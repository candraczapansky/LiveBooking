import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const sql = postgres(DATABASE_URL);
  try {
    console.log('Ensuring rooms table and columns exist...');
    await sql`CREATE TABLE IF NOT EXISTS rooms (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`;
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT`;
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1`;
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS location_id INTEGER`;
    console.log('✅ Rooms table verified/updated.');
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error('Migration failed:', e?.message || e);
  process.exit(1);
});


