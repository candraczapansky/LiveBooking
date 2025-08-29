-- Add missing commission_type column to staff table
-- Safe to run multiple times

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'commission';

-- Backfill nulls to default if any
UPDATE staff SET commission_type = 'commission' WHERE commission_type IS NULL;


