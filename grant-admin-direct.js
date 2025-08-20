import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function grantAdminAccess(userId) {
  try {
    console.log(`Attempting to grant admin access to user ID: ${userId}`);

    // Get current user info
    const result = await db.execute(sql`
      SELECT id, username, first_name, last_name, role
      FROM users
      WHERE id = ${userId}
    `);

    if (result.rows.length === 0) {
      console.error(`User with ID ${userId} not found`);
      
      // List available users
      const users = await db.execute(sql`
        SELECT id, username, first_name, last_name, role
        FROM users
        ORDER BY id
      `);
      
      console.log('\nAvailable users:');
      users.rows.forEach(user => {
        console.log(`- ${user.username} (${user.first_name} ${user.last_name}) - Role: ${user.role} [ID: ${user.id}]`);
      });
      return;
    }

    const user = result.rows[0];
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
      WHERE id = ${userId}
      RETURNING id, username, first_name, last_name, role
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

// If no user ID is provided, list all users
if (!process.argv[2]) {
  console.log('No user ID provided. Listing all users...');
  grantAdminAccess(null);
} else {
  // Get user ID from command line argument
  const userId = parseInt(process.argv[2]);
  if (isNaN(userId)) {
    console.error('Invalid user ID. Please provide a valid number.');
    process.exit(1);
  }
  grantAdminAccess(userId);
}