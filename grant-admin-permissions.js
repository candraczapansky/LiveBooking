import { DatabaseStorage } from './server/storage.js';
import { db } from './server/db.js';
import { users } from './server/schema.js';

async function grantAdminPermissions(username) {
  try {
    console.log(`Attempting to grant admin permissions to user: ${username}`);
    
    // Initialize storage
    const storage = new DatabaseStorage();
    
    // Find the user by username
    const user = await storage.getUserByUsername(username);
    
    if (!user) {
      console.error(`User with username '${username}' not found`);
      return;
    }
    
    console.log(`Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    console.log(`Current role: ${user.role}`);
    
    if (user.role === 'admin') {
      console.log('User already has admin role');
      return;
    }
    
    // Update user role to admin
    const updatedUser = await storage.updateUser(user.id, { role: 'admin' });
    
    console.log(`Successfully updated user role to: ${updatedUser.role}`);
    console.log(`User ${username} now has admin permissions!`);
    
  } catch (error) {
    console.error('Error granting admin permissions:', error);
  }
}

// Get username from command line argument
const username = process.argv[2];

if (!username) {
  console.log('Usage: node grant-admin-permissions.js <username>');
  console.log('Example: node grant-admin-permissions.js yourusername');
  process.exit(1);
}

grantAdminPermissions(username);
