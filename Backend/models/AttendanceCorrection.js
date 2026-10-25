const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  requestedCheckIn: Date,
  requestedCheckOut: Date,
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewComment: String,
  reviewedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);
