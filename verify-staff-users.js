import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const emails = [
  'annabellie573@gmail.com',
  'hdonley@yahoo.com',
  'oviedo.lupe08@gmail.com',
  'marinafanning123@gmail.com',
  'jbreece44@gmail.com',
  'ellen.karman5@gmail.com',
  'sydni.prof@gmail.com',
  'Ninisong819@gmail.com',
  'kistyferguson@gmail.com',
  'jrbeller@gmail.com',
  'coleysonja@gmail.com',
  'czapanskycandra@gmail.com',
  'jennmullings@gmail.com',
  'evaarred@gmail.com',
  'flutterbrandfrontdesk@gmail.com',
  'whitley_caldwell@yahoo.com',
  'hudsonriley03@gmail.com',
  'kelleranna244@gmail.com',
  'kelsie005561@outlook.com',
  'memphiscase14@gmail.com',
  'kczapansky@icloud.com',
  'noemail@email.com',
  'nsmith8397@yahoo.com',
  'miranda.sappington96@gmail.com',
  'tootiep1006@gmail.com',
  'jacque.grimm@yahoo.com',
  'kcczapansky@yahoo.com',
  'marleighallwelt@gmail.com',
];

async function main() {
  const users = await sql`
    SELECT id, username, email, role, first_name, last_name, phone
    FROM users
    WHERE LOWER(email) = ANY(${emails.map(e => e.toLowerCase())})
    ORDER BY id
  `;

  const ids = users.map(u => u.id);
  let staff = [];
  if (ids.length) {
    staff = await sql`
      SELECT id, user_id AS userId, title
      FROM staff
      WHERE user_id = ANY(${ids})
      ORDER BY id
    `;
  }

  console.log(JSON.stringify({ users, staff }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });


