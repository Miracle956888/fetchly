const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/connection');
const { JWT_SECRET } = require('../middleware/auth');

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password.'
      });
    }

    const cleanIdentifier = String(username).trim();
    const cleanPassword = String(password);

    const [rows] = await pool.execute(
      'SELECT id, username, email, password_hash, full_name, role FROM admins WHERE username = ? OR email = ? LIMIT 1',
      [cleanIdentifier, cleanIdentifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.'
      });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(cleanPassword, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username/email or password.'
      });
    }

    // Update last login
    await pool.execute('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [admin.id]);

    // Create JWT
    const payload = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      full_name: admin.full_name,
      role: admin.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    // Set cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      admin: payload
    });
  } catch (err) {
    console.error('[Auth Error]', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during authentication.'
    });
  }
}

async function logout(req, res) {
  res.clearCookie('admin_token');
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
}

async function me(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, full_name, role, last_login, created_at FROM admins WHERE id = ?',
      [req.admin.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found.'
      });
    }

    return res.json({
      success: true,
      admin: rows[0]
    });
  } catch (err) {
    console.error('[Admin Me Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve admin profile.'
    });
  }
}

module.exports = {
  login,
  logout,
  me
};
