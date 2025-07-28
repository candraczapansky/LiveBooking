import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function testStorageDebug() {
  console.log('🧪 Testing Storage Debug\n');

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
    }).from(users).where(eq(users.role, 'client')).limit(3);
    
    console.log('   Drizzle select result:');
    drizzleResult.forEach((user, index) => {
      console.log(`   User ${index + 1}:`, user);
      console.log(`   User ${index + 1} keys:`, Object.keys(user));
      console.log(`   User ${index + 1} has phone:`, 'phone' in user);
      if ('phone' in user) {
        console.log(`   User ${index + 1} phone: "${user.phone}"`);
      }
    });

    // Test 2: Check if there's a difference between what we get and what the API returns
    console.log('\n2. 🔍 Testing API response...');
    const response = await fetch('http://localhost:5000/api/users?role=client');
    const apiUsers = await response.json();
    
    if (apiUsers.length > 0) {
      console.log('   API response first user:', apiUsers[0]);
      console.log('   API response first user keys:', Object.keys(apiUsers[0]));
      console.log('   API response has phone:', 'phone' in apiUsers[0]);
    }

    // Test 3: Compare the results
    console.log('\n3. 🔄 Comparing results...');
    if (drizzleResult.length > 0 && apiUsers.length > 0) {
      const drizzleUser = drizzleResult[0];
      const apiUser = apiUsers[0];
      
      console.log('   Drizzle user keys:', Object.keys(drizzleUser));
      console.log('   API user keys:', Object.keys(apiUser));
      
      const drizzleHasPhone = 'phone' in drizzleUser;
      const apiHasPhone = 'phone' in apiUser;
      
      console.log(`   Drizzle has phone: ${drizzleHasPhone}`);
      console.log(`   API has phone: ${apiHasPhone}`);
      
      if (drizzleHasPhone && !apiHasPhone) {
        console.log('   ❌ ISSUE FOUND: Drizzle returns phone but API does not!');
        console.log(`   Drizzle phone: "${drizzleUser.phone}"`);
      } else if (drizzleHasPhone && apiHasPhone) {
        console.log('   ✅ Both have phone field');
      } else if (!drizzleHasPhone && !apiHasPhone) {
        console.log('   ⚠️  Neither has phone field');
      }
    }

  } catch (error) {
    console.error('❌ Error testing storage debug:', error.message);
  }
}

testStorageDebug(); 