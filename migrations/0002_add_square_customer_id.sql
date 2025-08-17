-- Migration: Add square_customer_id column to users table
-- This migration adds the missing square_customer_id column that was referenced in the schema

-- Add square_customer_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS square_customer_id TEXT;

-- Add helcim_customer_id column to users table (if not already present)
ALTER TABLE users ADD COLUMN IF NOT EXISTS helcim_customer_id TEXT;

-- Add square_payment_id column to payments table (if not already present)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS square_payment_id TEXT;

-- Add helcim_payment_id column to payments table (if not already present)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS helcim_payment_id TEXT;

-- Add square_card_id column to saved_payment_methods table (if not already present)
ALTER TABLE saved_payment_methods ADD COLUMN IF NOT EXISTS square_card_id TEXT;

-- Add helcim_card_id column to saved_payment_methods table (if not already present)
ALTER TABLE saved_payment_methods ADD COLUMN IF NOT EXISTS helcim_card_id TEXT;

-- Add square_subscription_id column to client_memberships table (if not already present)
ALTER TABLE client_memberships ADD COLUMN IF NOT EXISTS square_subscription_id TEXT;

-- Add helcim_payment_id column to sales_history table (if not already present)
ALTER TABLE sales_history ADD COLUMN IF NOT EXISTS helcim_payment_id TEXT;

-- Update the comment to reflect the migration
COMMENT ON COLUMN users.square_customer_id IS 'Legacy field for backward compatibility with Square';
COMMENT ON COLUMN users.helcim_customer_id IS 'Helcim customer ID for payment processing';
COMMENT ON COLUMN payments.square_payment_id IS 'Legacy field for backward compatibility with Square';
COMMENT ON COLUMN payments.helcim_payment_id IS 'Helcim payment ID for payment tracking';
COMMENT ON COLUMN saved_payment_methods.square_card_id IS 'Legacy field for backward compatibility with Square';
COMMENT ON COLUMN saved_payment_methods.helcim_card_id IS 'Helcim card ID for saved payment methods';
COMMENT ON COLUMN client_memberships.square_subscription_id IS 'Legacy field for backward compatibility with Square';
COMMENT ON COLUMN sales_history.helcim_payment_id IS 'Helcim payment ID for sales tracking'; 