const express = require('express');
const router = express.Router();
const { getAll, create, update, delete: deleteHoliday } = require('../controllers/holidayController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getAll)
  .post(protect, authorize('admin'), create);

router.route('/:id')
  .put(protect, authorize('admin'), update)
  .delete(protect, authorize('admin'), deleteHoliday);

module.exports = router;
