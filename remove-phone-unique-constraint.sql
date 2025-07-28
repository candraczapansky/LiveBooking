-- Remove unique constraint on phone field
-- This allows multiple users to have the same phone number

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_unique;

-- Verify the constraint was removed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_phone_unique'
    ) THEN
        RAISE NOTICE 'Phone unique constraint successfully removed';
    ELSE
        RAISE NOTICE 'Phone unique constraint still exists';
    END IF;
END $$; 