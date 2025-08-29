import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

/**
 * Idempotently add staff users (role = 'staff') and corresponding staff records.
 * - Does NOT modify existing unrelated data
 * - If a user with the email exists and role != 'staff', upgrade role to 'staff'
 * - Ensures a staff row exists pointing to the user
 * - Uses sensible defaults for staff.title and commission settings
 */

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const client = neon(DATABASE_URL);
const db = drizzle(client);

function normalizePhone(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Keep as-is; DB doesn't enforce strict formatting
  return s;
}

function nameParts(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}

function usernameFromEmailOrName(email, fullName) {
  if (email && String(email).includes('@')) {
    return String(email).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `staff${Date.now()}`;
  }
  const base = String(fullName || 'staff').toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff';
  return `${base}${Date.now()}`;
}

// Commission defaults: 45% expressed as 0.45
const DEFAULT_COMMISSION_RATE = 0.45;
const DEFAULT_TITLE_BY_GROUP = {
  'Stylists': 'Stylist',
  'Training': 'Training',
  'Admin': 'Admin',
  'Front Desk': 'Front Desk',
};

const INPUT = [
  { name: 'Annabelle Bowers', group: 'Training', phone: '+1 (918) 810-7078', email: 'annabellie573@gmail.com' },
  { name: 'Hailey Donley', group: 'Training', phone: '+1 (918) 319-7871', email: 'hdonley@yahoo.com' },
  { name: 'Lupe Oviedo', group: 'Training', phone: '+1 (417) 629-8493', email: 'oviedo.lupe08@gmail.com' },
  { name: 'Marina Fanning', group: 'Training', phone: '+1 (303) 550-9758', email: 'marinafanning123@gmail.com' },
  { name: 'Jade Reece', group: 'Stylists', phone: '+1 (918) 906-0139', email: 'jbreece44@gmail.com' },
  { name: 'Ellen Karman', group: 'Training', phone: '+1 (918) 289-7154', email: 'ellen.karman5@gmail.com' },
  // Old Staff entries are included per request but role should still be 'staff'
  { name: 'Sydni Brannon', group: 'Old Staff', phone: '+1 (918) 373-6598', email: 'sydni.prof@gmail.com' },
  { name: 'Valerie Song', group: 'Old Staff', phone: '+1 (918) 740-9934', email: 'Ninisong819@gmail.com' },
  { name: 'Kisty Ferguson', group: 'Stylists', phone: '+1 (918) 800-9734', email: 'kistyferguson@gmail.com' },
  { name: 'Jamie Beller', group: 'Old Staff', phone: '+1 (918) 638-9844', email: 'jrbeller@gmail.com' },
  { name: 'Sonja McIntire', group: 'Old Staff', phone: '(918) 289-3703', email: 'coleysonja@gmail.com' },
  { name: 'Candra Czapansky', group: 'Admin', phone: '+1 (918) 504-8902', email: 'czapanskycandra@gmail.com' },
  { name: 'Jenn Mullings', group: 'Stylists', phone: '+1 (918) 698-3221', email: 'jennmullings@gmail.com' },
  { name: 'Eva Arredondo', group: 'Stylists', phone: '+1 (918) 442-8983', email: 'evaarred@gmail.com' },
  { name: 'Front Desk', group: 'Front Desk', phone: '+1 (918) 504-8902', email: 'flutterbrandfrontdesk@gmail.com' },
  { name: 'Whitley Guey', group: 'Stylists', phone: '(918) 361-1119', email: 'whitley_caldwell@yahoo.com' },
  { name: 'Riley Hudson', group: 'Admin', phone: '(405) 343-9353', email: 'hudsonriley03@gmail.com' },
  { name: 'Anna Keller', group: 'Stylists', phone: '(918) 497-9853', email: 'kelleranna244@gmail.com' },
  { name: 'Kelsie Wensman', group: 'Old Staff', phone: '(918) 694-0692', email: 'kelsie005561@outlook.com' },
  { name: 'Memphis Case', group: 'Stylists', phone: '(918) 728-1087', email: 'memphiscase14@gmail.com' },
  { name: 'Kelsey Czapansky', group: 'Stylists', phone: '(918) 830-0617', email: 'kczapansky@icloud.com' },
  { name: 'Rita Williams', group: 'Stylists', phone: '(918) 407-0211', email: 'noemail@email.com' },
  { name: 'Nicole Smith', group: 'Old Staff', phone: '(918) 695-9830', email: 'nsmith8397@yahoo.com' },
  { name: 'Miranda Sappington', group: 'Old Staff', phone: '(918) 894-9122', email: 'miranda.sappington96@gmail.com' },
  { name: 'Lynetta Porter', group: 'Old Staff', phone: '(918) 351-3233', email: 'tootiep1006@gmail.com' },
  { name: 'Jacque Grimm', group: 'Old Staff', phone: '(918) 695-7294', email: 'jacque.grimm@yahoo.com' },
  { name: 'Kim Czapansky', group: 'Old Staff', phone: '(918) 388-7884', email: 'kcczapansky@yahoo.com' },
  { name: 'Marleigh Allwelt', group: 'Old Staff', phone: '(918) 859-1232', email: 'marleighallwelt@gmail.com' },
];

async function ensureUserAndStaff(entry) {
  const email = String(entry.email || '').trim();
  const phone = normalizePhone(entry.phone);
  const { firstName, lastName } = nameParts(entry.name);
  const title = DEFAULT_TITLE_BY_GROUP[entry.group] || 'Staff';

  // 1) Ensure user exists with role=staff
  let user = null;
  try {
    const res = await db.execute(sql`SELECT id, username, email, role FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`);
    user = res?.rows?.[0] || null;
  } catch {}

  if (user) {
    // Upgrade role to staff if needed and update phone/name if missing
    if (user.role !== 'staff') {
      await db.execute(sql`UPDATE users SET role = 'staff' WHERE id = ${user.id}`);
    }
    await db.execute(sql`
      UPDATE users
      SET
        first_name = COALESCE(NULLIF(${firstName}, ''), first_name),
        last_name = COALESCE(NULLIF(${lastName}, ''), last_name),
        phone = COALESCE(NULLIF(${phone}, ''), phone)
      WHERE id = ${user.id}
    `);
  } else {
    // Create unique username from email or name
    const base = usernameFromEmailOrName(email, entry.name);
    let username = base;
    let attempts = 0;
    // Ensure username is unique
    while (attempts < 50) {
      const check = await db.execute(sql`SELECT 1 FROM users WHERE username = ${username} LIMIT 1`);
      if (!check?.rows?.length) break;
      attempts += 1;
      username = `${base}${attempts}`;
    }

    // Use a placeholder hashed password; app supports password reset for staff
    // For security, we don't compute bcrypt here; rely on existing flows to set password later.
    // Store a random string to satisfy NOT NULL.
    const placeholderPassword = `Temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const created = await db.execute(sql`
      INSERT INTO users (username, password, email, role, first_name, last_name, phone)
      VALUES (${username}, ${placeholderPassword}, ${email}, 'staff', ${firstName}, ${lastName}, ${phone})
      RETURNING id, username, email, role
    `);
    user = created.rows[0];
  }

  // 2) Ensure staff record exists for this user
  const staffRes = await db.execute(sql`SELECT id FROM staff WHERE user_id = ${user.id} LIMIT 1`);
  if (!staffRes?.rows?.length) {
    await db.execute(sql`
      INSERT INTO staff (user_id, title, bio, commission_type, commission_rate)
      VALUES (${user.id}, ${title}, ${''}, ${'commission'}, ${DEFAULT_COMMISSION_RATE})
    `);
  } else {
    // Update title if missing
    await db.execute(sql`
      UPDATE staff
      SET title = COALESCE(NULLIF(${title}, ''), title)
      WHERE user_id = ${user.id}
    `);
  }
}

async function main() {
  let added = 0;
  let updated = 0;
  const errors = [];
  for (const entry of INPUT) {
    try {
      // Basic sanity: require email
      if (!entry.email || !String(entry.email).includes('@')) {
        // Skip entries without valid email
        continue;
      }
      const before = await db.execute(sql`SELECT id, role FROM users WHERE LOWER(email) = LOWER(${entry.email}) LIMIT 1`);
      await ensureUserAndStaff(entry);
      const after = await db.execute(sql`SELECT id, role FROM users WHERE LOWER(email) = LOWER(${entry.email}) LIMIT 1`);
      if (!before?.rows?.length && after?.rows?.length) {
        added += 1;
      } else {
        updated += 1;
      }
    } catch (e) {
      errors.push(`${entry.name} <${entry.email}>: ${e?.message || e}`);
    }
  }

  console.log(JSON.stringify({ added, updated, errors }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


