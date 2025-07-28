-- Migration: Add note_history table
-- This allows tracking all notes with timestamps for clients

CREATE TABLE "note_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"appointment_id" integer,
	"note_content" text NOT NULL,
	"note_type" text NOT NULL DEFAULT 'general',
	"created_by" integer NOT NULL,
	"created_by_role" text NOT NULL,
	"created_at" timestamp DEFAULT now()
); 