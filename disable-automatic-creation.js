#!/usr/bin/env node

/**
 * Disable Automatic Creation Script
 * 
 * This script adds environment variable controls to prevent automatic
 * service and category creation from external sources.
 */

import fs from 'fs';
import path from 'path';

const ENV_FILE = '.env';

function addEnvironmentControls() {
  console.log('🔧 Adding environment controls to prevent automatic service creation...\n');

  try {
    // Read existing .env file
    let envContent = '';
    if (fs.existsSync(ENV_FILE)) {
      envContent = fs.readFileSync(ENV_FILE, 'utf8');
    }

    // Define the new environment variables
    const newEnvVars = `
# Database Persistence Controls
# Set these to 'true' to disable automatic service/category creation
DISABLE_AUTOMATIC_SERVICE_CREATION=true
DISABLE_EXTERNAL_API_WEBHOOKS=true
DISABLE_JOTFORM_INTEGRATION=true
DISABLE_SETUP_SCRIPTS=true

# Sample Data Controls
SAMPLE_DATA_INITIALIZED=true
`;

    // Check if variables already exist
    const existingVars = [
      'DISABLE_AUTOMATIC_SERVICE_CREATION',
      'DISABLE_EXTERNAL_API_WEBHOOKS', 
      'DISABLE_JOTFORM_INTEGRATION',
      'DISABLE_SETUP_SCRIPTS',
      'SAMPLE_DATA_INITIALIZED'
    ];

    let updatedContent = envContent;
    let addedCount = 0;

    existingVars.forEach(varName => {
      if (!envContent.includes(varName)) {
        updatedContent += `\n${varName}=true`;
        addedCount++;
        console.log(`✅ Added: ${varName}=true`);
      } else {
        console.log(`⚠️  Already exists: ${varName}`);
      }
    });

    // Write updated .env file
    if (addedCount > 0) {
      fs.writeFileSync(ENV_FILE, updatedContent);
      console.log(`\n✅ Added ${addedCount} environment variables to ${ENV_FILE}`);
    } else {
      console.log('\n✅ All environment variables already exist');
    }

    console.log('\n📋 Next steps:');
    console.log('1. Restart your server to apply the new environment variables');
    console.log('2. The system will now respect these settings');
    console.log('3. Automatic service creation is now disabled');
    console.log('4. Services will stay deleted permanently');

    console.log('\n🔄 To restart your server:');
    console.log('   npm run dev');
    console.log('   or');
    console.log('   npm start');

  } catch (error) {
    console.error('❌ Error adding environment controls:', error);
  }
}

// Run the script
addEnvironmentControls(); 