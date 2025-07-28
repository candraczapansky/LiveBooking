import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Simulate the storage layer methods
class TestStorage {
  async getAllUsers() {
    return await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users);
  }

  async getUsersByRole(role) {
    return await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.role, role));
  }

  async searchUsers(query) {
    const searchTerm = `%${query}%`;
    return await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .where(
        sql`LOWER(${users.firstName}) LIKE LOWER(${searchTerm}) OR LOWER(${users.lastName}) LIKE LOWER(${searchTerm}) OR LOWER(${users.email}) LIKE LOWER(${searchTerm}) OR LOWER(${users.phone}) LIKE LOWER(${searchTerm})`
      )
      .limit(20);
  }
}

async function testStorageMethods() {
  console.log('🧪 Testing Storage Methods\n');

  try {
    const storage = new TestStorage();

    // Test 1: getAllUsers method
    console.log('1. 📊 Testing getAllUsers method...');
    const allUsers = await storage.getAllUsers();
    
    if (allUsers.length > 0) {
      console.log('   First user from getAllUsers:', allUsers[0]);
      console.log('   First user keys:', Object.keys(allUsers[0]));
      console.log('   Has phone field:', 'phone' in allUsers[0]);
      
      if ('phone' in allUsers[0]) {
        console.log(`   Phone value: "${allUsers[0].phone}"`);
      }
    } else {
      console.log('   No users returned from getAllUsers');
    }

    // Test 2: getUsersByRole method
    console.log('\n2. 👥 Testing getUsersByRole method...');
    const clientUsers = await storage.getUsersByRole('client');
    
    if (clientUsers.length > 0) {
      console.log('   First client from getUsersByRole:', clientUsers[0]);
      console.log('   First client keys:', Object.keys(clientUsers[0]));
      console.log('   Has phone field:', 'phone' in clientUsers[0]);
      
      if ('phone' in clientUsers[0]) {
        console.log(`   Phone value: "${clientUsers[0].phone}"`);
      }
    } else {
      console.log('   No client users returned from getUsersByRole');
    }

    // Test 3: searchUsers method
    console.log('\n3. 🔍 Testing searchUsers method...');
    const searchResults = await storage.searchUsers('test');
    
    if (searchResults.length > 0) {
      console.log('   First search result:', searchResults[0]);
      console.log('   First search result keys:', Object.keys(searchResults[0]));
      console.log('   Has phone field:', 'phone' in searchResults[0]);
      
      if ('phone' in searchResults[0]) {
        console.log(`   Phone value: "${searchResults[0].phone}"`);
      }
    } else {
      console.log('   No search results returned');
    }

    // Test 4: Check if all methods return consistent data
    console.log('\n4. 🔄 Checking data consistency...');
    
    const methods = [
      { name: 'getAllUsers', data: allUsers },
      { name: 'getUsersByRole', data: clientUsers },
      { name: 'searchUsers', data: searchResults }
    ];
    
    methods.forEach(method => {
      if (method.data.length > 0) {
        const firstUser = method.data[0];
        const hasPhone = 'phone' in firstUser;
        console.log(`   ${method.name}: has phone = ${hasPhone}`);
        
        if (hasPhone) {
          console.log(`   ${method.name}: phone = "${firstUser.phone}"`);
        }
      } else {
        console.log(`   ${method.name}: no data`);
      }
    });

  } catch (error) {
    console.error('❌ Error testing storage methods:', error.message);
  }
}

testStorageMethods(); 