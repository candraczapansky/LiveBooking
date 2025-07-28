#!/usr/bin/env node

/**
 * Setup SMS Booking Data
 * 
 * This script ensures the basic data needed for SMS booking is in place:
 * 1. Services
 * 2. Staff members
 * 3. Staff schedules
 * 4. Staff service assignments
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';

async function setupSMSBookingData() {
  console.log('🔧 Setting up SMS Booking Data...\n');

  try {
    // Check if server is running
    console.log('1. Checking server connectivity...');
    try {
      const healthResponse = await fetch(`${BASE_URL}/api/health`);
      if (!healthResponse.ok) {
        console.log('❌ Server is not running. Please start the server first.');
        console.log('   Run: npm run dev');
        return;
      }
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not running. Please start the server first.');
      console.log('   Run: npm run dev');
      return;
    }

    // Step 1: Check/Create Service Category
    console.log('\n2. Setting up service category...');
    let categoryId;
    try {
      const categoriesResponse = await fetch(`${BASE_URL}/api/service-categories`);
      if (categoriesResponse.ok) {
        const categories = await categoriesResponse.json();
        if (categories.length > 0) {
          categoryId = categories[0].id;
          console.log(`✅ Using existing category: ${categories[0].name} (ID: ${categoryId})`);
        } else {
          // Create a category
          const categoryData = {
            name: 'Spa Services',
            description: 'Relaxing spa and wellness services',
            color: '#8B5CF6'
          };
          
          const createCategoryResponse = await fetch(`${BASE_URL}/api/service-categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
          });
          
          if (createCategoryResponse.ok) {
            const category = await createCategoryResponse.json();
            categoryId = category.id;
            console.log(`✅ Created category: ${category.name} (ID: ${categoryId})`);
          } else {
            console.log('❌ Failed to create category');
            return;
          }
        }
      } else {
        console.log('❌ Failed to fetch categories');
        return;
      }
    } catch (error) {
      console.log('❌ Error with categories:', error.message);
      return;
    }

    // Step 2: Check/Create Service
    console.log('\n3. Setting up service...');
    let serviceId;
    try {
      const servicesResponse = await fetch(`${BASE_URL}/api/services`);
      if (servicesResponse.ok) {
        const services = await servicesResponse.json();
        const signatureService = services.find(s => s.name.toLowerCase().includes('signature'));
        
        if (signatureService) {
          serviceId = signatureService.id;
          console.log(`✅ Using existing service: ${signatureService.name} (ID: ${serviceId})`);
        } else {
          // Check if automatic service creation is disabled
          if (process.env.DISABLE_AUTOMATIC_SERVICE_CREATION === 'true') {
            console.log('❌ Automatic service creation is disabled. Cannot create service for SMS booking setup.');
            console.log('   Please create a service manually through the web interface first.');
            return;
          }

          // Create a service
          const serviceData = {
            name: 'Signature Head Spa',
            description: 'Relaxing head spa treatment with massage and aromatherapy',
            duration: 60,
            price: 99.00,
            categoryId: categoryId,
            bufferTimeBefore: 0,
            bufferTimeAfter: 0,
            color: '#3B82F6'
          };
          
          const createServiceResponse = await fetch(`${BASE_URL}/api/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serviceData)
          });
          
          if (createServiceResponse.ok) {
            const service = await createServiceResponse.json();
            serviceId = service.id;
            console.log(`✅ Created service: ${service.name} (ID: ${serviceId})`);
          } else {
            console.log('❌ Failed to create service');
            return;
          }
        }
      } else {
        console.log('❌ Failed to fetch services');
        return;
      }
    } catch (error) {
      console.log('❌ Error with services:', error.message);
      return;
    }

    // Step 3: Check/Create Staff Member
    console.log('\n4. Setting up staff member...');
    let staffId;
    try {
      const staffResponse = await fetch(`${BASE_URL}/api/staff`);
      if (staffResponse.ok) {
        const staff = await staffResponse.json();
        if (staff.length > 0) {
          staffId = staff[0].id;
          console.log(`✅ Using existing staff: ${staff[0].title || 'Staff'} (ID: ${staffId})`);
        } else {
          // Create a staff user first
          const userData = {
            username: `staff_${Date.now()}`,
            email: `staff_${Date.now()}@example.com`,
            password: 'Test123!',
            firstName: 'Emma',
            lastName: 'Martinez',
            phone: '555-123-4567',
            role: 'staff'
          };
          
          const createUserResponse = await fetch(`${BASE_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
          });
          
          if (createUserResponse.ok) {
            const user = await createUserResponse.json();
            
            // Create staff profile
            const staffData = {
              userId: user.id,
              title: 'Senior Spa Therapist',
              bio: 'Emma has over 5 years of experience in spa treatments.',
              commissionType: 'commission',
              commissionRate: 0.3
            };
            
            const createStaffResponse = await fetch(`${BASE_URL}/api/staff`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(staffData)
            });
            
            if (createStaffResponse.ok) {
              const staffMember = await createStaffResponse.json();
              staffId = staffMember.id;
              console.log(`✅ Created staff: ${staffMember.title} (ID: ${staffId})`);
            } else {
              console.log('❌ Failed to create staff');
              return;
            }
          } else {
            console.log('❌ Failed to create staff user');
            return;
          }
        }
      } else {
        console.log('❌ Failed to fetch staff');
        return;
      }
    } catch (error) {
      console.log('❌ Error with staff:', error.message);
      return;
    }

    // Step 4: Check/Create Staff Schedule
    console.log('\n5. Setting up staff schedule...');
    try {
      const schedulesResponse = await fetch(`${BASE_URL}/api/staff-schedules`);
      if (schedulesResponse.ok) {
        const schedules = await schedulesResponse.json();
        const staffSchedules = schedules.filter(s => s.staffId === staffId);
        
        if (staffSchedules.length > 0) {
          console.log(`✅ Staff already has ${staffSchedules.length} schedules`);
        } else {
          // Create schedules for the week
          const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          for (const day of weekdays) {
            const scheduleData = {
              staffId: staffId,
              dayOfWeek: day,
              startTime: day === 'Saturday' ? '10:00' : '09:00',
              endTime: day === 'Saturday' ? '16:00' : '17:00',
              isBlocked: false
            };
            
            const createScheduleResponse = await fetch(`${BASE_URL}/api/staff-schedules`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(scheduleData)
            });
            
            if (createScheduleResponse.ok) {
              console.log(`✅ Created schedule for ${day}`);
            } else {
              console.log(`❌ Failed to create schedule for ${day}`);
            }
          }
        }
      } else {
        console.log('❌ Failed to fetch staff schedules');
        return;
      }
    } catch (error) {
      console.log('❌ Error with staff schedules:', error.message);
      return;
    }

    // Step 5: Check/Create Staff Service Assignment
    console.log('\n6. Setting up staff service assignment...');
    try {
      const staffServicesResponse = await fetch(`${BASE_URL}/api/staff-services`);
      if (staffServicesResponse.ok) {
        const staffServices = await staffServicesResponse.json();
        const assignment = staffServices.find(ss => ss.staffId === staffId && ss.serviceId === serviceId);
        
        if (assignment) {
          console.log(`✅ Staff already assigned to service`);
        } else {
          // Create assignment
          const assignmentData = {
            staffId: staffId,
            serviceId: serviceId
          };
          
          const createAssignmentResponse = await fetch(`${BASE_URL}/api/staff-services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assignmentData)
          });
          
          if (createAssignmentResponse.ok) {
            console.log(`✅ Assigned service to staff`);
          } else {
            console.log('❌ Failed to assign service to staff');
            return;
          }
        }
      } else {
        console.log('❌ Failed to fetch staff services');
        return;
      }
    } catch (error) {
      console.log('❌ Error with staff services:', error.message);
      return;
    }

    console.log('\n🎉 SMS Booking Data Setup Complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Test SMS booking with: "I want to book a Signature Head Spa for 2:00 PM"');
    console.log('2. Run: node debug-sms-booking.js to verify everything is working');
    console.log('3. Check server logs for any remaining issues');

  } catch (error) {
    console.error('❌ Error during setup:', error);
  }
}

// Run the setup
setupSMSBookingData().catch(console.error); 