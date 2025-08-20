-- First, check current user info
SELECT id, username, first_name, last_name, role
FROM users
WHERE id = 1;

-- Update user role to admin
UPDATE users
SET role = 'admin'
WHERE id = 1
RETURNING id, username, first_name, last_name, role;
