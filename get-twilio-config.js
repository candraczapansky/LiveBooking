#!/usr/bin/env node

/**
 * Get Twilio configuration from database for Python SMS responder
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function getTwilioConfig() {
  try {
    // Connect to database
    const sequelize = new Sequelize(
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/salon_db',
      {
        logging: false
      }
    );

    // Query system_config table for Twilio settings
    const [results] = await sequelize.query(`
      SELECT key, value 
      FROM system_config 
      WHERE key IN ('twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number', 'openai_api_key')
    `);

    if (results && results.length > 0) {
      const config = {};
      results.forEach(row => {
        config[row.key] = row.value;
      });

      // Create .env file for Python service
      let envContent = '';
      envContent += `DATABASE_URL=${process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/salon_db'}\n`;
      
      if (config.twilio_account_sid) {
        envContent += `TWILIO_ACCOUNT_SID=${config.twilio_account_sid}\n`;
        console.log('✓ Found Twilio Account SID:', config.twilio_account_sid.substring(0, 10) + '...');
      }
      
      if (config.twilio_auth_token) {
        envContent += `TWILIO_AUTH_TOKEN=${config.twilio_auth_token}\n`;
        console.log('✓ Found Twilio Auth Token');
      }
      
      if (config.twilio_phone_number) {
        envContent += `TWILIO_PHONE_NUMBER=${config.twilio_phone_number}\n`;
        console.log('✓ Found Twilio Phone Number:', config.twilio_phone_number);
      }
      
      if (config.openai_api_key) {
        envContent += `OPENAI_API_KEY=${config.openai_api_key}\n`;
        console.log('✓ Found OpenAI API Key');
      }

      // Write to .env file
      fs.writeFileSync('.env', envContent);
      console.log('\n✓ Configuration saved to .env file');
      
      // Also export for immediate use
      if (config.twilio_account_sid) process.env.TWILIO_ACCOUNT_SID = config.twilio_account_sid;
      if (config.twilio_auth_token) process.env.TWILIO_AUTH_TOKEN = config.twilio_auth_token;
      if (config.twilio_phone_number) process.env.TWILIO_PHONE_NUMBER = config.twilio_phone_number;
      if (config.openai_api_key) process.env.OPENAI_API_KEY = config.openai_api_key;
      
      return config;
    } else {
      console.log('No Twilio configuration found in database');
      console.log('Using test credentials for now');
      
      // Create .env with test credentials
      const envContent = `DATABASE_URL=${process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/salon_db'}
TWILIO_ACCOUNT_SID=test_sid
TWILIO_AUTH_TOKEN=test_token
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=test_key
`;
      fs.writeFileSync('.env', envContent);
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error getting Twilio config:', error.message);
    
    // Create .env with defaults on error
    const envContent = `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/salon_db
TWILIO_ACCOUNT_SID=test_sid
TWILIO_AUTH_TOKEN=test_token
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=test_key
`;
    fs.writeFileSync('.env', envContent);
  }
}

// Run the function
getTwilioConfig().then(() => {
  console.log('\nNow you can start the Python SMS responder:');
  console.log('python3 run-python-sms.py');
});







