import fetch from 'node-fetch';

async function checkBrookeThomas() {
  console.log('🔍 Checking for Brooke Thomas and other Brooke clients\n');
  
  try {
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      console.log(`📊 Total clients in database: ${clients.length}`);
      
      // Look for clients with "brooke" in their name
      console.log('\n🔍 Looking for clients with "brooke" in their name:');
      const brookeClients = clients.filter(client => {
        const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
        return fullName.includes('brooke');
      });
      
      console.log(`Found ${brookeClients.length} clients with "brooke" in their name:`);
      brookeClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - ID: ${client.id}`);
      });
      
      // Look specifically for Brooke Thomas
      console.log('\n🔍 Looking specifically for Brooke Thomas:');
      const brookeThomas = clients.find(client => 
        client.firstName === 'Brooke' && client.lastName === 'Thomas'
      );
      
      if (brookeThomas) {
        console.log(`✅ Found Brooke Thomas:`);
        console.log(`   Name: ${brookeThomas.firstName} ${brookeThomas.lastName}`);
        console.log(`   Email: ${brookeThomas.email}`);
        console.log(`   Phone: ${brookeThomas.phone}`);
        console.log(`   ID: ${brookeThomas.id}`);
      } else {
        console.log('❌ Brooke Thomas not found in database');
      }
      
      // Test the exact search logic
      console.log('\n🧪 Testing search for "brooke":');
      const searchQuery = 'brooke';
      const filteredClients = clients.filter(client => {
        return client.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
               client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (client.firstName && client.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (client.lastName && client.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (client.phone && client.phone.includes(searchQuery));
      });
      
      console.log(`Search for "brooke" found ${filteredClients.length} clients:`);
      filteredClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - ID: ${client.id}`);
      });
      
      // Check if there are any clients with "thomas" as last name
      console.log('\n🔍 Looking for clients with "thomas" as last name:');
      const thomasClients = clients.filter(client => 
        client.lastName && client.lastName.toLowerCase().includes('thomas')
      );
      
      console.log(`Found ${thomasClients.length} clients with "thomas" in last name:`);
      thomasClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - ID: ${client.id}`);
      });
      
      // Show recent clients to see what was imported
      console.log('\n📋 Recent 10 clients (newly imported):');
      const recentClients = clients.slice(-10);
      recentClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkBrookeThomas(); 