const MODEL_URI = `${import.meta.env.BASE_URL}models`;

let faceApiPromise = null;

export const loadFaceApi = () => {
  if (!faceApiPromise) {
    faceApiPromise = import('@vladmandic/face-api')
      .then(async (faceapi) => {
        try {
          await faceapi.tf.setBackend('webgl');
        } catch {
          await faceapi.tf.setBackend('cpu');
        }
        await faceapi.tf.ready();

        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URI),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI)
        ]);

        return faceapi;
      })
      .catch((error) => {
        faceApiPromise = null;
        throw error;
      });
  }

  return faceApiPromise;
};

export const detectorOptions = (faceapi) =>
  new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

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
