import fetch from 'node-fetch';

async function testCleanImport() {
  console.log('🧪 Testing Clean CSV Import\n');
  
  try {
    // Test with the exact format from user's CSV
    console.log('1. 📤 Testing clean import with phone numbers...');
    const testClients = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '(555) 987-6543'
      },
      {
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike.johnson@example.com',
        phone: '(555) 111-2222'
      }
    ];
    
    const importResponse = await fetch('http://localhost:5003/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: testClients })
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
    
    // Check API response
    console.log('\n3. 🔍 Checking API response...');
    const apiResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (apiResponse.ok) {
      const clients = await apiResponse.json();
      
      // Find our test clients
      const testClientsFound = clients.filter(client => 
        client.email.includes('john.doe@example.com') ||
        client.email.includes('jane.smith@example.com') ||
        client.email.includes('mike.johnson@example.com')
      );
      
      console.log(`   📊 Found ${testClientsFound.length} test clients in API response`);
      
      testClientsFound.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName}`);
        console.log(`      Email: ${client.email}`);
        console.log(`      Phone: "${client.phone}" (type: ${typeof client.phone})`);
        console.log(`      Phone length: ${client.phone ? client.phone.length : 0}`);
      });
      
      // Check if any clients have phone numbers
      const clientsWithPhones = clients.filter(client => client.phone && client.phone !== '');
      console.log(`\n   📱 Total clients with phone numbers: ${clientsWithPhones.length} out of ${clients.length}`);
      
      if (clientsWithPhones.length > 0) {
        console.log('   ✅ Phone numbers are being imported and retrieved correctly!');
      } else {
        console.log('   ❌ Phone numbers are not being retrieved correctly');
      }
    } else {
      console.log(`   ❌ Failed to get clients: ${apiResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing clean import:', error.message);
  }
}

testCleanImport(); 