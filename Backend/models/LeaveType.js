const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Annual, Sick, Casual, Unpaid
  quota: { type: Number, default: 0 },
  isPaid: { type: Boolean, default: true },
  description: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
