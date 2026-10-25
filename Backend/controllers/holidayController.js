const Holiday = require('../models/Holiday');

exports.getAll = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const holiday = await Holiday.create(req.body);
    res.status(201).json(holiday);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(holiday);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ message: 'Holiday deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
