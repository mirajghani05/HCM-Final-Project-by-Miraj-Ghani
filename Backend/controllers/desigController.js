const Designation = require('../models/Designation');
const Department = require('../models/Department');
const { sanitizePayload } = require('../utils/sanitize');

const DESIGNATION_RULES = {
  objectIds: [{ key: 'department', label: 'Department', model: Department }],
  strings: [{ key: 'title' }],
  required: [{ key: 'title', label: 'Title' }]
};

const handleError = (res, error) => {
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map((item) => item.message).join(', ');
    return res.status(400).json({ message });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${error.path}` });
  }
  return res.status(500).json({ message: error.message });
};

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
    const { data, error } = await sanitizePayload(req.body, DESIGNATION_RULES);
    if (error) return res.status(400).json({ message: error });

    const designation = await Designation.create(data);
    await designation.populate('department');
    res.status(201).json(designation);
  } catch (error) {
    handleError(res, error);
  }
};

exports.update = async (req, res) => {
  try {
    const { data, error } = await sanitizePayload(req.body, {
      ...DESIGNATION_RULES,
      required: []
    });
    if (error) return res.status(400).json({ message: error });

    const designation = await Designation.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true
    }).populate('department');
    if (!designation) return res.status(404).json({ message: 'Designation not found' });
    res.json(designation);
  } catch (error) {
    handleError(res, error);
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
