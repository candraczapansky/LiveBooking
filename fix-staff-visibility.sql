-- SQL script to ensure all staff have the minimum required permissions

-- First, ensure all necessary permissions exist
INSERT INTO permissions (name, description, category, action, resource, is_active, is_system)
VALUES 
('view_dashboard', 'View dashboard', 'dashboard', 'view', 'dashboard', true, true),
('view_appointments', 'View appointments', 'appointments', 'view', 'appointments', true, true),
('view_clients', 'View clients', 'clients', 'view', 'clients', true, true),
('view_services', 'View services', 'services', 'view', 'services', true, true),
('view_staff', 'View staff', 'staff', 'view', 'staff', true, true)
ON CONFLICT (name) DO NOTHING;

-- Create or get the Basic Staff permission group
WITH basic_group AS (
    INSERT INTO permission_groups (name, description, is_active, is_system)
    VALUES ('Basic Staff', 'Basic permissions for staff members', true, true)
    ON CONFLICT (name) DO NOTHING
    RETURNING id
),
existing_group AS (
    SELECT id FROM permission_groups WHERE name = 'Basic Staff'
),
basic_staff_group AS (
    SELECT id FROM basic_group
    UNION ALL
    SELECT id FROM existing_group
)

-- Assign essential permissions to this group
INSERT INTO permission_group_mappings (group_id, permission_id)
SELECT bsg.id, p.id
FROM basic_staff_group bsg
CROSS JOIN permissions p
WHERE p.name IN ('view_dashboard', 'view_appointments', 'view_clients', 'view_services', 'view_staff')
ON CONFLICT DO NOTHING;

-- Assign all staff users to this permission group
INSERT INTO user_permission_groups (user_id, group_id)
SELECT u.id, pg.id
FROM users u
JOIN staff s ON s.user_id = u.id
CROSS JOIN permission_groups pg
WHERE pg.name = 'Basic Staff'
ON CONFLICT DO NOTHING;






