const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAdminAuth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

// Admin Authentication Routes
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAdminAuth, authController.me);

module.exports = router;
