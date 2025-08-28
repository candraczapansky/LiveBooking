import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { users } from '../../shared/schema.js';
export class UsersStorage {
    async getAllUsers() {
        return await db.select().from(users);
    }
    async getUserById(id) {
        const results = await db.select().from(users).where(eq(users.id, id));
        return results[0] || null;
    }
    async getUserByUsername(username) {
        const results = await db.select().from(users).where(eq(users.username, username));
        return results[0] || null;
    }
    async getUserByEmail(email) {
        const results = await db.select().from(users).where(eq(users.email, email));
        return results[0] || null;
    }
    async createUser(data) {
        const results = await db.insert(users).values(data).returning();
        return results[0];
    }
    async updateUser(id, data) {
        const results = await db.update(users)
            .set(data)
            .where(eq(users.id, id))
            .returning();
        return results[0] || null;
    }
    async deleteUser(id) {
        await db.delete(users).where(eq(users.id, id));
    }
}
