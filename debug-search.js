import fetch from 'node-fetch';

async function debugSearch() {
  console.log('🔍 Debugging Client Search Issue\n');
  
  try {
    // Test 1: Get all clients from the API
    console.log('1. 📊 Fetching all clients...');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      console.log(`   ✓ Found ${clients.length} total clients`);
      
      // Test 2: Look for clients with "Carrie" in their name
      console.log('\n2. 🔍 Searching for "Carrie"...');
      const carrieClients = clients.filter(client => {
        const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
        return fullName.includes('carrie') || 
               (client.firstName && client.firstName.toLowerCase().includes('carrie')) ||
               (client.lastName && client.lastName.toLowerCase().includes('carrie'));
      });
      
      console.log(`   Found ${carrieClients.length} clients with "Carrie" in their name:`);
      carrieClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
      
      // Test 3: Test the exact search logic from the frontend
      console.log('\n3. 🧪 Testing frontend search logic...');
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
      
      // Test 4: Show recent clients to see what's actually in the database
      console.log('\n4. 📋 Recent clients in database:');
      const recentClients = clients.slice(-10);
      recentClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - ID: ${client.id}`);
      });
      
      // Test 5: Check for any clients with similar names
      console.log('\n5. 🔍 Looking for similar names...');
      const similarNames = clients.filter(client => {
        const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
        return fullName.includes('car') || fullName.includes('carr');
      });
      
      console.log(`   Found ${similarNames.length} clients with "car" or "carr" in their name:`);
      similarNames.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
      
    } else {
      console.log(`   ✗ Failed to fetch clients: ${response.status}`);
    }
    
    console.log('\n6. 💡 Troubleshooting Tips:');
    console.log('   - If "Carrie" is not in the list above, the client may not have been imported successfully');
    console.log('   - Check the import results to see if there were any errors');
    console.log('   - Try searching for partial names like "car" or "carr"');
    console.log('   - Check the browser console for any JavaScript errors');
    console.log('   - Verify that the import was successful by checking the import results dialog');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugSearch(); 