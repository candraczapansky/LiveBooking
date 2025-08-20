-- Add room_id column to services table if it doesn't exist
ALTER TABLE services ADD COLUMN IF NOT EXISTS room_id INTEGER;

-- Add foreign key constraint to rooms table
ALTER TABLE services ADD CONSTRAINT fk_services_room FOREIGN KEY (room_id) REFERENCES rooms(id);
