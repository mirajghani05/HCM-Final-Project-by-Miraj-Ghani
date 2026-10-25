const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true },
  workingDays: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalComment: String,
  approvedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
