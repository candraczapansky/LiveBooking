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

async function runMigration() {
  try {
    console.log('Running migration...');

    // Read and run the migration SQL
    const migrationSql = fs.readFileSync('./migrations/0010_add_permissions_tables.sql', 'utf8');
    await db.execute(sql.raw(migrationSql));

    console.log('✅ Migration completed successfully!');

    // Assign admin user to admin group
    const adminGroupResult = await db.execute(sql`
      SELECT id FROM permission_groups WHERE name = 'admin';
    `);

    if (adminGroupResult.rows.length > 0) {
      const adminGroupId = adminGroupResult.rows[0].id;
      await db.execute(sql`
        INSERT INTO user_permission_groups (user_id, group_id)
        VALUES (1, ${adminGroupId})
        ON CONFLICT (user_id, group_id) DO NOTHING;
      `);
      console.log('✅ Admin user assigned to admin group!');
    }

  } catch (error) {
    console.error('Error running migration:', error);
  }
}

// Run the migration
runMigration();