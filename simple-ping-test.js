console.log('🧪 Simple Ping Test Starting...');

// Test the ping endpoint
async function testPing() {
  try {
    console.log('📡 Testing ping endpoint...');
    
    const response = await fetch('http://localhost:5001/api/terminal/ping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceCode: 'XOG5'
      })
    });
    
    console.log('📊 Response status:', response.status);
    
    const data = await response.json();
    console.log('📊 Response data:', data);
    
    if (data.success) {
      console.log('✅ Ping successful!');
    } else {
      console.log('❌ Ping failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPing();





