import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

// Get database URL from environment
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

// Initialize database connection
const client = neon(DATABASE_URL);
const db = drizzle(client);

async function checkTables() {
  try {
    console.log('Checking tables...');

    // Check if tables exist
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\nExisting tables:');
    result.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Check permissions table content if it exists
    try {
      const permissionsResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM permissions;
      `);
      console.log('\nPermissions count:', permissionsResult.rows[0].count);

      const permissionsSample = await db.execute(sql`
        SELECT * FROM permissions LIMIT 3;
      `);
      console.log('Sample permissions:', permissionsSample.rows);
    } catch (error) {
      console.log('\nPermissions table not found or error:', error.message);
    }

    // Check permission_groups table content if it exists
    try {
      const groupsResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM permission_groups;
      `);
      console.log('\nPermission Groups count:', groupsResult.rows[0].count);

      const groupsSample = await db.execute(sql`
        SELECT * FROM permission_groups LIMIT 3;
      `);
      console.log('Sample groups:', groupsSample.rows);
    } catch (error) {
      console.log('\nPermission Groups table not found or error:', error.message);
    }

    // Check user_permission_groups table content if it exists
    try {
      const userGroupsResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM user_permission_groups;
      `);
      console.log('\nUser Permission Groups count:', userGroupsResult.rows[0].count);

      const userGroupsSample = await db.execute(sql`
        SELECT * FROM user_permission_groups LIMIT 3;
      `);
      console.log('Sample user groups:', userGroupsSample.rows);
    } catch (error) {
      console.log('\nUser Permission Groups table not found or error:', error.message);
    }

  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

// Run the check
checkTables();
