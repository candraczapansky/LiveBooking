#!/usr/bin/env node

/**
 * Clear the webhook cache to test with a clean slate
 */

import http from 'http';

const PORT = process.env.PORT || 3003;

const options = {
  hostname: 'localhost',
  port: PORT,
  path: '/api/terminal/clear-cache',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🧹 Clearing webhook cache...');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Cache cleared successfully!');
      console.log('Response:', data);
      console.log('');
      console.log('You can now test a fresh payment without any cached data.');
    } else {
      console.log('❌ Failed to clear cache');
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('Make sure your server is running on port', PORT);
});

req.end();
