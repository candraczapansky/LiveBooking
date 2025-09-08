import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  const sql = neon(DATABASE_URL);
  try {
    await sql`SELECT 1`;
    const rows = await sql`
      SELECT 
        s.id AS staff_id,
        s.user_id,
        s.title,
        s.is_active,
        u.username,
        u.first_name,
        u.last_name,
        u.email
      FROM staff s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.id
    `;
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Query failed:', e?.message || e);
    process.exit(1);
  }
}

main();


