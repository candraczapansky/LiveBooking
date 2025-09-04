import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set");
}

const sql = neon(databaseUrl);

async function addCardFieldsToAppointments() {
  try {
    console.log('Starting migration: Adding card fields to appointments table...');
    
    // Add payment card fields to appointments table
    console.log('1. Adding payment card fields to appointments table...');
    
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_card_token TEXT`;
    console.log('   ✓ payment_card_token column added');
    
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_card_brand TEXT`;
    console.log('   ✓ payment_card_brand column added');
    
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_card_last4 TEXT`;
    console.log('   ✓ payment_card_last4 column added');
    
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_card_exp_month INTEGER`;
    console.log('   ✓ payment_card_exp_month column added');
    
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_card_exp_year INTEGER`;
    console.log('   ✓ payment_card_exp_year column added');
    
    // Add comments for documentation
    console.log('2. Adding column documentation...');
    await sql`COMMENT ON COLUMN appointments.payment_card_token IS 'Helcim payment token for this appointment'`;
    await sql`COMMENT ON COLUMN appointments.payment_card_brand IS 'Card brand (Visa, Mastercard, etc.) for this appointment'`;
    await sql`COMMENT ON COLUMN appointments.payment_card_last4 IS 'Last 4 digits of card for this appointment'`;
    await sql`COMMENT ON COLUMN appointments.payment_card_exp_month IS 'Card expiration month for this appointment'`;
    await sql`COMMENT ON COLUMN appointments.payment_card_exp_year IS 'Card expiration year for this appointment'`;
    console.log('   ✓ Column documentation added');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('Appointments table now has card fields for single-appointment payments.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the migration
addCardFieldsToAppointments();
