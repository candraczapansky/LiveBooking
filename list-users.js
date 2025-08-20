import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

// Get database URL from environment or use default
const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

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


