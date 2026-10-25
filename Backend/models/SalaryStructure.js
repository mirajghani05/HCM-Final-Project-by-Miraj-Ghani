const mongoose = require('mongoose');

const salaryStructureSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  basic: { type: Number, required: true },
  hra: { type: Number, default: 0 },
  medicalAllowance: { type: Number, default: 0 },
  otherAllowances: { type: Number, default: 0 },
  gross: { type: Number, required: true },
  effectiveDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
