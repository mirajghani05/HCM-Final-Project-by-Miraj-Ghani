const express = require('express');
const router = express.Router();
const { createHR, getUsers, resetPassword, toggleUserStatus } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.route('/').get(protect, authorize('admin'), getUsers);
router.post('/hr', protect, authorize('admin'), createHR);
router.put('/:id/reset-password', protect, authorize('admin'), resetPassword);
router.put('/:id/toggle-status', protect, authorize('admin'), toggleUserStatus);

module.exports = router;
