const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  officeStartTime: { type: String, default: '09:00' },
  graceMinutes: { type: Number, default: 15 },
  weekendDays: { type: [Number], default: [0, 6] },
  halfDayHours: { type: Number, default: 5 },
  officeLat: Number,
  officeLng: Number,
  officeRadius: { type: Number, default: 150 },
  setupComplete: { type: Boolean, default: false },
  locationMode: { type: String, enum: ['soft', 'strict'], default: 'soft' },
  faceMatchThreshold: { type: Number, default: 0.5 }
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', companySettingsSchema);

