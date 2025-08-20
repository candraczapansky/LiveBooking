import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

// Get database URL from environment or use default
const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

// Initialize database connection
const client = neon(DATABASE_URL);
const db = drizzle(client);

async function checkPermissions() {
  try {
    console.log('\nChecking permission tables...');

    // Check permission_categories
    const categoriesResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM permission_categories;
    `);
    console.log(`\nPermission Categories: ${categoriesResult.rows[0].count}`);

    // Check permissions
    const permissionsResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM permissions;
    `);
    console.log(`Permissions: ${permissionsResult.rows[0].count}`);

    // Check permission_groups
    const groupsResult = await db.execute(sql`
      SELECT * FROM permission_groups;
    `);
    console.log('\nPermission Groups:');
    groupsResult.rows.forEach(group => {
      console.log(`- ${group.name}: ${group.description}`);
    });

    // Check user_permission_groups
    const userGroupsResult = await db.execute(sql`
      SELECT u.username, u.role, pg.name as group_name
      FROM users u
      LEFT JOIN user_permission_groups upg ON u.id = upg.user_id
      LEFT JOIN permission_groups pg ON upg.group_id = pg.id;
    `);
    console.log('\nUser Permissions:');
    userGroupsResult.rows.forEach(row => {
      console.log(`- ${row.username} (${row.role}): ${row.group_name || 'No group'}`);
    });

  } catch (error) {
    console.error('Error checking permissions:', error);
  }
}

// Run the check
checkPermissions();
