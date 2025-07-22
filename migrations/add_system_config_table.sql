-- Migration: Add system_config table
-- This table stores system configuration values like API keys

CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- Insert some default configurations
INSERT INTO system_config (key, value, description, category, is_encrypted) VALUES
  ('openai_api_key', '', 'OpenAI API Key for AI services', 'ai', TRUE),
  ('sendgrid_api_key', '', 'SendGrid API Key for email services', 'email', TRUE),
  ('sendgrid_from_email', 'noreply@gloheadspa.com', 'SendGrid verified sender email', 'email', FALSE),
  ('twilio_account_sid', '', 'Twilio Account SID for SMS services', 'sms', TRUE),
  ('twilio_auth_token', '', 'Twilio Auth Token for SMS services', 'sms', TRUE),
  ('twilio_phone_number', '', 'Twilio Phone Number for SMS services', 'sms', FALSE)
ON CONFLICT (key) DO NOTHING; 