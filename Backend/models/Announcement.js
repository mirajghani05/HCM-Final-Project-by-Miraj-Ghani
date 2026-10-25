const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetRoles: [{ type: String, enum: ['admin', 'hr', 'employee'] }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
