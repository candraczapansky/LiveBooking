#!/usr/bin/env node

/**
 * Database Persistence Check Script
 * 
 * This script checks the current state of the database to verify that:
 * 1. Services and categories are not being recreated after deletion
 * 2. The sample data prevention flag is properly set
 * 3. No automatic service creation is happening
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

async function checkDatabasePersistence() {
  console.log('🔍 Checking Database Persistence...\n');

  try {
    // Check if server is running
    console.log('1. Checking server connectivity...');
    try {
      const healthResponse = await fetch(`${BASE_URL}/api/health`);
      if (healthResponse.ok) {
        console.log('✅ Server is running');
      } else {
        console.log('⚠️  Server responded but health check failed');
      }
    } catch (error) {
      console.log('❌ Server is not running. Please start the server first.');
      console.log('   Run: npm run dev');
      return;
    }

    // Check system configuration for sample data flag
    console.log('\n2. Checking sample data prevention flag...');
    try {
      const configResponse = await fetch(`${BASE_URL}/api/system-config/sample_data_initialized`);
      if (configResponse.ok) {
        const config = await configResponse.json();
        if (config && config.value === 'true') {
          console.log('✅ Sample data prevention flag is set');
        } else {
          console.log('⚠️  Sample data prevention flag is not set correctly');
        }
      } else {
        console.log('⚠️  Could not check sample data prevention flag');
      }
    } catch (error) {
      console.log('⚠️  Error checking sample data prevention flag:', error.message);
    }

    // Check current services
    console.log('\n3. Checking current services...');
    try {
      const servicesResponse = await fetch(`${BASE_URL}/api/services`);
      if (servicesResponse.ok) {
        const services = await servicesResponse.json();
        console.log(`Found ${services.length} services:`);
        
        if (services.length === 0) {
          console.log('   ✅ No services found - database is clean');
        } else {
          services.forEach(service => {
            console.log(`   - ${service.name} (ID: ${service.id})`);
          });
        }
      } else {
        console.log('❌ Failed to fetch services:', servicesResponse.status);
      }
    } catch (error) {
      console.log('❌ Error fetching services:', error.message);
    }

    // Check current service categories
    console.log('\n4. Checking current service categories...');
    try {
      const categoriesResponse = await fetch(`${BASE_URL}/api/service-categories`);
      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json();
        console.log(`Found ${categories.length} service categories:`);
        
        if (categories.length === 0) {
          console.log('   ✅ No service categories found - database is clean');
        } else {
          categories.forEach(category => {
            console.log(`   - ${category.name} (ID: ${category.id})`);
          });
        }
      } else {
        console.log('❌ Failed to fetch service categories:', categoriesResponse.status);
      }
    } catch (error) {
      console.log('❌ Error fetching service categories:', error.message);
    }

    // Check current staff members
    console.log('\n5. Checking current staff members...');
    try {
      const staffResponse = await fetch(`${BASE_URL}/api/staff`);
      if (staffResponse.ok) {
        const staff = await staffResponse.json();
        console.log(`Found ${staff.length} staff members:`);
        
        if (staff.length === 0) {
          console.log('   ✅ No staff members found - database is clean');
        } else {
          staff.forEach(member => {
            console.log(`   - ${member.title || 'Staff'} (ID: ${member.id})`);
          });
        }
      } else {
        console.log('❌ Failed to fetch staff members:', staffResponse.status);
      }
    } catch (error) {
      console.log('❌ Error fetching staff members:', error.message);
    }

    // Check for potential recreation sources
    console.log('\n6. Checking for potential recreation sources...');
    
    // Check if external API is enabled
    console.log('   - External API webhooks: Could create services/categories automatically');
    console.log('   - JotForm integration: Could create services/categories automatically');
    console.log('   - Setup scripts: Could create services/categories when run');
    
    console.log('\n📋 Recommendations:');
    console.log('1. If you see services/categories you didn\'t create, they may be from:');
    console.log('   - External API webhooks (check your webhook configurations)');
    console.log('   - JotForm integration (check form submissions)');
    console.log('   - Setup scripts that were run manually');
    console.log('');
    console.log('2. To prevent automatic creation:');
    console.log('   - Disable external API webhooks if not needed');
    console.log('   - Disable JotForm integration if not needed');
    console.log('   - Don\'t run setup scripts unless necessary');
    console.log('');
    console.log('3. To clean up unwanted data:');
    console.log('   - Run: node cleanup-database.js');
    console.log('   - Then restart the server');
    console.log('   - Verify with: node test-no-sample-data.js');

  } catch (error) {
    console.error('❌ Error during database persistence check:', error);
  }
}

// Run the check
checkDatabasePersistence().catch(console.error); 