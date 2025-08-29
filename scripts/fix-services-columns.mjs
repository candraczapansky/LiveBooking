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
    console.log('Ensuring services buffer time columns exist...');
    await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_time_before INTEGER DEFAULT 0`;
    await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_time_after INTEGER DEFAULT 0`;
    console.log('✅ services.buffer_time_before / buffer_time_after verified.');
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error('Migration failed:', e?.message || e);
  process.exit(1);
});


