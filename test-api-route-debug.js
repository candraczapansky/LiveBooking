import fetch from 'node-fetch';

async function testApiRouteDebug() {
  console.log('🧪 Testing API Route Debug\n');

  try {
    // Test 1: Check what the API returns
    console.log('1. 📊 Testing API response...');
    const apiResponse = await fetch('http://localhost:5000/api/users?role=client');
    
    if (apiResponse.ok) {
      const clients = await apiResponse.json();
      
      if (clients.length > 0) {
        console.log('   First client object keys:', Object.keys(clients[0]));
        console.log('   First client object:', clients[0]);
        
        // Check if phone field exists
        const hasPhone = 'phone' in clients[0];
        console.log(`   Has phone field: ${hasPhone}`);
        
        if (hasPhone) {
          console.log(`   Phone value: "${clients[0].phone}"`);
        } else {
          console.log('   ❌ Phone field is missing from API response');
        }
      } else {
        console.log('   No clients found in API response');
      }
    } else {
      console.log(`   ❌ API request failed: ${apiResponse.status}`);
    }

    // Test 2: Simulate the API route logic
    console.log('\n2. 🔍 Simulating API route logic...');
    
    // Simulate a user object with all fields
    const mockUser = {
      id: 1,
      username: 'testuser',
      password: 'hashedpassword',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      phone: '(555) 123-4567',
      role: 'client',
      createdAt: new Date().toISOString()
    };
    
    console.log('   Original user object:', mockUser);
    console.log('   Original user keys:', Object.keys(mockUser));
    
    // Simulate the password removal logic
    const { password, ...userWithoutPassword } = mockUser;
    console.log('   After password removal:', userWithoutPassword);
    console.log('   After password removal keys:', Object.keys(userWithoutPassword));
    
    // Check if phone is still there
    const hasPhoneAfterRemoval = 'phone' in userWithoutPassword;
    console.log(`   Has phone after password removal: ${hasPhoneAfterRemoval}`);
    
    if (hasPhoneAfterRemoval) {
      console.log(`   Phone value after removal: "${userWithoutPassword.phone}"`);
    }

    // Test 3: Check if there's a JSON serialization issue
    console.log('\n3. 🔄 Testing JSON serialization...');
    
    const testObject = {
      id: 1,
      phone: '(555) 123-4567',
      email: 'test@example.com'
    };
    
    console.log('   Original object:', testObject);
    console.log('   Original object keys:', Object.keys(testObject));
    
    // Serialize and deserialize
    const serialized = JSON.stringify(testObject);
    const deserialized = JSON.parse(serialized);
    
    console.log('   After JSON round-trip:', deserialized);
    console.log('   After JSON round-trip keys:', Object.keys(deserialized));
    
    const hasPhoneAfterJson = 'phone' in deserialized;
    console.log(`   Has phone after JSON round-trip: ${hasPhoneAfterJson}`);

  } catch (error) {
    console.error('❌ Error testing API route debug:', error.message);
  }
}

testApiRouteDebug(); 