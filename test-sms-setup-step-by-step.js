#!/usr/bin/env node

/**
 * Step-by-step SMS Setup Test
 * 
 * This script tests each step of the SMS setup process individually.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5002';

async function testStepByStep() {
  console.log('🧪 Testing SMS Setup Step by Step...\n');

  try {
    // Step 1: Check service categories
    console.log('1. Testing service categories...');
    const categoriesResponse = await fetch(`${BASE_URL}/api/service-categories`);
    console.log('Categories response status:', categoriesResponse.status);
    
    if (categoriesResponse.ok) {
      const categories = await categoriesResponse.json();
      console.log(`Found ${categories.length} categories:`, categories.map(c => c.name));
    } else {
      console.log('Categories response text:', await categoriesResponse.text());
    }

    // Step 2: Check services
    console.log('\n2. Testing services...');
    const servicesResponse = await fetch(`${BASE_URL}/api/services`);
    console.log('Services response status:', servicesResponse.status);
    
    if (servicesResponse.ok) {
      const services = await servicesResponse.json();
      console.log(`Found ${services.length} services:`, services.map(s => s.name));
    } else {
      console.log('Services response text:', await servicesResponse.text());
    }

    // Step 3: Check staff
    console.log('\n3. Testing staff...');
    const staffResponse = await fetch(`${BASE_URL}/api/staff`);
    console.log('Staff response status:', staffResponse.status);
    
    if (staffResponse.ok) {
      const staff = await staffResponse.json();
      console.log(`Found ${staff.length} staff members:`, staff.map(s => s.title));
    } else {
      console.log('Staff response text:', await staffResponse.text());
    }

    // Step 4: Check SMS config
    console.log('\n4. Testing SMS config...');
    const smsConfigResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/config`);
    console.log('SMS config response status:', smsConfigResponse.status);
    
    if (smsConfigResponse.ok) {
      const config = await smsConfigResponse.json();
      console.log('SMS config:', config);
    } else {
      console.log('SMS config response text:', await smsConfigResponse.text());
    }

    // Step 5: Test SMS health
    console.log('\n5. Testing SMS health...');
    const smsHealthResponse = await fetch(`${BASE_URL}/api/sms-auto-respond/health`);
    console.log('SMS health response status:', smsHealthResponse.status);
    
    if (smsHealthResponse.ok) {
      const health = await smsHealthResponse.json();
      console.log('SMS health:', health);
    } else {
      console.log('SMS health response text:', await smsHealthResponse.text());
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testStepByStep(); 