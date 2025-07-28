#!/usr/bin/env node

/**
 * Test Staff Form Fix
 * 
 * This script tests the staff creation with the same data structure as the frontend form.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

async function testStaffFormFix() {
  console.log('🧪 Testing Staff Form Fix...\n');

  try {
    // Simulate the exact flow from the frontend form
    console.log('1. Creating user (simulating frontend form)...');
    
    const timestamp = Date.now();
    const baseUsername = 'teststaff'.toLowerCase();
    const username = `${baseUsername}${timestamp.toString().slice(-4)}`;
    const email = `teststaff${timestamp}@example.com`;
    
    const userData = {
      username,
      email,
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'Staff',
      phone: '555-123-4567',
      role: 'staff'
    };

    console.log('User data:', userData);

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

    // Simulate the staff data structure from the frontend form
    console.log('\n2. Creating staff member (simulating frontend form)...');
    
    const formData = {
      title: 'Test Therapist',
      bio: 'Test bio',
      commissionType: 'commission',
      commissionRate: 30, // Frontend sends percentage (30%)
      hourlyRate: 0,
      fixedSalary: 0,
      email: email,
      firstName: 'Test',
      lastName: 'Staff',
      phone: '555-123-4567'
    };

    // Convert to staff data (same logic as frontend)
    const staffData = {
      userId: user.user.id, // Fixed: access user.id from nested structure
      title: formData.title,
      bio: formData.bio || "",
      commissionType: formData.commissionType,
      commissionRate: formData.commissionType === 'commission' ? formData.commissionRate / 100 : null, // Convert to decimal
      hourlyRate: formData.commissionType === 'hourly' ? formData.hourlyRate : null,
      fixedRate: formData.commissionType === 'fixed' ? formData.fixedSalary : null,
    };

    console.log('Staff data being sent:', staffData);

    const staffResponse = await fetch(`${BASE_URL}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffData)
    });

    if (!staffResponse.ok) {
      const errorData = await staffResponse.json();
      console.log('❌ Staff creation failed:', errorData);
    } else {
      const staff = await staffResponse.json();
      console.log('✅ Staff created successfully:', staff);
      console.log('🎉 Staff form fix is working!');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testStaffFormFix(); 