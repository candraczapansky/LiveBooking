-- Fix location assignments for existing data
-- This script ensures all existing appointments, staff, services, and rooms are assigned to a location

-- First, ensure we have at least one location
INSERT INTO locations (
  name, address, city, state, zip_code, phone, email, timezone, is_active, is_default, description, created_at, updated_at
) SELECT
  'Main Location',
  '123 Main St',
  'New York',
  'NY',
  '10001',
  '555-123-4567',
  'info@example.com',
  'America/New_York',
  true,
  true,
  'Primary business location',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM locations);

-- Get the default location ID
DO $$
DECLARE
    default_location_id INTEGER;
BEGIN
    -- Get the default location ID
    SELECT id INTO default_location_id FROM locations WHERE is_default = true LIMIT 1;
    
    -- If no default location exists, get the first location
    IF default_location_id IS NULL THEN
        SELECT id INTO default_location_id FROM locations LIMIT 1;
    END IF;
    
    -- Update all existing records to use the default location
    UPDATE services SET location_id = default_location_id WHERE location_id IS NULL;
    UPDATE staff SET location_id = default_location_id WHERE location_id IS NULL;
    UPDATE rooms SET location_id = default_location_id WHERE location_id IS NULL;
    UPDATE appointments SET location_id = default_location_id WHERE location_id IS NULL;
    
    RAISE NOTICE 'Updated all records to use location ID: %', default_location_id;
END $$;

-- Verify the updates
SELECT 'Services without location' as table_name, COUNT(*) as count FROM services WHERE location_id IS NULL
UNION ALL
SELECT 'Staff without location' as table_name, COUNT(*) as count FROM staff WHERE location_id IS NULL
UNION ALL
SELECT 'Rooms without location' as table_name, COUNT(*) as count FROM rooms WHERE location_id IS NULL
UNION ALL
SELECT 'Appointments without location' as table_name, COUNT(*) as count FROM appointments WHERE location_id IS NULL; 