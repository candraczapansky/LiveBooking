import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import fs from 'fs';

// Get database URL from environment
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

// Initialize database connection
const client = neon(DATABASE_URL);
const db = drizzle(client);

async function setupPermissions() {
  try {
    console.log('Setting up permissions...');

    // Create permission categories
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS permission_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO permission_categories (name, description, display_order) VALUES
        ('clients', 'Client management permissions', 10),
        ('appointments', 'Appointment management permissions', 20),
        ('services', 'Service management permissions', 30),
        ('staff', 'Staff management permissions', 40),
        ('reports', 'Report access permissions', 50),
        ('settings', 'System settings permissions', 60)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Create permissions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS permissions (
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

      INSERT INTO permissions (name, description, category, action, resource, is_system) VALUES
        ('view_clients', 'View client list and details', 'clients', 'view', 'clients', true),
        ('create_clients', 'Create new clients', 'clients', 'create', 'clients', true),
        ('edit_clients', 'Edit client information', 'clients', 'edit', 'clients', true),
        ('delete_clients', 'Delete client records', 'clients', 'delete', 'clients', true),
        ('view_appointments', 'View appointments', 'appointments', 'view', 'appointments', true),
        ('create_appointments', 'Create new appointments', 'appointments', 'create', 'appointments', true),
        ('edit_appointments', 'Edit appointment details', 'appointments', 'edit', 'appointments', true),
        ('delete_appointments', 'Delete appointments', 'appointments', 'delete', 'appointments', true),
        ('view_services', 'View services', 'services', 'view', 'services', true),
        ('create_services', 'Create new services', 'services', 'create', 'services', true),
        ('edit_services', 'Edit service details', 'services', 'edit', 'services', true),
        ('delete_services', 'Delete services', 'services', 'delete', 'services', true),
        ('view_staff', 'View staff list and details', 'staff', 'view', 'staff', true),
        ('create_staff', 'Create new staff accounts', 'staff', 'create', 'staff', true),
        ('edit_staff', 'Edit staff information', 'staff', 'edit', 'staff', true),
        ('delete_staff', 'Delete staff accounts', 'staff', 'delete', 'staff', true),
        ('view_reports', 'View reports', 'reports', 'view', 'reports', true),
        ('export_reports', 'Export reports', 'reports', 'export', 'reports', true),
        ('view_settings', 'View system settings', 'settings', 'view', 'settings', true),
        ('edit_settings', 'Edit system settings', 'settings', 'edit', 'settings', true),
        ('view_permissions', 'View user permissions and access levels', 'settings', 'view', 'permissions', true),
        ('edit_permissions', 'Edit user permissions and access levels', 'settings', 'edit', 'permissions', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Create permission groups table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS permission_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        is_system BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO permission_groups (name, description, is_system)
      VALUES ('admin', 'Full system access', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // Create permission group mappings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS permission_group_mappings (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(group_id, permission_id)
      );
    `);

    // Create user permission groups table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_permission_groups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        group_id INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        UNIQUE(user_id, group_id)
      );
    `);

    // Get admin group ID
    const groupResult = await db.execute(sql`
      SELECT id FROM permission_groups WHERE name = 'admin';
    `);

    if (groupResult.rows.length === 0) {
      console.error('Admin group not found');
      return;
    }

    const adminGroupId = groupResult.rows[0].id;

    // Assign all permissions to admin group
    await db.execute(sql`
      INSERT INTO permission_group_mappings (group_id, permission_id)
      SELECT ${adminGroupId}, id
      FROM permissions
      ON CONFLICT (group_id, permission_id) DO NOTHING;
    `);

    // Assign user to admin group
    await db.execute(sql`
      INSERT INTO user_permission_groups (user_id, group_id)
      VALUES (1, ${adminGroupId})
      ON CONFLICT (user_id, group_id) DO NOTHING;
    `);

    console.log('✅ Successfully set up permissions!');

  } catch (error) {
    console.error('Error setting up permissions:', error);
  }
}

// Run the setup
setupPermissions();