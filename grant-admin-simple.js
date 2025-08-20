import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

// Get database URL from environment or use default
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/salon_management';

// Initialize database connection
const client = neon(databaseUrl);
const db = drizzle(client);

async function grantAdminAccess() {
  try {
    // Update user role to admin
    const result = await db.execute(sql`
      UPDATE users
      SET role = 'admin'
      WHERE id = 72
      RETURNING id, username, first_name, last_name, role;
    `);

    if (result.rows.length === 0) {
      console.error('User not found');
      return;
    }

    const user = result.rows[0];
    console.log('✅ Successfully granted admin permissions!');
    console.log('User info:', {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    });

  } catch (error) {
    console.error('Error granting admin permissions:', error);
  }
}

// Run the update
grantAdminAccess();