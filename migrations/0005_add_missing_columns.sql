-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "square_customer_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "helcim_customer_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_backup_codes" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_method" text DEFAULT 'authenticator';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_email_code" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_email_code_expiry" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notes" text;

-- Add missing columns to marketing_campaigns table
ALTER TABLE "marketing_campaigns" ADD COLUMN IF NOT EXISTS "photo_url" text;

-- Add any missing indexes
CREATE INDEX IF NOT EXISTS "users_square_customer_id_idx" ON "users"("square_customer_id");
CREATE INDEX IF NOT EXISTS "users_helcim_customer_id_idx" ON "users"("helcim_customer_id");
