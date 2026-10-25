const PayrollRun = require('../models/PayrollRun');
const SalaryStructure = require('../models/SalaryStructure');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const CompanySettings = require('../models/CompanySettings');
const User = require('../models/User');
const pdfkit = require('pdfkit');

const calculateTax = (annualGross) => {
  if (annualGross <= 600000) return 0;
  if (annualGross <= 1200000) return (annualGross - 600000) * 0.05;
  if (annualGross <= 2400000) return 30000 + (annualGross - 1200000) * 0.15;
  if (annualGross <= 3600000) return 30000 + 180000 + (annualGross - 2400000) * 0.25;
  return 30000 + 180000 + 300000 + (annualGross - 3600000) * 0.35;
};

exports.getMyPayslips = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.employeeId) return res.status(400).json({ message: 'No employee record linked' });
    
    const runs = await PayrollRun.find({ status: 'finalized' }).sort({ year: -1, month: -1 });
    const payslips = [];
    
    for (let run of runs) {
      const item = run.items.find(i => i.employee.toString() === user.employeeId.toString());
      if (item) {
        payslips.push({
          runId: run._id,
          month: run.month,
          year: run.year,
          netPay: item.netPay,
          gross: item.gross
        });
      }
    }
    
    res.json(payslips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPayrollRun = async (req, res) => {
  try {
    const { month, year } = req.body;
    
    const existing = await PayrollRun.findOne({ month, year });
    if (existing) {
      return res.status(400).json({ message: 'Payroll run already exists for this month' });
    }
    
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month - 1, i);
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
    }
    
    const employees = await Employee.find({ status: { $in: ['active', 'probation'] } });
    const items = [];
    
    for (let emp of employees) {
      const salary = await SalaryStructure.findOne({ employee: emp._id, isActive: true });
      if (!salary) continue;
      
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      const attendance = await Attendance.find({
        employee: emp._id,
        date: { $gte: startDate, $lte: endDate }
      });
      
      let absentDays = 0;
      let halfDays = 0;
      let lateCount = 0;
      attendance.forEach(a => {
        if (a.status === 'absent') absentDays++;
        if (a.status === 'half_day') halfDays++;
        if (a.status === 'late') lateCount++;
      });
      
      let latePenaltyDays = 0;
      if (lateCount >= 3) {
        latePenaltyDays = Math.floor(lateCount / 3) * 0.5;
      }
      
      const unpaidLeaves = await LeaveRequest.find({
        employee: emp._id,
        status: 'approved',
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }).populate('leaveType');
      
      let unpaidLeaveDays = 0;
      unpaidLeaves.forEach(leave => {
        if (leave.leaveType && leave.leaveType.name === 'Unpaid') {
          unpaidLeaveDays += leave.workingDays;
        }
      });
      
      const gross = salary.gross || salary.basic * 1.5;
      const perDay = gross / (workingDays || 1);
      const deductions = perDay * (absentDays + unpaidLeaveDays + 0.5 * halfDays + latePenaltyDays);
      const annualGross = gross * 12;
      const annualTax = calculateTax(annualGross);
      const tax = annualTax / 12;
      const netPay = gross - deductions - tax;
      
      items.push({
        employee: emp._id,
        basic: salary.basic,
        gross,
        absentDays,
        unpaidLeaveDays,
        halfDays,
        lateCount,
        latePenaltyDays,
        deductions: Math.round(deductions),
        tax: Math.round(tax),
        netPay: Math.round(netPay),
        presentDays: workingDays - absentDays - unpaidLeaveDays - Math.floor(halfDays)
      });
    }
    
    const totalGross = items.reduce((sum, i) => sum + i.gross, 0);
    const totalNet = items.reduce((sum, i) => sum + i.netPay, 0);
    
    const payrollRun = await PayrollRun.create({
      month,
      year,
      workingDays,
      items,
      totalGross,
      totalNet,
      createdBy: req.user.id,
      status: 'draft'
    });
    
    await payrollRun.populate('items.employee createdBy');
    res.status(201).json(payrollRun);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPayrollRuns = async (req, res) => {
  try {
    const runs = await PayrollRun.find().populate('createdBy finalizedBy').sort({ year: -1, month: -1 });
    res.json(runs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPayrollRun = async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id).populate('items.employee createdBy finalizedBy');
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    res.json(run);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.finalizePayroll = async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (run.status === 'finalized') return res.status(400).json({ message: 'Already finalized' });
    
    run.status = 'finalized';
    run.finalizedBy = req.user.id;
    run.finalizedAt = new Date();
    await run.save();
    
    res.json({ message: 'Payroll finalized', run });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPayslip = async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.runId).populate('items.employee');
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (run.status !== 'finalized') return res.status(400).json({ message: 'Payroll not finalized' });
    
    const user = await User.findById(req.user.id);
    let item;
    
    if (req.user.role === 'employee') {
      item = run.items.find(i => i.employee._id.toString() === user.employeeId.toString());
    } else {
      item = run.items.find(i => i.employee._id.toString() === req.params.employeeId);
    }
    
    if (!item) return res.status(404).json({ message: 'Payslip not found' });
    
    res.json({
      run: { month: run.month, year: run.year },
      employee: item.employee,
      earnings: { basic: item.basic, gross: item.gross },
      deductions: { absent: item.absentDays || 0, unpaidLeave: item.unpaidLeaveDays || 0, halfDays: item.halfDays || 0, tax: item.tax || 0, total: item.deductions || 0 },
      netPay: item.netPay,
      workingDays: run.workingDays
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
