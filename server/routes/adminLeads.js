const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { requireAdminAuth } = require('../middleware/auth');

// All routes here are protected by admin authentication
router.use(requireAdminAuth);

// Leads statistics & analytics
router.get('/stats', leadController.getLeadStats);

// Export leads as CSV
router.get('/export', leadController.exportLeadsCsv);

// Retrieve leads with pagination, search, filters
router.get('/', leadController.getLeads);

// Single lead details + activity timeline
router.get('/:id', leadController.getLeadById);

// Update lead info
router.put('/:id', leadController.updateLead);

// Update lead status
router.patch('/:id/status', leadController.updateLeadStatus);

// Add admin note to lead
router.post('/:id/notes', leadController.addLeadNote);

// Delete lead
router.delete('/:id', leadController.deleteLead);

module.exports = router;
