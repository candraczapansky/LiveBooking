-- Migration intentionally left no-op for Square removal. Keeping Helcim fields only.
ALTER TABLE users ADD COLUMN IF NOT EXISTS helcim_customer_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS helcim_payment_id TEXT;
ALTER TABLE saved_payment_methods ADD COLUMN IF NOT EXISTS helcim_card_id TEXT;
ALTER TABLE client_memberships ADD COLUMN IF NOT EXISTS square_subscription_id TEXT; -- retained for legacy read, optional
ALTER TABLE sales_history ADD COLUMN IF NOT EXISTS helcim_payment_id TEXT;