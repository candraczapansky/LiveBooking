#!/usr/bin/env node

/**
 * Test Simple Greeting Response
 * 
 * This script tests the improved simple greeting response.
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

async function testSimpleGreeting() {
  console.log('🧪 Testing Simple Greeting Response...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/sms-auto-respond/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: '+19185048902',
        to: '+19187277348',
        body: 'Hi'
      })
    });

    if (!response.ok) {
      console.log(`❌ Failed: HTTP ${response.status}`);
      return;
    }

    const result = await response.json();
    
    if (result.success && result.responseSent) {
      console.log(`✅ Success: Response sent`);
      console.log(`📝 Response: "${result.response}"`);
      console.log(`🎯 Confidence: ${result.confidence}`);
      
      // Check if the response is the improved version
      if (result.response.includes('👋 How can I help you today?')) {
        console.log('✅ Response is the improved version - much better!');
      } else {
        console.log('⚠️  Response still contains old content');
      }
    } else {
      console.log(`❌ Failed: No response sent`);
      console.log(`📝 Reason: ${result.reason || 'Unknown'}`);
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Run the test
testSimpleGreeting().catch(console.error); 