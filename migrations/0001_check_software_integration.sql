-- Check Software Integration Migration
-- This migration adds support for payroll check processing through various check software providers

-- Check Software Providers table
CREATE TABLE "check_software_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"api_key" text,
	"api_secret" text,
	"access_token" text,
	"refresh_token" text,
	"webhook_url" text,
	"company_id" text,
	"location_id" text,
	"is_active" boolean DEFAULT true,
	"config" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Payroll Checks table
CREATE TABLE "payroll_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_history_id" integer REFERENCES "payroll_history"("id"),
	"staff_id" integer NOT NULL,
	"check_number" text,
	"check_amount" double precision NOT NULL,
	"check_date" date NOT NULL,
	"provider_id" integer REFERENCES "check_software_providers"("id"),
	"provider_check_id" text,
	"status" text NOT NULL DEFAULT 'pending',
	"issue_date" timestamp,
	"clear_date" timestamp,
	"void_date" timestamp,
	"void_reason" text,
	"check_image_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Check Software API Logs table
CREATE TABLE "check_software_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer REFERENCES "check_software_providers"("id"),
	"action" text NOT NULL,
	"status" text NOT NULL,
	"request_data" text,
	"response_data" text,
	"error_message" text,
	"payroll_check_id" integer REFERENCES "payroll_checks"("id"),
	"created_at" timestamp DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX "idx_payroll_checks_staff_id" ON "payroll_checks"("staff_id");
CREATE INDEX "idx_payroll_checks_status" ON "payroll_checks"("status");
CREATE INDEX "idx_payroll_checks_provider_id" ON "payroll_checks"("provider_id");
CREATE INDEX "idx_check_software_logs_provider_id" ON "check_software_logs"("provider_id");
CREATE INDEX "idx_check_software_logs_action" ON "check_software_logs"("action");

-- Insert default check software providers
INSERT INTO "check_software_providers" ("name", "display_name", "is_active") VALUES
('quickbooks', 'QuickBooks Payroll', false),
('square', 'Square Payroll', false),
('gusto', 'Gusto', false),
('adp', 'ADP', false),
('paychex', 'Paychex', false); 