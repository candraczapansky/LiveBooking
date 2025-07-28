import fetch from 'node-fetch';
import { neon } from '@neondatabase/serverless';

async function testPhoneStorageDebug() {
  console.log('🔍 Debugging Phone Number Storage\n');
  
  try {
    // Test 1: Import a client with phone number
    console.log('1. 📤 Importing test client with phone number...');
    const testClient = {
      firstName: 'Debug',
      lastName: 'Phone',
      email: 'debug.phone.storage@example.com',
      phone: '(555) 999-8888'
    };
    
    console.log('   📤 Sending to backend:', testClient);
    
    const importResponse = await fetch('http://localhost:5003/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: [testClient] })
    });
    
    if (importResponse.ok) {
      const result = await importResponse.json();
      console.log(`   ✓ Import result: ${result.imported} imported, ${result.skipped} skipped`);
      if (result.errors && result.errors.length > 0) {
        console.log(`   ⚠️  Import errors: ${result.errors.join(', ')}`);
      }
    } else {
      const errorText = await importResponse.text();
      console.log(`   ❌ Import failed: ${importResponse.status} - ${errorText}`);
      return;
    }
    
    // Wait for database update
    console.log('\n2. ⏳ Waiting for database update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Check database directly
    console.log('\n3. 🔍 Checking database directly...');
    const sql = neon(process.env.DATABASE_URL);
    
    const dbResult = await sql`
      SELECT id, email, first_name, last_name, phone 
      FROM users 
      WHERE email LIKE '%debug.phone.storage@example.com%'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    if (dbResult.length > 0) {
      const user = dbResult[0];
      console.log(`   ✅ Found user in database: ${user.first_name} ${user.last_name}`);
      console.log(`   📱 Phone from database: "${user.phone}"`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 ID: ${user.id}`);
      
      if (user.phone) {
        console.log('   ✅ Phone number IS stored in database!');
      } else {
        console.log('   ❌ Phone number is NOT stored in database');
      }
    } else {
      console.log('   ❌ User not found in database');
    }
    
    // Test 3: Check API response
    console.log('\n4. 🔍 Checking API response...');
    const apiResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (apiResponse.ok) {
      const clients = await apiResponse.json();
      
      // Find our test client
      const testClientFound = clients.find(client => 
        client.email.includes('debug.phone.storage@example.com')
      );
      
      if (testClientFound) {
        console.log('   ✅ Found test client in API response:');
        console.log(`      Name: ${testClientFound.firstName} ${testClientFound.lastName}`);
        console.log(`      Email: ${testClientFound.email}`);
        console.log(`      Phone: "${testClientFound.phone}" (type: ${typeof testClientFound.phone})`);
        console.log(`      Phone length: ${testClientFound.phone ? testClientFound.phone.length : 0}`);
        
        if (testClientFound.phone && testClientFound.phone !== '') {
          console.log('   ✅ Phone number IS being returned by API!');
        } else {
          console.log('   ❌ Phone number is NOT being returned by API');
        }
      } else {
        console.log('   ❌ Test client not found in API response');
      }
    } else {
      console.log(`   ❌ Failed to get clients: ${apiResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing phone storage debug:', error.message);
  }
}

testPhoneStorageDebug(); 