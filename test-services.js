#!/usr/bin/env node

/**
 * Test Services Available
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5004';

async function testServices() {
  console.log('🔍 Testing Available Services...\n');

  try {
    // Test 1: Get all services
    console.log('1. Getting all services...');
    const servicesResponse = await fetch(`${BASE_URL}/api/services`);
    
    if (servicesResponse.ok) {
      const services = await servicesResponse.json();
      console.log('✅ Available services:');
      services.forEach(service => {
        console.log(`   - ${service.name} ($${service.price}) - ${service.duration} min`);
      });
    } else {
      console.log('❌ Failed to get services:', servicesResponse.status);
    }

    // Test 2: Get staff
    console.log('\n2. Getting staff...');
    const staffResponse = await fetch(`${BASE_URL}/api/staff`);
    
    if (staffResponse.ok) {
      const staff = await staffResponse.json();
      console.log('✅ Available staff:');
      staff.forEach(s => {
        console.log(`   - ${s.title} (ID: ${s.id})`);
      });
    } else {
      console.log('❌ Failed to get staff:', staffResponse.status);
    }

    // Test 3: Get staff services
    console.log('\n3. Getting staff services...');
    const staffServicesResponse = await fetch(`${BASE_URL}/api/staff/53/services`);
    
    if (staffServicesResponse.ok) {
      const staffServices = await staffServicesResponse.json();
      console.log('✅ Staff 53 services:');
      staffServices.forEach(ss => {
        console.log(`   - Service ID: ${ss.serviceId}`);
      });
    } else {
      console.log('❌ Failed to get staff services:', staffServicesResponse.status);
    }

  } catch (error) {
    console.error('❌ Error testing services:', error);
  }
}

testServices(); 