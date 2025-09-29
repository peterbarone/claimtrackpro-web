-- Set default of staff_roles.status to 'published' and backfill existing rows
-- Safe to run multiple times (idempotent-ish): second run will just keep default and update only remaining draft/null rows.

-- 1. Update existing rows currently draft or null
UPDATE staff_roles
SET status = 'published'
WHERE status IS NULL OR status = 'draft';

-- 2. Change column default (PostgreSQL syntax)
ALTER TABLE staff_roles
ALTER COLUMN status SET DEFAULT 'published';

-- (Optional) If you want to enforce not-null and only published/archived values later you can add a CHECK constraint.
-- ALTER TABLE staff_roles ADD CONSTRAINT staff_roles_status_ck CHECK (status IN ('published','archived'));

-- To rollback (if needed):
-- ALTER TABLE staff_roles ALTER COLUMN status SET DEFAULT 'draft';