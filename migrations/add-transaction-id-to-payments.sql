-- Add transactionId column to payments table
-- This allows storing external transaction IDs from payment processors like Helcim

ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Add index for better query performance when looking up payments by transaction ID
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- Add comment to document the purpose of this column
COMMENT ON COLUMN payments.transaction_id IS 'External transaction ID from payment processor (e.g., Helcim, Square)';



