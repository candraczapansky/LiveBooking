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

async function listUsers() {
  try {
    // Get all users
    const result = await db.execute(sql`
      SELECT id, username, first_name, last_name, role
      FROM users
      ORDER BY id;
    `);

    console.log('\nAvailable users:');
    result.rows.forEach(user => {
      console.log(`- ${user.username} (${user.first_name} ${user.last_name}) - Role: ${user.role} [ID: ${user.id}]`);
    });

  } catch (error) {
    console.error('Error listing users:', error);
  }
}

// Run the query
listUsers();


