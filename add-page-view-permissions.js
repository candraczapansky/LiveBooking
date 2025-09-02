import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

// This script adds page-level 'view' permissions for all app pages.
// It ONLY inserts rows if they don't already exist. It does not delete or update existing data.

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const client = neon(DATABASE_URL);
const db = drizzle(client);

// Define page resources (snake_case) and friendly names for descriptions
const PAGE_PERMISSIONS = [
  { resource: 'dashboard', label: 'Dashboard' },
  { resource: 'services', label: 'Services' },
  { resource: 'clients', label: 'Clients' },
  { resource: 'clients_import', label: 'Clients Import' },
  { resource: 'staff', label: 'Staff' },
  { resource: 'pos', label: 'Point of Sale' },
  { resource: 'products', label: 'Products' },
  { resource: 'gift_certificates', label: 'Gift Certificates' },
  { resource: 'rooms', label: 'Rooms' },
  { resource: 'devices', label: 'Devices' },
  { resource: 'appointments', label: 'Appointments' },
  { resource: 'classes', label: 'Classes' },
  { resource: 'memberships', label: 'Memberships' },
  { resource: 'reports', label: 'Reports' },
  { resource: 'marketing', label: 'Marketing' },
  { resource: 'automations', label: 'Automations' },
  { resource: 'note_templates', label: 'Note Templates' },
  { resource: 'phone', label: 'Phone' },
  { resource: 'forms', label: 'Forms' },
  { resource: 'documents', label: 'Documents' },
  { resource: 'ai_messaging', label: 'AI Messaging' },
  { resource: 'payroll', label: 'Payroll' },
  { resource: 'locations', label: 'Locations' },
  { resource: 'permissions', label: 'Permissions' },
  { resource: 'time_clock', label: 'Time Clock' },
  { resource: 'email_test', label: 'Email Test' },
  { resource: 'settings', label: 'Settings' },
  { resource: 'schedule', label: 'Schedule' },
  { resource: 'staff_schedule', label: 'Staff Schedule' },
  { resource: 'booking_test', label: 'Booking Test' },
];

async function addPageViewPermissions() {
  try {
    console.log('Adding page-level view permissions (idempotent)...');

    let created = 0;
    let skipped = 0;

    for (const page of PAGE_PERMISSIONS) {
      const name = `view_${page.resource}`;
      const description = `View ${page.label} page`;
      const category = 'pages'; // Group these under a simple Pages category for UI organization
      const action = 'view';
      const resource = page.resource;

      try {
        const result = await db.execute(sql`
          INSERT INTO permissions (name, description, category, action, resource, is_system)
          VALUES (${name}, ${description}, ${category}, ${action}, ${resource}, true)
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `);

        if (result?.rows && result.rows.length > 0) {
          created += 1;
          console.log(`✓ Created permission: ${name}`);
        } else {
          skipped += 1;
          console.log(`• Skipped (exists): ${name}`);
        }
      } catch (err) {
        // If any structured error occurs, log and continue with the next permission
        console.error(`Error inserting permission ${name}:`, err?.message || err);
      }
    }

    console.log(`\nDone. Created: ${created}, Skipped (already existed): ${skipped}`);
  } catch (error) {
    console.error('Failed to add page view permissions:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  addPageViewPermissions().then(() => {
    console.log('Page view permissions setup complete.');
    process.exit(0);
  }).catch((err) => {
    console.error('Page view permissions setup failed:', err);
    process.exit(1);
  });
}

export { addPageViewPermissions };



