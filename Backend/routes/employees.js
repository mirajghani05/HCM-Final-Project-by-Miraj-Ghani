const express = require('express');
const router = express.Router();
const { getAllEmployees, getEmployee, getEmployee360, createEmployee, updateEmployee, exportCSV, updateMe, getMeEmployee } = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, authorize('admin', 'hr'), getAllEmployees)
  .post(protect, authorize('admin', 'hr'), createEmployee);

router.get('/me', protect, authorize('employee'), getMeEmployee);
router.put('/me/update', protect, authorize('employee'), updateMe);
router.get('/export', protect, authorize('admin', 'hr'), exportCSV);
router.get('/:id', protect, authorize('admin', 'hr'), getEmployee);
router.get('/:id/360', protect, authorize('admin', 'hr'), getEmployee360);
router.put('/:id', protect, authorize('admin', 'hr'), updateEmployee);

module.exports = router;
