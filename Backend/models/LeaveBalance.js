const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  year: { type: Number, required: true },
  leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
  quota: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 }
}, { timestamps: true });

leaveBalanceSchema.index({ employee: 1, year: 1, leaveType: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
