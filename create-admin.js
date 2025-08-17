import { PgStorage } from './server/storage.ts';
import { hashPassword } from './server/utils/password.ts';

async function createAdminUser() {
  try {
    const storage = new PgStorage();
    
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByUsername('admin');
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Hash password
    const hashedPassword = await hashPassword('admin123');
    
    // Create admin user
    const adminUser = await storage.createUser({
      username: 'admin',
      email: 'admin@admin.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    
    console.log('Admin user created successfully:', adminUser);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser(); 