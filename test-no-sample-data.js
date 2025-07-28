#!/usr/bin/env node

/**
 * Test No Sample Data Recreation
 * 
 * This script verifies that sample data is not recreated after cleanup.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testNoSampleData() {
  console.log('🧪 Testing that sample data is not recreated...\n');

  try {
    // Check services
    console.log('1. Checking services...');
    const servicesResponse = await fetch(`${BASE_URL}/api/services`);
    if (servicesResponse.ok) {
      const services = await servicesResponse.json();
      console.log(`Found ${services.length} services`);
      
      if (services.length === 0) {
        console.log('✅ No services found - sample data not recreated');
      } else {
        console.log('❌ Services found - sample data may have been recreated');
        services.forEach(service => {
          console.log(`  - ${service.name} (ID: ${service.id})`);
        });
      }
    }

    // Check staff
    console.log('\n2. Checking staff members...');
    const staffResponse = await fetch(`${BASE_URL}/api/staff`);
    if (staffResponse.ok) {
      const staff = await staffResponse.json();
      console.log(`Found ${staff.length} staff members`);
      
      if (staff.length === 0) {
        console.log('✅ No staff members found - sample data not recreated');
      } else {
        console.log('❌ Staff members found - sample data may have been recreated');
        staff.forEach(member => {
          console.log(`  - ${member.user?.firstName} ${member.user?.lastName} (ID: ${member.id})`);
        });
      }
    }

    // Check staff schedules
    console.log('\n3. Checking staff schedules...');
    const schedulesResponse = await fetch(`${BASE_URL}/api/staff-schedules`);
    if (schedulesResponse.ok) {
      const schedules = await schedulesResponse.json();
      console.log(`Found ${schedules.length} staff schedules`);
      
      if (schedules.length === 0) {
        console.log('✅ No staff schedules found - sample data not recreated');
      } else {
        console.log('❌ Staff schedules found - sample data may have been recreated');
        schedules.forEach(schedule => {
          console.log(`  - Schedule ID: ${schedule.id}`);
        });
      }
    }

    // Check staff services
    console.log('\n4. Checking staff services...');
    const staffServicesResponse = await fetch(`${BASE_URL}/api/staff-services`);
    if (staffServicesResponse.ok) {
      const staffServices = await staffServicesResponse.json();
      console.log(`Found ${staffServices.length} staff services`);
      
      if (staffServices.length === 0) {
        console.log('✅ No staff services found - sample data not recreated');
      } else {
        console.log('❌ Staff services found - sample data may have been recreated');
        staffServices.forEach(staffService => {
          console.log(`  - Staff Service ID: ${staffService.id}`);
        });
      }
    }

    console.log('\n🎉 Test completed!');
    console.log('\n📝 If all checks show "✅", then the sample data prevention is working correctly.');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testNoSampleData(); 