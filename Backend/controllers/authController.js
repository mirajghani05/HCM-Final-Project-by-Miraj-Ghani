const User = require('../models/User');
const CompanySettings = require('../models/CompanySettings');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Check if first run setup needed
exports.checkFirstRun = async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    const settings = await CompanySettings.findOne();
    res.json({
      needsSetup: adminCount === 0,
      setupComplete: settings?.setupComplete || false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// First run setup - create company and admin
exports.firstRunSetup = async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const { companyName, adminEmail, adminPassword, firstName, lastName } = req.body;

    if (!companyName || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Create company settings
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create({
        companyName,
        setupComplete: true
      });
    } else {
      settings.companyName = companyName;
      settings.setupComplete = true;
      await settings.save();
    }

    // Create admin user
    const admin = await User.create({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      firstName,
      lastName,
      mustChangePassword: false
    });

    res.status(201).json({
      message: 'Setup completed successfully',
      token: generateToken(admin._id),
      user: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        firstName: admin.firstName,
        lastName: admin.lastName
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).populate('employeeId');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password required' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password incorrect' });
      }
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('employeeId');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
