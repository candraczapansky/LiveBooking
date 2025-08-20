-- Create terminal configurations table
CREATE TABLE IF NOT EXISTS terminal_configurations (
  id SERIAL PRIMARY KEY,
  terminal_id TEXT NOT NULL,
  location_id TEXT NOT NULL REFERENCES locations(id),
  api_token TEXT NOT NULL, -- Will store encrypted token
  device_code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(location_id, terminal_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_terminal_config_location ON terminal_configurations(location_id) WHERE is_active = true;

-- Add comment explaining encryption
COMMENT ON COLUMN terminal_configurations.api_token IS 'Encrypted Helcim API token for this terminal';
