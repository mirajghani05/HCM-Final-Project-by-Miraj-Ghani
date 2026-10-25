const Announcement = require('../models/Announcement');

exports.getAnnouncements = async (req, res) => {
  try {
    const query = { isActive: true };
    if (req.user.role !== 'admin') {
      query.targetRoles = { $in: [req.user.role] };
    }
    const announcements = await Announcement.find(query).populate('postedBy', 'firstName lastName').sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.create({
      ...req.body,
      postedBy: req.user.id,
      targetRoles: req.body.targetRoles || ['admin', 'hr', 'employee']
    });
    await announcement.populate('postedBy', 'firstName lastName');
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
