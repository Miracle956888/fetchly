const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { requireAdminAuth } = require('../middleware/auth');

// All routes here are protected by admin authentication
router.use(requireAdminAuth);

// Get all courses (Active & Inactive)
router.get('/', courseController.getAllCourses);

// Create new course
router.post('/', courseController.createCourse);

// Update course
router.put('/:id', courseController.updateCourse);

// Toggle active/inactive status
router.patch('/:id/status', courseController.toggleCourseStatus);

// Delete/deactivate course
router.delete('/:id', courseController.deleteCourse);

module.exports = router;
