import fetch from 'node-fetch';

async function testSearchLogic() {
  console.log('🧪 Testing Search Logic for Thomas Carrie\n');
  
  try {
    // Get all clients
    const response = await fetch('http://localhost:5003/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      
      // Find the Thomas Carrie client
      const thomasCarrie = clients.find(client => 
        client.firstName === 'Thomas' && client.lastName === 'Carrie'
      );
      
      if (thomasCarrie) {
        console.log('✅ Found Thomas Carrie client:');
        console.log(`   Name: ${thomasCarrie.firstName} ${thomasCarrie.lastName}`);
        console.log(`   Email: ${thomasCarrie.email}`);
        console.log(`   Phone: ${thomasCarrie.phone}`);
        
        // Test search logic
        console.log('\n🔍 Testing search queries:');
        
        const searchQueries = ['thomas', 'carrie', 'carr', 'thom'];
        
        searchQueries.forEach(query => {
          const filteredClients = clients.filter(client => {
            return client.username.toLowerCase().includes(query.toLowerCase()) ||
                   client.email.toLowerCase().includes(query.toLowerCase()) ||
                   (client.firstName && client.firstName.toLowerCase().includes(query.toLowerCase())) ||
                   (client.lastName && client.lastName.toLowerCase().includes(query.toLowerCase())) ||
                   (client.phone && client.phone.includes(query));
          });
          
          const found = filteredClients.some(client => 
            client.firstName === 'Thomas' && client.lastName === 'Carrie'
          );
          
          console.log(`   Search "${query}": ${found ? '✅ Found' : '❌ Not found'} (${filteredClients.length} total results)`);
        });
        
        // Test exact frontend logic
        console.log('\n🧪 Testing exact frontend search logic:');
        const searchQuery = 'carrie';
        const filteredClients = clients.filter(client => {
          return client.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (client.firstName && client.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                 (client.lastName && client.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                 (client.phone && client.phone.includes(searchQuery));
        });
        
        const carrieFound = filteredClients.some(client => 
          client.firstName === 'Thomas' && client.lastName === 'Carrie'
        );
        
        console.log(`   Frontend search for "carrie": ${carrieFound ? '✅ Found' : '❌ Not found'}`);
        console.log(`   Total results for "carrie": ${filteredClients.length}`);
        
        if (filteredClients.length > 0) {
          console.log('   Results found:');
          filteredClients.forEach((client, index) => {
            console.log(`     ${index + 1}. ${client.firstName} ${client.lastName} (${client.email})`);
          });
        }
        
      } else {
        console.log('❌ Thomas Carrie client not found in database');
      }
      
    } else {
      console.log(`❌ Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSearchLogic(); 