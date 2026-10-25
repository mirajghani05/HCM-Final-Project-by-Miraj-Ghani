const Designation = require('../models/Designation');

exports.getAll = async (req, res) => {
  try {
    const designations = await Designation.find().populate('department').sort({ title: 1 });
    res.json(designations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const designation = await Designation.create(req.body);
    await designation.populate('department');
    res.status(201).json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const designation = await Designation.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('department');
    res.json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Designation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Designation deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
