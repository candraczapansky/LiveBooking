#!/usr/bin/env node

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function findKimCzapansky() {
  try {
    const storage = new DatabaseStorage();
    
    console.log('🔍 Searching for Kim Czapansky in the database...\n');
    
    // Get all users and staff
    const allUsers = await storage.getAllUsers();
    const allStaff = await storage.getAllStaff();
    
    // Search for Kim Czapansky specifically
    console.log('📋 Users with "czapansky" in their name or email:\n');
    const czapanskys = allUsers.filter(u => 
      u.firstName?.toLowerCase().includes('czapansky') || 
      u.lastName?.toLowerCase().includes('czapansky') ||
      u.email?.toLowerCase().includes('czapansky')
    );
    
    if (czapanskys.length > 0) {
      czapanskys.forEach(user => {
        console.log(`User ID: ${user.id}`);
        console.log(`Name: ${user.firstName} ${user.lastName}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        
        // Check if they have a staff record
        const staffRecord = allStaff.find(s => s.userId === user.id);
        if (staffRecord) {
          console.log(`Staff ID: ${staffRecord.id}`);
          console.log(`Title: ${staffRecord.title}`);
          console.log(`Commission Type: ${staffRecord.commissionType}`);
          console.log(`Commission Rate: ${staffRecord.commissionRate}`);
        } else {
          console.log('No staff record found');
        }
        console.log('---');
      });
    } else {
      console.log('No users found with "czapansky" in their name\n');
    }
    
    // Search for users named Kim
    console.log('\n📋 Users with first name "Kim" or "Kimberly":\n');
    const kims = allUsers.filter(u => 
      u.firstName?.toLowerCase() === 'kim' || 
      u.firstName?.toLowerCase() === 'kimberly'
    );
    
    if (kims.length > 0) {
      kims.forEach(user => {
        console.log(`User ID: ${user.id}`);
        console.log(`Name: ${user.firstName} ${user.lastName}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        
        // Check if they have a staff record
        const staffRecord = allStaff.find(s => s.userId === user.id);
        if (staffRecord) {
          console.log(`Staff ID: ${staffRecord.id}`);
          console.log(`Title: ${staffRecord.title}`);
        }
        console.log('---');
      });
    }
    
    // Now let's check if there's a staff member named Kim in any staff records
    console.log('\n📋 Checking staff records directly:\n');
    
    // Get user details for each staff member
    for (const staff of allStaff) {
      const user = allUsers.find(u => u.id === staff.userId);
      if (user) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        if (fullName.includes('kim') || fullName.includes('czapansky')) {
          console.log(`Found potential match:`);
          console.log(`  Staff ID: ${staff.id}`);
          console.log(`  User ID: ${user.id}`);
          console.log(`  Name: ${user.firstName} ${user.lastName}`);
          console.log(`  Email: ${user.email}`);
          console.log(`  Role: ${user.role}`);
          console.log(`  Title: ${staff.title}`);
          console.log('---');
        }
      }
    }
    
    // Check sales history for any "kim czapansky" entries
    console.log('\n📊 Checking sales history for Kim Czapansky references:\n');
    const allSales = await storage.getAllSalesHistory();
    
    // Find unique staff names that might be Kim
    const staffNames = new Set();
    allSales.forEach(sale => {
      if (sale.staffName) {
        const lower = sale.staffName.toLowerCase();
        if (lower.includes('kim') || lower.includes('czapansky')) {
          staffNames.add(sale.staffName);
        }
      }
    });
    
    if (staffNames.size > 0) {
      console.log('Unique staff names containing "kim" or "czapansky" in sales history:');
      Array.from(staffNames).forEach(name => {
        const count = allSales.filter(s => s.staffName === name).length;
        console.log(`  "${name}" - ${count} transactions`);
      });
    } else {
      console.log('No sales history entries with "kim" or "czapansky" in staff name');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

findKimCzapansky().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});










