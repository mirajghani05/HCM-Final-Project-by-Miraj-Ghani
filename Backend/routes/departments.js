const express = require('express');
const router = express.Router();
const { getAll, create, update, delete: deleteDept } = require('../controllers/deptController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getAll)
  .post(protect, authorize('admin', 'hr'), create);

router.route('/:id')
  .put(protect, authorize('admin', 'hr'), update)
  .delete(protect, authorize('admin'), deleteDept);

module.exports = router;
