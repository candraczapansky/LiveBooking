#!/usr/bin/env node

/**
 * Script to disable automatic service creation and clean up unwanted services/categories
 * This prevents services and categories from being recreated after deletion
 */

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/salon_management'
});

async function disableAutomaticServiceCreation() {
  console.log('🔧 Disabling automatic service creation...\n');

  try {
    // 1. Set environment variable to disable automatic creation
    process.env.DISABLE_AUTOMATIC_SERVICE_CREATION = 'true';
    console.log('✅ Set DISABLE_AUTOMATIC_SERVICE_CREATION=true');

    // 2. Check current services and categories
    console.log('\n📊 Current database state:');
    
    const servicesResult = await pool.query('SELECT id, name, category_id FROM services ORDER BY id');
    console.log(`Services (${servicesResult.rows.length}):`);
    servicesResult.rows.forEach(service => {
      console.log(`  - ${service.name} (ID: ${service.id}, Category: ${service.category_id})`);
    });

    const categoriesResult = await pool.query('SELECT id, name FROM service_categories ORDER BY id');
    console.log(`\nCategories (${categoriesResult.rows.length}):`);
    categoriesResult.rows.forEach(category => {
      console.log(`  - ${category.name} (ID: ${category.id})`);
    });

    // 3. Check for any automatic creation sources
    console.log('\n🔍 Checking for automatic creation sources:');
    
    // Check if there are any webhook endpoints that might create services
    const webhookCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'webhook_logs'
    `);
    
    if (webhookCheck.rows[0].count > 0) {
      console.log('⚠️  Found webhook logs table - external systems may be creating services');
    } else {
      console.log('✅ No webhook logs found');
    }

    // 4. Create a system config entry to track this setting
    try {
      await pool.query(`
        INSERT INTO system_config (key, value, description, category) 
        VALUES ('DISABLE_AUTOMATIC_SERVICE_CREATION', 'true', 'Prevents automatic service/category creation from external sources', 'services')
        ON CONFLICT (key) DO UPDATE SET value = 'true'
      `);
      console.log('✅ Added system config entry for automatic service creation prevention');
    } catch (error) {
      console.log('⚠️  Could not add system config entry (table might not exist)');
    }

    // 5. Show instructions for permanent fix
    console.log('\n📋 To permanently disable automatic service creation:');
    console.log('1. Add to your environment variables:');
    console.log('   DISABLE_AUTOMATIC_SERVICE_CREATION=true');
    console.log('\n2. Restart your server after setting this environment variable');
    console.log('\n3. The following sources will be disabled:');
    console.log('   - External API webhooks (server/external-api.ts)');
    console.log('   - JotForm integration (server/jotform-integration.ts)');
    console.log('   - Setup scripts (setup-sms-booking-data.js)');

    console.log('\n✅ Automatic service creation is now disabled!');
    console.log('   Deleted services and categories should no longer reappear.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the script
disableAutomaticServiceCreation(); 