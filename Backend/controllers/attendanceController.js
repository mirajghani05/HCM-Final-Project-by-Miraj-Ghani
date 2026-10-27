const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const CompanySettings = require('../models/CompanySettings');
const User = require('../models/User');
const { validateLiveness, verifyFaceDescriptor } = require('../services/faceService');

const isWeekend = (date, weekendDays = [0, 6]) => {
  return weekendDays.includes(date.getDay());
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const distanceInMeters = (fromLat, fromLng, toLat, toLng) => {
  const earthRadius = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const MAX_GPS_ACCURACY_METERS = 500;

const isStrictLocation = (settings) => settings?.locationMode === 'strict';

const parseRawLocation = (body) => {
  const raw = body?.location;
  if (!raw) return null;

  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  const accuracy = Number(raw.accuracy);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(accuracy) || accuracy < 0) {
    return { invalid: true };
  }

  return { lat, lng, accuracy: Math.round(accuracy) };
};

const evaluateCameraLocation = (body, settings) => {
  const strict = isStrictLocation(settings);
  const raw = parseRawLocation(body);

  if (!raw || raw.invalid) {
    if (strict) {
      throw badRequest('A valid location with GPS accuracy is required for camera attendance');
    }
    return {
      location: null,
      locationVerified: false,
      locationReason: 'Location unavailable'
    };
  }

  const accuracyTooPoor = raw.accuracy > MAX_GPS_ACCURACY_METERS;
  const officeLat = Number(settings?.officeLat);
  const officeLng = Number(settings?.officeLng);

  if (!Number.isFinite(officeLat) || !Number.isFinite(officeLng)) {
    if (strict) {
      throw badRequest('Office location is not configured. Ask admin to set it in Settings.');
    }
    return {
      location: raw,
      locationVerified: false,
      locationReason: 'Office location not configured'
    };
  }

  const distance = distanceInMeters(raw.lat, raw.lng, officeLat, officeLng);
  const radius = Number(settings?.officeRadius) || 150;
  const cappedAccuracy = Math.min(raw.accuracy, MAX_GPS_ACCURACY_METERS);
  const allowedDistance = radius + cappedAccuracy;

  const locationData = {
    ...raw,
    distance: Math.round(distance),
    allowedDistance: Math.round(allowedDistance)
  };

  if (accuracyTooPoor) {
    if (strict) {
      throw badRequest(
        `GPS accuracy is ${raw.accuracy} m, which is worse than the ${MAX_GPS_ACCURACY_METERS} m limit. ` +
        'Move to an open area and try again.'
      );
    }
    return {
      location: locationData,
      locationVerified: false,
      locationReason: `Poor GPS accuracy (${raw.accuracy} m)`
    };
  }

  if (distance > allowedDistance) {
    if (strict) {
      throw badRequest(
        `Location rejected: you are about ${Math.round(distance)} m from the office with GPS accuracy ${Math.round(raw.accuracy)} m. ` +
        `The ${Math.round(radius)} m office radius plus GPS uncertainty allows up to ${Math.round(allowedDistance)} m. ` +
        'Move closer or improve your GPS signal and try again.'
      );
    }
    return {
      location: locationData,
      locationVerified: false,
      locationReason: `Outside geofence (${Math.round(distance)} m / allowed ${Math.round(allowedDistance)} m)`
    };
  }

  return {
    location: locationData,
    locationVerified: true,
    locationReason: null
  };
};

const verifyCameraFace = async (body, employeeId) => {
  if (Number(body.faceCount) !== 1) {
    throw badRequest('Exactly one face must be detected for camera attendance');
  }

  const liveness = validateLiveness(body);
  const verification = await verifyFaceDescriptor(employeeId, body.faceDescriptor);

  if (!verification.matched) {
    throw badRequest(
      `Face verification failed (${Math.round(verification.confidence * 100)}% confidence, ` +
      `distance ${verification.distance}, threshold ${verification.threshold}). ` +
      'Ensure good lighting and try again.'
    );
  }

  return {
    ...verification,
    ...liveness
  };
};

const buildFaceFields = (cameraFace, now) => ({
  faceVerified: true,
  faceConfidence: cameraFace.confidence,
  faceDistance: cameraFace.distance,
  faceVerifiedAt: now,
  livenessPassed: cameraFace.livenessPassed,
  livenessMethod: cameraFace.livenessMethod,
  livenessSteadyMs: cameraFace.steadyMs
});

exports.checkIn = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.employeeId) return res.status(400).json({ message: 'No employee record linked' });

    const body = req.body ?? {};
    const source = body.source === 'camera' ? 'camera' : 'web';
    let cameraFace = null;
    let locationResult = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({ employee: user.employeeId, date: today });
    if (existing && existing.checkIn) {
      return res.status(409).json({ message: 'Already checked in for today' });
    }

    const settings = await CompanySettings.findOne();

    if (source === 'camera') {
      cameraFace = await verifyCameraFace(body, user.employeeId);
      locationResult = evaluateCameraLocation(body, settings);
    }

    const now = new Date();
    const officeStart = settings?.officeStartTime || '09:00';
    const [startHour, startMin] = officeStart.split(':').map(Number);
    const graceMin = settings?.graceMinutes || 15;

    const officeStartTime = new Date(today);
    officeStartTime.setHours(startHour, startMin + graceMin, 0, 0);

    let status = 'present';
    if (now > officeStartTime) {
      status = 'late';
    }

    const faceFields = source === 'camera' ? buildFaceFields(cameraFace, now) : { faceVerified: false };

    let attendance;
    if (existing) {
      existing.checkIn = now;
      existing.status = status;
      existing.source = source;
      if (source === 'camera') {
        existing.location = locationResult.location;
        existing.locationVerified = locationResult.locationVerified;
        existing.locationReason = locationResult.locationReason;
      }
      Object.assign(existing, faceFields);
      attendance = await existing.save();
    } else {
      const locationFields = source === 'camera'
        ? {
            location: locationResult.location,
            locationVerified: locationResult.locationVerified,
            locationReason: locationResult.locationReason
          }
        : {};

      attendance = await Attendance.create({
        employee: user.employeeId,
        date: today,
        checkIn: now,
        status,
        source,
        ...locationFields,
        ...faceFields
      });
    }

    res.json({
      message: locationResult && !locationResult.locationVerified
        ? 'Checked in successfully (location not verified)'
        : 'Checked in successfully',
      faceVerification: cameraFace
        ? {
            verified: true,
            confidence: cameraFace.confidence,
            distance: cameraFace.distance,
            threshold: cameraFace.threshold,
            verifiedAt: now
          }
        : null,
      locationVerified: locationResult ? locationResult.locationVerified : true,
      locationReason: locationResult ? locationResult.locationReason : null,
      attendance,
      attendanceToday: attendance
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.employeeId) return res.status(400).json({ message: 'No employee record linked' });

    const body = req.body ?? {};
    const source = body.source === 'camera' ? 'camera' : 'web';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ employee: user.employeeId, date: today });
    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ message: 'No check-in record found for today' });
    }
    if (attendance.checkOut) {
      return res.status(400).json({ message: 'Already checked out' });
    }

    const settings = await CompanySettings.findOne();
    let cameraFace = null;
    let locationResult = null;

    if (source === 'camera') {
      cameraFace = await verifyCameraFace(body, user.employeeId);
      locationResult = evaluateCameraLocation(body, settings);
    }

    const now = new Date();
    attendance.checkOut = now;

    const hoursWorked = (now - attendance.checkIn) / (1000 * 60 * 60);
    attendance.hoursWorked = Math.round(hoursWorked * 100) / 100;

    const halfDayHours = settings?.halfDayHours || 5;
    if (hoursWorked < halfDayHours) {
      attendance.status = 'half_day';
    }

    if (source === 'camera') {
      attendance.checkOutFaceVerified = true;
      attendance.checkOutFaceConfidence = cameraFace.confidence;
      attendance.checkOutFaceDistance = cameraFace.distance;
      attendance.checkOutFaceVerifiedAt = now;
      attendance.checkOutLivenessPassed = cameraFace.livenessPassed;
      attendance.checkOutLivenessMethod = cameraFace.livenessMethod;
      attendance.checkOutLivenessSteadyMs = cameraFace.steadyMs;
      attendance.checkOutLocation = locationResult.location;
      attendance.checkOutLocationVerified = locationResult.locationVerified;
      attendance.checkOutLocationReason = locationResult.locationReason;
    }

    await attendance.save();

    res.json({
      message: locationResult && !locationResult.locationVerified
        ? 'Checked out successfully (location not verified)'
        : 'Checked out successfully',
      faceVerification: cameraFace
        ? {
            verified: true,
            confidence: cameraFace.confidence,
            distance: cameraFace.distance,
            threshold: cameraFace.threshold,
            verifiedAt: now
          }
        : null,
      locationVerified: locationResult ? locationResult.locationVerified : true,
      locationReason: locationResult ? locationResult.locationReason : null,
      attendance,
      attendanceToday: attendance
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, page = 1, limit = 30 } = req.query;
    const query = {};

    if (req.user.role === 'employee') {
      const user = await User.findById(req.user.id);
      query.employee = user.employeeId;
    } else if (employeeId) {
      query.employee = employeeId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .populate('employee')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);
    res.json({ attendance, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance = await Attendance.find({ date: today }).populate('employee');
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
