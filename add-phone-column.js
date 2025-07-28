import { neon } from '@neondatabase/serverless';

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('💡 Please set the DATABASE_URL environment variable');
  process.exit(1);
}

async function addPhoneColumn() {
  console.log('🔧 Adding phone column to users table...\n');
  
  try {
    // Create direct SQL connection
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('1. 📊 Checking if phone column already exists...');
    
    // Check if phone column exists
    const checkResult = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone'
    `;
    
    if (checkResult.length > 0) {
      console.log('   ✅ Phone column already exists in users table');
      return;
    }
    
    console.log('   ❌ Phone column does not exist, adding it...');
    
    // Add phone column
    console.log('2. 🔧 Adding phone column...');
    await sql`ALTER TABLE users ADD COLUMN phone text`;
    console.log('   ✅ Phone column added successfully');
    
    // Add unique constraint
    console.log('3. 🔒 Adding unique constraint...');
    await sql`ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone)`;
    console.log('   ✅ Unique constraint added successfully');
    
    console.log('\n🎉 Phone column has been successfully added to the users table!');
    console.log('💡 You can now import clients with phone numbers.');
    
  } catch (error) {
    console.error('❌ Error adding phone column:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('💡 The phone column or constraint already exists');
    } else {
      console.log('💡 Please check your database connection and try again');
    }
  }
}

addPhoneColumn(); 