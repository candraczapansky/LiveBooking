-- Migration: Update staff_schedules table to use location_id instead of location text

-- Add location_id column to staff_schedules table
ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);

-- Update existing schedules to use the default location
UPDATE staff_schedules 
SET location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1) 
WHERE location_id IS NULL;

-- Drop the old location column (after ensuring data is migrated)
ALTER TABLE staff_schedules DROP COLUMN IF EXISTS location;
