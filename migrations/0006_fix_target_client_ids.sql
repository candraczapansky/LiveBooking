-- Drop the old target_client_ids column
ALTER TABLE "marketing_campaigns" DROP COLUMN IF EXISTS "target_client_ids";

-- Add the new target_client_ids column as text array
ALTER TABLE "marketing_campaigns" ADD COLUMN "target_client_ids" text[] DEFAULT '{}';
