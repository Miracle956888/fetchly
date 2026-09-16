const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// Public endpoint: retrieve active courses for lead form & catalog
router.get('/', courseController.getActiveCourses);

module.exports = router;
