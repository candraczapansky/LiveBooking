import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from './shared/schema.ts';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function testPhoneColumnMismatch() {
  console.log('🧪 Testing Phone Column Mismatch\n');

  try {
    // Test 1: Check the actual database column names
    console.log('1. 📊 Checking database column names...');
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `;
    
    console.log('   All columns in users table:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Test 2: Check if there are any phone-related columns
    console.log('\n2. 📱 Checking for phone-related columns...');
    const phoneColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE '%phone%'
    `;
    
    console.log('   Phone-related columns:');
    phoneColumns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Test 3: Try to select phone with different possible column names
    console.log('\n3. 🔍 Testing different phone column names...');
    
    // Try 'phone'
    try {
      const phoneTest = await sql`SELECT id, phone FROM users WHERE phone IS NOT NULL LIMIT 1`;
      console.log('   "phone" column exists:', phoneTest.length > 0);
      if (phoneTest.length > 0) {
        console.log('   Sample phone value:', phoneTest[0].phone);
      }
    } catch (error) {
      console.log('   "phone" column does not exist or has error:', error.message);
    }

    // Try 'phone_number'
    try {
      const phoneNumberTest = await sql`SELECT id, phone_number FROM users WHERE phone_number IS NOT NULL LIMIT 1`;
      console.log('   "phone_number" column exists:', phoneNumberTest.length > 0);
      if (phoneNumberTest.length > 0) {
        console.log('   Sample phone_number value:', phoneNumberTest[0].phone_number);
      }
    } catch (error) {
      console.log('   "phone_number" column does not exist or has error:', error.message);
    }

    // Try 'telephone'
    try {
      const telephoneTest = await sql`SELECT id, telephone FROM users WHERE telephone IS NOT NULL LIMIT 1`;
      console.log('   "telephone" column exists:', telephoneTest.length > 0);
      if (telephoneTest.length > 0) {
        console.log('   Sample telephone value:', telephoneTest[0].telephone);
      }
    } catch (error) {
      console.log('   "telephone" column does not exist or has error:', error.message);
    }

    // Test 4: Check what Drizzle returns vs raw SQL
    console.log('\n4. 🔄 Comparing Drizzle vs Raw SQL...');
    
    // Drizzle select
    const drizzleResult = await db.select({
      id: users.id,
      phone: users.phone
    }).from(users).limit(1);
    
    console.log('   Drizzle select result:', drizzleResult[0]);
    
    // Raw SQL select
    const rawResult = await sql`SELECT id, phone FROM users LIMIT 1`;
    console.log('   Raw SQL select result:', rawResult[0]);

  } catch (error) {
    console.error('❌ Error testing phone column mismatch:', error.message);
  }
}

testPhoneColumnMismatch(); 