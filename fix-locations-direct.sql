-- Fix location assignments for existing data
-- This script ensures all existing appointments, staff, services are assigned to locations

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

-- Create a second location for testing
INSERT INTO locations (
  name, address, city, state, zip_code, phone, email, timezone, is_active, is_default, description, created_at, updated_at
) SELECT
  'Downtown Location',
  '456 Downtown Ave',
  'New York',
  'NY',
  '10002',
  '555-987-6543',
  'downtown@example.com',
  'America/New_York',
  true,
  false,
  'Downtown business location',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Downtown Location');

-- Get the location IDs
DO $$
DECLARE
    location1_id INTEGER;
    location2_id INTEGER;
    appointment_count INTEGER;
    staff_count INTEGER;
    service_count INTEGER;
    mid_point INTEGER;
BEGIN
    -- Get location IDs
    SELECT id INTO location1_id FROM locations WHERE is_default = true LIMIT 1;
    SELECT id INTO location2_id FROM locations WHERE name = 'Downtown Location' LIMIT 1;
    
    -- Get counts
    SELECT COUNT(*) INTO appointment_count FROM appointments;
    SELECT COUNT(*) INTO staff_count FROM staff;
    SELECT COUNT(*) INTO service_count FROM services;
    
    RAISE NOTICE 'Location 1 ID: %, Location 2 ID: %', location1_id, location2_id;
    RAISE NOTICE 'Appointments: %, Staff: %, Services: %', appointment_count, staff_count, service_count;
    
    -- Assign appointments to locations (first half to location 1, second half to location 2)
    IF appointment_count > 0 THEN
        mid_point := appointment_count / 2;
        
        -- Assign first half to location 1
        UPDATE appointments 
        SET location_id = location1_id 
        WHERE id IN (
            SELECT id FROM appointments 
            ORDER BY id 
            LIMIT mid_point
        );
        
        -- Assign second half to location 2
        UPDATE appointments 
        SET location_id = location2_id 
        WHERE id IN (
            SELECT id FROM appointments 
            ORDER BY id 
            OFFSET mid_point
        );
        
        RAISE NOTICE 'Assigned % appointments to location 1, % to location 2', mid_point, appointment_count - mid_point;
    END IF;
    
    -- Assign staff to locations
    IF staff_count > 0 THEN
        -- First staff to location 1
        UPDATE staff SET location_id = location1_id WHERE id = (SELECT id FROM staff ORDER BY id LIMIT 1);
        
        -- Second staff to location 2 (if exists)
        IF staff_count > 1 THEN
            UPDATE staff SET location_id = location2_id WHERE id = (SELECT id FROM staff ORDER BY id OFFSET 1 LIMIT 1);
        END IF;
        
        RAISE NOTICE 'Assigned staff to locations';
    END IF;
    
    -- Assign services to locations
    IF service_count > 0 THEN
        -- First service to location 1
        UPDATE services SET location_id = location1_id WHERE id = (SELECT id FROM services ORDER BY id LIMIT 1);
        
        -- Second service to location 2 (if exists)
        IF service_count > 1 THEN
            UPDATE services SET location_id = location2_id WHERE id = (SELECT id FROM services ORDER BY id OFFSET 1 LIMIT 1);
        END IF;
        
        RAISE NOTICE 'Assigned services to locations';
    END IF;
    
END $$;

-- Verify the assignments
SELECT 'Appointments for Location 1' as table_name, COUNT(*) as count FROM appointments WHERE location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1)
UNION ALL
SELECT 'Appointments for Location 2' as table_name, COUNT(*) as count FROM appointments WHERE location_id = (SELECT id FROM locations WHERE name = 'Downtown Location' LIMIT 1)
UNION ALL
SELECT 'Staff for Location 1' as table_name, COUNT(*) as count FROM staff WHERE location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1)
UNION ALL
SELECT 'Staff for Location 2' as table_name, COUNT(*) as count FROM staff WHERE location_id = (SELECT id FROM locations WHERE name = 'Downtown Location' LIMIT 1)
UNION ALL
SELECT 'Services for Location 1' as table_name, COUNT(*) as count FROM services WHERE location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1)
UNION ALL
SELECT 'Services for Location 2' as table_name, COUNT(*) as count FROM services WHERE location_id = (SELECT id FROM locations WHERE name = 'Downtown Location' LIMIT 1); 