const { pool } = require('../database/connection');
const { validateLeadSubmission, normalizePhone, VALID_STATUSES } = require('../utils/validator');

/**
 * Public: Submit a new lead
 */
async function submitLead(req, res) {
  try {
    const validation = validateLeadSubmission(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed. Please correct the highlighted errors.',
        errors: validation.errors
      });
    }

    const {
      full_name,
      phone,
      email,
      course,
      learning_mode,
      communication_method,
      referral_source,
      referral_other
    } = validation.sanitized;

    const normalized = normalizePhone(phone);

    // Intelligent duplicate check (same email or same phone)
    const [existingLeads] = await pool.execute(
      `SELECT id, full_name, email, phone, course, status, notes, created_at,
              TIMESTAMPDIFF(DAY, created_at, NOW()) as days_ago
       FROM leads
       WHERE email = ? OR phone = ? OR phone = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, phone, normalized]
    );

    let leadId;
    let isDuplicate = false;

    if (existingLeads.length > 0) {
      const existing = existingLeads[0];
      leadId = existing.id;
      isDuplicate = true;

      // Append note to existing record and update status if closed/not interested
      const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const updateNote = existing.notes
        ? `${existing.notes}\n[${timestampStr}] Re-inquired for: ${course} (${learning_mode}, Comm: ${communication_method}).`
        : `[${timestampStr}] Re-inquired for: ${course} (${learning_mode}, Comm: ${communication_method}).`;

      let updatedStatus = existing.status;
      if (existing.status === 'Closed' || existing.status === 'Not Interested') {
        updatedStatus = 'Follow Up';
      }

      await pool.execute(
        `UPDATE leads
         SET full_name = ?,
             phone = ?,
             course = ?,
             learning_mode = ?,
             communication_method = ?,
             status = ?,
             notes = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [full_name, phone, course, learning_mode, communication_method, updatedStatus, updateNote, leadId]
      );

      // Log timeline activity
      await pool.execute(
        `INSERT INTO lead_activities (lead_id, action_type, description, created_by)
         VALUES (?, ?, ?, ?)`,
        [
          leadId,
          'RE_INQUIRY',
          `Re-submitted inquiry for "${course}" (${learning_mode} learning, via ${communication_method}).`,
          'Visitor'
        ]
      );
    } else {
      // Insert new lead
      const [insertResult] = await pool.execute(
        `INSERT INTO leads (
          full_name, phone, email, course, learning_mode,
          communication_method, referral_source, referral_other,
          status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'New', ?)`,
        [
          full_name,
          phone,
          email,
          course,
          learning_mode,
          communication_method,
          referral_source,
          referral_other,
          `Initial inquiry for ${course} (${learning_mode} mode)`
        ]
      );

      leadId = insertResult.insertId;

      // Log creation in timeline
      await pool.execute(
        `INSERT INTO lead_activities (lead_id, action_type, description, created_by)
         VALUES (?, ?, ?, ?)`,
        [
          leadId,
          'CREATED',
          `Lead submitted registration for "${course}" via ${referral_source}${referral_other ? ` (${referral_other})` : ''}.`,
          'Visitor'
        ]
      );
    }

    return res.status(201).json({
      success: true,
      message: "Thank you! 🎉 Your details have been received. We’ll contact you shortly with more information about your selected ICT course.",
      lead_id: leadId,
      duplicate_detected: isDuplicate
    });
  } catch (err) {
    console.error('[Submit Lead Error]', err);
    return res.status(500).json({
      success: false,
      message: 'A temporary server error occurred. Please try submitting again.'
    });
  }
}

/**
 * Admin: Get leads with pagination, search, and filtering
 */
async function getLeads(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const {
      search,
      course,
      learning_mode,
      communication_method,
      referral_source,
      status,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const whereClauses = [];
    const params = [];

    // Search by Name, Phone, Email
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereClauses.push('(full_name LIKE ? OR phone LIKE ? OR email LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Filter by Course
    if (course && course.trim()) {
      whereClauses.push('course = ?');
      params.push(course.trim());
    }

    // Filter by Learning Mode
    if (learning_mode && learning_mode.trim()) {
      whereClauses.push('learning_mode = ?');
      params.push(learning_mode.trim());
    }

    // Filter by Communication Method
    if (communication_method && communication_method.trim()) {
      whereClauses.push('communication_method = ?');
      params.push(communication_method.trim());
    }

    // Filter by Referral Source
    if (referral_source && referral_source.trim()) {
      whereClauses.push('referral_source = ?');
      params.push(referral_source.trim());
    }

    // Filter by Status
    if (status && status.trim()) {
      whereClauses.push('status = ?');
      params.push(status.trim());
    }

    // Filter by Date Range
    if (startDate && startDate.trim()) {
      whereClauses.push('DATE(created_at) >= ?');
      params.push(startDate.trim());
    }
    if (endDate && endDate.trim()) {
      whereClauses.push('DATE(created_at) <= ?');
      params.push(endDate.trim());
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Validate sort column and order
    const allowedSortCols = ['id', 'full_name', 'email', 'phone', 'course', 'learning_mode', 'communication_method', 'status', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    // Count total query
    const countSql = `SELECT COUNT(*) as total FROM leads ${whereSQL}`;
    const [countResult] = await pool.execute(countSql, params);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch paginated records
    const leadsSql = `SELECT id, full_name, phone, email, course, learning_mode,
                             communication_method, referral_source, referral_other,
                             status, notes, created_at, updated_at
                      FROM leads
                      ${whereSQL}
                      ORDER BY ${safeSortBy} ${safeSortOrder}
                      LIMIT ${limit} OFFSET ${offset}`;

    const [leads] = await pool.execute(leadsSql, params);

    return res.json({
      success: true,
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages
      }
    });
  } catch (err) {
    console.error('[Get Leads Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leads.'
    });
  }
}

/**
 * Admin: Get Dashboard Metrics & Analytics Breakdown
 */
async function getLeadStats(req, res) {
  try {
    // 1. Total Leads
    const [totalRows] = await pool.query('SELECT COUNT(*) as count FROM leads');
    const totalLeads = totalRows[0].count;

    // 2. New Leads
    const [newRows] = await pool.query("SELECT COUNT(*) as count FROM leads WHERE status = 'New'");
    const newLeads = newRows[0].count;

    // 3. Contacted Leads
    const [contactedRows] = await pool.query("SELECT COUNT(*) as count FROM leads WHERE status = 'Contacted'");
    const contactedLeads = contactedRows[0].count;

    // 4. Enrolled Leads
    const [enrolledRows] = await pool.query("SELECT COUNT(*) as count FROM leads WHERE status = 'Enrolled'");
    const enrolledLeads = enrolledRows[0].count;

    // 5. Today's Leads
    const [todayRows] = await pool.query('SELECT COUNT(*) as count FROM leads WHERE DATE(created_at) = CURDATE()');
    const todayLeads = todayRows[0].count;

    // 6. This Week's Leads
    const [weekRows] = await pool.query('SELECT COUNT(*) as count FROM leads WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)');
    const thisWeekLeads = weekRows[0].count;

    // 7. Breakdown: Leads by Course
    const [byCourse] = await pool.query(`
      SELECT course, COUNT(*) as count
      FROM leads
      GROUP BY course
      ORDER BY count DESC
    `);

    // 8. Breakdown: Leads by Learning Mode
    const [byMode] = await pool.query(`
      SELECT learning_mode, COUNT(*) as count
      FROM leads
      GROUP BY learning_mode
    `);

    // 9. Breakdown: Leads by Referral Source
    const [byReferral] = await pool.query(`
      SELECT referral_source, COUNT(*) as count
      FROM leads
      GROUP BY referral_source
      ORDER BY count DESC
    `);

    // 10. Breakdown: Leads by Status
    const [byStatus] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM leads
      GROUP BY status
    `);

    // 11. Recent 5 Leads for quick dashboard preview
    const [recentLeads] = await pool.query(`
      SELECT id, full_name, phone, email, course, learning_mode, status, created_at
      FROM leads
      ORDER BY created_at DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      stats: {
        totalLeads,
        newLeads,
        contactedLeads,
        enrolledLeads,
        todayLeads,
        thisWeekLeads
      },
      analytics: {
        byCourse,
        byMode,
        byReferral,
        byStatus
      },
      recentLeads
    });
  } catch (err) {
    console.error('[Get Lead Stats Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics.'
    });
  }
}

/**
 * Admin: Get single lead profile with activity timeline
 */
async function getLeadById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT id, full_name, phone, email, course, learning_mode,
              communication_method, referral_source, referral_other,
              status, notes, created_at, updated_at
       FROM leads
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.'
      });
    }

    const lead = rows[0];

    // Fetch activities
    const [activities] = await pool.execute(
      `SELECT id, action_type, description, created_by, created_at
       FROM lead_activities
       WHERE lead_id = ?
       ORDER BY created_at DESC, id DESC`,
      [id]
    );

    return res.json({
      success: true,
      lead,
      activities
    });
  } catch (err) {
    console.error('[Get Lead By ID Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve lead details.'
    });
  }
}

/**
 * Admin: Update complete lead information
 */
async function updateLead(req, res) {
  try {
    const { id } = req.params;
    const {
      full_name,
      phone,
      email,
      course,
      learning_mode,
      communication_method,
      referral_source,
      referral_other,
      status,
      notes
    } = req.body;

    const [existing] = await pool.execute('SELECT id, status FROM leads WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.'
      });
    }

    const oldStatus = existing[0].status;

    await pool.execute(
      `UPDATE leads
       SET full_name = ?,
           phone = ?,
           email = ?,
           course = ?,
           learning_mode = ?,
           communication_method = ?,
           referral_source = ?,
           referral_other = ?,
           status = ?,
           notes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        full_name,
        phone,
        email,
        course,
        learning_mode,
        communication_method,
        referral_source,
        referral_other || null,
        status,
        notes || null,
        id
      ]
    );

    // Log update activity
    let actDesc = 'Admin updated lead profile information.';
    if (oldStatus !== status) {
      actDesc = `Admin changed status from "${oldStatus}" to "${status}".`;
    }

    await pool.execute(
      'INSERT INTO lead_activities (lead_id, action_type, description, created_by) VALUES (?, ?, ?, ?)',
      [id, 'EDITED', actDesc, req.admin?.username || 'Admin']
    );

    return res.json({
      success: true,
      message: 'Lead updated successfully.'
    });
  } catch (err) {
    console.error('[Update Lead Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update lead.'
    });
  }
}

/**
 * Admin: Update lead status
 */
async function updateLeadStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const [existing] = await pool.execute('SELECT id, status FROM leads WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.'
      });
    }

    const oldStatus = existing[0].status;
    if (oldStatus === status) {
      return res.json({
        success: true,
        message: 'Status is already set to ' + status
      });
    }

    await pool.execute(
      'UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    await pool.execute(
      'INSERT INTO lead_activities (lead_id, action_type, description, created_by) VALUES (?, ?, ?, ?)',
      [id, 'STATUS_CHANGE', `Admin changed status from "${oldStatus}" to "${status}".`, req.admin?.username || 'Admin']
    );

    return res.json({
      success: true,
      message: `Lead status updated to ${status}.`
    });
  } catch (err) {
    console.error('[Update Status Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update status.'
    });
  }
}

/**
 * Admin: Add note to lead
 */
async function addLeadNote(req, res) {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide note text.'
      });
    }

    const [existing] = await pool.execute('SELECT id, notes FROM leads WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.'
      });
    }

    const cleanNote = note.trim();
    const adminUser = req.admin?.username || 'Admin';
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newNotesField = existing[0].notes
      ? `${existing[0].notes}\n[${timestampStr} - ${adminUser}]: ${cleanNote}`
      : `[${timestampStr} - ${adminUser}]: ${cleanNote}`;

    await pool.execute(
      'UPDATE leads SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newNotesField, id]
    );

    await pool.execute(
      'INSERT INTO lead_activities (lead_id, action_type, description, created_by) VALUES (?, ?, ?, ?)',
      [id, 'NOTE_ADDED', `Admin note added: "${cleanNote}"`, adminUser]
    );

    return res.json({
      success: true,
      message: 'Note added successfully.',
      notes: newNotesField
    });
  } catch (err) {
    console.error('[Add Note Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to add note.'
    });
  }
}

/**
 * Admin: Delete lead
 */
async function deleteLead(req, res) {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT id, full_name FROM leads WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.'
      });
    }

    await pool.execute('DELETE FROM leads WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: `Lead "${existing[0].full_name}" deleted successfully.`
    });
  } catch (err) {
    console.error('[Delete Lead Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete lead.'
    });
  }
}

/**
 * Helper to escape CSV values according to RFC 4180
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Admin: Export leads to CSV with filtering support
 */
async function exportLeadsCsv(req, res) {
  try {
    const {
      search,
      course,
      learning_mode,
      communication_method,
      referral_source,
      status,
      startDate,
      endDate
    } = req.query;

    const whereClauses = [];
    const params = [];

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereClauses.push('(full_name LIKE ? OR phone LIKE ? OR email LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (course && course.trim()) {
      whereClauses.push('course = ?');
      params.push(course.trim());
    }
    if (learning_mode && learning_mode.trim()) {
      whereClauses.push('learning_mode = ?');
      params.push(learning_mode.trim());
    }
    if (communication_method && communication_method.trim()) {
      whereClauses.push('communication_method = ?');
      params.push(communication_method.trim());
    }
    if (referral_source && referral_source.trim()) {
      whereClauses.push('referral_source = ?');
      params.push(referral_source.trim());
    }
    if (status && status.trim()) {
      whereClauses.push('status = ?');
      params.push(status.trim());
    }
    if (startDate && startDate.trim()) {
      whereClauses.push('DATE(created_at) >= ?');
      params.push(startDate.trim());
    }
    if (endDate && endDate.trim()) {
      whereClauses.push('DATE(created_at) <= ?');
      params.push(endDate.trim());
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `SELECT id, full_name, phone, email, course, learning_mode,
                        communication_method, referral_source, referral_other,
                        status, notes, created_at
                 FROM leads
                 ${whereSQL}
                 ORDER BY created_at DESC`;

    const [leads] = await pool.execute(sql, params);

    // Build CSV
    const headers = [
      'ID',
      'Full Name',
      'Phone',
      'Email',
      'Course',
      'Learning Mode',
      'Communication Method',
      'Referral Source',
      'Referral Details',
      'Status',
      'Notes',
      'Date Submitted'
    ];

    const lines = [headers.map(escapeCsv).join(',')];

    for (const lead of leads) {
      lines.push([
        escapeCsv(lead.id),
        escapeCsv(lead.full_name),
        escapeCsv(lead.phone),
        escapeCsv(lead.email),
        escapeCsv(lead.course),
        escapeCsv(lead.learning_mode),
        escapeCsv(lead.communication_method),
        escapeCsv(lead.referral_source),
        escapeCsv(lead.referral_other || ''),
        escapeCsv(lead.status),
        escapeCsv(lead.notes || ''),
        escapeCsv(lead.created_at)
      ].join(','));
    }

    const csvContent = lines.join('\r\n');
    const timestamp = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ict_leads_${timestamp}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('[Export CSV Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to export CSV.'
    });
  }
}

module.exports = {
  submitLead,
  getLeads,
  getLeadStats,
  getLeadById,
  updateLead,
  updateLeadStatus,
  addLeadNote,
  deleteLead,
  exportLeadsCsv
};
