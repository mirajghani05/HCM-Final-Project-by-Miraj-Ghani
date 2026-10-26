const express = require('express');
const router = express.Router();
const { enroll, status } = require('../controllers/faceController');
const { protect, authorize } = require('../middleware/auth');

router.get('/status', protect, authorize('employee'), status);
router.post('/enroll', protect, authorize('employee'), enroll);

module.exports = router;
