const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const Employee = require('../models/Employee');
const Holiday = require('../models/Holiday');
const CompanySettings = require('../models/CompanySettings');
const User = require('../models/User');
const Notification = require('../models/Notification');

const isWeekend = (date, weekendDays = [0, 6]) => {
  return weekendDays.includes(date.getDay());
};

const calculateWorkingDays = async (startDate, endDate) => {
  const settings = await CompanySettings.findOne();
  const weekendDays = settings?.weekendDays || [0, 6];
  const holidays = await Holiday.find({ isActive: true });
  const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);
  
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (!isWeekend(current, weekendDays) && !holidayDates.includes(dateStr)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

exports.applyLeave = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.employeeId) return res.status(400).json({ message: 'No employee record linked' });
    
    const { leaveTypeId, startDate, endDate, reason } = req.body;
    
    // Check overlap
    const overlapping = await LeaveRequest.findOne({
      employee: user.employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
      ]
    });
    
    if (overlapping) {
      return res.status(422).json({ message: 'Leave request overlaps with existing leave' });
    }
    
    const workingDays = await calculateWorkingDays(startDate, endDate);
    const year = new Date(startDate).getFullYear();
    
    // Check balance
    const leaveType = await LeaveType.findById(leaveTypeId);
    if (leaveType && leaveType.name !== 'Unpaid') {
      const balance = await LeaveBalance.findOne({
        employee: user.employeeId,
        year,
        leaveType: leaveTypeId
      });
      
      if (!balance || balance.remaining < workingDays) {
        return res.status(422).json({ message: 'Insufficient leave balance' });
      }
    }
    
    const leaveRequest = await LeaveRequest.create({
      employee: user.employeeId,
      leaveType: leaveTypeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      workingDays,
      appliedBy: user._id
    });
    
    await leaveRequest.populate('leaveType employee');
    res.status(201).json(leaveRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLeaveRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    
    if (req.user.role === 'employee') {
      const user = await User.findById(req.user.id);
      query.employee = user.employeeId;
    }
    
    const leaves = await LeaveRequest.find(query)
      .populate('employee leaveType approvedBy appliedBy')
      .sort({ createdAt: -1 });
    
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id).populate('employee leaveType');
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });
    if (leaveRequest.status !== 'pending') return res.status(400).json({ message: 'Leave already processed' });
    
    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = req.user.id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.approvalComment = req.body.comment || '';
    await leaveRequest.save();
    
    // Update balance
    const leaveType = leaveRequest.leaveType;
    if (leaveType.name !== 'Unpaid') {
      const year = leaveRequest.startDate.getFullYear();
      const balance = await LeaveBalance.findOne({
        employee: leaveRequest.employee._id,
        year,
        leaveType: leaveType._id
      });
      if (balance) {
        balance.used += leaveRequest.workingDays;
        balance.remaining = balance.quota - balance.used;
        await balance.save();
      }
    }
    
    // Create notification
    const user = await User.findOne({ employeeId: leaveRequest.employee._id });
    if (user) {
      await Notification.create({
        user: user._id,
        title: 'Leave Approved',
        message: `Your leave request for ${leaveRequest.workingDays} day(s) has been approved.`,
        type: 'success'
      });
    }
    
    res.json({ message: 'Leave approved', leaveRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });
    if (leaveRequest.status !== 'pending') return res.status(400).json({ message: 'Leave already processed' });
    
    leaveRequest.status = 'rejected';
    leaveRequest.approvedBy = req.user.id;
    leaveRequest.approvedAt = new Date();
    leaveRequest.approvalComment = req.body.comment || '';
    await leaveRequest.save();
    
    const user = await User.findOne({ employeeId: leaveRequest.employee });
    if (user) {
      await Notification.create({
        user: user._id,
        title: 'Leave Rejected',
        message: `Your leave request has been rejected. ${req.body.comment || ''}`,
        type: 'error'
      });
    }
    
    res.json({ message: 'Leave rejected', leaveRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBalances = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.employeeId) return res.status(400).json({ message: 'No employee record linked' });
    
    const year = req.query.year || new Date().getFullYear();
    const balances = await LeaveBalance.find({ employee: user.employeeId, year }).populate('leaveType');
    res.json(balances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
