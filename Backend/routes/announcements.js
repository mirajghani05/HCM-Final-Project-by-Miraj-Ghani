const express = require('express');
const router = express.Router();
const { getAnnouncements, createAnnouncement } = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getAnnouncements)
  .post(protect, authorize('admin', 'hr'), createAnnouncement);

module.exports = router;
