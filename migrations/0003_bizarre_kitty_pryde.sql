CREATE TABLE "ai_messaging_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false,
	"confidence_threshold" double precision DEFAULT 0.7,
	"max_response_length" integer DEFAULT 160,
	"business_hours_only" boolean DEFAULT false,
	"business_hours_start" text DEFAULT '09:00',
	"business_hours_end" text DEFAULT '17:00',
	"business_hours_timezone" text DEFAULT 'America/Chicago',
	"email_enabled" boolean DEFAULT false,
	"email_excluded_keywords" text,
	"email_excluded_domains" text,
	"email_auto_respond_emails" text,
	"sms_enabled" boolean DEFAULT false,
	"sms_excluded_keywords" text,
	"sms_excluded_phone_numbers" text,
	"sms_auto_respond_phone_numbers" text,
	"excluded_keywords" text,
	"total_processed" integer DEFAULT 0,
	"responses_sent" integer DEFAULT 0,
	"responses_blocked" integer DEFAULT 0,
	"average_confidence" double precision DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"keywords" text,
	"priority" integer DEFAULT 1,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_knowledge_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#3B82F6',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "check_software_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"request_data" text,
	"response_data" text,
	"error_message" text,
	"payroll_check_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"client_id" integer,
	"form_data" text NOT NULL,
	"submitted_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"fields" text,
	"submissions" integer DEFAULT 0,
	"last_submission" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "llm_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"client_message" text NOT NULL,
	"ai_response" text NOT NULL,
	"channel" text NOT NULL,
	"confidence" double precision,
	"suggested_actions" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"payroll_history_id" integer,
	"staff_id" integer NOT NULL,
	"check_number" text,
	"check_amount" double precision NOT NULL,
	"check_date" timestamp NOT NULL,
	"provider_id" integer,
	"provider_check_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"issue_date" timestamp,
	"clear_date" timestamp,
	"void_date" timestamp,
	"void_reason" text,
	"check_image_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"description" text,
	"is_encrypted" boolean DEFAULT false,
	CONSTRAINT "system_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "payroll_history" ALTER COLUMN "period_start" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "payroll_history" ALTER COLUMN "period_end" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "business_logo" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "service_categories" ADD COLUMN "color" text DEFAULT '#3B82F6';--> statement-breakpoint
ALTER TABLE "business_knowledge" ADD CONSTRAINT "business_knowledge_category_id_business_knowledge_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."business_knowledge_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_software_logs" ADD CONSTRAINT "check_software_logs_provider_id_check_software_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."check_software_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_software_logs" ADD CONSTRAINT "check_software_logs_payroll_check_id_payroll_checks_id_fk" FOREIGN KEY ("payroll_check_id") REFERENCES "public"."payroll_checks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_conversations" ADD CONSTRAINT "llm_conversations_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_checks" ADD CONSTRAINT "payroll_checks_payroll_history_id_payroll_history_id_fk" FOREIGN KEY ("payroll_history_id") REFERENCES "public"."payroll_history"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_checks" ADD CONSTRAINT "payroll_checks_provider_id_check_software_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."check_software_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_color_preferences" ADD CONSTRAINT "user_color_preferences_user_id_unique" UNIQUE("user_id");