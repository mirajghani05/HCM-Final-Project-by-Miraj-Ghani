const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
