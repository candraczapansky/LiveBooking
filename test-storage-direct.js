import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from './shared/schema.ts';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function testStorageDirect() {
  console.log('🧪 Testing Storage Direct\n');

  try {
    // Test 1: Direct Drizzle query (same as storage layer)
    console.log('1. 📊 Testing direct Drizzle query...');
    const drizzleResult = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).limit(3);
    
    console.log('   Drizzle select result:');
    drizzleResult.forEach((user, index) => {
      console.log(`   User ${index + 1}:`, user);
      console.log(`   User ${index + 1} keys:`, Object.keys(user));
      console.log(`   User ${index + 1} has phone:`, 'phone' in user);
      if ('phone' in user) {
        console.log(`   User ${index + 1} phone: "${user.phone}"`);
      }
    });

    // Test 2: Raw SQL query (same data)
    console.log('\n2. 🔍 Testing raw SQL query...');
    const rawResult = await sql`
      SELECT id, username, email, first_name, last_name, phone, role, created_at
      FROM users
      LIMIT 3
    `;
    
    console.log('   Raw SQL result:');
    rawResult.forEach((user, index) => {
      console.log(`   User ${index + 1}:`, user);
      console.log(`   User ${index + 1} keys:`, Object.keys(user));
      console.log(`   User ${index + 1} has phone:`, 'phone' in user);
      if ('phone' in user) {
        console.log(`   User ${index + 1} phone: "${user.phone}"`);
      }
    });

    // Test 3: Check if there's a difference between Drizzle and Raw SQL
    console.log('\n3. 🔄 Comparing Drizzle vs Raw SQL...');
    
    if (drizzleResult.length > 0 && rawResult.length > 0) {
      const drizzleUser = drizzleResult[0];
      const rawUser = rawResult[0];
      
      console.log('   Drizzle user keys:', Object.keys(drizzleUser));
      console.log('   Raw SQL user keys:', Object.keys(rawUser));
      
      const drizzleHasPhone = 'phone' in drizzleUser;
      const rawHasPhone = 'phone' in rawUser;
      
      console.log(`   Drizzle has phone: ${drizzleHasPhone}`);
      console.log(`   Raw SQL has phone: ${rawHasPhone}`);
      
      if (drizzleHasPhone && rawHasPhone) {
        console.log(`   Drizzle phone: "${drizzleUser.phone}"`);
        console.log(`   Raw SQL phone: "${rawUser.phone}"`);
        console.log(`   Phone values match: ${drizzleUser.phone === rawUser.phone}`);
      }
    }

    // Test 4: Check specific users with known phone numbers
    console.log('\n4. 📱 Testing users with known phone numbers...');
    const usersWithPhone = await sql`
      SELECT id, username, email, first_name, last_name, phone, role, created_at
      FROM users
      WHERE phone IS NOT NULL AND phone != ''
      LIMIT 3
    `;
    
    console.log('   Users with phone numbers:');
    usersWithPhone.forEach((user, index) => {
      console.log(`   User ${index + 1}:`, user);
      console.log(`   User ${index + 1} keys:`, Object.keys(user));
      console.log(`   User ${index + 1} phone: "${user.phone}"`);
    });

  } catch (error) {
    console.error('❌ Error testing storage direct:', error.message);
  }
}

testStorageDirect(); 