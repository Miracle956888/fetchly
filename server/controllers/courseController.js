const { pool } = require('../database/connection');

/**
 * Public: Get active courses for the lead form and courses section
 */
async function getActiveCourses(req, res) {
  try {
    const [courses] = await pool.query(
      `SELECT id, name, description, duration, category, icon, status
       FROM courses
       WHERE status = 'Active'
       ORDER BY name ASC`
    );

    return res.json({
      success: true,
      courses
    });
  } catch (err) {
    console.error('[Get Active Courses Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve available courses.'
    });
  }
}

/**
 * Admin: Get all courses with lead count metrics
 */
async function getAllCourses(req, res) {
  try {
    const [courses] = await pool.query(`
      SELECT c.id, c.name, c.description, c.duration, c.category, c.icon, c.status,
             c.created_at, c.updated_at,
             COUNT(l.id) as lead_count
      FROM courses c
      LEFT JOIN leads l ON l.course = c.name
      GROUP BY c.id
      ORDER BY c.status ASC, c.name ASC
    `);

    return res.json({
      success: true,
      courses
    });
  } catch (err) {
    console.error('[Get All Courses Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve courses.'
    });
  }
}

/**
 * Admin: Create a new course
 */
async function createCourse(req, res) {
  try {
    const { name, description, duration, category, icon, status = 'Active' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Course name is required.'
      });
    }

    const cleanName = name.trim();

    // Check duplicate name
    const [existing] = await pool.execute('SELECT id FROM courses WHERE name = ?', [cleanName]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A course with the name "${cleanName}" already exists.`
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO courses (name, description, duration, category, icon, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cleanName,
        description ? description.trim() : null,
        duration ? duration.trim() : '8 Weeks',
        category ? category.trim() : 'Technology',
        icon ? icon.trim() : 'code',
        status === 'Inactive' ? 'Inactive' : 'Active'
      ]
    );

    return res.status(201).json({
      success: true,
      message: `Course "${cleanName}" created successfully.`,
      course_id: result.insertId
    });
  } catch (err) {
    console.error('[Create Course Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create course.'
    });
  }
}

/**
 * Admin: Update course details
 */
async function updateCourse(req, res) {
  try {
    const { id } = req.params;
    const { name, description, duration, category, icon, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Course name is required.'
      });
    }

    const cleanName = name.trim();

    const [existing] = await pool.execute('SELECT id FROM courses WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.'
      });
    }

    // Check duplicate name with another course
    const [dup] = await pool.execute('SELECT id FROM courses WHERE name = ? AND id != ?', [cleanName, id]);
    if (dup.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Another course with the name "${cleanName}" already exists.`
      });
    }

    await pool.execute(
      `UPDATE courses
       SET name = ?,
           description = ?,
           duration = ?,
           category = ?,
           icon = ?,
           status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        cleanName,
        description ? description.trim() : null,
        duration ? duration.trim() : '8 Weeks',
        category ? category.trim() : 'Technology',
        icon ? icon.trim() : 'code',
        status === 'Inactive' ? 'Inactive' : 'Active',
        id
      ]
    );

    return res.json({
      success: true,
      message: `Course "${cleanName}" updated successfully.`
    });
  } catch (err) {
    console.error('[Update Course Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update course.'
    });
  }
}

/**
 * Admin: Toggle course status (Active / Inactive)
 */
async function toggleCourseStatus(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT id, name, status FROM courses WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.'
      });
    }

    const newStatus = existing[0].status === 'Active' ? 'Inactive' : 'Active';

    await pool.execute(
      'UPDATE courses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    );

    return res.json({
      success: true,
      message: `Course "${existing[0].name}" is now ${newStatus}.`,
      status: newStatus
    });
  } catch (err) {
    console.error('[Toggle Course Status Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update course status.'
    });
  }
}

/**
 * Admin: Delete or deactivate course
 */
async function deleteCourse(req, res) {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT id, name FROM courses WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.'
      });
    }

    // Check if there are leads attached to this course
    const [leads] = await pool.execute('SELECT COUNT(*) as count FROM leads WHERE course = ?', [existing[0].name]);
    if (leads[0].count > 0) {
      // Rather than deleting and corrupting lead history, set to Inactive
      await pool.execute("UPDATE courses SET status = 'Inactive' WHERE id = ?", [id]);
      return res.json({
        success: true,
        message: `Course has ${leads[0].count} existing inquiries and was deactivated instead of permanently deleted to preserve records.`
      });
    }

    await pool.execute('DELETE FROM courses WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: `Course "${existing[0].name}" deleted permanently.`
    });
  } catch (err) {
    console.error('[Delete Course Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete course.'
    });
  }
}

module.exports = {
  getActiveCourses,
  getAllCourses,
  createCourse,
  updateCourse,
  toggleCourseStatus,
  deleteCourse
};
