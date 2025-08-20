// Import required modules
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
    // First, check current user info
    const userResult = await db.execute(sql`
      SELECT id, username, first_name, last_name, role
      FROM users
      WHERE id = 72;
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

    if (user.role === 'admin') {
      console.log('User already has admin role');
      return;
    }

    // Update user role to admin
    const updateResult = await db.execute(sql`
      UPDATE users
      SET role = 'admin'
      WHERE id = 72
      RETURNING id, username, first_name, last_name, role;
    `);

    const updatedUser = updateResult.rows[0];
    console.log('✅ Successfully granted admin permissions!');
    console.log('Updated user info:', {
      id: updatedUser.id,
      username: updatedUser.username,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      role: updatedUser.role
    });

  } catch (error) {
    console.error('Error granting admin permissions:', error);
  }
}

// Run the update
grantAdminAccess();


