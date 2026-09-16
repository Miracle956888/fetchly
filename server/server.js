const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { pool, testConnection } = require('./database/connection');
const { initializeDatabase } = require('./database/init');

// Import routes
const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const adminLeadsRoutes = require('./routes/adminLeads');
const coursesRoutes = require('./routes/courses');
const adminCoursesRoutes = require('./routes/adminCourses');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '0.0.0.0';

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows inline SVG/icons, fonts, and styles for clean UI
    crossOriginEmbedderPolicy: false
  })
);

// Enable CORS
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// Body Parsing & Cookies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Request logger for debugging & audits
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/courses', coursesRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin/leads', adminLeadsRoutes);
app.use('/api/admin/courses', adminCoursesRoutes);

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1 as healthy');
    return res.json({
      status: 'ok',
      service: 'ICT Lead Generation System',
      database: result[0].healthy === 1 ? 'healthy' : 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(503).json({
      status: 'error',
      service: 'ICT Lead Generation System',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Static Assets - Public Landing Page
app.use(express.static(path.join(__dirname, '../public')));

// Static Assets - Admin Dashboard
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// Friendly Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/admin', (req, res) => {
  res.redirect('/admin/dashboard');
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/dashboard.html'));
});

app.get('/admin/leads', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/leads.html'));
});

app.get('/admin/courses', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/courses.html'));
});

app.get('/admin/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/analytics.html'));
});

// 404 Handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Catch-all 404 for web
app.use((req, res) => {
  if (req.path.startsWith('/admin')) {
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/');
  }
});

// Global Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred on the server.' 
      : err.message || 'Internal Server Error'
  });
});

// Server Initialization
async function startServer() {
  try {
    console.log('[Server] Checking and initializing database schema...');
    await initializeDatabase();
    await testConnection();

    app.listen(PORT, HOST, () => {
      console.log(`====================================================`);
      console.log(` ICT Lead Generation System is running!`);
      console.log(` Public Portal:   http://${HOST}:${PORT}/`);
      console.log(` Admin Dashboard: http://${HOST}:${PORT}/admin/login`);
      console.log(` API Endpoint:    http://${HOST}:${PORT}/api/leads`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('[Fatal] Server failed to start:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
