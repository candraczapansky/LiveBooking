-- Seed Permissions System
-- This script creates initial permissions and permission groups

-- 1. Create permissions
INSERT INTO permissions (name, description, category, action, resource, is_active, is_system) VALUES
-- Client Management
('view_clients', 'View client information', 'clients', 'read', 'client_contact_info', true, true),
('create_clients', 'Create new clients', 'clients', 'create', 'client_contact_info', true, true),
('edit_clients', 'Edit client information', 'clients', 'update', 'client_contact_info', true, true),
('delete_clients', 'Delete clients', 'clients', 'delete', 'client_contact_info', true, true),

-- Appointment Management
('view_appointments', 'View appointments', 'appointments', 'read', 'calendar', true, true),
('create_appointments', 'Create appointments', 'appointments', 'create', 'calendar', true, true),
('edit_appointments', 'Edit appointments', 'appointments', 'update', 'calendar', true, true),
('cancel_appointments', 'Cancel appointments', 'appointments', 'delete', 'calendar', true, true),

-- Staff Management
('view_staff', 'View staff information', 'staff', 'read', 'staff_management', true, true),
('create_staff', 'Create new staff members', 'staff', 'create', 'staff_management', true, true),
('edit_staff', 'Edit staff information', 'staff', 'update', 'staff_management', true, true),
('delete_staff', 'Delete staff members', 'staff', 'delete', 'staff_management', true, true),

-- Services Management
('view_services', 'View services', 'services', 'read', 'service_management', true, true),
('create_services', 'Create new services', 'services', 'create', 'service_management', true, true),
('edit_services', 'Edit services', 'services', 'update', 'service_management', true, true),
('delete_services', 'Delete services', 'services', 'delete', 'service_management', true, true),

-- Reports
('view_reports', 'View reports', 'reports', 'read', 'reports', true, true),
('export_reports', 'Export reports', 'reports', 'export', 'reports', true, true),

-- Settings
('view_settings', 'View system settings', 'settings', 'read', 'system_settings', true, true),
('edit_settings', 'Edit system settings', 'settings', 'update', 'system_settings', true, true),

-- Permissions Management
('view_permissions', 'View permissions', 'permissions', 'read', 'permission_management', true, true),
('manage_permissions', 'Manage permissions and groups', 'permissions', 'manage', 'permission_management', true, true),

-- Financial
('view_payments', 'View payment information', 'financial', 'read', 'payment_management', true, true),
('process_payments', 'Process payments', 'financial', 'create', 'payment_management', true, true),
('view_payroll', 'View payroll information', 'financial', 'read', 'payroll_management', true, true),

-- Marketing
('view_marketing', 'View marketing campaigns', 'marketing', 'read', 'marketing_management', true, true),
('create_marketing', 'Create marketing campaigns', 'marketing', 'create', 'marketing_management', true, true),
('edit_marketing', 'Edit marketing campaigns', 'marketing', 'update', 'marketing_management', true, true);

-- 2. Create permission groups
INSERT INTO permission_groups (name, description, is_active, is_system, created_by) VALUES
('Administrator', 'Full system access with all permissions', true, true, 72),
('Manager', 'Management access with most permissions except system settings', true, true, 72),
('Stylist', 'Standard stylist access for appointments and client management', true, true, 72),
('Receptionist', 'Front desk access for appointments and basic client management', true, true, 72),
('Assistant', 'Limited access for basic tasks and viewing', true, true, 72);

-- 3. Map permissions to Administrator group (all permissions)
INSERT INTO permission_group_mappings (group_id, permission_id)
SELECT pg.id, p.id
FROM permission_groups pg, permissions p
WHERE pg.name = 'Administrator';

-- 4. Map permissions to Manager group (most permissions except system settings)
INSERT INTO permission_group_mappings (group_id, permission_id)
SELECT pg.id, p.id
FROM permission_groups pg, permissions p
WHERE pg.name = 'Manager' 
AND p.name NOT IN ('edit_settings', 'manage_permissions');

-- 5. Map permissions to Stylist group (appointment and client management)
INSERT INTO permission_group_mappings (group_id, permission_id)
SELECT pg.id, p.id
FROM permission_groups pg, permissions p
WHERE pg.name = 'Stylist' 
AND (p.category IN ('appointments', 'clients') 
     OR p.name IN ('view_services', 'view_payments', 'process_payments'));

-- 6. Map permissions to Receptionist group (basic appointment and client access)
INSERT INTO permission_group_mappings (group_id, permission_id)
SELECT pg.id, p.id
FROM permission_groups pg, permissions p
WHERE pg.name = 'Receptionist' 
AND p.name IN ('view_clients', 'create_clients', 'edit_clients', 
               'view_appointments', 'create_appointments', 'edit_appointments',
               'view_services', 'view_payments', 'process_payments');

-- 7. Map permissions to Assistant group (view-only access)
INSERT INTO permission_group_mappings (group_id, permission_id)
SELECT pg.id, p.id
FROM permission_groups pg, permissions p
WHERE pg.name = 'Assistant' 
AND p.action = 'read' 
AND p.category IN ('clients', 'appointments', 'services');

-- 8. Assign Administrator group to admin user
INSERT INTO user_permission_groups (user_id, group_id, assigned_by)
SELECT 72, pg.id, 72
FROM permission_groups pg
WHERE pg.name = 'Administrator';

-- Display results
SELECT 'Permissions created:' as info, COUNT(*) as count FROM permissions
UNION ALL
SELECT 'Permission groups created:', COUNT(*) FROM permission_groups
UNION ALL
SELECT 'Permission mappings created:', COUNT(*) FROM permission_group_mappings
UNION ALL
SELECT 'User permission groups assigned:', COUNT(*) FROM user_permission_groups; 