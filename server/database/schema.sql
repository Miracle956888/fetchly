-- ICT Course Lead Generation System Database Schema
-- Compatible with MySQL 5.7+ and MariaDB

CREATE DATABASE IF NOT EXISTS ict_lead_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ict_lead_db;

-- 1. Courses Table (Admin manageable, populates public form)
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  duration VARCHAR(50) DEFAULT '8 Weeks',
  category VARCHAR(50) DEFAULT 'Software Development',
  icon VARCHAR(50) DEFAULT 'code',
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_courses_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Leads Table (Core leads submitted via public landing page)
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(150) NOT NULL,
  course VARCHAR(100) NOT NULL,
  learning_mode ENUM('Physical', 'Online') NOT NULL,
  communication_method ENUM('WhatsApp', 'Phone Call', 'Email', 'SMS') NOT NULL,
  referral_source VARCHAR(50) NOT NULL,
  referral_other VARCHAR(255) NULL,
  status ENUM('New', 'Contacted', 'Interested', 'Enrolled', 'Not Interested', 'Follow Up', 'Closed') NOT NULL DEFAULT 'New',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leads_email (email),
  INDEX idx_leads_phone (phone),
  INDEX idx_leads_course (course),
  INDEX idx_leads_status (status),
  INDEX idx_leads_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Lead Activity History / Timeline Table
CREATE TABLE IF NOT EXISTS lead_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  created_by VARCHAR(100) DEFAULT 'System',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_lead (lead_id),
  CONSTRAINT fk_lead_activity FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role VARCHAR(50) DEFAULT 'Administrator',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
