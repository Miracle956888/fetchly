const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { leadSubmissionLimiter } = require('../middleware/rateLimiter');

// Public lead submission
router.post('/', leadSubmissionLimiter, leadController.submitLead);

module.exports = router;
