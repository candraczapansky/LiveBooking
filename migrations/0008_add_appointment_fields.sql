-- Add payment and amount fields to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_amount DOUBLE PRECISION;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tip_amount DOUBLE PRECISION;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tax_amount DOUBLE PRECISION;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP;

-- Add indexes for payment-related queries
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_date ON appointments(payment_date);

-- Update schema.ts to match
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_from INTEGER REFERENCES appointments(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_to INTEGER REFERENCES appointments(id);
