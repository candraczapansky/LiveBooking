-- Migration: Add appointment_photos table for progress tracking
-- This table stores photos with timestamps for tracking service progress

CREATE TABLE "appointment_photos" (
  "id" serial PRIMARY KEY NOT NULL,
  "appointment_id" integer NOT NULL,
  "photo_data" text NOT NULL,
  "photo_type" text NOT NULL,
  "description" text,
  "uploaded_by" integer,
  "uploaded_by_role" text,
  "created_at" timestamp DEFAULT now()
);

-- Add foreign key constraint to appointments table
ALTER TABLE "appointment_photos" 
ADD CONSTRAINT "appointment_photos_appointment_id_fkey" 
FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE;

-- Add index for faster queries by appointment
CREATE INDEX "appointment_photos_appointment_id_idx" ON "appointment_photos"("appointment_id");

-- Add index for photo type filtering
CREATE INDEX "appointment_photos_photo_type_idx" ON "appointment_photos"("photo_type"); 