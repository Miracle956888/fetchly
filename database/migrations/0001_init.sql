-- Fetchly initial schema (MySQL 8+) — for FRESH installs (includes the
-- telemetry/delivery columns). 0002_download_telemetry.sql is ONLY for
-- databases created before that enhancement.
-- Canonical migrations are managed by Prisma (`npm run db:migrate`);
-- on cPanel you can simply import this file via phpMyAdmin.

CREATE DATABASE IF NOT EXISTS fetchly CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fetchly;

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  PRIMARY KEY,
  name          VARCHAR(191) NOT NULL,
  email         VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(191) NOT NULL,
  role          ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  status        ENUM('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS download_jobs (
  id             VARCHAR(36) PRIMARY KEY,
  user_id        VARCHAR(36) NULL,
  ip_key         VARCHAR(64) NULL,
  source_url     TEXT NOT NULL,
  platform       VARCHAR(32) NOT NULL,
  title          TEXT NULL,
  thumbnail_url  TEXT NULL,
  format         VARCHAR(16) NOT NULL,
  quality        VARCHAR(16) NOT NULL,
  status         ENUM('QUEUED','ANALYZING','DOWNLOADING','PROCESSING','COMPLETED','FAILED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'QUEUED',
  progress       INT NOT NULL DEFAULT 0,
  file_size      BIGINT NULL,
  file_name      VARCHAR(512) NULL,
  file_path      VARCHAR(512) NULL,
  downloaded_bytes BIGINT NULL,
  speed_bps      INT NULL,
  error_code     VARCHAR(48) NULL,
  error_message  TEXT NULL,
  delivered_at   DATETIME(3) NULL,
  delivery_count INT NOT NULL DEFAULT 0,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  started_at     DATETIME(3) NULL,
  completed_at   DATETIME(3) NULL,
  expires_at     DATETIME(3) NULL,
  CONSTRAINT fk_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_jobs_status (status),
  INDEX idx_jobs_platform (platform),
  INDEX idx_jobs_created (created_at)
);

CREATE TABLE IF NOT EXISTS download_events (
  id              VARCHAR(36) PRIMARY KEY,
  download_job_id VARCHAR(36) NOT NULL,
  event_type      VARCHAR(48) NOT NULL,
  message         TEXT NULL,
  metadata        JSON NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_events_job FOREIGN KEY (download_job_id) REFERENCES download_jobs(id) ON DELETE CASCADE,
  INDEX idx_events_job (download_job_id)
);

CREATE TABLE IF NOT EXISTS platforms (
  id         VARCHAR(36) PRIMARY KEY,
  name       VARCHAR(191) NOT NULL,
  slug       VARCHAR(191) NOT NULL UNIQUE,
  enabled    TINYINT(1) NOT NULL DEFAULT 1,
  icon       VARCHAR(191) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
  id         VARCHAR(36) PRIMARY KEY,
  `key`      VARCHAR(191) NOT NULL UNIQUE,
  value      TEXT NOT NULL,
  updated_at DATETIME(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id         VARCHAR(36) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  platform   VARCHAR(32) NULL,
  metadata   JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_analytics_type (event_type),
  INDEX idx_analytics_created (created_at)
);
