const User = require('../models/User');
const CompanySettings = require('../models/CompanySettings');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const getPasswordError = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return 'Password must include both uppercase and lowercase letters';
  }
  if (!/\d/.test(password)) {
    return 'Password must include at least one number';
  }
  return null;
};

// Check if first run setup needed
exports.checkFirstRun = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const settings = await CompanySettings.findOne();
    res.json({
      needsSetup: userCount === 0,
      setupComplete: settings?.setupComplete || false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// First run setup - create company and admin
exports.firstRunSetup = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(400).json({ message: 'Setup already completed' });
    }

    const { companyName, adminEmail, adminPassword, firstName, lastName, email, password } = req.body;

    const companyNameValue = companyName || req.body.company || req.body.companyName;
    const adminEmailValue = adminEmail || email;
    const adminPasswordValue = adminPassword || password;

    if (!companyNameValue || !adminEmailValue || !adminPasswordValue) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const passwordError = getPasswordError(adminPasswordValue);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create({
        companyName: companyNameValue,
        setupComplete: true
      });
    } else {
      settings.companyName = companyNameValue;
      settings.setupComplete = true;
      await settings.save();
    }

    const admin = await User.create({
      email: adminEmailValue,
      password: adminPasswordValue,
      role: 'admin',
      firstName: firstName || '',
      lastName: lastName || '',
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

const getNewPasswordError = (newPassword) => {
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return 'New password must be at least 8 characters long';
  }
  if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword)) {
    return 'New password must include both uppercase and lowercase letters';
  }
  if (!/\d/.test(newPassword)) {
    return 'New password must include at least one number';
  }
  return null;
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newPasswordError = getNewPasswordError(newPassword);
    if (newPasswordError) {
      return res.status(400).json({ message: newPasswordError });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password changed successfully', mustChangePassword: false });
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
