-- Migration: Add note_templates table
-- This allows staff to create and manage reusable note templates

CREATE TABLE "note_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"category" text NOT NULL DEFAULT 'general',
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
); 