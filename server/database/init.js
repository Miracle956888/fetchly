const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT, 10) || 3306;
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'ict_lead_db';

const defaultCourses = [
  {
    name: 'Web Development',
    description: 'Master full-stack development with HTML5, CSS3, JavaScript, Node.js, Express, and MySQL. Build real-world client and enterprise web applications.',
    duration: '12 Weeks',
    category: 'Software Development',
    icon: 'code'
  },
  {
    name: 'Python Programming',
    description: 'From fundamental syntax to object-oriented programming, data structures, automation scripting, and backend web APIs with FastAPI & Django.',
    duration: '10 Weeks',
    category: 'Programming',
    icon: 'terminal'
  },
  {
    name: 'JavaScript',
    description: 'Deep dive into modern ES6+, asynchronous JavaScript, DOM manipulation, REST APIs, state management, and modern browser architectures.',
    duration: '8 Weeks',
    category: 'Software Development',
    icon: 'cpu'
  },
  {
    name: 'HTML & CSS',
    description: 'Build responsive, accessible, pixel-perfect user interfaces using modern CSS Grid, Flexbox, animations, and cross-device optimization techniques.',
    duration: '6 Weeks',
    category: 'Web Design',
    icon: 'layout'
  },
  {
    name: 'Graphics Design',
    description: 'Professional visual branding, typography, UI/UX prototyping in Figma, and graphic creation using Adobe Photoshop and Illustrator.',
    duration: '8 Weeks',
    category: 'Creative Arts',
    icon: 'pen-tool'
  },
  {
    name: 'Microsoft Office',
    description: 'Comprehensive office productivity suite training: Advanced Excel formulas & pivot tables, Word documents, PowerPoint presentations, and Access databases.',
    duration: '6 Weeks',
    category: 'Office Productivity',
    icon: 'file-text'
  },
  {
    name: 'Database Management',
    description: 'Relational database schema design, normalization, complex SQL querying, indexing, transactions, backup strategies, and MySQL / PostgreSQL administration.',
    duration: '8 Weeks',
    category: 'Database Administration',
    icon: 'database'
  },
  {
    name: 'Networking',
    description: 'CompTIA Network+ aligned hands-on training: IPv4/IPv6 subnetting, routing protocols, switches, VLANs, wireless networking, and firewall configurations.',
    duration: '10 Weeks',
    category: 'Infrastructure',
    icon: 'server'
  },
  {
    name: 'Cybersecurity',
    description: 'Information security fundamentals, penetration testing basics, network defense, threat analysis, cryptography, and secure system hardening.',
    duration: '12 Weeks',
    category: 'Security',
    icon: 'shield'
  },
  {
    name: 'Data Analysis',
    description: 'Data wrangling, exploratory analysis, Power BI business dashboards, SQL for analytics, and statistical insights with Python and Pandas.',
    duration: '10 Weeks',
    category: 'Data Science',
    icon: 'bar-chart'
  },
  {
    name: 'Other',
    description: 'Custom corporate ICT workshops, specialized technology electives, and tailored one-on-one technology mentorship tracks.',
    duration: 'Custom Duration',
    category: 'Specialized Track',
    icon: 'more-horizontal'
  }
];

const sampleLeads = [
  {
    full_name: 'Chinedu Okafor',
    phone: '08034567890',
    email: 'chinedu.okafor@gmail.com',
    course: 'Web Development',
    learning_mode: 'Physical',
    communication_method: 'WhatsApp',
    referral_source: 'Facebook',
    referral_other: null,
    status: 'New',
    notes: 'Inquired about weekend batches and tuition installment plan.'
  },
  {
    full_name: 'Amina Bello',
    phone: '08123456789',
    email: 'amina.bello@yahoo.com',
    course: 'Cybersecurity',
    learning_mode: 'Online',
    communication_method: 'Email',
    referral_source: 'Google',
    referral_other: null,
    status: 'Contacted',
    notes: 'Sent course brochure and syllabus. Follow up scheduled for Friday.'
  },
  {
    full_name: 'David Adeleke',
    phone: '07056789012',
    email: 'david.adeleke@outlook.com',
    course: 'Data Analysis',
    learning_mode: 'Physical',
    communication_method: 'Phone Call',
    referral_source: 'Friend or Family',
    referral_other: null,
    status: 'Interested',
    notes: 'Attended free preview seminar. Very keen on Power BI and SQL modules.'
  },
  {
    full_name: 'Blessing Emmanuel',
    phone: '09087654321',
    email: 'blessing.emmanuel@gmail.com',
    course: 'Python Programming',
    learning_mode: 'Online',
    communication_method: 'WhatsApp',
    referral_source: 'Instagram',
    referral_other: null,
    status: 'Enrolled',
    notes: 'Full tuition paid. Registered for the morning virtual cohort starting next month.'
  },
  {
    full_name: 'Oluwaseun Bakare',
    phone: '08091234567',
    email: 'seun.bakare@hotmail.com',
    course: 'Graphics Design',
    learning_mode: 'Physical',
    communication_method: 'WhatsApp',
    referral_source: 'WhatsApp',
    referral_other: null,
    status: 'Follow Up',
    notes: 'Wants to review portfolio of past graphic design trainees before deciding.'
  },
  {
    full_name: 'Fatima Aliyu',
    phone: '08187654321',
    email: 'fatima.aliyu@gmail.com',
    course: 'Networking',
    learning_mode: 'Physical',
    communication_method: 'Phone Call',
    referral_source: 'Other',
    referral_other: 'Campus Tech Fair Flyer',
    status: 'Contacted',
    notes: 'Spoke with admissions officer. Requested information on Cisco lab availability.'
  },
  {
    full_name: 'Ibrahim Musa',
    phone: '09123450987',
    email: 'ibrahim.musa@gmail.com',
    course: 'Microsoft Office',
    learning_mode: 'Online',
    communication_method: 'SMS',
    referral_source: 'Google',
    referral_other: null,
    status: 'New',
    notes: 'Looking for advanced Excel macros and dashboard training for corporate role.'
  },
  {
    full_name: 'Ngozi Eze',
    phone: '+2348039876543',
    email: 'ngozi.eze@techhub.ng',
    course: 'Database Management',
    learning_mode: 'Online',
    communication_method: 'Email',
    referral_source: 'Facebook',
    referral_other: null,
    status: 'Interested',
    notes: 'Has basic SQL background; wants advanced index tuning and database replication.'
  }
];

async function initializeDatabase() {
  console.log('[Init] Connecting to MySQL server...');
  
  // Connect without DB first to create database if needed
  const rootConn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword
  });

  try {
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`[Init] Database \`${dbName}\` ready.`);
  } finally {
    await rootConn.end();
  }

  // Connect to the specific database
  const db = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    multipleStatements: true
  });

  try {
    console.log('[Init] Executing schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schemaSql);
    console.log('[Init] Tables verified and created successfully.');

    // Seed Courses if empty
    const [courses] = await db.query('SELECT COUNT(*) as count FROM courses');
    if (courses[0].count === 0) {
      console.log('[Init] Seeding default ICT courses...');
      for (const course of defaultCourses) {
        await db.execute(
          'INSERT INTO courses (name, description, duration, category, icon, status) VALUES (?, ?, ?, ?, ?, ?)',
          [course.name, course.description, course.duration, course.category, course.icon, 'Active']
        );
      }
      console.log(`[Init] Successfully seeded ${defaultCourses.length} default courses.`);
    }

    // Seed Admin if empty
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ictacademy.org';
    const adminPass = process.env.ADMIN_PASSWORD || 'AdminPassword2026!';
    const adminName = process.env.ADMIN_NAME || 'ICT System Administrator';

    const [admins] = await db.execute('SELECT id FROM admins WHERE username = ? OR email = ?', [adminUser, adminEmail]);
    if (admins.length === 0) {
      console.log(`[Init] Creating default administrator (${adminUser})...`);
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(adminPass, salt);
      await db.execute(
        'INSERT INTO admins (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
        [adminUser, adminEmail, hash, adminName, 'Super Admin']
      );
      console.log(`[Init] Admin created: username="${adminUser}", password="${adminPass}"`);
    } else {
      console.log('[Init] Admin account already exists.');
    }

    // Seed sample leads if none exist
    const [leads] = await db.query('SELECT COUNT(*) as count FROM leads');
    if (leads[0].count === 0) {
      console.log('[Init] Seeding initial sample leads for demonstration...');
      for (const lead of sampleLeads) {
        const [res] = await db.execute(
          `INSERT INTO leads (full_name, phone, email, course, learning_mode, communication_method, referral_source, referral_other, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            lead.full_name,
            lead.phone,
            lead.email,
            lead.course,
            lead.learning_mode,
            lead.communication_method,
            lead.referral_source,
            lead.referral_other,
            lead.status,
            lead.notes
          ]
        );
        const leadId = res.insertId;
        await db.execute(
          'INSERT INTO lead_activities (lead_id, action_type, description, created_by) VALUES (?, ?, ?, ?)',
          [leadId, 'CREATED', `Lead submitted inquiry for ${lead.course}`, 'System']
        );
        if (lead.status !== 'New') {
          await db.execute(
            'INSERT INTO lead_activities (lead_id, action_type, description, created_by) VALUES (?, ?, ?, ?)',
            [leadId, 'STATUS_CHANGE', `Status updated to ${lead.status}`, 'Admin']
          );
        }
      }
      console.log(`[Init] Seeded ${sampleLeads.length} sample leads with activities.`);
    }

    console.log('[Init] Database initialization complete!');
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Init] Error initializing database:', err);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
