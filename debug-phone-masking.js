import { DatabaseStorage } from './dist/storage.js';
import { DatabaseConfig } from './dist/config.js';

async function debugPhoneMasking() {
  console.log('🔍 Debugging Phone Number Masking...\n');

  try {
    const storage = new DatabaseStorage();
    const dbConfig = new DatabaseConfig(storage);

    // Test 1: Check what's stored in the database
    console.log('1. Checking database configuration...');
    const aiConfig = await storage.getAiMessagingConfig();
    console.log('AI Config from database:', aiConfig);

    if (aiConfig && aiConfig.smsAutoRespondPhoneNumbers) {
      console.log('SMS Auto Respond Phone Numbers (raw):', aiConfig.smsAutoRespondPhoneNumbers);
      try {
        const parsed = JSON.parse(aiConfig.smsAutoRespondPhoneNumbers);
        console.log('SMS Auto Respond Phone Numbers (parsed):', parsed);
      } catch (e) {
        console.log('Failed to parse SMS Auto Respond Phone Numbers:', e.message);
      }
    }

    // Test 2: Check Twilio configuration
    console.log('\n2. Checking Twilio configuration...');
    const twilioPhone = await dbConfig.getConfig('twilio_phone_number');
    console.log('Twilio Phone Number:', twilioPhone);

    // Test 3: Test phone number normalization
    console.log('\n3. Testing phone number normalization...');
    const testNumbers = [
      '+1234567890',
      '+19187277348',
      '+123456XXXX',
      '1234567890',
      '19187277348'
    ];

    for (const phone of testNumbers) {
      const normalized = phone.replace(/\D/g, '');
      console.log(`${phone} -> ${normalized}`);
    }

    // Test 4: Test SMS service directly
    console.log('\n4. Testing SMS service...');
    const { sendSMS } = await import('./dist/sms.js');
    
    const testResult = await sendSMS('+1234567890', 'Test message');
    console.log('SMS Test Result:', testResult);

  } catch (error) {
    console.error('❌ Error debugging phone masking:', error);
  }
}

debugPhoneMasking(); 