const express = require('express');
const router = express.Router();
const { importDryRun, importCommit } = require('../controllers/employeeImportController');
const { protect, authorize } = require('../middleware/auth');

router.post('/dry-run', protect, authorize('admin', 'hr'), importDryRun);
router.post('/commit', protect, authorize('admin', 'hr'), importCommit);

module.exports = router;
