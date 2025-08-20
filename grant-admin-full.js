import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

// Get database URL from environment or use default
const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

// Initialize database connection
const client = neon(DATABASE_URL);
const db = drizzle(client);

async function grantAdminAccess() {
  try {
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

    // Get the Owner permission group ID
    const groupResult = await db.execute(sql`
      SELECT id, name
      FROM permission_groups
      WHERE name = 'Owner';
    `);

    if (groupResult.rows.length === 0) {
      console.log('Running permission seeding first...');
      // Run the permission seeding script
      await db.execute(sql`
        DO $$ 
        BEGIN
          -- Create permission categories
          INSERT INTO permission_categories (name, description)
          VALUES ('Client Management', 'Permissions related to client management')
          ON CONFLICT (name) DO NOTHING;

          -- Create Owner permission group if it doesn't exist
          INSERT INTO permission_groups (name, description, is_system)
          VALUES ('Owner', 'Full access to all features and data', true)
          ON CONFLICT (name) DO NOTHING;
        END $$;
      `);

      console.log('Permission seeding completed');
    }

    const ownerGroup = groupResult.rows[0] || (await db.execute(sql`
      SELECT id, name
      FROM permission_groups
      WHERE name = 'Owner';
    `)).rows[0];

    if (!ownerGroup) {
      console.error('Could not find or create Owner permission group');
      return;
    }

    // Assign user to Owner permission group
    await db.execute(sql`
      INSERT INTO user_permission_groups (user_id, group_id)
      VALUES (${updatedUser.id}, ${ownerGroup.id})
      ON CONFLICT (user_id, group_id) DO NOTHING;
    `);

    console.log('✅ Successfully assigned Owner permissions!');
    console.log('Updated user info:', {
      id: updatedUser.id,
      username: updatedUser.username,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      role: updatedUser.role,
      permissionGroup: 'Owner'
    });

  } catch (error) {
    console.error('Error granting admin permissions:', error);
  }
}

// Run the update
grantAdminAccess();
