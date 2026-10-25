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
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
