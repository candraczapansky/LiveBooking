import { DatabaseStorage } from './server/storage.js';

async function updateRole() {
  try {
    console.log('Updating user role...');

    // Initialize storage
    const storage = new DatabaseStorage();

    // Get all users
    const users = await storage.getAllUsers();
    const user = users.find(u => u.id === 1);

    if (!user) {
      console.error('User not found');
      return;
    }

    console.log('Current user info:', {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    });

    // Update user role to admin
    const updatedUser = await storage.updateUser(user.id, { role: 'admin' });

    console.log('✅ Successfully updated user role!');
    console.log('Updated user info:', {
      id: updatedUser.id,
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role
    });

  } catch (error) {
    console.error('Error updating user role:', error);
  }
}

// Run the update
updateRole();
