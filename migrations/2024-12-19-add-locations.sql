-- Migration: Add locations table and update existing tables for multi-location support

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  description TEXT,
  business_hours TEXT, -- JSON string for business hours
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add location_id columns to existing tables
ALTER TABLE services ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id);

-- Insert a default location if none exists
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

-- Update existing records to use the default location
UPDATE services SET location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1) WHERE location_id IS NULL;
UPDATE staff SET location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1) WHERE location_id IS NULL;
UPDATE rooms SET location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1) WHERE location_id IS NULL;
UPDATE appointments SET location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1) WHERE location_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_location_id ON services(location_id);
CREATE INDEX IF NOT EXISTS idx_staff_location_id ON staff(location_id);
CREATE INDEX IF NOT EXISTS idx_rooms_location_id ON rooms(location_id);
CREATE INDEX IF NOT EXISTS idx_appointments_location_id ON appointments(location_id);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON locations(is_active);
CREATE INDEX IF NOT EXISTS idx_locations_is_default ON locations(is_default); 