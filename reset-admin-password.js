import { PgStorage } from './server/storage.ts';
import { hashPassword } from './server/utils/password.ts';

async function resetAdminPassword() {
  try {
    const storage = new PgStorage();
    
    // Get admin user
    const adminUser = await storage.getUserByUsername('admin');
    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }
    
    // Hash new password
    const hashedPassword = await hashPassword('admin123');
    
    // Update admin password
    const updatedUser = await storage.updateUser(adminUser.id, {
      password: hashedPassword,
    });
    
    console.log('Admin password reset successfully');
  } catch (error) {
    console.error('Error resetting admin password:', error);
  }
}

resetAdminPassword(); 