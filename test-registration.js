// Test script to verify registration system
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000'; // Adjust port if needed

async function testRegistration() {
  console.log('🧪 Testing Registration System...\n');

  // Test 1: Register a new user
  console.log('1. Testing new user registration...');
  try {
    const newUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    };

    const response = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ New user registration successful:', data.user.username);
    } else {
      console.log('❌ New user registration failed:', data);
    }
  } catch (error) {
    console.log('❌ New user registration error:', error.message);
  }

  // Test 2: Try to register with same username (should fail)
  console.log('\n2. Testing duplicate username...');
  try {
    const duplicateUser = {
      username: 'testuser_duplicate',
      email: 'duplicate@example.com',
      password: 'testpassword123',
      firstName: 'Duplicate',
      lastName: 'User'
    };

    const response = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateUser)
    });

    const data = await response.json();
    
    if (response.status === 409) {
      console.log('✅ Duplicate username correctly rejected:', data.message);
    } else {
      console.log('❌ Duplicate username not handled correctly:', data);
    }
  } catch (error) {
    console.log('❌ Duplicate username test error:', error.message);
  }

  // Test 3: Try to register with same email (should fail)
  console.log('\n3. Testing duplicate email...');
  try {
    const duplicateEmail = {
      username: 'differentuser',
      email: 'duplicate@example.com',
      password: 'testpassword123',
      firstName: 'Different',
      lastName: 'User'
    };

    const response = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateEmail)
    });

    const data = await response.json();
    
    if (response.status === 409) {
      console.log('✅ Duplicate email correctly rejected:', data.message);
    } else {
      console.log('❌ Duplicate email not handled correctly:', data);
    }
  } catch (error) {
    console.log('❌ Duplicate email test error:', error.message);
  }

  // Test 4: Check existing users
  console.log('\n4. Checking existing users...');
  try {
    const response = await fetch(`${BASE_URL}/api/users`);
    const users = await response.json();
    
    console.log(`✅ Found ${users.length} existing users`);
    if (users.length > 0) {
      console.log('Sample users:');
      users.slice(0, 3).forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - Role: ${user.role}`);
      });
    }
  } catch (error) {
    console.log('❌ Error fetching users:', error.message);
  }

  console.log('\n🏁 Registration system test completed!');
}

// Run the test
testRegistration().catch(console.error); 