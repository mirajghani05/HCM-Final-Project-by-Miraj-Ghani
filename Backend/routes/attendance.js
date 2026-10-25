const express = require('express');
const router = express.Router();
const { checkIn, checkOut, getAttendance, getTodayAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.post('/check-in', protect, authorize('employee'), checkIn);
router.post('/check-out', protect, authorize('employee'), checkOut);
router.get('/', protect, getAttendance);
router.get('/today', protect, authorize('admin', 'hr'), getTodayAttendance);

module.exports = router;
