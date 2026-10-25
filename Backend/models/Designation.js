const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Designation', designationSchema);
