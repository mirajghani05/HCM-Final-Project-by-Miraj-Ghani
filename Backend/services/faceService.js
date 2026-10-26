const FaceProfile = require('../models/FaceProfile');

const DESCRIPTOR_LENGTH = 128;
const MATCH_THRESHOLD = 0.5;

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeDescriptor = (descriptor) => {
  if (!Array.isArray(descriptor) || descriptor.length !== DESCRIPTOR_LENGTH) {
    throw validationError(`Face descriptor must contain ${DESCRIPTOR_LENGTH} numbers`);
  }

  const values = descriptor.map(Number);
  if (values.some((value) => !Number.isFinite(value) || Math.abs(value) > 10)) {
    throw validationError('Face descriptor contains invalid values');
  }

  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (magnitude < 1e-6) {
    throw validationError('Face descriptor is not valid');
  }

  return values.map((value) => value / magnitude);
};

const euclideanDistance = (first, second) => {
  let sum = 0;
  for (let index = 0; index < first.length; index += 1) {
    const difference = first[index] - second[index];
    sum += difference * difference;
  }
  return Math.sqrt(sum);
};

const toConfidence = (distance) => {
  return Math.round(Math.max(0, Math.min(1, 1 - distance)) * 1000) / 1000;
};

const validateLiveness = (body) => {
  const livenessPassed = body.livenessPassed === true;
  const livenessMethod = String(body.livenessMethod || '');
  const steadyMs = Number(body.steadyMs);

  if (!livenessPassed) {
    throw validationError('Liveness check is required for camera attendance');
  }
  if (!['blink', 'head_turn'].includes(livenessMethod)) {
    throw validationError('A valid liveness challenge is required');
  }
  if (!Number.isFinite(steadyMs) || steadyMs < 2000) {
    throw validationError('Hold your face steady for at least 2 seconds');
  }

  return { livenessPassed, livenessMethod, steadyMs };
};

const enrollFace = async (employeeId, descriptor) => {
  const normalized = normalizeDescriptor(descriptor);
  const profile = await FaceProfile.findOneAndUpdate(
    { employee: employeeId },
    {
      employee: employeeId,
      descriptor: normalized,
      enrolledAt: new Date(),
      lastVerifiedAt: null,
      lastMatchDistance: null
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    enrolled: true,
    enrolledAt: profile.enrolledAt
  };
};

const getFaceStatus = async (employeeId) => {
  const profile = await FaceProfile.findOne({ employee: employeeId })
    .select('enrolledAt lastVerifiedAt lastMatchDistance updatedAt');

  if (!profile) {
    return { enrolled: false };
  }

  return {
    enrolled: true,
    enrolledAt: profile.enrolledAt,
    lastVerifiedAt: profile.lastVerifiedAt,
    lastMatchDistance: profile.lastMatchDistance
  };
};

const verifyFaceDescriptor = async (employeeId, descriptor) => {
  const normalized = normalizeDescriptor(descriptor);
  const profile = await FaceProfile.findOne({ employee: employeeId }).select('+descriptor');

  if (!profile) {
    throw validationError('Face enrollment required before camera attendance. Enroll your face from Profile.');
  }

  const distance = euclideanDistance(normalized, profile.descriptor);
  const confidence = toConfidence(distance);
  const matched = distance <= MATCH_THRESHOLD;

  if (matched) {
    profile.lastVerifiedAt = new Date();
    profile.lastMatchDistance = distance;
    await profile.save();
  }

  return {
    matched,
    distance: Math.round(distance * 10000) / 10000,
    confidence
  };
};

module.exports = {
  DESCRIPTOR_LENGTH,
  MATCH_THRESHOLD,
  normalizeDescriptor,
  validateLiveness,
  enrollFace,
  getFaceStatus,
  verifyFaceDescriptor
};
