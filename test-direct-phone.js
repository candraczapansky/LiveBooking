import { neon } from '@neondatabase/serverless';

async function testDirectPhone() {
  console.log('🔍 Testing Direct Database Phone Storage\n');
  
  try {
    // Create direct SQL connection
    const sql = neon(process.env.DATABASE_URL);
    
    // First, let's import a client with a phone number
    console.log('1. 📤 Importing test client via API...');
    const testClient = {
      lastName: 'DirectPhone',
      firstName: 'Test',
      email: 'direct.phone.test@example.com',
      phone: '555-888-9999'
    };
    
    const importResponse = await fetch('http://localhost:5003/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: [testClient] })
    });
    
    if (importResponse.ok) {
      const result = await importResponse.json();
      console.log(`   ✓ Import result: ${result.imported} imported, ${result.skipped} skipped`);
    } else {
      const errorText = await importResponse.text();
      console.log(`   ❌ Import failed: ${importResponse.status} - ${errorText}`);
      return;
    }
    
    // Wait for database update
    console.log('\n2. ⏳ Waiting for database update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now let's directly query the database
    console.log('\n3. 🔍 Directly querying database...');
    const dbResult = await sql`
      SELECT id, email, first_name, last_name, phone 
      FROM users 
      WHERE email = 'direct.phone.test@example.com'
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
    
    // Now let's check what the API returns
    console.log('\n4. 🔍 Checking API response...');
    const apiResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (apiResponse.ok) {
      const clients = await apiResponse.json();
      const apiClient = clients.find(client => 
        client.email === 'direct.phone.test@example.com'
      );
      
      if (apiClient) {
        console.log(`   ✅ Found user via API: ${apiClient.firstName} ${apiClient.lastName}`);
        console.log(`   📱 Phone from API: "${apiClient.phone}"`);
        console.log(`   🔍 Has 'phone' property: ${'phone' in apiClient}`);
        
        // Show all properties
        console.log('\n5. 📋 All API properties:');
        Object.keys(apiClient).forEach(key => {
          console.log(`   ${key}: "${apiClient[key]}"`);
        });
        
        console.log('\n6. 💡 Analysis:');
        if (!('phone' in apiClient)) {
          console.log('   ❌ Phone property missing from API response');
          console.log('   💡 Database has phone but API is not returning it');
        } else if (apiClient.phone === undefined) {
          console.log('   ❌ Phone property exists but is undefined');
        } else if (apiClient.phone === null) {
          console.log('   ❌ Phone property is null');
        } else if (apiClient.phone === '') {
          console.log('   ❌ Phone property is empty string');
        } else {
          console.log('   ✅ Phone property has a value');
        }
        
      } else {
        console.log('   ❌ User not found via API');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirectPhone(); 