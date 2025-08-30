import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

async function updateAdminName() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL must be set');
    process.exit(1);
  }

  const client = neon(DATABASE_URL);
  const db = drizzle(client);

  try {
    const result = await db.execute(sql`
      UPDATE users
      SET first_name = 'Admin', last_name = 'Account'
      WHERE username = 'admin'
      RETURNING id, username, first_name, last_name, role;
    `);

    const rows = result?.rows ?? result;
    if (!rows || rows.length === 0) {
      console.log('No user with username "admin" found. No changes made.');
      return;
    }

    const updated = rows[0];
    console.log('Updated admin user:', updated);
  } catch (err) {
    console.error('Failed to update admin name:', err?.message || err);
    process.exitCode = 1;
  }
}

updateAdminName();


