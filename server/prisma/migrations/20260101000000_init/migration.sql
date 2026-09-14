-- Fetchly initial schema (MySQL 8+).
--
-- This is the canonical Prisma migration and produces the COMPLETE current
-- schema (including download telemetry + delivery tracking). It supersedes the
-- legacy pair database/migrations/0001_init.sql + 0002_download_telemetry.sql,
-- which are retained only as a manual import reference for shared hosts
-- (see docs/CPANEL.md).
--
-- Tables use IF NOT EXISTS so `prisma migrate deploy` is safe on a database
-- that was previously created by the bundled SQL (e.g. the Docker Compose
-- MySQL init path) — it records the migration without touching existing data.
-- The target database must already exist (Prisma connects to it via
-- DATABASE_URL); it is intentionally not created here.

CREATE TABLE IF NOT EXISTS users (
    id            VARCHAR(36)  PRIMARY KEY,
    name          VARCHAR(191) NOT NULL,
    email         VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(191) NOT NULL,
    role          ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
    status        ENUM('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
    created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at    DATETIME(3) NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS download_jobs (
    id               VARCHAR(36) PRIMARY KEY,
    user_id          VARCHAR(36) NULL,
    ip_key           VARCHAR(64) NULL,
    source_url       TEXT NOT NULL,
    platform         VARCHAR(32) NOT NULL,
    title            TEXT NULL,
    thumbnail_url    TEXT NULL,
    format           VARCHAR(16) NOT NULL,
    quality          VARCHAR(16) NOT NULL,
    status           ENUM('QUEUED','ANALYZING','DOWNLOADING','PROCESSING','COMPLETED','FAILED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'QUEUED',
    progress         INT NOT NULL DEFAULT 0,
    file_size        BIGINT NULL,
    file_name        VARCHAR(512) NULL,
    file_path        VARCHAR(512) NULL,
    downloaded_bytes BIGINT NULL,
    speed_bps        INT NULL,
    error_code       VARCHAR(48) NULL,
    error_message    TEXT NULL,
    delivered_at     DATETIME(3) NULL,
    delivery_count   INT NOT NULL DEFAULT 0,
    created_at       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    started_at       DATETIME(3) NULL,
    completed_at     DATETIME(3) NULL,
    expires_at       DATETIME(3) NULL,
    CONSTRAINT fk_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_jobs_status (status),
    INDEX idx_jobs_platform (platform),
    INDEX idx_jobs_created (created_at),
    INDEX idx_jobs_delivered (delivered_at)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS download_events (
    id              VARCHAR(36) PRIMARY KEY,
    download_job_id VARCHAR(36) NOT NULL,
    event_type      VARCHAR(48) NOT NULL,
    message         TEXT NULL,
    metadata        JSON NULL,
    created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT fk_events_job FOREIGN KEY (download_job_id) REFERENCES download_jobs(id) ON DELETE CASCADE,
    INDEX idx_events_job (download_job_id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platforms (
    id         VARCHAR(36) PRIMARY KEY,
    name       VARCHAR(191) NOT NULL,
    slug       VARCHAR(191) NOT NULL UNIQUE,
    enabled    TINYINT(1) NOT NULL DEFAULT 1,
    icon       VARCHAR(191) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
    id         VARCHAR(36) PRIMARY KEY,
    `key`      VARCHAR(191) NOT NULL UNIQUE,
    value      TEXT NOT NULL,
    updated_at DATETIME(3) NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_events (
    id         VARCHAR(36) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    platform   VARCHAR(32) NULL,
    metadata   JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_analytics_type (event_type),
    INDEX idx_analytics_created (created_at)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
