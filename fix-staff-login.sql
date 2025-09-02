-- SQL script to fix staff login issues

-- 1. Ensure all staff users have the correct role
UPDATE users
SET role = 'staff'
FROM staff
WHERE users.id = staff.user_id
AND users.role != 'staff' 
AND users.role != 'admin';

-- 2. Reset passwords to a known value for all staff users
-- Note: we're setting passwords to a raw value 'password123' which the auth system will auto-hash on first login
UPDATE users
SET password = 'password123'
FROM staff
WHERE users.id = staff.user_id;

-- 3. Fix any missing usernames
WITH staff_missing_username AS (
    SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        CASE 
            WHEN u.username IS NULL OR u.username = '' THEN
                LOWER(REGEXP_REPLACE(COALESCE(u.first_name, '') || COALESCE(u.last_name, ''), '[^a-zA-Z0-9]', '', 'g'))
            ELSE u.username
        END as generated_username
    FROM users u
    JOIN staff s ON s.user_id = u.id
    WHERE u.username IS NULL OR u.username = ''
)
UPDATE users 
SET username = 
    CASE 
        WHEN LENGTH(smu.generated_username) < 3 THEN 'staff' || users.id
        ELSE smu.generated_username
    END
FROM staff_missing_username smu
WHERE users.id = smu.id;







