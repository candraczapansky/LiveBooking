ALTER TABLE services
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_services_is_hidden ON services(is_hidden);
