import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from './shared/schema.ts';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function testDatabaseColumns() {
  console.log('🧪 Testing Database Column Names\n');

  try {
    // Test 1: Check if we can query the phone column directly
    console.log('1. 📊 Testing direct phone column query...');
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE '%phone%'
    `;
    
    console.log('   Phone-related columns found:');
    result.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    // Test 2: Try to select phone column directly
    console.log('\n2. 📱 Testing direct phone selection...');
    const phoneTest = await sql`
      SELECT id, phone 
      FROM users 
      WHERE phone IS NOT NULL 
      LIMIT 5
    `;
    
    console.log('   Users with phone numbers:');
    phoneTest.forEach(row => {
      console.log(`   - ID: ${row.id}, Phone: "${row.phone}"`);
    });

    // Test 3: Check what Drizzle returns
    console.log('\n3. 🔍 Testing Drizzle select...');
    const drizzleResult = await db.select({
      id: users.id,
      phone: users.phone
    }).from(users).limit(5);
    
    console.log('   Drizzle select result:');
    drizzleResult.forEach(row => {
      console.log(`   - ID: ${row.id}, Phone: "${row.phone}"`);
    });

    // Test 4: Check the full user object from Drizzle
    console.log('\n4. 📋 Testing full user object...');
    const fullUser = await db.select().from(users).limit(1);
    
    if (fullUser.length > 0) {
      console.log('   Full user object keys:', Object.keys(fullUser[0]));
      console.log('   Full user object:', fullUser[0]);
    }

  } catch (error) {
    console.error('❌ Error testing database columns:', error.message);
  }
}

testDatabaseColumns(); 