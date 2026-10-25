const express = require('express');
const router = express.Router();
const { chat, smartLeave, summarize } = require('../ai/aiService');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { message: 'Too many AI requests, please try again later' }
});

router.post('/chat', protect, limiter, chat);
router.post('/smart-leave', protect, limiter, smartLeave);
router.post('/summarize', protect, limiter, summarize);

module.exports = router;
