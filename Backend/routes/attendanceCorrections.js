const express = require('express');
const router = express.Router();
const { requestCorrection, getCorrections, approveCorrection, rejectCorrection } = require('../controllers/attendanceCorrectionController');
const { protect, authorize } = require('../middleware/auth');

router.post('/request', protect, authorize('employee'), requestCorrection);
router.get('/', protect, getCorrections);
router.put('/:id/approve', protect, authorize('admin', 'hr'), approveCorrection);
router.put('/:id/reject', protect, authorize('admin', 'hr'), rejectCorrection);

module.exports = router;
