-- S3-compatible private object storage key for quarantined file uploads.
BEGIN;
ALTER TABLE file_objects ADD COLUMN storage_key TEXT;
CREATE UNIQUE INDEX idx_file_objects_storage_key ON file_objects(storage_key) WHERE storage_key IS NOT NULL;
COMMIT;