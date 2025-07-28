import fetch from 'node-fetch';

async function findImportedClients() {
  console.log('🔍 Finding Imported Test Clients\n');
  
  try {
    const response = await fetch('http://localhost:5001/api/users?role=client');
    
    if (response.ok) {
      const clients = await response.json();
      
      // Look for test clients
      const testClients = clients.filter(client => 
        client.email.includes('test.user') || 
        client.email.includes('frontend.test') ||
        client.email.includes('debug.test') ||
        client.email.includes('test.import')
      );
      
      console.log(`Found ${testClients.length} test clients:\n`);
      
      testClients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.firstName} ${client.lastName}`);
        console.log(`   Email: ${client.email}`);
        console.log(`   Phone: ${client.phone}`);
        console.log(`   ID: ${client.id}`);
        console.log('');
      });
      
      console.log('💡 Search Tips:');
      console.log('- Try searching by first name: "Test"');
      console.log('- Try searching by last name: "User"');
      console.log('- Try searching by partial email: "test.user"');
      console.log('- Try searching by phone number: "555"');
      
    } else {
      console.log(`Failed to fetch clients: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findImportedClients(); 