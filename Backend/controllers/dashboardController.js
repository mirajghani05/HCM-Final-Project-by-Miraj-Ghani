const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const PayrollRun = require('../models/PayrollRun');
const User = require('../models/User');
const { startOfMonth, endOfMonth } = require('date-fns');

exports.getAdminDashboard = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments({ status: { $in: ['active', 'probation'] } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const presentToday = await Attendance.countDocuments({ date: today, status: { $in: ['present', 'late', 'half_day'] } });
    const onLeaveToday = await LeaveRequest.countDocuments({
      status: 'approved',
      startDate: { $lte: today },
      endDate: { $gte: today }
    });
    
    // Payroll cost this month
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const payrollRun = await PayrollRun.findOne({ month: currentMonth, year: currentYear, status: 'finalized' });
    const payrollCost = payrollRun ? payrollRun.totalGross : 0;
    
    // Employees by department
    const byDept = await Employee.aggregate([
      { $match: { status: { $in: ['active', 'probation'] } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } }
    ]);
    
    res.json({
      kpis: { totalEmployees, presentToday, onLeaveToday, payrollCost },
      employeesByDepartment: byDept
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getHRDashboard = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments({ status: { $in: ['active', 'probation'] } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const presentToday = await Attendance.countDocuments({ date: today, status: { $in: ['present', 'late'] } });
    const lateToday = await Attendance.countDocuments({ date: today, status: 'late' });
    const onLeaveToday = await LeaveRequest.countDocuments({
      status: 'approved',
      startDate: { $lte: today },
      endDate: { $gte: today }
    });
    const pendingLeaves = await LeaveRequest.countDocuments({ status: 'pending' });
    
    res.json({
      kpis: { totalEmployees, presentToday, lateToday, onLeaveToday, pendingLeaves }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmployeeDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.employeeId) return res.status(400).json({ message: 'No employee record linked' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendanceToday = await Attendance.findOne({ employee: user.employeeId, date: today });
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const weekAttendance = await Attendance.find({
      employee: user.employeeId,
      date: { $gte: startOfWeek, $lte: today }
    });
    
    let hoursThisWeek = 0;
    weekAttendance.forEach(a => { if (a.hoursWorked) hoursThisWeek += a.hoursWorked; });
    
    const year = today.getFullYear();
    const LeaveBalance = require('../models/LeaveBalance');
    const balances = await LeaveBalance.find({ employee: user.employeeId, year }).populate('leaveType');
    
    res.json({
      attendanceToday,
      hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
      leaveBalances: balances
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
