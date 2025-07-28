import fetch from 'node-fetch';

async function checkDatabaseSchema() {
  console.log('🔍 Checking Database Schema\n');
  
  try {
    // First, let's get all users to see the structure
    console.log('1. 📊 Getting all users to check database structure...');
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      
      if (clients.length > 0) {
        const firstClient = clients[0];
        console.log('   📋 Sample client object structure:');
        console.log(JSON.stringify(firstClient, null, 2));
        
        // Check if phone field exists in the response
        console.log('\n2. 🔍 Checking phone field presence:');
        console.log(`   Has 'phone' property: ${'phone' in firstClient}`);
        console.log(`   Phone value: "${firstClient.phone}"`);
        console.log(`   Phone type: ${typeof firstClient.phone}`);
        
        // Check a few more clients
        console.log('\n3. 📱 Checking phone numbers in recent clients:');
        const recentClients = clients.slice(-5);
        recentClients.forEach((client, index) => {
          console.log(`   ${index + 1}. ${client.firstName} ${client.lastName}: phone="${client.phone}" (type: ${typeof client.phone})`);
        });
        
        // Look for any clients that might have phone numbers
        console.log('\n4. 🔍 Searching for clients with phone numbers:');
        const clientsWithPhones = clients.filter(client => client.phone && client.phone !== '');
        console.log(`   Found ${clientsWithPhones.length} clients with phone numbers out of ${clients.length} total`);
        
        if (clientsWithPhones.length > 0) {
          console.log('   Sample clients with phones:');
          clientsWithPhones.slice(0, 3).forEach((client, index) => {
            console.log(`     ${index + 1}. ${client.firstName} ${client.lastName}: ${client.phone}`);
          });
        } else {
          console.log('   ❌ No clients found with phone numbers');
        }
        
      } else {
        console.log('   ❌ No clients found in database');
      }
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

checkDatabaseSchema(); 