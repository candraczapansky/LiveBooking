-- Add missing birthday column to users table for marketing automations
-- Safe to run multiple times

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birthday DATE;


