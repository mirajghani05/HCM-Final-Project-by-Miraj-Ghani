const CompanySettings = require('../models/CompanySettings');

exports.getSettings = async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create({ companyName: 'My Company' });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create(req.body);
    } else {
      const allowed = ['companyName', 'officeStartTime', 'graceMinutes', 'weekendDays', 'halfDayHours', 'officeLat', 'officeLng', 'officeRadius', 'setupComplete', 'locationMode', 'faceMatchThreshold'];
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          settings[key] = req.body[key];
        }
      }
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

