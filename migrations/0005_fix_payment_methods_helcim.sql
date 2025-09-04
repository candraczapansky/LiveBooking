-- Fix saved_payment_methods table to work with Helcim instead of Square
-- Make square_card_id nullable for backward compatibility
ALTER TABLE saved_payment_methods 
  ALTER COLUMN square_card_id DROP NOT NULL;

-- Ensure helcim_card_id column exists
ALTER TABLE saved_payment_methods 
  ADD COLUMN IF NOT EXISTS helcim_card_id TEXT;

-- Update any existing records that have square_card_id but no helcim_card_id
UPDATE saved_payment_methods 
  SET helcim_card_id = square_card_id 
  WHERE helcim_card_id IS NULL AND square_card_id IS NOT NULL;

-- Add comment explaining the transition
COMMENT ON COLUMN saved_payment_methods.square_card_id IS 'Legacy Square card ID - kept for backward compatibility';
COMMENT ON COLUMN saved_payment_methods.helcim_card_id IS 'Helcim card ID - primary payment method identifier';
