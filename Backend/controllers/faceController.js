const User = require('../models/User');
const { enrollFace, getFaceStatus } = require('../services/faceService');

exports.enroll = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.employeeId) {
      return res.status(400).json({ message: 'No employee record linked' });
    }

    const result = await enrollFace(user.employeeId, req.body.descriptor);
    res.json({
      message: 'Face enrolled successfully',
      ...result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.status = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.employeeId) {
      return res.status(400).json({ message: 'No employee record linked' });
    }

    res.json(await getFaceStatus(user.employeeId));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
