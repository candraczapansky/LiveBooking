#!/usr/bin/env node

/**
 * Test Helcim API to find the correct endpoint for fetching transactions
 */

const HELCIM_API_TOKEN = process.env.HELCIM_API_TOKEN || '';
const transactionId = process.argv[2] || '25764674';

async function testHelcimAPI() {
  if (!HELCIM_API_TOKEN) {
    console.log('❌ HELCIM_API_TOKEN not set');
    console.log('Set it with: export HELCIM_API_TOKEN=your_token');
    return;
  }
  
  console.log('Testing Helcim API endpoints for transaction:', transactionId);
  console.log('='.repeat(60));
  
  // Endpoints to try based on Helcim API v2 documentation
  const endpoints = [
    `/card-transactions/${transactionId}`,
    `/transactions/${transactionId}`,
    `/payments/${transactionId}`,
    `/card-batches/transactions/${transactionId}`,
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTrying: ${endpoint}`);
    try {
      const response = await fetch(`https://api.helcim.com/v2${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${HELCIM_API_TOKEN}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS! Data:', JSON.stringify(data, null, 2));
        break;
      } else {
        const text = await response.text();
        console.log('Response:', text);
      }
    } catch (error) {
      console.log('Error:', error.message);
    }
  }
}

testHelcimAPI();
