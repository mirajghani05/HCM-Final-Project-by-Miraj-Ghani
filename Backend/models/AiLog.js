const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userRole: String,
  query: String,
  toolsUsed: [String],
  response: String,
  tokens: Number,
  duration: Number
}, { timestamps: true });

module.exports = mongoose.model('AiLog', aiLogSchema);
