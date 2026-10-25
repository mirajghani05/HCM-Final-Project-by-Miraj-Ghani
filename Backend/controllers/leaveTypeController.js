const LeaveType = require('../models/LeaveType');

exports.getAll = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find().sort({ name: 1 });
    res.json(leaveTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const leaveType = await LeaveType.create(req.body);
    res.status(201).json(leaveType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const leaveType = await LeaveType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(leaveType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await LeaveType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Leave type deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
