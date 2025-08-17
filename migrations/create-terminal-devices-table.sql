-- Create terminal_devices table for location-based terminal management
-- This table stores Helcim Smart Terminal devices and their associated locations

CREATE TABLE IF NOT EXISTS terminal_devices (
    id SERIAL PRIMARY KEY,
    device_code TEXT NOT NULL UNIQUE,
    device_name TEXT NOT NULL,
    location_id INTEGER REFERENCES locations(id),
    status TEXT DEFAULT 'active' NOT NULL,
    device_type TEXT DEFAULT 'smart_terminal' NOT NULL,
    last_seen TIMESTAMP,
    is_default BOOLEAN DEFAULT FALSE,
    api_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on device_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_terminal_devices_device_code ON terminal_devices(device_code);

-- Create index on location_id for fast location-based queries
CREATE INDEX IF NOT EXISTS idx_terminal_devices_location_id ON terminal_devices(location_id);

-- Create index on status for filtering active/inactive devices
CREATE INDEX IF NOT EXISTS idx_terminal_devices_status ON terminal_devices(status);

-- Create index on is_default for finding default terminals per location
CREATE INDEX IF NOT EXISTS idx_terminal_devices_is_default ON terminal_devices(is_default);

-- Add comment to table
COMMENT ON TABLE terminal_devices IS 'Stores Helcim Smart Terminal devices and their associated locations for location-based terminal management';

-- Add comments to columns
COMMENT ON COLUMN terminal_devices.device_code IS 'Helcim device code (e.g., xog5)';
COMMENT ON COLUMN terminal_devices.device_name IS 'Friendly name for the terminal (e.g., "Front Desk Terminal")';
COMMENT ON COLUMN terminal_devices.location_id IS 'Associated location ID from locations table';
COMMENT ON COLUMN terminal_devices.status IS 'Device status: active, inactive, maintenance';
COMMENT ON COLUMN terminal_devices.device_type IS 'Type of terminal: smart_terminal, virtual_terminal';
COMMENT ON COLUMN terminal_devices.last_seen IS 'Last successful ping/communication timestamp';
COMMENT ON COLUMN terminal_devices.is_default IS 'Whether this is the default terminal for the location';
COMMENT ON COLUMN terminal_devices.api_enabled IS 'Whether API mode is enabled on the device';





