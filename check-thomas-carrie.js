import fetch from 'node-fetch';

async function checkThomasCarrie() {
  console.log('🔍 Checking for Thomas Carrie after import\n');
  
  try {
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      console.log(`📊 Total clients in database: ${clients.length}`);
      
      // Look for Thomas Carrie by name
      console.log('\n🔍 Looking for Thomas Carrie:');
      const thomasCarrie = clients.filter(client => 
        (client.firstName && client.firstName.toLowerCase().includes('thomas')) &&
        (client.lastName && client.lastName.toLowerCase().includes('carrie'))
      );
      
      console.log(`Found ${thomasCarrie.length} clients with Thomas Carrie:`);
      thomasCarrie.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - Phone: ${client.phone}`);
      });
      
      // Look for the specific email
      console.log('\n🔍 Looking for michele73801@hotmail.com:');
      const micheleClient = clients.find(client => 
        client.email === 'michele73801@hotmail.com'
      );
      
      if (micheleClient) {
        console.log(`✅ Found client with email michele73801@hotmail.com:`);
        console.log(`   Name: ${micheleClient.firstName} ${micheleClient.lastName}`);
        console.log(`   Phone: ${micheleClient.phone}`);
        console.log(`   ID: ${micheleClient.id}`);
      } else {
        console.log('❌ No client found with email michele73801@hotmail.com');
      }
      
      // Look for the specific phone number
      console.log('\n🔍 Looking for phone 9184389979:');
      const phoneClient = clients.find(client => 
        client.phone === '9184389979'
      );
      
      if (phoneClient) {
        console.log(`✅ Found client with phone 9184389979:`);
        console.log(`   Name: ${phoneClient.firstName} ${phoneClient.lastName}`);
        console.log(`   Email: ${phoneClient.email}`);
        console.log(`   ID: ${phoneClient.id}`);
      } else {
        console.log('❌ No client found with phone 9184389979');
      }
      
      // Show recent clients to see what was imported
      console.log('\n📋 Recent 10 clients (newly imported):');
      const recentClients = clients.slice(-10);
      recentClients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName} (${client.email}) - Phone: ${client.phone}`);
      });
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkThomasCarrie(); 