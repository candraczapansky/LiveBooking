-- Add optional account invitation columns to users table
-- Safe to run multiple times

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wants_account_invite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_invite_sent_at TIMESTAMP;



