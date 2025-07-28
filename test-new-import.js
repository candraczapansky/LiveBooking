import fetch from 'node-fetch';

async function testNewImport() {
  console.log('🧪 Testing New Import Logic\n');
  
  try {
    // Test 1: Import with Last Name, First Name format (your format)
    console.log('1. 📤 Testing Last Name, First Name format...');
    const testClients = [
      {
        lastName: 'Thomas',
        firstName: 'Brooke',
        email: 'brooke.thomas.test@example.com',
        phone: '555-444-3333'
      },
      {
        lastName: 'Brennan',
        firstName: 'Thomas',
        email: 'thomas.brennan.test@example.com',
        phone: '555-555-6666'
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
    
    // Wait and check results
    console.log('\n2. ⏳ Waiting for database update...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n3. 🔍 Checking imported clients...');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      
      // Check for Brooke Thomas
      const brookeThomas = clients.find(client => 
        client.firstName === 'Brooke' && client.lastName === 'Thomas'
      );
      
      if (brookeThomas) {
        console.log(`   ✅ Brooke Thomas found: ${brookeThomas.firstName} ${brookeThomas.lastName} (${brookeThomas.email})`);
      } else {
        console.log(`   ❌ Brooke Thomas NOT found`);
      }
      
      // Check for Thomas Brennan
      const thomasBrennan = clients.find(client => 
        client.firstName === 'Thomas' && client.lastName === 'Brennan'
      );
      
      if (thomasBrennan) {
        console.log(`   ✅ Thomas Brennan found: ${thomasBrennan.firstName} ${thomasBrennan.lastName} (${thomasBrennan.email})`);
      } else {
        console.log(`   ❌ Thomas Brennan NOT found`);
      }
      
      // Test search functionality
      console.log('\n4. 🧪 Testing search functionality...');
      const searchQueries = ['brooke', 'thomas', 'brennan'];
      
      searchQueries.forEach(query => {
        const filteredClients = clients.filter(client => {
          return client.username.toLowerCase().includes(query.toLowerCase()) ||
                 client.email.toLowerCase().includes(query.toLowerCase()) ||
                 (client.firstName && client.firstName.toLowerCase().includes(query.toLowerCase())) ||
                 (client.lastName && client.lastName.toLowerCase().includes(query.toLowerCase())) ||
                 (client.phone && client.phone.includes(query));
        });
        
        console.log(`   Search "${query}": ${filteredClients.length} results`);
        filteredClients.forEach((client, index) => {
          console.log(`     ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
        });
      });
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
    console.log('\n5. 💡 Next Steps:');
    console.log('   - Try searching for "Brooke" in the frontend');
    console.log('   - Try searching for "Thomas" in the frontend');
    console.log('   - If found: New import logic is working');
    console.log('   - If not found: There may still be an issue');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewImport(); 