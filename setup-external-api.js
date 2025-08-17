#!/usr/bin/env node

/**
 * Setup script for External API integration
 * This script helps configure the external API key for client booking app integration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔑 Setting up External API Key for Client Booking App Integration...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file found');
  
  // Read existing .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if EXTERNAL_API_KEY already exists
  if (envContent.includes('EXTERNAL_API_KEY=')) {
    console.log('⚠️  EXTERNAL_API_KEY already exists in .env file');
    console.log('   Current value:', envContent.match(/EXTERNAL_API_KEY=(.+)/)?.[1] || 'not set');
  } else {
    // Add EXTERNAL_API_KEY to .env file
    const apiKey = `glo-head-spa-client-booking-${Date.now()}`;
    envContent += `\n# External API Key for Client Booking App Integration\nEXTERNAL_API_KEY=${apiKey}\n`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Added EXTERNAL_API_KEY to .env file');
    console.log(`   Key: ${apiKey}`);
  }
} else {
  console.log('📝 .env file not found, creating new one...');
  
  // Create new .env file with EXTERNAL_API_KEY
  const apiKey = `glo-head-spa-client-booking-${Date.now()}`;
  const envContent = `# External API Key for Client Booking App Integration\nEXTERNAL_API_KEY=${apiKey}\n`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file with EXTERNAL_API_KEY');
  console.log(`   Key: ${apiKey}`);
}

console.log('\n📋 Next Steps:');
console.log('1. Restart your server to load the new environment variable');
console.log('2. Use this API key in your client booking app');
console.log('3. Test the integration using the webhook endpoint');
console.log('\n🔗 Webhook Endpoint: https://your-domain.com/api/appointments/webhook');
console.log('🔑 Authentication: Include header: Authorization: Bearer YOUR_API_KEY');

console.log('\n✨ Setup complete!');
