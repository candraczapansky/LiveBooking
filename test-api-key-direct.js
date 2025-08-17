// Direct test of the new API key from Replit secrets
console.log('🔍 Testing New API Key Directly');
console.log('==============================');

async function testDirectAPI() {
  try {
    console.log('1. Testing device registration through your server...');
    
    const response = await fetch('http://localhost:5000/api/terminal/register-with-location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceCode: 'XOG5',
        deviceName: 'Glo Head Spa Terminal',
        locationId: 14
      })
    });
    
    const data = await response.json();
    console.log(`Response Status: ${response.status} ${response.statusText}`);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ Device registration successful!');
      console.log('🎉 The new API key is working!');
    } else {
      console.log('❌ Device registration failed:', data.error);
      
      if (data.error && data.error.includes('unauthorized')) {
        console.log('\n⚠️  Still getting unauthorized error. This means:');
        console.log('   - The server is still using the old API key');
        console.log('   - The new API key from Replit secrets is not being loaded');
        console.log('   - We need to restart the server to pick up the new key');
      } else if (data.error && data.error.includes('Device not found')) {
        console.log('\n⚠️  Device not found error. This means:');
        console.log('   - The API key might be working now');
        console.log('   - But the device code XOG5 doesn\'t exist in Helcim');
        console.log('   - We need to use the actual device code from your terminal');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Wait for server to be ready, then test
setTimeout(() => {
  testDirectAPI();
}, 3000);

