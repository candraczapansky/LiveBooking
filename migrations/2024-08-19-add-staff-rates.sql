-- Add missing rate columns to staff table
ALTER TABLE staff 
  ADD COLUMN IF NOT EXISTS fixed_rate double precision,
  ADD COLUMN IF NOT EXISTS hourly_rate double precision,
  ADD COLUMN IF NOT EXISTS commission_rate double precision;
