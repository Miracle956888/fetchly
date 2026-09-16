# Apex ICT Academy - Full-Stack Lead Generation System

A complete, production-ready **ICT Course Lead Generation Website and Lead Management System** built with HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js, and MySQL.

---

## 1. Project Overview

The **Apex ICT Lead Generation System** is an end-to-end platform engineered for technology training institutes and coding academies. It combines:
1. **A High-Converting Public Landing Page**: Featuring an interactive course catalog, detailed program outlines, comparison of Physical and Online cohorts, graduate testimonials, and a streamlined multi-field lead capture form.
2. **A Secure Admin Portal**: Providing institute administrators with real-time analytics, comprehensive lead profiles, automated activity timelines, direct WhatsApp/Call/Email contact triggers, multi-parameter search and filtering, CSV data exports, and dynamic course management.

Every submitted inquiry flows directly from the visitor's browser through parameterized Express REST APIs into MySQL and appears immediately in the administrator's dashboard.

---

## 2. Technology Stack

### Frontend (100% Framework-Free)
* **HTML5**: Semantic markup, accessible input types, and structured landmarks.
* **CSS3**: Modern responsive layout using CSS custom properties (variables), Flexbox, CSS Grid, animations, and micro-interactions.
* **Vanilla JavaScript (ES6+)**: Pure client-side logic for dynamic course hydration, asynchronous `fetch()` API calls, client-side validation, duplicate submission debouncing, and DOM management.
* **Responsive Design**: Mobile-first architecture tested and verified across `320px`, `375px`, `425px`, `768px`, `1024px`, `1366px`, and `1920px`.

### Backend
* **Node.js**: Asynchronous runtime environment.
* **Express.js**: Clean RESTful API architecture with modular routers and centralized error handling.
* **express-rate-limit**: Abuse prevention and brute-force mitigation for both public lead submissions and admin login endpoints.
* **Helmet & CORS**: HTTP security headers and cross-origin resource sharing protection.

### Database
* **MySQL**: Relational database storage with InnoDB engine, `utf8mb4` encoding, and foreign key cascades.
* **mysql2/promise**: High-performance connection pool with 100% prepared/parameterized queries to prevent SQL injection.

### Security & Authentication
* **bcryptjs**: Salted password hashing (cost factor 10) for administrator credentials.
* **jsonwebtoken (JWT)** & **Cookie-Parser**: Secure stateless authentication token verification with HTTP-only cookies and Authorization Bearer header support.
* **Input Sanitization**: Server-side and client-side validation for emails, international/Nigerian phone numbers, and required form fields.

---

## 3. System Requirements

* **Node.js**: Version 18.x, 20.x, or 22.x+
* **npm**: Version 9.x or 10.x+
* **MySQL Server** or **MariaDB Server**: Version 5.7+ or 8.0+

---

## 4. How to Install Node.js Dependencies

Clone the repository and install all required backend packages:

```bash
git clone https://github.com/Miracle956888/fetchly.git
cd fetchly
npm install
```

---

## 5. How to Configure MySQL

Ensure your MySQL server is running locally or on a remote host:

```bash
# Check MySQL status (Ubuntu / Debian)
sudo systemctl status mysql
```

Log into MySQL to verify your administrative user permissions:

```bash
mysql -u root -p
```

---

## 6. How to Create the Database

Create the application database manually or allow the automated initialization script to create it for you:

```sql
CREATE DATABASE IF NOT EXISTS ict_lead_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

---

## 7. How to Run the SQL Schema

You can execute the schema file directly into MySQL:

```bash
mysql -u root -p ict_lead_db < server/database/schema.sql
```

Alternatively, run the automated database initialization script, which creates the database, provisions all tables, and seeds initial active courses and sample leads:

```bash
npm run init-db
```

The database schema provisions:
* `courses`: Manages course catalog, categories, durations, and active/inactive status.
* `leads`: Stores applicant contact information, course choice, learning mode, communication channel, referral source, status, and internal notes.
* `lead_activities`: Maintains an immutable chronological audit trail and timeline of interactions for each applicant.
* `admins`: Stores hashed credentials and roles for staff administrators.

---

## 8. How to Configure `.env`

Copy `.env.example` to create your local `.env` configuration file:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and secret key:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ict_lead_db

# Security & Admin Authentication
JWT_SECRET=super_secret_jwt_key_ict_lead_management_2026

# Default Administrator Seed Account
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@ictacademy.org
ADMIN_PASSWORD=AdminPassword2026!
ADMIN_NAME=ICT System Administrator
```

---

## 9. How to Create or Seed the First Admin

Run the safe admin seed command to provision or reset the primary administrator account using the values from your `.env` file:

```bash
npm run seed
```

This will safely hash the administrator password using `bcrypt` and store it securely in the `admins` table.

---

## 10. How to Start the Server

To start the production server:

```bash
npm start
```

Or for development:

```bash
npm run dev
```

On startup, the server automatically checks database connectivity, verifies that all tables exist, and begins listening on `0.0.0.0:3000`.

---

## 11. How to Access the Public Website

Open your browser and navigate to:

```text
http://localhost:3000/
```

Features available to visitors:
* Read course overviews and click **"Select This Course"** to auto-populate the registration form.
* Complete the multi-channel registration form (Nigerian phone numbers like `080...` or `+234...` and international numbers supported).
* Select referral source; selecting **"Other"** displays a dynamic input field.
* Click **"Get Course Details"** to submit inquiries via asynchronous `fetch()`.
* View the instant confirmation success card with direct WhatsApp advisor chat integration.

---

## 12. How to Access the Admin Panel

Navigate to the admin portal:

```text
http://localhost:3000/admin/login
```

* **Default Username**: `admin`
* **Default Password**: `AdminPassword2026!`

After authenticating, you will be redirected to the executive dashboard:

```text
http://localhost:3000/admin/dashboard
```

### Admin Capabilities:
1. **Executive Metrics**: Live counts of Total Leads, New Leads, Contacted, Enrolled, Today's Leads, and This Week.
2. **Leads Directory (`/admin/leads`)**:
   * Search across applicant names, phone numbers, and emails.
   * Filter by course, learning mode, communication preference, referral channel, pipeline status, and date.
   * View complete submitted lead information in a clean modal profile.
   * One-click contact triggers: Launch **WhatsApp chat** with pre-filled greeting, initiate phone calls, or compose emails.
   * Update lead statuses: `New` &rarr; `Contacted` &rarr; `Interested` &rarr; `Enrolled` &rarr; `Follow Up` &rarr; `Not Interested` &rarr; `Closed`.
   * Add internal staff notes and view the chronological activity timeline for each applicant.
   * Export all or filtered leads as RFC-compliant CSV files.
3. **Course Management (`/admin/courses`)**:
   * Create new ICT courses dynamically without modifying HTML.
   * Edit course descriptions, durations, and categories.
   * Activate or deactivate courses (inactive courses are automatically hidden from the public registration form).
4. **Reports & Analytics (`/admin/analytics`)**:
   * Visual breakdowns of course popularity, physical vs online learning preferences, marketing referral channels, and pipeline conversion flow.

---

## 13. How to Deploy the Application

### Deploying on a Linux VPS (e.g. Ubuntu, Debian, AWS EC2, DigitalOcean)

1. **Install Node.js & MySQL**:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm mysql-server
   ```
2. **Clone Repository & Setup Env**:
   ```bash
   git clone <repo-url> /var/www/ict-leads
   cd /var/www/ict-leads
   npm install --production
   cp .env.example .env
   # Edit .env with production database credentials
   npm run init-db
   ```
3. **Process Management with PM2**:
   ```bash
   sudo npm install -g pm2
   pm2 start server/server.js --name "ict-leads"
   pm2 save
   pm2 startup
   ```
4. **Configure Nginx Reverse Proxy**:
   ```nginx
   server {
       server_name yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
5. **Secure with SSL**:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

---

## 14. REST API Documentation

### Public Endpoints
* `POST /api/leads`: Submit a new inquiry (Rate limited to 15 requests per 15 minutes).
* `GET /api/courses`: Retrieve active courses for public catalog and form dropdown.
* `GET /api/health`: Health status of server and database connection.

### Authentication Endpoints
* `POST /api/admin/login`: Authenticate admin with username/email and password (Rate limited).
* `POST /api/admin/logout`: Clear authentication cookie.
* `GET /api/admin/me`: Check current session and retrieve admin profile.

### Protected Admin Endpoints (`Bearer <token>` or HTTP cookie required)
* `GET /api/admin/leads`: Retrieve paginated, searchable, and filtered leads.
* `GET /api/admin/leads/stats`: Summary counts and analytics breakdowns.
* `GET /api/admin/leads/export`: Download CSV export of all or filtered leads.
* `GET /api/admin/leads/:id`: Fetch complete lead profile and activity history.
* `PUT /api/admin/leads/:id`: Update lead details.
* `PATCH /api/admin/leads/:id/status`: Update lead status and record audit log.
* `POST /api/admin/leads/:id/notes`: Add an internal staff note and update timeline.
* `DELETE /api/admin/leads/:id`: Permanently delete a lead.
* `GET /api/admin/courses`: Retrieve all courses (including inactive) with inquiry counts.
* `POST /api/admin/courses`: Create a new course.
* `PUT /api/admin/courses/:id`: Update course attributes.
* `PATCH /api/admin/courses/:id/status`: Toggle course between active and inactive.
* `DELETE /api/admin/courses/:id`: Delete or deactivate course.

---

## 15. License

This project is licensed under the MIT License.
