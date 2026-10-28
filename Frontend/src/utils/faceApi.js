const MODEL_URI = `${import.meta.env.BASE_URL}models`;

let faceApiPromise = null;
let currentFaceApi = null;

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

export const loadFaceApi = async () => {
  if (faceApiPromise) {
    return faceApiPromise;
  }

  faceApiPromise = import('@vladmandic/face-api')
    .then(async (faceapi) => {
      currentFaceApi = faceapi;
      try {
        await faceapi.tf.setBackend('webgl');
      } catch {
        try {
          await faceapi.tf.setBackend('cpu');
        } catch {
          // ignore
        }
      }
      await faceapi.tf.ready();

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URI)
      ]);

      return faceapi;
    })
    .catch((error) => {
      faceApiPromise = null;
      currentFaceApi = null;
      throw error;
    });

  return faceApiPromise;
};

export const getFaceApi = () => currentFaceApi;

export const getTfBackend = () => {
  try {
    const faceapi = currentFaceApi || (typeof window !== 'undefined' && window.faceapi);
    if (faceapi?.tf?.getBackend) {
      return faceapi.tf.getBackend();
    }
  } catch {
    // ignore
  }
  return 'unknown';
};

export const detectorOptions = (faceapi, options = {}) => {
  const mobile = isMobileDevice();
  if (mobile) {
    const inputSize = options.inputSize || 224;
    const scoreThreshold = options.scoreThreshold ?? 0.5;
    return new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
  }
  const minConfidence = options.minConfidence ?? 0.5;
  return new faceapi.SsdMobilenetv1Options({ minConfidence });
};

export const detectFaces = (faceapi, video, options = {}) => {
  const mobile = isMobileDevice();
  if (mobile) {
    return faceapi.detectAllFaces(video, detectorOptions(faceapi, options)).withFaceLandmarks();
  }
  return faceapi.detectAllFaces(video, detectorOptions(faceapi, options)).withFaceLandmarks();
};

export const captureFaceDescriptor = async (faceapi, video) => {
  const results = await faceapi
    .detectAllFaces(video, detectorOptions(faceapi))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (results.length !== 1) {
    throw new Error(
      results.length === 0 ? 'No face detected. Center your face and try again.' : 'Multiple faces detected. Only one person may be in frame.'
    );
  }

  return Array.from(results[0].descriptor);
};

export const measureBrightness = (video, canvas) => {
  if (!video || !canvas || video.readyState < 2) return null;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

  let total = 0;
  for (let index = 0; index < data.length; index += 4) {
    total += data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
  }

  return total / (data.length / 4);
};
