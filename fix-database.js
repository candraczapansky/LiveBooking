import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function fixDatabase() {
  console.log('🔧 Fixing database schema...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Add missing columns
    console.log('\n📝 Adding missing columns...');
    
    // Add square_customer_id to users table
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS square_customer_id TEXT`;
    console.log('✅ Added square_customer_id to users table');
    
    // Add helcim_customer_id to users table
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS helcim_customer_id TEXT`;
    console.log('✅ Added helcim_customer_id to users table');
    
    // Add square_payment_id to payments table
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS square_payment_id TEXT`;
    console.log('✅ Added square_payment_id to payments table');
    
    // Add helcim_payment_id to payments table
    await sql`ALTER TABLE payments ADD COLUMN IF NOT EXISTS helcim_payment_id TEXT`;
    console.log('✅ Added helcim_payment_id to payments table');
    
    // Add square_card_id to saved_payment_methods table
    await sql`ALTER TABLE saved_payment_methods ADD COLUMN IF NOT EXISTS square_card_id TEXT`;
    console.log('✅ Added square_card_id to saved_payment_methods table');
    
    // Add helcim_card_id to saved_payment_methods table
    await sql`ALTER TABLE saved_payment_methods ADD COLUMN IF NOT EXISTS helcim_card_id TEXT`;
    console.log('✅ Added helcim_card_id to saved_payment_methods table');
    
    // Add square_subscription_id to client_memberships table
    await sql`ALTER TABLE client_memberships ADD COLUMN IF NOT EXISTS square_subscription_id TEXT`;
    console.log('✅ Added square_subscription_id to client_memberships table');
    
    // Add helcim_payment_id to sales_history table
    await sql`ALTER TABLE sales_history ADD COLUMN IF NOT EXISTS helcim_payment_id TEXT`;
    console.log('✅ Added helcim_payment_id to sales_history table');
    
    // Verify the columns exist
    console.log('\n🔍 Verifying columns...');
    
    const usersColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('square_customer_id', 'helcim_customer_id')
      ORDER BY column_name
    `;
    
    console.log('Users table columns found:', usersColumns.map(c => c.column_name));
    
    const paymentsColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name IN ('square_payment_id', 'helcim_payment_id')
      ORDER BY column_name
    `;
    
    console.log('Payments table columns found:', paymentsColumns.map(c => c.column_name));
    
    console.log('\n🎉 Database schema fixed successfully!');
    console.log('✅ All missing columns have been added');
    console.log('✅ Users, staff, and schedules should now load properly');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  }
}

fixDatabase().catch(console.error); 