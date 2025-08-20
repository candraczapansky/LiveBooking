import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, type User } from '../../shared/schema';

export class UsersStorage {
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserById(id: number): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0] || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.email, email));
    return results[0] || null;
  }

  async createUser(data: any): Promise<User> {
    const results = await db.insert(users).values(data).returning();
    return results[0];
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | null> {
    const results = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return results[0] || null;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

