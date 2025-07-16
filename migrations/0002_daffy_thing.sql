ALTER TABLE "users" ADD COLUMN "two_factor_method" text DEFAULT 'authenticator';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_email_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_email_code_expiry" timestamp;