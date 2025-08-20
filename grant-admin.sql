-- First, show current user info
SELECT id, username, first_name, last_name, role
FROM users
WHERE id = 72;

-- Then update the role to admin
UPDATE users
SET role = 'admin'
WHERE id = 72
RETURNING id, username, first_name, last_name, role;


