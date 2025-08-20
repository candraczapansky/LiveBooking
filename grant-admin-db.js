import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from './server/schema.ts';

// Get database URL from config
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/salon_management';

// Initialize database connection
const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

async function grantAdminAccess(userId) {
  try {
    console.log(`Attempting to grant admin access to user ID: ${userId}`);

    // Get current user info
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));

    if (!user) {
      console.error(`User with ID ${userId} not found`);
      return;
    }

    console.log('Current user info:', {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    });

    if (user.role === 'admin') {
      console.log('User already has admin role');
      return;
    }

    // Update user role to admin
    const [updatedUser] = await db
      .update(schema.users)
      .set({ role: 'admin' })
      .where(eq(schema.users.id, userId))
      .returning();

    console.log('✅ Successfully updated user role!');
    console.log('Updated user info:', {
      id: updatedUser.id,
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role
    });

  } catch (error) {
    console.error('Error updating user role:', error);
  }
}

// Get user ID from command line argument or default to 72
const userId = parseInt(process.argv[2] || '72');

// Run the update
grantAdminAccess(userId);