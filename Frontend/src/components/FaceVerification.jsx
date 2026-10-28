import { useEffect, useRef, useState } from 'react';
import { CameraOff, CheckCircle2, LocateFixed, MapPin, RefreshCw, ScanFace, ShieldCheck, Sun, TriangleAlert, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../services/api';
import { captureFaceDescriptor, detectFaces, getTfBackend, loadFaceApi, measureBrightness } from '../utils/faceApi';
import { Badge, Button, Modal } from './ui';

const MODE_CONFIG = {
  enroll: { title: 'Enroll your face', description: 'Capture a clear face descriptor for camera attendance. No photo is stored.', action: 'Save face', endpoint: '/face/enroll', success: 'Face enrolled successfully', steadyMs: 1000 },
  'check-in': { title: 'Face check-in', description: 'Complete the liveness step, verify your face. Location may be recorded as unverified if unavailable.', action: 'Confirm check-in', endpoint: '/attendance/check-in', success: 'Face check-in successful', steadyMs: 1000 },
  'check-out': { title: 'Face check-out', description: 'Complete the liveness step, verify your face. Location may be recorded as unverified if unavailable.', action: 'Confirm check-out', endpoint: '/attendance/check-out', success: 'Face check-out successful', steadyMs: 1000 }
};

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  if (mobileRegex.test(ua)) return true;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window;
  }
  return false;
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
  const blinkRef = useRef(false);
  const detectionInFlightRef = useRef(false);
  const lastDetectionTimeRef = useRef(0);

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
  const [hints, setHints] = useState([]);
  const [debugInfo, setDebugInfo] = useState({ backend: 'unknown', videoW: 0, videoH: 0, modelsLoaded: false, lastMs: 0, faces: 0, error: '' });
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    setShowDebug(!!params?.get('debug'));

    const resetFaceProgress = () => {
      steadyStartRef.current = null;
      steadyMsRef.current = 0;
      lastBoxRef.current = null;
      turnedRef.current = false;
      livenessRef.current = false;
      blinkRef.current = false;
      setSteadyMs(0);
      setChallengeState('waiting');
    };

    const stopCamera = () => {
      if (loopTimerRef.current) { clearTimeout(loopTimerRef.current); loopTimerRef.current = null; }
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      faceApiRef.current = null;
      detectionInFlightRef.current = false;
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
    setHints([]);
    setDebugInfo({ backend: 'unknown', videoW: 0, videoH: 0, modelsLoaded: false, lastMs: 0, faces: 0, error: '' });
    resetFaceProgress();

    const mobile = isMobileDevice();
    const scanInterval = mobile ? 250 : 200;

    const scheduleScan = () => {
      if (!cancelled && !detectionInFlightRef.current) {
        loopTimerRef.current = setTimeout(scan, scanInterval);
      } else if (!cancelled) {
        loopTimerRef.current = setTimeout(scheduleScan, 50);
      }
    };

    const scan = async () => {
      if (cancelled || !faceApiRef.current) { scheduleScan(); return; }
      const video = videoRef.current;
      if (!video || video.readyState < 2) { scheduleScan(); return; }
      if (video.videoWidth === 0 || video.videoHeight === 0) { scheduleScan(); return; }
      if (detectionInFlightRef.current) { scheduleScan(); return; }

      detectionInFlightRef.current = true;
      const start = performance.now();
      try {
        const faceapi = faceApiRef.current;
        const results = await detectFaces(faceapi, video, mobile ? { inputSize: 224, scoreThreshold: 0.5 } : { minConfidence: 0.5 });
        if (cancelled) { detectionInFlightRef.current = false; return; }

        const now = performance.now();
        const elapsed = Math.round(now - start);
        lastDetectionTimeRef.current = elapsed;
        setDebugInfo((d) => ({ ...d, lastMs: elapsed, faces: results.length, videoW: video.videoWidth, videoH: video.videoHeight, modelsLoaded: true, backend: getTfBackend(), error: '' }));
        if (now - lastBrightnessCheckRef.current > 400) {
          lastBrightnessCheckRef.current = now;
          const brightness = measureBrightness(video, canvasRef.current);
          if (brightness != null) setLowLight(brightness < LOW_LIGHT_THRESHOLD);
        }

        const count = results.length;
        setFaceCount(count);
        const newHints = [];
        if (count !== 1) newHints.push('only one face');
        if (lowLight) newHints.push('more light');
        if (count === 1) {
          const detection = results[0];
          const box = detection.detection.box;
          const vw = video.videoWidth || 640;
          if (box.width < vw * 0.18) newHints.push('move closer');
        }
        setHints(Array.from(new Set(newHints)));

        if (count !== 1) { resetFaceProgress(); detectionInFlightRef.current = false; scheduleScan(); return; }

        const detection = results[0];
        const box = detection.detection.box;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const previous = lastBoxRef.current;

        if (previous) {
          const maxShift = Math.max(Math.abs(centerX - previous.centerX), Math.abs(centerY - previous.centerY), Math.abs(box.width - previous.width));
          if (maxShift > box.width * 0.18) { steadyStartRef.current = now; if (!livenessRef.current) setChallengeState('waiting'); }
        }
        if (steadyStartRef.current == null) steadyStartRef.current = now;
        const heldMs = now - steadyStartRef.current;
        steadyMsRef.current = heldMs;
        setSteadyMs(Math.min(heldMs, config.steadyMs));
        lastBoxRef.current = { centerX, centerY, width: box.width };
        const steady = heldMs >= config.steadyMs;

        if (isEnrollment) {
          setChallengeState(steady ? 'passed' : 'waiting');
          detectionInFlightRef.current = false;
          scheduleScan();
          return;
        }

        if (!steady) {
          if (!livenessRef.current) setChallengeState('waiting');
          detectionInFlightRef.current = false;
          scheduleScan();
          return;
        }

        if (!livenessRef.current) {
          try {
            const leftEye = detection.landmarks.getLeftEye();
            const rightEye = detection.landmarks.getRightEye();
            const eyeOpen = Math.abs(leftEye[3].y - leftEye[0].y) + Math.abs(rightEye[3].y - rightEye[0].y);
            if (eyeOpen < 6) blinkRef.current = true;
            if (blinkRef.current && eyeOpen > 8) { livenessRef.current = true; setChallengeState('passed'); detectionInFlightRef.current = false; scheduleScan(); return; }
          } catch {
            blinkRef.current = false;
          }
          const nose = detection.landmarks.getNose()[3];
          const offset = (nose.x - centerX) / box.width;
          if (!turnedRef.current && Math.abs(offset) > 0.08) { turnedRef.current = true; setChallengeState('center'); }
          else if (turnedRef.current && Math.abs(offset) < 0.08) { livenessRef.current = true; setChallengeState('passed'); }
          else if (!turnedRef.current) { setChallengeState('turn'); }
        } else {
          setChallengeState('passed');
        }
        detectionInFlightRef.current = false;
      } catch (err) {
        if (!cancelled) { setFaceCount(0); resetFaceProgress(); setDebugInfo((d) => ({ ...d, error: err?.message || String(err) })); }
        detectionInFlightRef.current = false;
      }
      scheduleScan();
    };

    const startCamera = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) { setCameraState('error'); setError('Camera access is not supported in this browser.'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('muted', 'true');
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.autoplay = true;
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // ignore autoplay issues
          }
        }
        setCameraState('ready');
      } catch (err) {
        setCameraState('error');
        setError(err?.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access and try again.' : 'Unable to start the camera. Check your device and browser permissions.');
      }
    };

    const startModels = async () => {
      try {
        const faceapi = await loadFaceApi();
        if (cancelled) return;
        faceApiRef.current = faceapi;
        setModelState('ready');
        setDebugInfo((d) => ({ ...d, modelsLoaded: true, backend: getTfBackend() }));
        scan();
      } catch (err) {
        if (cancelled) return;
        setModelState('error');
        setError('Face models could not load.');
        setDebugInfo((d) => ({ ...d, error: err?.message || String(err) }));
      }
    };

    startCamera();
    startModels();
    return () => { cancelled = true; stopCamera(); };
  }, [open, mode, config.steadyMs, isEnrollment, attempt, lowLight]);

  const requestLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) { setLocationError('Location not supported.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLocation = { lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)), accuracy: Math.round(pos.coords.accuracy) };
        setLocation(nextLocation);
        setLocating(false);
        if (nextLocation.accuracy > MAX_GPS_ACCURACY_METERS) setLocationError('GPS accuracy ' + nextLocation.accuracy + ' m may be flagged.');
      },
      (err) => {
        setLocating(false);
        setLocationError(err?.code === 1 ? 'Location permission denied. Attendance may be flagged.' : 'Could not get location. Attendance may be flagged.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const retry = () => {
    setAttempt((a) => a + 1);
    setStatus('idle');
    setError('');
    setConfidence(null);
    steadyStartRef.current = null;
    steadyMsRef.current = 0;
    setSteadyMs(0);
    turnedRef.current = false;
    livenessRef.current = false;
    blinkRef.current = false;
    setChallengeState('waiting');
    setHints([]);
    setFaceCount(0);
    setLowLight(false);
    detectionInFlightRef.current = false;
    lastDetectionTimeRef.current = 0;
  };

  const steadyReady = steadyMs >= config.steadyMs;
  const livenessReady = isEnrollment || challengeState === 'passed' || livenessRef.current;
  const canSubmit = cameraState === 'ready' && modelState === 'ready' && faceCount === 1 && steadyReady && livenessReady && !lowLight && status !== 'verifying' && status !== 'success';

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('verifying');
    setError('');
    try {
      const faceapi = faceApiRef.current;
      const descriptor = await captureFaceDescriptor(faceapi, videoRef.current);
      if (!isEnrollment && !(livenessRef.current || challengeState === 'passed')) throw new Error('Complete liveness step.');
      const payload = isEnrollment
        ? { descriptor }
        : { source: 'camera', faceCount: 1, faceDescriptor: descriptor, livenessPassed: true, livenessMethod: turnedRef.current ? 'head_turn' : (blinkRef.current ? 'blink' : 'head_turn'), steadyMs: Math.round(steadyMsRef.current), location: location ? { lat: location.lat, lng: location.lng, accuracy: location.accuracy } : undefined };
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
    if (faceCount > 1) return { label: faceCount + ' faces detected', tone: 'rose' };
    if (!steadyReady) return { label: 'Hold still...', tone: 'indigo' };
    if (isEnrollment) return { label: 'Face ready', tone: 'emerald' };
    if (challengeState === 'turn') return { label: 'Turn head slightly or blink', tone: 'violet' };
    if (challengeState === 'center') return { label: 'Return to center', tone: 'violet' };
    if (challengeState === 'passed' || livenessReady) return { label: 'Liveness confirmed', tone: 'emerald' };
    return { label: 'Face detected', tone: 'indigo' };
  })();

  const progress = Math.min(100, Math.round((steadyMs / config.steadyMs) * 100));
  const hintLabel = (h) => {
    if (h === 'move closer') return 'Move back or closer to fit face';
    if (h === 'more light') return 'More light';
    if (h === 'look at the camera') return 'Look at the camera';
    if (h === 'only one face') return 'Only one face';
    return h;
  };

  return (
    <Modal open={open} onClose={onClose} title={config.title} description={config.description} size="lg">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-800">
            <video ref={videoRef} muted playsInline autoPlay className="aspect-video w-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
              <Badge tone={faceStatus.tone} className="gap-1.5"><ScanFace className="h-3.5 w-3.5" />{faceStatus.label}</Badge>
              {lowLight ? <Badge tone="amber" className="gap-1.5"><Sun className="h-3.5 w-3.5" />Low light</Badge> : null}
              {faceCount === 1 ? <Badge tone="neutral" className="gap-1.5"><Users className="h-3.5 w-3.5" />1 face</Badge> : null}
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center justify-between text-[11px] text-white/80"><span>Hold steady {(steadyMs/1000).toFixed(1)}s / {(config.steadyMs/1000).toFixed(1)}s</span><span>{progress}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: progress + '%' }} /></div>
            </div>
          </div>
          {hints.length ? <div className="flex flex-wrap gap-2">{hints.map((h) => <Badge key={h} tone="neutral">{hintLabel(h)}</Badge>)}</div> : null}
          {cameraState === 'error' || modelState === 'error' ? <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"><TriangleAlert className="mt-0.5 h-4 w-4" /><p>{error}</p></div> : null}
          {showDebug ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              <div className="mb-1 font-semibold">Debug</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div>tf backend: {debugInfo.backend}</div>
                <div>video: {debugInfo.videoW}x{debugInfo.videoH}</div>
                <div>models loaded: {debugInfo.modelsLoaded ? 'yes' : 'no'}</div>
                <div>last detection: {debugInfo.lastMs}ms</div>
                <div>faces: {debugInfo.faces}</div>
                <div>error: {debugInfo.error || '-'}</div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-500" /><p className="text-sm font-semibold text-slate-900 dark:text-white">Liveness</p></div><Badge tone={livenessReady ? 'emerald' : 'neutral'}>{livenessReady ? 'Passed' : 'In progress'}</Badge></div>
            <p className="mt-2 text-xs text-muted">{isEnrollment ? 'Hold still for ~1 second.' : 'Hold still for ~1 second, then turn head slightly or blink.'}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900/60"><p className="text-subtle">Steady</p><p className="mt-1 font-medium text-slate-900 dark:text-white">{(steadyMs/1000).toFixed(1)}s</p></div>
              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900/60"><p className="text-subtle">Challenge</p><p className="mt-1 font-medium text-slate-900 dark:text-white">{livenessReady ? 'Done' : challengeState === 'turn' ? 'Turn/ blink' : challengeState === 'center' ? 'Return to center' : 'Hold'}</p></div>
            </div>
          </div>
          {!isEnrollment ? (
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-indigo-500" /><p className="text-sm font-semibold text-slate-900 dark:text-white">Location</p></div>{location ? <Badge tone={location.accuracy <= MAX_GPS_ACCURACY_METERS ? 'emerald' : 'amber'}>GPS ±{location.accuracy} m</Badge> : <Badge tone="neutral">Not set</Badge>}</div>
              <p className="mt-2 text-xs text-muted">Location is optional and does not block attendance if face matches. It may be flagged.</p>
              <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={requestLocation} loading={locating} icon={LocateFixed}>{location ? 'Update location' : 'Get location'}</Button>
              {locationError ? <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{locationError}</p> : null}
            </div>
          ) : null}
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-500" /><p className="text-sm font-semibold text-slate-900 dark:text-white">Ready to submit</p></div>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              <li>{cameraState === 'ready' && modelState === 'ready' ? '✓' : '○'} Camera ready and models loaded</li>
              <li>{faceCount === 1 && !lowLight ? '✓' : '○'} Exactly one face, good lighting</li>
              <li>{steadyReady && livenessReady ? '✓' : '○'} Steady hold + liveness (~1s)</li>
            </ul>
            {confidence !== null ? <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">Match confidence {Math.round(confidence * 100)}%</p> : null}
            {error && status === 'failed' ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleSubmit} disabled={!canSubmit} loading={status === 'verifying'}>{config.action}<ShieldCheck className="h-4 w-4" /></Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={retry} icon={RefreshCw} className="flex-1">Retry</Button>
              <Button variant="ghost" onClick={onClose} className="flex-1" icon={CameraOff}>Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
