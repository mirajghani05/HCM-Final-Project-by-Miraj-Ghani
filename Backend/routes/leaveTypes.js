const express = require('express');
const router = express.Router();
const { getAll, create, update, delete: deleteLeaveType } = require('../controllers/leaveTypeController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getAll)
  .post(protect, authorize('admin'), create);

router.route('/:id')
  .put(protect, authorize('admin'), update)
  .delete(protect, authorize('admin'), deleteLeaveType);

module.exports = router;
