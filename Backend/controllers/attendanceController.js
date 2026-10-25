const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const CompanySettings = require('../models/CompanySettings');
const User = require('../models/User');

const isWeekend = (date, weekendDays = [0, 6]) => {
  return weekendDays.includes(date.getDay());
};

exports.checkIn = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.employeeId) return res.status(400).json({ message: 'No employee record linked' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existing = await Attendance.findOne({ employee: user.employeeId, date: today });
    if (existing && existing.checkIn) {
      return res.status(409).json({ message: 'Already checked in for today' });
    }

    const settings = await CompanySettings.findOne();
    const now = new Date();
    const officeStart = settings?.officeStartTime || '09:00';
    const [startHour, startMin] = officeStart.split(':').map(Number);
    const graceMin = settings?.graceMinutes || 15;
    
    const officeStartTime = new Date(today);
    officeStartTime.setHours(startHour, startMin + graceMin, 0, 0);
    
    let status = 'present';
    if (now > officeStartTime) {
      status = 'late';
    }

    let attendance;
    if (existing) {
      existing.checkIn = now;
      existing.status = status;
      existing.source = req.body.source || 'web';
      attendance = await existing.save();
    } else {
      attendance = await Attendance.create({
        employee: user.employeeId,
        date: today,
        checkIn: now,
        status,
        source: req.body.source || 'web'
      });
    }

    res.json({ message: 'Checked in successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.employeeId) return res.status(400).json({ message: 'No employee record linked' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({ employee: user.employeeId, date: today });
    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ message: 'No check-in record found for today' });
    }
    if (attendance.checkOut) {
      return res.status(400).json({ message: 'Already checked out' });
    }

    const settings = await CompanySettings.findOne();
    const now = new Date();
    attendance.checkOut = now;
    
    const hoursWorked = (now - attendance.checkIn) / (1000 * 60 * 60);
    attendance.hoursWorked = Math.round(hoursWorked * 100) / 100;
    
    const halfDayHours = settings?.halfDayHours || 5;
    if (hoursWorked < halfDayHours) {
      attendance.status = 'half_day';
    }
    
    await attendance.save();
    res.json({ message: 'Checked out successfully', attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, page = 1, limit = 30 } = req.query;
    const query = {};
    
    if (req.user.role === 'employee') {
      const user = await User.findById(req.user.id);
      query.employee = user.employeeId;
    } else if (employeeId) {
      query.employee = employeeId;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .populate('employee')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);
    res.json({ attendance, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance = await Attendance.find({ date: today }).populate('employee');
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
