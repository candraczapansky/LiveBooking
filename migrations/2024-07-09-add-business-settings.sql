-- Migration: Create business_settings table and insert default row

CREATE TABLE IF NOT EXISTS business_settings (
  id SERIAL PRIMARY KEY,
  business_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  currency TEXT DEFAULT 'USD',
  tax_rate DOUBLE PRECISION DEFAULT 0.08,
  receipt_footer TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert a default row if none exists
INSERT INTO business_settings (
  business_name, address, phone, email, website, timezone, currency, tax_rate, receipt_footer, created_at, updated_at
) SELECT
  'Your Business Name',
  '123 Main St',
  '555-123-4567',
  'info@example.com',
  'https://yourwebsite.com',
  'America/New_York',
  'USD',
  0.08,
  'Thank you for your business!',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM business_settings); 