import fetch from 'node-fetch';

async function testPhoneColumn() {
  console.log('🔍 Testing if Phone Column Exists in Database\n');
  
  try {
    // Test 1: Try to import a client with a phone number and see if it gets stored
    console.log('1. 📤 Importing client with phone number...');
    const testClient = {
      lastName: 'ColumnTest',
      firstName: 'Phone',
      email: 'phone.column.test@example.com',
      phone: '555-111-2222'
    };
    
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
    
    // Test 2: Try to get the user by email to see if phone is stored
    console.log('\n3. 🔍 Checking if phone was stored...');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      const testClientFound = clients.find(client => 
        client.email === 'phone.column.test@example.com'
      );
      
      if (testClientFound) {
        console.log(`   ✅ Test client found: ${testClientFound.firstName} ${testClientFound.lastName}`);
        console.log(`   📱 Phone number: "${testClientFound.phone}"`);
        console.log(`   🔍 Has 'phone' property: ${'phone' in testClientFound}`);
        
        // Show all properties
        console.log('\n4. 📋 All properties:');
        Object.keys(testClientFound).forEach(key => {
          console.log(`   ${key}: "${testClientFound[key]}"`);
        });
        
        console.log('\n5. 💡 Analysis:');
        if (!('phone' in testClientFound)) {
          console.log('   ❌ Phone property is missing - column may not exist in database');
          console.log('   💡 This suggests the phone column was not created in the database');
        } else if (testClientFound.phone === undefined) {
          console.log('   ❌ Phone property exists but is undefined');
          console.log('   💡 This suggests the column exists but data is not being stored');
        } else if (testClientFound.phone === null) {
          console.log('   ❌ Phone property is null');
          console.log('   💡 This suggests the column exists but value is null');
        } else if (testClientFound.phone === '') {
          console.log('   ❌ Phone property is empty string');
          console.log('   💡 This suggests the column exists but value is empty');
        } else {
          console.log('   ✅ Phone property has a value');
        }
        
      } else {
        console.log(`   ❌ Test client NOT found`);
      }
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPhoneColumn(); 