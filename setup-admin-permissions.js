import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

// Get database URL from environment or use default
const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

// Initialize database connection
const client = neon(DATABASE_URL);
const db = drizzle(client);

async function setupAdminPermissions() {
  try {
    console.log('Setting up admin permissions...');

    // First, check current user info
    const userResult = await db.execute(sql`
      SELECT id, username, first_name, last_name, role
      FROM users
      WHERE id = 1;
    `);

    if (userResult.rows.length === 0) {
      console.error('User not found');
      return;
    }

    const user = userResult.rows[0];
    console.log('Current user info:', {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    });

    // Update user role to admin
    const updateResult = await db.execute(sql`
      UPDATE users
      SET role = 'admin'
      WHERE id = 1
      RETURNING id, username, first_name, last_name, role;
    `);

    const updatedUser = updateResult.rows[0];
    console.log('✅ Successfully updated user role to admin!');

    // Make sure admin group exists
    await db.execute(sql`
      INSERT INTO permission_groups (name, description, is_system)
      VALUES ('admin', 'Full system access', true)
      ON CONFLICT (name) DO NOTHING;
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

    // Make sure all permissions exist
    await db.execute(sql`
      INSERT INTO permissions (name, description, category, action, resource, is_system)
      VALUES 
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
        ('edit_settings', 'Edit system settings', 'settings', 'edit', 'settings', true)
      ON CONFLICT (name) DO NOTHING;
    `);

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
      VALUES (${updatedUser.id}, ${adminGroupId})
      ON CONFLICT (user_id, group_id) DO NOTHING;
    `);

    console.log('✅ Successfully set up admin permissions!');
    console.log('Updated user info:', {
      id: updatedUser.id,
      username: updatedUser.username,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      role: updatedUser.role,
      permissionGroup: 'admin'
    });

  } catch (error) {
    console.error('Error setting up admin permissions:', error);
  }
}

// Run the setup
setupAdminPermissions();
