-- Create permission categories table
CREATE TABLE permission_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create permission groups table
CREATE TABLE permission_groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create permission group mappings table (many-to-many between groups and permissions)
CREATE TABLE permission_group_mappings (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, permission_id)
);

-- Create user permission groups table (many-to-many between users and permission groups)
CREATE TABLE user_permission_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    UNIQUE(user_id, group_id)
);

-- Create user direct permissions table (for individual permission overrides)
CREATE TABLE user_direct_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT true,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    UNIQUE(user_id, permission_id)
);

-- Create indexes for better performance
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permission_groups_created_by ON permission_groups(created_by);
CREATE INDEX idx_permission_group_mappings_group_id ON permission_group_mappings(group_id);
CREATE INDEX idx_permission_group_mappings_permission_id ON permission_group_mappings(permission_id);
CREATE INDEX idx_user_permission_groups_user_id ON user_permission_groups(user_id);
CREATE INDEX idx_user_permission_groups_group_id ON user_permission_groups(group_id);
CREATE INDEX idx_user_direct_permissions_user_id ON user_direct_permissions(user_id);
CREATE INDEX idx_user_direct_permissions_permission_id ON user_direct_permissions(permission_id);

-- Insert default permission categories
INSERT INTO permission_categories (name, description, display_order) VALUES
('clients', 'Client management permissions', 10),
('appointments', 'Appointment management permissions', 20),
('services', 'Service management permissions', 30),
('staff', 'Staff management permissions', 40),
('reports', 'Report access permissions', 50),
('settings', 'System settings permissions', 60);

-- Insert default permissions
INSERT INTO permissions (name, description, category, action, resource, is_system) VALUES
-- Client permissions
('view_clients', 'View client list and details', 'clients', 'view', 'clients', true),
('create_clients', 'Create new clients', 'clients', 'create', 'clients', true),
('edit_clients', 'Edit client information', 'clients', 'edit', 'clients', true),
('delete_clients', 'Delete client records', 'clients', 'delete', 'clients', true),

-- Appointment permissions
('view_appointments', 'View appointments', 'appointments', 'view', 'appointments', true),
('create_appointments', 'Create new appointments', 'appointments', 'create', 'appointments', true),
('edit_appointments', 'Edit appointment details', 'appointments', 'edit', 'appointments', true),
('delete_appointments', 'Delete appointments', 'appointments', 'delete', 'appointments', true),

-- Service permissions
('view_services', 'View services', 'services', 'view', 'services', true),
('create_services', 'Create new services', 'services', 'create', 'services', true),
('edit_services', 'Edit service details', 'services', 'edit', 'services', true),
('delete_services', 'Delete services', 'services', 'delete', 'services', true),

-- Staff permissions
('view_staff', 'View staff list and details', 'staff', 'view', 'staff', true),
('create_staff', 'Create new staff accounts', 'staff', 'create', 'staff', true),
('edit_staff', 'Edit staff information', 'staff', 'edit', 'staff', true),
('delete_staff', 'Delete staff accounts', 'staff', 'delete', 'staff', true),

-- Report permissions
('view_reports', 'View reports', 'reports', 'view', 'reports', true),
('export_reports', 'Export reports', 'reports', 'export', 'reports', true),

-- Settings permissions
('view_settings', 'View system settings', 'settings', 'view', 'settings', true),
('edit_settings', 'Edit system settings', 'settings', 'edit', 'settings', true);

-- Insert default permission groups
INSERT INTO permission_groups (name, description, is_system) VALUES
('admin', 'Full system access', true),
('manager', 'Management access', true),
('staff', 'Staff access', true),
('client', 'Client access', true);

-- Assign all permissions to admin group
INSERT INTO permission_group_mappings (group_id, permission_id)
SELECT 
    (SELECT id FROM permission_groups WHERE name = 'admin'),
    id
FROM permissions;

-- Assign basic permissions to staff group
INSERT INTO permission_group_mappings (group_id, permission_id)
SELECT 
    (SELECT id FROM permission_groups WHERE name = 'staff'),
    id
FROM permissions 
WHERE name IN (
    'view_clients',
    'view_appointments',
    'create_appointments',
    'edit_appointments',
    'view_services',
    'view_staff',
    'view_reports'
);

