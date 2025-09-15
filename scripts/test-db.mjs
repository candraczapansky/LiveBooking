#!/usr/bin/env node

console.log('Test script starting...');

import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';

async function test() {
  console.log('In test function');
  
  try {
    const storage = new DatabaseStorage();
    console.log('Storage created');
    
    const users = await storage.getAllUsers();
    console.log(`Found ${users.length} users`);
    
    // Show first few users
    for (const user of users.slice(0, 5)) {
      console.log(`User: ${user.name || 'No name'} - ${user.email}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

console.log('About to run test...');
test().then(() => {
  console.log('Test complete');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});










