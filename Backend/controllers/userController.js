const User = require('../models/User');
const Employee = require('../models/Employee');
const SalaryStructure = require('../models/SalaryStructure');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveType = require('../models/LeaveType');
const bcrypt = require('bcryptjs');
const { sanitizePayload } = require('../utils/sanitize');

const HR_PAYLOAD_RULES = {
  strings: [
    { key: 'email' },
    { key: 'firstName' },
    { key: 'lastName' }
  ],
  required: [
    { key: 'email', label: 'Email' },
    { key: 'password', label: 'Password' },
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' }
  ],
  protectedFields: ['_id', '__v', 'role', 'employeeId', 'createdAt', 'updatedAt']
};

exports.createHR = async (req, res) => {
  try {
    const { data, error } = await sanitizePayload(req.body, HR_PAYLOAD_RULES);
    if (error) return res.status(400).json({ message: error });

    const { email, password, firstName, lastName } = data;
    const normalizedEmail = email.toLowerCase();

    if (String(password).trim().length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hr = await User.create({
      email: normalizedEmail,
      password,
      role: 'hr',
      firstName,
      lastName,
      mustChangePassword: true
    });

    res.status(201).json({
      message: 'HR user created',
      user: { id: hr._id, email: hr.email, role: hr.role, firstName: hr.firstName, lastName: hr.lastName }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map((item) => item.message).join(', ');
      return res.status(400).json({ message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('employeeId').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const tempPassword = Math.random().toString(36).slice(-8);
    user.password = tempPassword;
    user.mustChangePassword = true;
    await user.save();
    
    res.json({ message: 'Password reset', tempPassword });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
