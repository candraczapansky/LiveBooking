// db-cleanup.js
const { Client } = require('pg');

const TABLES_TO_CLEAN = [
  'appointments',
  'appointment_history',
  'cancelled_appointments',
  'client_memberships',
  'payments',
  'saved_payment_methods',
  'saved_gift_cards',
  'gift_cards',
  'gift_card_transactions',
  'marketing_campaigns',
  'marketing_campaign_recipients',
  'notifications',
  'payroll_history',
  'sales_history',
  'staff_services',
  'staff_schedules',
  'time_clock_entries',
  'user_color_preferences',
  'rooms',
  'devices',
  'services',
  'service_categories',
  'memberships',
  'products',
  'automation_rules',
];

const ADMIN_EMAIL = 'admin@admin.com'; // Change if your admin email is different

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGHOST ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  // 1. Print all table names
  const tablesRes = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
  const tableNames = tablesRes.rows.map(r => r.table_name);
  console.log('Tables in database:', tableNames);

  // 2. Print row count for each table
  for (const table of tableNames) {
    const countRes = await client.query(`SELECT COUNT(*) FROM "${table}"`);
    console.log(`Table ${table}: ${countRes.rows[0].count} rows`);
  }

  // 3. Clean up non-essential/test/demo tables
  for (const table of TABLES_TO_CLEAN) {
    if (tableNames.includes(table)) {
      await client.query(`DELETE FROM "${table}"`);
      console.log(`Cleared all rows from ${table}`);
    }
  }

  // 4. Clean up users table (keep only admin)
  if (tableNames.includes('users')) {
    await client.query(`DELETE FROM users WHERE email != $1`, [ADMIN_EMAIL]);
    console.log('Deleted all users except admin');
  }

  // 5. Ensure business_settings table exists and has a default row
  if (tableNames.includes('business_settings')) {
    const res = await client.query('SELECT COUNT(*) FROM business_settings');
    if (parseInt(res.rows[0].count) === 0) {
      await client.query(`INSERT INTO business_settings (
        business_name, address, phone, email, website, timezone, currency, tax_rate, receipt_footer, created_at, updated_at
      ) VALUES (
        'Your Business Name',
        '123 Main St',
        '555-123-4567',
        'info@example.com',
        'https://yourwebsite.com',
        'America/New_York',
        'USD',
        0.08,
        'Thank you for your business!',
        NOW(),
        NOW()
      )`);
      console.log('Inserted default row into business_settings');
    } else {
      console.log('business_settings table already has data');
    }
  }

  // 6. Print summary
  console.log('\nDatabase cleanup complete!');
  await client.end();
}

main().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
}); 