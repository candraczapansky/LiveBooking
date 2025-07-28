import fetch from 'node-fetch';

async function checkThomasBrooke() {
  console.log('🔍 Checking for Thomas Brooke clients from CSV\n');
  
  try {
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      console.log(`📊 Total clients in database: ${clients.length}`);
      
      // Look for Thomas Brooke specifically
      console.log('\n🔍 Looking for Thomas Brooke:');
      const thomasBrooke = clients.find(client => 
        client.firstName === 'Thomas' && client.lastName === 'Brooke'
      );
      
      if (thomasBrooke) {
        console.log(`✅ Found Thomas Brooke:`);
        console.log(`   Name: ${thomasBrooke.firstName} ${thomasBrooke.lastName}`);
        console.log(`   Email: ${thomasBrooke.email}`);
        console.log(`   Phone: ${thomasBrooke.phone}`);
        console.log(`   ID: ${thomasBrooke.id}`);
      } else {
        console.log('❌ Thomas Brooke not found in database');
      }
      
      // Look for clients with email brooklyn.thomas24@gmail.com
      console.log('\n🔍 Looking for brooklyn.thomas24@gmail.com:');
      const brooklynEmail = clients.find(client => 
        client.email === 'brooklyn.thomas24@gmail.com'
      );
      
      if (brooklynEmail) {
        console.log(`✅ Found client with brooklyn.thomas24@gmail.com:`);
        console.log(`   Name: ${brooklynEmail.firstName} ${brooklynEmail.lastName}`);
        console.log(`   Phone: ${brooklynEmail.phone}`);
        console.log(`   ID: ${brooklynEmail.id}`);
      } else {
        console.log('❌ No client found with brooklyn.thomas24@gmail.com');
      }
      
      // Look for all Thomas clients
      console.log('\n🔍 Looking for all Thomas clients:');
      const thomasClients = clients.filter(client => 
        client.firstName && client.firstName.toLowerCase().includes('thomas')
      );
      
      console.log(`Found ${thomasClients.length} clients with "Thomas" in first name:`);
      thomasClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
      
      // Look for all Brooke clients
      console.log('\n🔍 Looking for all Brooke clients:');
      const brookeClients = clients.filter(client => 
        client.lastName && client.lastName.toLowerCase().includes('brooke')
      );
      
      console.log(`Found ${brookeClients.length} clients with "Brooke" in last name:`);
      brookeClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
      
      // Test search for "brooke" (should find Thomas Brooke)
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
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
      });
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkThomasBrooke(); 