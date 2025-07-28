-- Migration: Add notes column to users table
-- This allows staff to add notes about clients

ALTER TABLE "users" ADD COLUMN "notes" text; 