import 'dotenv/config';
import { DatabaseStorage } from '../server/storage.ts';
import { hashPassword } from '../server/utils/password.ts';

async function ensureAdmin() {
  const storage = new DatabaseStorage();
  const username = 'admin';
  const password = 'admin123';

  try {
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      const hashed = await hashPassword(password);
      await storage.updateUser(existing.id, { password: hashed, role: existing.role || 'admin' });
      console.log('✅ Admin user exists. Password reset to requested value.');
      return;
    }

    const hashed = await hashPassword(password);
    const user = await storage.createUser({
      username,
      password: hashed,
      email: 'admin@admin.com',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      phone: null,
    });
    console.log('✅ Admin user created:', { id: user.id, username: user.username, role: user.role });
  } catch (err) {
    console.error('❌ Failed to ensure admin user:', err?.message || err);
    process.exitCode = 1;
  }
}

ensureAdmin();


