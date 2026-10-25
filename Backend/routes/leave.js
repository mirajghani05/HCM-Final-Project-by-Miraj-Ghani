const express = require('express');
const router = express.Router();
const { applyLeave, getLeaveRequests, approveLeave, rejectLeave, getBalances } = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

router.post('/apply', protect, authorize('employee'), applyLeave);
router.get('/', protect, getLeaveRequests);
router.get('/balances', protect, getBalances);
router.put('/:id/approve', protect, authorize('admin', 'hr'), approveLeave);
router.put('/:id/reject', protect, authorize('admin', 'hr'), rejectLeave);

module.exports = router;
