import fetch from 'node-fetch';

async function testSimpleImport() {
  console.log('🧪 Testing Simple Import Logic\n');
  
  try {
    // Test with the exact format from user's CSV: Last Name, First Name, Email, Phone
    console.log('1. 📤 Testing Last Name, First Name format...');
    const testClients = [
      {
        lastName: 'Thomas',
        firstName: 'Brooke',
        email: 'brooke.thomas.simple@example.com',
        phone: '555-111-2222'
      },
      {
        lastName: 'Brennan',
        firstName: 'Thomas',
        email: 'thomas.brennan.simple@example.com',
        phone: '555-333-4444'
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
      
      console.log('\n4. 💡 Next Steps:');
      console.log('   - Try importing your CSV file again');
      console.log('   - Search for "Brooke" in the frontend');
      console.log('   - Search for "Thomas" in the frontend');
      console.log('   - If found: New import logic is working');
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleImport(); 