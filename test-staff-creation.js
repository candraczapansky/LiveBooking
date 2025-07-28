#!/usr/bin/env node

/**
 * Staff Creation Test Script
 * 
 * This script tests the staff creation API to identify validation issues.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testStaffCreation() {
  console.log('🧪 Testing Staff Creation API...\n');

  try {
    // Test 1: Create a user first
    console.log('1. Creating test user...');
    const userData = {
      username: 'teststaff' + Date.now(),
      email: 'teststaff' + Date.now() + '@example.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'Staff',
      phone: '555-123-4567',
      role: 'staff'
    };

    const userResponse = await fetch(`${BASE_URL}/api/register/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.log('❌ User creation failed:', errorData);
      return;
    }

    const user = await userResponse.json();
    console.log('✅ User created:', user);

    // Test 2: Create staff member
    console.log('\n2. Creating staff member...');
    const staffData = {
      userId: user.user.id, // Fix: access user.id from the nested structure
      title: 'Test Therapist',
      bio: 'Test bio',
      commissionType: 'commission',
      commissionRate: 0.3, // 30%
      hourlyRate: null,
      fixedRate: null
    };

    console.log('Staff data being sent:', staffData);

    const staffResponse = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffData)
    });

    console.log('Staff response status:', staffResponse.status);
    console.log('Staff response headers:', Object.fromEntries(staffResponse.headers.entries()));

    if (!staffResponse.ok) {
      const errorData = await staffResponse.json();
      console.log('❌ Staff creation failed:', errorData);
      
      // Test with different commission types
      console.log('\n3. Testing different commission types...');
      
      // Test hourly
      const hourlyStaffData = {
        userId: user.user.id, // Fix: access user.id from the nested structure
        title: 'Test Therapist',
        bio: 'Test bio',
        commissionType: 'hourly',
        commissionRate: null,
        hourlyRate: 25.0,
        fixedRate: null
      };

      const hourlyResponse = await fetch(`${BASE_URL}/api/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hourlyStaffData)
      });

      if (hourlyResponse.ok) {
        const hourlyStaff = await hourlyResponse.json();
        console.log('✅ Hourly staff created:', hourlyStaff);
      } else {
        const hourlyError = await hourlyResponse.json();
        console.log('❌ Hourly staff creation failed:', hourlyError);
      }

      // Test fixed
      const fixedStaffData = {
        userId: user.user.id, // Fix: access user.id from the nested structure
        title: 'Test Therapist',
        bio: 'Test bio',
        commissionType: 'fixed',
        commissionRate: null,
        hourlyRate: null,
        fixedRate: 50000.0
      };

      const fixedResponse = await fetch(`${BASE_URL}/api/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fixedStaffData)
      });

      if (fixedResponse.ok) {
        const fixedStaff = await fixedResponse.json();
        console.log('✅ Fixed staff created:', fixedStaff);
      } else {
        const fixedError = await fixedResponse.json();
        console.log('❌ Fixed staff creation failed:', fixedError);
      }

    } else {
      const staff = await staffResponse.json();
      console.log('✅ Staff created successfully:', staff);
    }

    // Test 3: Check if staff already exists
    console.log('\n4. Testing duplicate staff creation...');
    const duplicateResponse = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffData)
    });

    if (!duplicateResponse.ok) {
      const duplicateError = await duplicateResponse.json();
      console.log('✅ Duplicate check working:', duplicateError);
    } else {
      console.log('❌ Duplicate check failed - should have rejected');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testStaffCreation(); 