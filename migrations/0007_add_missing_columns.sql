-- Add timezone column to locations table
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'America/New_York';

-- Add commission_type column to staff table
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "commission_type" text DEFAULT 'commission';
