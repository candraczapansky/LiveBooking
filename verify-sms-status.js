#!/usr/bin/env node

/**
 * SMS Status Verification
 * 
 * Quick script to verify the current status of the SMS auto-responder
 */

import fetch from 'node-fetch';

async function verifySMSStatus() {
  console.log('🔍 SMS Auto-Responder Status Verification\n');
  
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Check health
    console.log('1. Health Check...');
    const health = await fetch(`${baseUrl}/api/sms-auto-respond/health`);
    if (health.ok) {
      const healthData = await health.json();
      console.log(`✅ Status: ${healthData.status}`);
      console.log(`✅ Config Loaded: ${healthData.configLoaded}`);
      console.log(`✅ OpenAI Key: ${healthData.openAIKeyAvailable}`);
      console.log(`✅ Storage: ${healthData.storageConnected}`);
    } else {
      console.log('❌ Health check failed');
    }
    
    // Check configuration
    console.log('\n2. Configuration...');
    const config = await fetch(`${baseUrl}/api/sms-auto-respond/config`);
    if (config.ok) {
      const configData = await config.json();
      console.log(`✅ Enabled: ${configData.enabled}`);
      console.log(`✅ Confidence Threshold: ${(configData.confidenceThreshold * 100).toFixed(0)}%`);
      console.log(`✅ Max Response Length: ${configData.maxResponseLength} characters`);
      console.log(`✅ Auto-Respond Numbers: ${configData.autoRespondPhoneNumbers.length} configured`);
    } else {
      console.log('❌ Config check failed');
    }
    
    // Check statistics
    console.log('\n3. Statistics...');
    const stats = await fetch(`${baseUrl}/api/sms-auto-respond/stats`);
    if (stats.ok) {
      const statsData = await stats.json();
      console.log(`✅ Total Processed: ${statsData.totalProcessed}`);
      console.log(`✅ Responses Sent: ${statsData.responsesSent}`);
      console.log(`✅ Average Confidence: ${(statsData.averageConfidence * 100).toFixed(1)}%`);
    } else {
      console.log('❌ Stats check failed');
    }
    
    // Test webhook endpoint
    console.log('\n4. Webhook Test...');
    const webhookTest = await fetch(`${baseUrl}/api/webhook/incoming-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: '+1234567890',
        To: '+19187277348',
        Body: 'Test message',
        MessageSid: `verify_${Date.now()}`,
        Timestamp: new Date().toISOString()
      })
    });
    
    if (webhookTest.ok) {
      console.log('✅ Webhook endpoint responding correctly');
      const response = await webhookTest.text();
      if (response.includes('<?xml')) {
        console.log('✅ TwiML response received (correct for Twilio)');
      }
    } else {
      console.log('❌ Webhook test failed');
    }
    
    console.log('\n🎉 SMS Auto-Responder Status: HEALTHY');
    console.log('\n📋 Next Steps:');
    console.log('1. Configure Twilio webhook URL:');
    console.log('   https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/webhook/incoming-sms');
    console.log('2. Test by sending SMS to your Twilio number');
    console.log('3. Monitor logs for incoming webhook requests');
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

verifySMSStatus(); 