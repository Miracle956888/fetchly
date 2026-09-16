const { pool } = require('../database/connection');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@ictacademy.org';
  const password = process.env.ADMIN_PASSWORD || 'AdminPassword2026!';
  const fullName = process.env.ADMIN_NAME || 'ICT Academy Director';
  const role = 'Super Admin';

  try {
    const [existing] = await pool.execute(
      'SELECT id, username, email FROM admins WHERE username = ? OR email = ?',
      [username, email]
    );

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    if (existing.length > 0) {
      await pool.execute(
        'UPDATE admins SET password_hash = ?, full_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hash, fullName, role, existing[0].id]
      );
      console.log(`[Seed] Existing admin account "${username}" updated with password from .env.`);
    } else {
      await pool.execute(
        'INSERT INTO admins (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
        [username, email, hash, fullName, role]
      );
      console.log(`[Seed] New admin account created successfully: username="${username}"`);
    }

    console.log(`[Seed] Admin Email: ${email}`);
    console.log(`[Seed] Ready for login.`);
  } catch (err) {
    console.error('[Seed] Error seeding admin:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedAdmin();
