#!/usr/bin/env node

/**
 * Database Cleanup Script
 * 
 * This script properly removes sample data and prevents it from being recreated.
 * It also sets up a flag to prevent the initialization process from recreating sample data.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function cleanupDatabase() {
  console.log('🧹 Cleaning up database...\n');

  try {
    // Step 1: Get all services and delete them
    console.log('1. Cleaning up services...');
    const servicesResponse = await fetch(`${BASE_URL}/api/services`);
    if (servicesResponse.ok) {
      const services = await servicesResponse.json();
      console.log(`Found ${services.length} services`);
      
      for (const service of services) {
        console.log(`Deleting service: ${service.name} (ID: ${service.id})`);
        const deleteResponse = await fetch(`${BASE_URL}/api/services/${service.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted service: ${service.name}`);
        } else {
          const error = await deleteResponse.json();
          console.log(`❌ Failed to delete service ${service.name}:`, error);
        }
      }
    }

    // Step 2: Get all staff and delete them (except admin)
    console.log('\n2. Cleaning up staff members...');
    const staffResponse = await fetch(`${BASE_URL}/api/staff`);
    if (staffResponse.ok) {
      const staff = await staffResponse.json();
      console.log(`Found ${staff.length} staff members`);
      
      for (const member of staff) {
        // Skip admin user
        if (member.user && member.user.username === 'admin') {
          console.log(`Skipping admin user: ${member.user.username}`);
          continue;
        }
        
        console.log(`Deleting staff member: ${member.user?.firstName} ${member.user?.lastName} (ID: ${member.id})`);
        const deleteResponse = await fetch(`${BASE_URL}/api/staff/${member.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted staff member: ${member.user?.firstName} ${member.user?.lastName}`);
        } else {
          const error = await deleteResponse.json();
          console.log(`❌ Failed to delete staff member ${member.user?.firstName} ${member.user?.lastName}:`, error);
        }
      }
    }

    // Step 3: Get all staff schedules and delete them
    console.log('\n3. Cleaning up staff schedules...');
    const schedulesResponse = await fetch(`${BASE_URL}/api/staff-schedules`);
    if (schedulesResponse.ok) {
      const schedules = await schedulesResponse.json();
      console.log(`Found ${schedules.length} staff schedules`);
      
      for (const schedule of schedules) {
        console.log(`Deleting schedule ID: ${schedule.id}`);
        const deleteResponse = await fetch(`${BASE_URL}/api/staff-schedules/${schedule.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted schedule ID: ${schedule.id}`);
        } else {
          const error = await deleteResponse.json();
          console.log(`❌ Failed to delete schedule ID ${schedule.id}:`, error);
        }
      }
    }

    // Step 4: Get all staff services and delete them
    console.log('\n4. Cleaning up staff services...');
    const staffServicesResponse = await fetch(`${BASE_URL}/api/staff-services`);
    if (staffServicesResponse.ok) {
      const staffServices = await staffServicesResponse.json();
      console.log(`Found ${staffServices.length} staff services`);
      
      for (const staffService of staffServices) {
        console.log(`Deleting staff service ID: ${staffService.id}`);
        const deleteResponse = await fetch(`${BASE_URL}/api/staff-services/${staffService.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted staff service ID: ${staffService.id}`);
        } else {
          const error = await deleteResponse.json();
          console.log(`❌ Failed to delete staff service ID ${staffService.id}:`, error);
        }
      }
    }

    // Step 5: Set a flag to prevent sample data recreation
    console.log('\n5. Setting flag to prevent sample data recreation...');
    const flagResponse = await fetch(`${BASE_URL}/api/system-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'sample_data_initialized',
        value: 'true',
        description: 'Flag to prevent sample data from being recreated'
      })
    });

    if (flagResponse.ok) {
      console.log('✅ Set flag to prevent sample data recreation');
    } else {
      console.log('⚠️  Could not set flag (this is optional)');
    }

    console.log('\n🎉 Database cleanup completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your server');
    console.log('2. Create your own services, staff, and schedules');
    console.log('3. The sample data should not be recreated');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupDatabase(); 