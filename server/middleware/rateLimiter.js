const rateLimit = require('express-rate-limit');

// Public lead submission limiter: allows up to 15 submissions per 15 minutes per IP
const leadSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many inquiries submitted from this connection. Please wait a few minutes before trying again.'
  }
});

// Admin login brute-force limiter: allows up to 10 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 15 minutes before trying again.'
  }
});

module.exports = {
  leadSubmissionLimiter,
  loginLimiter
};
