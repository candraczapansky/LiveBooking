import { DatabaseStorage } from './storage';
import { hashPassword } from './utils/password';

async function migratePasswords() {
  const storage = new DatabaseStorage();
  
  try {
    console.log('Starting password migration...');
    
    // Get all users
    const users = await storage.getAllUsers();
    console.log(`Found ${users.length} users to migrate`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2b$)
      if (user.password.startsWith('$2b$')) {
        console.log(`Skipping user ${user.username} - password already hashed`);
        skipped++;
        continue;
      }
      
      // Hash the plain text password
      const hashedPassword = await hashPassword(user.password);
      
      // Update the user with hashed password
      await storage.updateUser(user.id, { password: hashedPassword });
      
      console.log(`Migrated password for user ${user.username}`);
      migrated++;
    }
    
    console.log(`Migration complete! Migrated: ${migrated}, Skipped: ${skipped}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migratePasswords(); 