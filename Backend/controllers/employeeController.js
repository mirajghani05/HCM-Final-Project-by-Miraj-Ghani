const Employee = require('../models/Employee');
const User = require('../models/User');
const SalaryStructure = require('../models/SalaryStructure');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const csv = require('csv-parser');
const fs = require('fs');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

// Generate employee ID
const generateEmployeeId = async () => {
  const count = await Employee.countDocuments();
  return `EMP${String(count + 1).padStart(5, '0')}`;
};

exports.getAllEmployees = async (req, res) => {
  try {
    const { search, department, status, page = 1, limit = 10 } = req.query;
    const query = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) query.department = department;
    if (status) query.status = status;

    const employees = await Employee.find(query)
      .populate('department')
      .populate('designation')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Employee.countDocuments(query);

    res.json({ employees, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('department')
      .populate('designation');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmployee360 = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('department')
      .populate('designation');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const salary = await SalaryStructure.findOne({ employee: employee._id, isActive: true });
    const user = await User.findOne({ employeeId: employee._id });
    
    res.json({ employee, salary, user: user ? { email: user.email, isActive: user.isActive } : null });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const { email, password, basicSalary, ...empData } = req.body;
    
    const existingEmp = await Employee.findOne({ email });
    if (existingEmp) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    const employeeId = await generateEmployeeId();
    const employee = await Employee.create({ ...empData, email, employeeId });

    const tempPassword = password || Math.random().toString(36).slice(-8);
    await User.create({
      email,
      password: tempPassword,
      role: 'employee',
      employeeId: employee._id,
      firstName: empData.firstName,
      lastName: empData.lastName,
      mustChangePassword: true
    });

    if (basicSalary) {
      const basic = Number(basicSalary);
      const hra = basic * 0.40;
      const medicalAllowance = basic * 0.10;
      const gross = basic * 1.5;
      await SalaryStructure.create({
        employee: employee._id,
        basic,
        hra,
        medicalAllowance,
        gross,
        isActive: true
      });
    }

    const leaveTypes = await LeaveType.find({ isActive: true });
    const year = new Date().getFullYear();
    for (let lt of leaveTypes) {
      await LeaveBalance.create({
        employee: employee._id,
        year,
        leaveType: lt._id,
        quota: lt.quota,
        used: 0,
        remaining: lt.quota
      });
    }

    await employee.populate('department designation');
    res.status(201).json({ employee, tempPassword, message: 'Employee created successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('department')
      .populate('designation');
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.exportCSV = async (req, res) => {
  try {
    const employees = await Employee.find().populate('department').populate('designation');
    let csv = 'EmployeeID,FirstName,LastName,Email,Phone,Department,Designation,JoinDate,Status\n';
    employees.forEach(emp => {
      csv += `${emp.employeeId},${emp.firstName},${emp.lastName},${emp.email},${emp.phone || ''},${emp.department?.name || ''},${emp.designation?.title || ''},${emp.joinDate ? emp.joinDate.toISOString().split('T')[0] : ''},${emp.status}\n`;
    });
    res.header('Content-Type', 'text/csv');
    res.attachment('employees.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.employeeId) return res.status(400).json({ message: 'No employee record linked' });
    
    const employee = await Employee.findByIdAndUpdate(
      user.employeeId,
      { phone: req.body.phone, address: req.body.address },
      { new: true }
    ).populate('department designation');
    
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMeEmployee = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.employeeId) return res.status(400).json({ message: 'No employee record linked' });
    
    const employee = await Employee.findById(user.employeeId)
      .populate('department designation');
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
