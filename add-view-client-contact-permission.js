import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

// Adds the 'view_client_contact_info' permission if missing. No updates/deletes.

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const client = neon(DATABASE_URL);
const db = drizzle(client);

async function addPermission() {
  try {
    const name = 'view_client_contact_info';
    const description = 'View client email and phone';
    const category = 'clients';
    const action = 'view';
    const resource = 'client_contact_info';

    const result = await db.execute(sql`
      INSERT INTO permissions (name, description, category, action, resource, is_system)
      VALUES (${name}, ${description}, ${category}, ${action}, ${resource}, true)
      ON CONFLICT (name) DO NOTHING
      RETURNING id
    `);

    if (result?.rows && result.rows.length > 0) {
      console.log(`✓ Created permission: ${name}`);
    } else {
      console.log(`• Skipped (exists): ${name}`);
    }
  } catch (err) {
    console.error('Failed to add permission:', err?.message || err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  addPermission().then(() => {
    console.log('Done.');
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { addPermission };


