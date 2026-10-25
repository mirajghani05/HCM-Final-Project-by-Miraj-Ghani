const express = require('express');
const router = express.Router();
const { getAll, create, update, delete: deleteDesig } = require('../controllers/desigController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getAll)
  .post(protect, authorize('admin', 'hr'), create);

router.route('/:id')
  .put(protect, authorize('admin', 'hr'), update)
  .delete(protect, authorize('admin'), deleteDesig);

module.exports = router;
