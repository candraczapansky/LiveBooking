CREATE TABLE "appointment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"action" text NOT NULL,
	"action_by" integer,
	"action_by_role" text,
	"previous_values" text,
	"new_values" text,
	"client_id" integer,
	"service_id" integer,
	"staff_id" integer,
	"start_time" timestamp,
	"end_time" timestamp,
	"status" text,
	"payment_status" text,
	"total_amount" double precision,
	"notes" text,
	"reason" text,
	"system_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"total_amount" double precision,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"trigger" text NOT NULL,
	"timing" text NOT NULL,
	"template" text NOT NULL,
	"subject" text,
	"active" boolean DEFAULT true,
	"custom_trigger_name" text,
	"sent_count" integer DEFAULT 0,
	"last_run" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"website" text,
	"timezone" text DEFAULT 'America/New_York',
	"currency" text DEFAULT 'USD',
	"tax_rate" double precision DEFAULT 0.08,
	"receipt_footer" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_call_id" integer NOT NULL,
	"twilio_recording_sid" text NOT NULL,
	"recording_url" text NOT NULL,
	"duration" integer,
	"file_size" integer,
	"format" text DEFAULT 'mp3',
	"channels" integer DEFAULT 1,
	"status" text NOT NULL,
	"transcription" text,
	"transcription_status" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "call_recordings_twilio_recording_sid_unique" UNIQUE("twilio_recording_sid")
);
--> statement-breakpoint
CREATE TABLE "cancelled_appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_appointment_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"total_amount" double precision,
	"notes" text,
	"cancellation_reason" text,
	"cancelled_by" integer,
	"cancelled_by_role" text,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"refund_amount" double precision DEFAULT 0,
	"refund_date" timestamp,
	"original_created_at" timestamp,
	"cancelled_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"membership_id" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"square_subscription_id" text,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"renewal_date" integer,
	"last_renewal_attempt" timestamp,
	"renewal_failure_count" integer DEFAULT 0,
	"payment_method_id" text
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"device_type" text NOT NULL,
	"brand" text,
	"model" text,
	"serial_number" text,
	"purchase_date" text,
	"warranty_expiry" text,
	"status" text DEFAULT 'available' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_unsubscribes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" text NOT NULL,
	"unsubscribed_at" timestamp DEFAULT now(),
	"campaign_id" integer,
	"reason" text,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE "gift_card_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"gift_card_id" integer NOT NULL,
	"appointment_id" integer,
	"transaction_type" text NOT NULL,
	"amount" double precision NOT NULL,
	"balance_after" double precision NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"initial_amount" double precision NOT NULL,
	"current_balance" double precision NOT NULL,
	"issued_to_email" text,
	"issued_to_name" text,
	"purchased_by_user_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"expiry_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "gift_cards_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "marketing_campaign_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"unsubscribed_at" timestamp,
	"tracking_token" text,
	"error_message" text,
	CONSTRAINT "marketing_campaign_recipients_tracking_token_unique" UNIQUE("tracking_token")
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"audience" text NOT NULL,
	"subject" text,
	"content" text NOT NULL,
	"html_content" text,
	"template_design" text,
	"send_date" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_count" integer DEFAULT 0,
	"delivered_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"opened_count" integer DEFAULT 0,
	"clicked_count" integer DEFAULT 0,
	"unsubscribed_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" double precision NOT NULL,
	"duration" integer NOT NULL,
	"benefits" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"user_id" integer,
	"related_id" integer,
	"related_type" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"appointment_id" integer,
	"client_membership_id" integer,
	"amount" double precision NOT NULL,
	"tip_amount" double precision DEFAULT 0,
	"total_amount" double precision NOT NULL,
	"method" text DEFAULT 'card' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"type" text DEFAULT 'appointment' NOT NULL,
	"description" text,
	"square_payment_id" text,
	"payment_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"period_type" text DEFAULT 'monthly' NOT NULL,
	"total_hours" double precision DEFAULT 0,
	"total_services" integer DEFAULT 0,
	"total_revenue" double precision DEFAULT 0,
	"total_commission" double precision DEFAULT 0,
	"total_hourly_pay" double precision DEFAULT 0,
	"total_fixed_pay" double precision DEFAULT 0,
	"total_earnings" double precision NOT NULL,
	"commission_type" text NOT NULL,
	"base_commission_rate" double precision,
	"hourly_rate" double precision,
	"fixed_rate" double precision,
	"earnings_breakdown" text,
	"time_entries_data" text,
	"appointments_data" text,
	"payroll_status" text DEFAULT 'generated' NOT NULL,
	"generated_by" integer,
	"reviewed_by" integer,
	"approved_by" integer,
	"paid_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "phone_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"twilio_call_sid" text NOT NULL,
	"from_number" text NOT NULL,
	"to_number" text NOT NULL,
	"direction" text NOT NULL,
	"status" text NOT NULL,
	"duration" integer,
	"price" text,
	"price_unit" text,
	"user_id" integer,
	"staff_id" integer,
	"appointment_id" integer,
	"notes" text,
	"purpose" text,
	"created_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"ended_at" timestamp,
	CONSTRAINT "phone_calls_twilio_call_sid_unique" UNIQUE("twilio_call_sid")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sku" text,
	"barcode" text,
	"price" double precision NOT NULL,
	"cost_price" double precision,
	"category" text NOT NULL,
	"brand" text,
	"stock_quantity" integer DEFAULT 0,
	"min_stock_level" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_taxable" boolean DEFAULT true,
	"weight" double precision,
	"dimensions" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" double precision NOT NULL,
	"service" text,
	"expiration_date" date NOT NULL,
	"usage_limit" integer NOT NULL,
	"used_count" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"capacity" integer DEFAULT 1,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "sales_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_type" text NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"payment_id" integer,
	"total_amount" double precision NOT NULL,
	"payment_method" text NOT NULL,
	"payment_status" text DEFAULT 'completed' NOT NULL,
	"client_id" integer,
	"client_name" text,
	"client_email" text,
	"client_phone" text,
	"staff_id" integer,
	"staff_name" text,
	"appointment_id" integer,
	"service_ids" text,
	"service_names" text,
	"service_total_amount" double precision,
	"product_ids" text,
	"product_names" text,
	"product_quantities" text,
	"product_unit_prices" text,
	"product_total_amount" double precision,
	"membership_id" integer,
	"membership_name" text,
	"membership_duration" integer,
	"tax_amount" double precision DEFAULT 0,
	"tip_amount" double precision DEFAULT 0,
	"discount_amount" double precision DEFAULT 0,
	"business_date" date,
	"day_of_week" text,
	"month_year" text,
	"quarter" text,
	"square_payment_id" text,
	"created_by" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_gift_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"gift_card_id" integer NOT NULL,
	"nickname" text,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"square_card_id" text NOT NULL,
	"card_brand" text NOT NULL,
	"card_last4" text NOT NULL,
	"card_exp_month" integer NOT NULL,
	"card_exp_year" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration" integer NOT NULL,
	"price" double precision NOT NULL,
	"category_id" integer NOT NULL,
	"room_id" integer,
	"buffer_time_before" integer DEFAULT 0,
	"buffer_time_after" integer DEFAULT 0,
	"color" text DEFAULT '#3B82F6'
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"bio" text,
	"commission_type" text DEFAULT 'commission' NOT NULL,
	"commission_rate" double precision,
	"hourly_rate" double precision,
	"fixed_rate" double precision,
	"photo_url" text
);
--> statement-breakpoint
CREATE TABLE "staff_earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"appointment_id" integer,
	"service_id" integer NOT NULL,
	"payment_id" integer,
	"earnings_amount" double precision NOT NULL,
	"rate_type" text NOT NULL,
	"rate_used" double precision NOT NULL,
	"is_custom_rate" boolean DEFAULT false NOT NULL,
	"service_price" double precision NOT NULL,
	"calculation_details" text,
	"earnings_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"day_of_week" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"location" text NOT NULL,
	"service_categories" text[] DEFAULT '{}',
	"start_date" date NOT NULL,
	"end_date" date,
	"is_blocked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"custom_rate" double precision,
	"custom_commission_rate" double precision
);
--> statement-breakpoint
CREATE TABLE "time_clock_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"clock_in_time" timestamp NOT NULL,
	"clock_out_time" timestamp,
	"total_hours" double precision,
	"break_time" double precision DEFAULT 0,
	"notes" text,
	"status" text DEFAULT 'clocked_in' NOT NULL,
	"location" text,
	"external_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "time_clock_entries_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "user_color_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"primary_color" text DEFAULT '#f4a4c0' NOT NULL,
	"primary_text_color" text DEFAULT '#000000' NOT NULL,
	"secondary_text_color" text DEFAULT '#6b7280' NOT NULL,
	"is_dark_mode" boolean DEFAULT false NOT NULL,
	"saved_brand_colors" text,
	"saved_text_colors" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'client' NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"profile_picture" text,
	"stripe_customer_id" text,
	"reset_token" text,
	"reset_token_expiry" timestamp,
	"email_account_management" boolean DEFAULT true,
	"email_appointment_reminders" boolean DEFAULT true,
	"email_promotions" boolean DEFAULT false,
	"sms_account_management" boolean DEFAULT false,
	"sms_appointment_reminders" boolean DEFAULT true,
	"sms_promotions" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
