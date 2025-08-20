import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function updateSchema() {
  try {
    console.log('🔄 Updating database schema...');
    
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Add new columns to appointments table
    console.log('Adding payment fields to appointments table...');
    await sql`ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS total_amount DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS tip_amount DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS discount_amount DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS tax_amount DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS payment_method TEXT,
      ADD COLUMN IF NOT EXISTS payment_reference TEXT,
      ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
      ADD COLUMN IF NOT EXISTS rescheduled_from INTEGER REFERENCES appointments(id),
      ADD COLUMN IF NOT EXISTS rescheduled_to INTEGER REFERENCES appointments(id)`;
    console.log('✅ Added payment fields');

    // Create indexes
    console.log('Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_appointments_payment_date ON appointments(payment_date)`;
    console.log('✅ Created indexes');

    console.log('🎉 Schema update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    process.exit(1);
  }
}

updateSchema();
