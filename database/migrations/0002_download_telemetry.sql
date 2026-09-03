-- Download telemetry + delivery tracking (enhancement phase).
USE fetchly;

ALTER TABLE download_jobs
  ADD COLUMN file_name        VARCHAR(512) NULL AFTER file_size,
  ADD COLUMN downloaded_bytes BIGINT NULL AFTER file_path,
  ADD COLUMN speed_bps        INT NULL AFTER downloaded_bytes,
  ADD COLUMN delivered_at     DATETIME(3) NULL AFTER error_message,
  ADD COLUMN delivery_count   INT NOT NULL DEFAULT 0 AFTER delivered_at;

CREATE INDEX idx_jobs_delivered ON download_jobs (delivered_at);
