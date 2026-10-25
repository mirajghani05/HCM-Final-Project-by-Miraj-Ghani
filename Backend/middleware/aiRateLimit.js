const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { message: 'Too many AI requests, please try again later (20 requests per hour limit)' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = aiLimiter;
