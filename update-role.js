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

async function updateRole() {
  try {
    console.log('Updating user role...');

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
    console.log('✅ Successfully updated user role!');
    console.log('Updated user info:', {
      id: updatedUser.id,
      username: updatedUser.username,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      role: updatedUser.role
    });

  } catch (error) {
    console.error('Error updating user role:', error);
  }
}

// Run the update
updateRole();