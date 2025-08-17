const https = require('https');
const http = require('http');

console.log('🔧 Replit Connection Fix');
console.log('========================\n');

// Test different connection methods
const testUrls = [
  'http://localhost:5000/api/services',
  'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev:5000/api/services',
  'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/services'
];

function testUrl(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Replit-Connection-Test'
      }
    };

    console.log(`🧪 Testing: ${url}`);
    console.log(`Hostname: ${options.hostname}`);
    console.log(`Port: ${options.port}`);
    console.log(`Path: ${options.path}`);

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
        if (res.statusCode === 200) {
          console.log('✅ SUCCESS - Server is accessible');
          console.log(`Response length: ${data.length} characters`);
        } else {
          console.log(`❌ Failed with status: ${res.statusCode}`);
        }
        console.log('');
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Error: ${error.message}`);
      console.log('');
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.log('❌ Timeout after 5 seconds');
      console.log('');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing different connection methods to the server...\n');
  
  for (const url of testUrls) {
    try {
      await testUrl(url);
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
  }

  console.log('🎯 Recommendations:');
  console.log('1. If localhost:5000 works but Replit domain doesn\'t, the server needs to be accessible from the Replit domain');
  console.log('2. If none work, the server might not be running');
  console.log('3. If Replit domain works without port, use that URL in the frontend');
}

runTests().catch(console.error); 