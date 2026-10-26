import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  LocateFixed,
  MapPin,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sun,
  TriangleAlert,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../services/api';
import { captureFaceDescriptor, detectorOptions, loadFaceApi, measureBrightness } from '../utils/faceApi';
import { Badge, Button, Modal } from './ui';

const MODE_CONFIG = {
  enroll: {
    title: 'Enroll your face',
    description: 'Capture a clear face descriptor for camera attendance. No photo is stored.',
    action: 'Save face',
    endpoint: '/face/enroll',
    success: 'Face enrolled successfully',
    steadyMs: 1500
  },
  'check-in': {
    title: 'Face check-in',
    description: 'Complete the liveness challenge, then verify your face and office location.',
    action: 'Confirm check-in',
    endpoint: '/attendance/check-in',
    success: 'Face check-in successful',
    steadyMs: 2000
  },
  'check-out': {
    title: 'Face check-out',
    description: 'Complete the liveness challenge, then verify your face and office location.',
    action: 'Confirm check-out',
    endpoint: '/attendance/check-out',
    success: 'Face check-out successful',
    steadyMs: 2000
  }
};

const LOW_LIGHT_THRESHOLD = 45;
const MAX_GPS_ACCURACY_METERS = 500;

export default function FaceVerification({ open, mode = 'check-in', onClose, onSuccess }) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG['check-in'];
  const isEnrollment = mode === 'enroll';

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceApiRef = useRef(null);
  const loopTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const steadyStartRef = useRef(null);
  const steadyMsRef = useRef(0);
  const lastBoxRef = useRef(null);
  const lastBrightnessCheckRef = useRef(0);
  const turnedRef = useRef(false);
  const livenessRef = useRef(false);

  const [attempt, setAttempt] = useState(0);
  const [cameraState, setCameraState] = useState('starting');
  const [modelState, setModelState] = useState('loading');
  const [faceCount, setFaceCount] = useState(0);
  const [steadyMs, setSteadyMs] = useState(0);
  const [challengeState, setChallengeState] = useState('waiting');
  const [lowLight, setLowLight] = useState(false);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [status, setStatus] = useState('idle');
  const [confidence, setConfidence] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    const resetFaceProgress = () => {
      steadyStartRef.current = null;
      steadyMsRef.current = 0;
      lastBoxRef.current = null;
      turnedRef.current = false;
      livenessRef.current = false;
      setSteadyMs(0);
      setChallengeState('waiting');
    };

    const stopCamera = () => {
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      faceApiRef.current = null;
    };

    setCameraState('starting');
    setModelState('loading');
    setFaceCount(0);
    setLowLight(false);
    setLocation(null);
    setLocationError('');
    setStatus('idle');
    setConfidence(null);
    setError('');
    resetFaceProgress();

    const scheduleScan = () => {
      if (!cancelled) {
        loopTimerRef.current = setTimeout(scan, 220);
      }
    };

    const scan = async () => {
      if (cancelled || !faceApiRef.current) {
        scheduleScan();
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        scheduleScan();
        return;
      }

      try {
        const faceapi = faceApiRef.current;
        const results = await faceapi
          .detectAllFaces(video, detectorOptions(faceapi))
          .withFaceLandmarks();

        if (cancelled) return;

        const now = performance.now();
        if (now - lastBrightnessCheckRef.current > 500) {
          lastBrightnessCheckRef.current = now;
          const brightness = measureBrightness(video, canvasRef.current);
          if (brightness != null) setLowLight(brightness < LOW_LIGHT_THRESHOLD);
        }

        const count = results.length;
        setFaceCount(count);

        if (count !== 1) {
          resetFaceProgress();
          scheduleScan();
          return;
        }

        const detection = results[0];
        const box = detection.detection.box;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const previous = lastBoxRef.current;

        if (previous) {
          const maxShift = Math.max(
            Math.abs(centerX - previous.centerX),
            Math.abs(centerY - previous.centerY),
            Math.abs(box.width - previous.width)
          );

          if (maxShift > box.width * 0.12) {
            steadyStartRef.current = now;
            if (!livenessRef.current) setChallengeState('waiting');
          }
        }

        if (steadyStartRef.current == null) {
          steadyStartRef.current = now;
        }

        const heldMs = now - steadyStartRef.current;
        steadyMsRef.current = heldMs;
        setSteadyMs(Math.min(heldMs, config.steadyMs));
        lastBoxRef.current = { centerX, centerY, width: box.width };

        const steady = heldMs >= config.steadyMs;

        if (isEnrollment) {
          setChallengeState(steady ? 'passed' : 'waiting');
          scheduleScan();
          return;
        }

        if (!steady) {
          if (!livenessRef.current) setChallengeState('waiting');
          scheduleScan();
          return;
        }

        if (!livenessRef.current) {
          const nose = detection.landmarks.getNose()[3];
          const offset = (nose.x - centerX) / box.width;

          if (!turnedRef.current && Math.abs(offset) > 0.12) {
            turnedRef.current = true;
            setChallengeState('center');
          } else if (turnedRef.current && Math.abs(offset) < 0.06) {
            livenessRef.current = true;
            setChallengeState('passed');
          } else if (!turnedRef.current) {
            setChallengeState('turn');
          }
        }
      } catch {
        if (!cancelled) {
          setFaceCount(0);
          resetFaceProgress();
        }
      }

      scheduleScan();
    };

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('error');
        setError('Camera access is not supported in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState('ready');
      } catch (err) {
        setCameraState('error');
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access and try again.'
            : 'Unable to start the camera. Check your device and browser permissions.'
        );
      }
    };

    const startModels = async () => {
      try {
        const faceapi = await loadFaceApi();
        if (cancelled) return;
        faceApiRef.current = faceapi;
        setModelState('ready');
        scan();
      } catch {
        if (cancelled) return;
        setModelState('error');
        setError('Face models could not load. Check the model files and try again.');
      }
    };

    startCamera();
    startModels();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, mode, config.steadyMs, isEnrollment, attempt]);

  const requestLocation = () => {
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Location is not supported in this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy)
        };
        setLocation(nextLocation);
        setLocating(false);
        if (nextLocation.accuracy > MAX_GPS_ACCURACY_METERS) {
          setLocationError(
            `GPS accuracy is ±${nextLocation.accuracy} m. Move to an open area and try again (max ${MAX_GPS_ACCURACY_METERS} m).`
          );
        }
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err?.code === 1
            ? 'Location permission was denied. Location is required for camera attendance.'
            : 'Could not get your location. Try again with GPS enabled.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const steadyReady = steadyMs >= config.steadyMs;
  const livenessReady = isEnrollment || challengeState === 'passed';
  const locationReady =
    isEnrollment || (location && location.accuracy <= MAX_GPS_ACCURACY_METERS);
  const canSubmit =
    cameraState === 'ready' &&
    modelState === 'ready' &&
    faceCount === 1 &&
    steadyReady &&
    livenessReady &&
    locationReady &&
    !lowLight &&
    status !== 'verifying' &&
    status !== 'success';

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setStatus('verifying');
    setError('');

    try {
      const faceapi = faceApiRef.current;
      const descriptor = await captureFaceDescriptor(faceapi, videoRef.current);

      if (!isEnrollment && !livenessRef.current) {
        throw new Error('Complete the head-turn challenge before continuing.');
      }

      const payload = isEnrollment
        ? { descriptor }
        : {
            source: 'camera',
            faceCount: 1,
            faceDescriptor: descriptor,
            livenessPassed: true,
            livenessMethod: 'head_turn',
            steadyMs: Math.round(steadyMsRef.current),
            location: {
              lat: location.lat,
              lng: location.lng,
              accuracy: location.accuracy
            }
          };

      const response = await API.post(config.endpoint, payload);
      setConfidence(isEnrollment ? null : response.data?.faceVerification?.confidence ?? null);
      setStatus('success');
      toast.success(response.data?.message || config.success);
      onSuccess?.(response.data);
      closeTimerRef.current = setTimeout(() => onClose?.(), 1400);
    } catch (err) {
      setStatus('failed');
      setError(err.response?.data?.message || err.message || 'Face verification failed. Please try again.');
    }
  };

  const faceStatus = (() => {
    if (cameraState === 'error') return { label: 'Camera unavailable', tone: 'rose' };
    if (modelState === 'loading') return { label: 'Loading face models...', tone: 'neutral' };
    if (modelState === 'error') return { label: 'Face models unavailable', tone: 'rose' };
    if (lowLight) return { label: 'Low light', tone: 'amber' };
    if (faceCount === 0) return { label: 'No face detected', tone: 'amber' };
    if (faceCount > 1) return { label: `${faceCount} faces detected`, tone: 'rose' };
    if (!steadyReady) return { label: 'Hold still...', tone: 'indigo' };
    if (isEnrollment) return { label: 'Face ready', tone: 'emerald' };
    if (challengeState === 'turn') return { label: 'Turn your head', tone: 'violet' };
    if (challengeState === 'center') return { label: 'Return to center', tone: 'violet' };
    if (challengeState === 'passed') return { label: 'Liveness confirmed', tone: 'emerald' };
    return { label: 'Face detected', tone: 'indigo' };
  })();

  const progress = Math.min(100, Math.round((steadyMs / config.steadyMs) * 100));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={config.title}
      description={config.description}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={status === 'verifying'}>
            Cancel
          </Button>
          <Button
            icon={CheckCircle2}
            onClick={handleSubmit}
            loading={status === 'verifying'}
            disabled={!canSubmit}
          >
            {status === 'failed' ? 'Try again' : config.action}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-800">
          <video
            ref={videoRef}
            muted
            playsInline
            className="aspect-[4/3] w-full scale-x-[-1] object-cover"
          />
          <canvas ref={canvasRef} width="64" height="48" className="hidden" />

          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div
              className={
                faceCount === 1 && !lowLight
                  ? 'relative h-[68%] w-[48%] rounded-[50%] border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)] transition-all'
                  : 'relative h-[68%] w-[48%] rounded-[50%] border-2 border-dashed border-white/50 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)] transition-all'
              }
            >
              {faceCount === 1 && !lowLight ? (
                <>
                  <span className="absolute inset-0 rounded-[50%] border border-emerald-300/60 animate-ping" />
                  <span className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-emerald-300 to-transparent animate-pulse" />
                </>
              ) : null}
            </div>
          </div>

          <div className="absolute left-3 top-3">
            <Badge tone={faceStatus.tone} dot>
              {faceStatus.label}
            </Badge>
          </div>

          {cameraState === 'starting' ? (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/80 text-center">
              <div>
                <Camera className="mx-auto h-7 w-7 animate-pulse text-white" />
                <p className="mt-2 text-xs font-medium text-slate-300">Starting camera...</p>
              </div>
            </div>
          ) : null}

          {cameraState === 'error' || modelState === 'error' ? (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/90 p-6 text-center">
              <div>
                <CameraOff className="mx-auto h-8 w-8 text-rose-400" />
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-300">{error}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={RefreshCw}
                  className="mt-3"
                  onClick={() => {
                    setAttempt((value) => value + 1);
                  }}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : null}

          {status === 'success' ? (
            <div className="absolute inset-0 grid place-items-center bg-emerald-950/85 p-6 text-center backdrop-blur-sm">
              <div>
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
                <p className="mt-2 text-sm font-semibold text-white">
                  {isEnrollment ? 'Face enrolled' : 'Identity verified'}
                </p>
                {confidence != null ? (
                  <p className="mt-1 text-xs text-emerald-100">
                    Match confidence: {Math.round(confidence * 100)}%
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-muted">
            <span>Steady face</span>
            <span>{Math.min(100, progress)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={steadyReady ? 'h-full rounded-full bg-emerald-500' : 'h-full rounded-full bg-indigo-500'}
              style={{ width: `${progress}%` }}
            />
          </div>
          {!isEnrollment ? (
            <p className="mt-2 text-[11px] text-subtle">
              {challengeState === 'passed'
                ? 'Liveness confirmed. You can continue.'
                : challengeState === 'center'
                  ? 'Now look straight at the camera.'
                  : 'After holding still, turn your head slightly left or right.'}
            </p>
          ) : null}
        </div>

        {lowLight ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <Sun className="mt-0.5 h-4 w-4 shrink-0" />
            Low light detected. Move to a brighter area so your face is clearly visible.
          </div>
        ) : null}

        {faceCount > 1 ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            <Users className="mt-0.5 h-4 w-4 shrink-0" />
            Multiple faces detected. Only one person may be in frame.
          </div>
        ) : null}

        {error && cameraState !== 'error' && modelState !== 'error' ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {!isEnrollment ? (
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Office location</p>
                  <p className="text-[11px] text-muted">
                    {location
                      ? `${location.lat}, ${location.lng} · GPS accuracy ±${location.accuracy} m`
                      : 'Share your GPS location to verify you are at the office.'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={location ? RefreshCw : LocateFixed}
                onClick={requestLocation}
                loading={locating}
                disabled={status === 'verifying'}
              >
                {location ? 'Refresh' : 'Share location'}
              </Button>
            </div>

            {location && !locationError ? (
              <p className="mt-2.5 rounded-lg bg-sky-50 px-3 py-2 text-[11px] leading-5 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                The server adds your GPS accuracy (±{location.accuracy} m) to the office radius when checking the geofence.
              </p>
            ) : null}

            {locationError ? (
              <p className="mt-2.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {locationError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-muted dark:bg-slate-950/40">
            <ScanFace className="h-4 w-4 shrink-0 text-indigo-500" />
            Exactly one face
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-muted dark:bg-slate-950/40">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
            Liveness required
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-muted dark:bg-slate-950/40">
            <Users className="h-4 w-4 shrink-0 text-violet-500" />
            No photo stored
          </div>
        </div>

        <p className="text-[11px] leading-5 text-subtle">
          Your camera feed stays on this device. Only a face descriptor, liveness result, timestamp and GPS location are sent to the server. No photo or video is uploaded.
        </p>
      </div>
    </Modal>
  );
}
