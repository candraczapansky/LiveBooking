-- Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS "marketing_campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "audience" text NOT NULL,
  "subject" text,
  "content" text NOT NULL,
  "html_content" text,
  "template_design" text,
  "send_date" timestamp,
  "status" text NOT NULL DEFAULT 'draft',
  "sent_count" integer DEFAULT 0,
  "delivered_count" integer DEFAULT 0,
  "failed_count" integer DEFAULT 0,
  "opened_count" integer DEFAULT 0,
  "clicked_count" integer DEFAULT 0,
  "unsubscribed_count" integer DEFAULT 0,
  "sent_at" timestamp,
  "target_client_ids" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
