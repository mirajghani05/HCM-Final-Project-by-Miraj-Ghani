const express = require('express');
const router = express.Router();
const { createPayrollRun, getPayrollRuns, getPayrollRun, finalizePayroll, getPayslip, getMyPayslips } = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getPayrollRuns)
  .post(protect, authorize('admin', 'hr'), createPayrollRun);

router.get('/my/payslips', protect, authorize('employee'), getMyPayslips);
router.get('/:id', protect, getPayrollRun);
router.put('/:id/finalize', protect, authorize('admin'), finalizePayroll);
router.get('/:runId/payslip', protect, getPayslip);
router.get('/:runId/payslip/:employeeId', protect, getPayslip);

module.exports = router;
