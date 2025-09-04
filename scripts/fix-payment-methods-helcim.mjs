import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set");
}

const sql = neon(databaseUrl);

async function fixPaymentMethodsForHelcim() {
  try {
    console.log('Starting migration: Fixing saved_payment_methods for Helcim...');
    
    // Make square_card_id nullable
    console.log('1. Making square_card_id nullable...');
    await sql`ALTER TABLE saved_payment_methods ALTER COLUMN square_card_id DROP NOT NULL`;
    console.log('   ✓ square_card_id is now nullable');
    
    // Ensure helcim_card_id column exists
    console.log('2. Ensuring helcim_card_id column exists...');
    await sql`ALTER TABLE saved_payment_methods ADD COLUMN IF NOT EXISTS helcim_card_id TEXT`;
    console.log('   ✓ helcim_card_id column confirmed');
    
    // Update any existing records that have square_card_id but no helcim_card_id
    console.log('3. Migrating existing card IDs from Square to Helcim...');
    const result = await sql`
      UPDATE saved_payment_methods 
      SET helcim_card_id = square_card_id 
      WHERE helcim_card_id IS NULL AND square_card_id IS NOT NULL
      RETURNING id
    `;
    console.log(`   ✓ Migrated ${result.length} existing cards to use Helcim`);
    
    // Add comments for documentation
    console.log('4. Adding column documentation...');
    await sql`COMMENT ON COLUMN saved_payment_methods.square_card_id IS 'Legacy Square card ID - kept for backward compatibility'`;
    await sql`COMMENT ON COLUMN saved_payment_methods.helcim_card_id IS 'Helcim card ID - primary payment method identifier'`;
    console.log('   ✓ Column documentation added');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('The saved_payment_methods table is now ready for Helcim.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run the migration
fixPaymentMethodsForHelcim();
