import fetch from 'node-fetch';

async function checkActualData() {
  console.log('🔍 Checking Actual Database Data\n');
  
  try {
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      console.log(`📊 Total clients in database: ${clients.length}`);
      
      // Look for any clients with "car" in their name
      console.log('\n🔍 Looking for clients with "car" in their name:');
      const carClients = clients.filter(client => {
        const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
        return fullName.includes('car');
      });
      
      console.log(`Found ${carClients.length} clients with "car" in their name:`);
      carClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - ID: ${client.id}`);
      });
      
      // Look for clients with "carr" specifically
      console.log('\n🔍 Looking for clients with "carr" in their name:');
      const carrClients = clients.filter(client => {
        const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
        return fullName.includes('carr');
      });
      
      console.log(`Found ${carrClients.length} clients with "carr" in their name:`);
      carrClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - ID: ${client.id}`);
      });
      
      // Show recent clients
      console.log('\n📋 Recent 10 clients:');
      const recentClients = clients.slice(-10);
      recentClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - ID: ${client.id}`);
      });
      
      // Test the exact search that should find 1 client for "carr"
      console.log('\n🧪 Testing exact search for "carr":');
      const searchQuery = 'carr';
      const filteredClients = clients.filter(client => {
        return client.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
               client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (client.firstName && client.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (client.lastName && client.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (client.phone && client.phone.includes(searchQuery));
      });
      
      console.log(`Search for "carr" found ${filteredClients.length} clients:`);
      filteredClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - ID: ${client.id}`);
      });
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkActualData(); 