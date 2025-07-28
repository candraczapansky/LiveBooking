import fetch from 'node-fetch';

async function testCarrieImport() {
  console.log('🧪 Testing Carrie Import\n');
  
  try {
    // Test 1: Import a client named Carrie
    console.log('1. 📤 Importing Carrie client...');
    const testData = [
      {
        firstName: 'Carrie',
        lastName: 'Test',
        email: 'carrie.test@example.com',
        phone: '555-123-4567'
      }
    ];
    
    const importResponse = await fetch('http://localhost:5003/api/clients/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clients: testData })
    });
    
    if (importResponse.ok) {
      const result = await importResponse.json();
      console.log(`   ✓ Import successful!`);
      console.log(`   - Imported: ${result.imported} clients`);
      console.log(`   - Skipped: ${result.skipped} clients`);
      if (result.errors && result.errors.length > 0) {
        console.log(`   - Errors: ${result.errors.join(', ')}`);
      }
    } else {
      const errorText = await importResponse.text();
      console.log(`   ✗ Import failed: ${importResponse.status} - ${errorText}`);
      return;
    }
    
    // Test 2: Verify Carrie is now in the database
    console.log('\n2. 🔍 Verifying Carrie is in database...');
    const verifyResponse = await fetch('http://localhost:5003/api/users?role=client');
    
    if (verifyResponse.ok) {
      const clients = await verifyResponse.json();
      const carrieClients = clients.filter(client => {
        const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
        return fullName.includes('carrie') || 
               (client.firstName && client.firstName.toLowerCase().includes('carrie')) ||
               (client.lastName && client.lastName.toLowerCase().includes('carrie'));
      });
      
      console.log(`   Found ${carrieClients.length} clients with "Carrie" in their name:`);
      carrieClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - ID: ${client.id}`);
      });
      
      // Test 3: Test the frontend search logic
      console.log('\n3. 🧪 Testing frontend search for "carrie"...');
      const searchQuery = 'carrie';
      const filteredClients = clients.filter(client => {
        return client.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
               client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (client.firstName && client.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (client.lastName && client.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (client.phone && client.phone.includes(searchQuery));
      });
      
      console.log(`   Frontend search for "carrie" found ${filteredClients.length} clients:`);
      filteredClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
      
    } else {
      console.log(`   ✗ Failed to verify: ${verifyResponse.status}`);
    }
    
    console.log('\n4. 💡 Next Steps:');
    console.log('   - If Carrie appears above, the import is working correctly');
    console.log('   - Try searching for "carrie" in the frontend');
    console.log('   - If Carrie does not appear, there may be an issue with the import process');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCarrieImport(); 