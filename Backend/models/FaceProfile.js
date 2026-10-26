const mongoose = require('mongoose');

const faceProfileSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true,
    index: true
  },
  descriptor: {
    type: [Number],
    required: true,
    select: false
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  lastVerifiedAt: Date,
  lastMatchDistance: Number
}, { timestamps: true });

module.exports = mongoose.model('FaceProfile', faceProfileSchema);
