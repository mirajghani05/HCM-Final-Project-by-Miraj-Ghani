const express = require('express');
const router = express.Router();
const { getAdminDashboard, getHRDashboard, getEmployeeDashboard } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.get('/admin', protect, authorize('admin'), getAdminDashboard);
router.get('/hr', protect, authorize('hr'), getHRDashboard);
router.get('/employee', protect, authorize('employee'), getEmployeeDashboard);

module.exports = router;
