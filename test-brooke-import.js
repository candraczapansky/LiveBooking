import fetch from 'node-fetch';

async function testBrookeImport() {
  console.log('🧪 Testing Brooke Thomas Import\n');
  
  try {
    // Import Brooke Thomas directly
    console.log('1. 📤 Importing Brooke Thomas...');
    const brookeThomas = {
      firstName: 'Brooke',
      lastName: 'Thomas',
      email: 'brooke.thomas@example.com',
      phone: '555-333-4444'
    };
    
    const importResponse = await fetch('http://localhost:5003/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: [brookeThomas] })
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
    
    // Wait and check if Brooke Thomas is in database
    console.log('\n2. ⏳ Waiting for database update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n3. 🔍 Checking if Brooke Thomas is in database...');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      const brookeFound = clients.find(client => 
        client.firstName === 'Brooke' && client.lastName === 'Thomas'
      );
      
      if (brookeFound) {
        console.log(`   ✅ Brooke Thomas found in database:`);
        console.log(`      Name: ${brookeFound.firstName} ${brookeFound.lastName}`);
        console.log(`      Email: ${brookeFound.email}`);
        console.log(`      Phone: ${brookeFound.phone}`);
        console.log(`      ID: ${brookeFound.id}`);
      } else {
        console.log(`   ❌ Brooke Thomas NOT found in database`);
      }
      
      // Test search
      console.log('\n4. 🧪 Testing search for "brooke"...');
      const searchQuery = 'brooke';
      const filteredClients = clients.filter(client => {
        return client.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
               client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (client.firstName && client.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (client.lastName && client.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (client.phone && client.phone.includes(searchQuery));
      });
      
      console.log(`   Search for "brooke" found ${filteredClients.length} clients:`);
      filteredClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBrookeImport(); 