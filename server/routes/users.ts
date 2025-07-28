import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage";
import { z } from "zod";
import { insertUserSchema, insertUserColorPreferencesSchema, updateUserSchema } from "@shared/schema";

// Helper to validate request body using schema
function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: Function) => {
    try {
      console.log("Validating body with schema:", JSON.stringify(req.body, null, 2));
      schema.parse(req.body);
      console.log("Validation successful");
      next();
    } catch (error) {
      console.log("Validation failed:", error);
      res.status(400).json({ error: "Invalid request body", details: error });
    }
  };
}

export function registerUserRoutes(app: Express, storage: IStorage) {
  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      console.log("GET /api/users called - DEBUG VERSION");
      const { search, role } = req.query;
      let users;
      
      if (search && typeof search === 'string') {
        // Search users by name, email, or phone
        users = await storage.searchUsers(search);
      } else if (role && typeof role === 'string') {
        // Filter users by role
        users = await storage.getUsersByRole(role);
      } else {
        users = await storage.getAllUsers();
      }
      
      console.log("Users found:", users.length);
      if (users.length > 0) {
        console.log("First user object:", users[0]);
        console.log("First user keys:", Object.keys(users[0]));
      }
      
      // Remove sensitive information
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      // Debug log: print the first user object and its keys
      if (safeUsers.length > 0) {
        console.log('API response - first user object:', safeUsers[0]);
        console.log('API response - first user keys:', Object.keys(safeUsers[0]));
        
        // Check if phone field exists in the response
        const firstUser = safeUsers[0];
        console.log('Phone field check:', {
          hasPhone: 'phone' in firstUser,
          phoneValue: firstUser.phone,
          phoneType: typeof firstUser.phone,
          phoneLength: firstUser.phone?.length
        });
        
        // Check how many users have phone numbers
        const usersWithPhones = safeUsers.filter((u: any) => u.phone && u.phone.trim() !== '');
        console.log('Users with phones in API response:', usersWithPhones.length, 'out of', safeUsers.length);
      }

      res.json(safeUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users: " + error.message });
    }
  });

  // Update user
  app.put("/api/users/:id", validateBody(updateUserSchema), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log("Updating user with data:", JSON.stringify(req.body, null, 2));
      
      const updatedUser = await storage.updateUser(userId, req.body);
      console.log("User updated successfully:", JSON.stringify(updatedUser, null, 2));
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user:", error);
      
      // Handle specific error types
      if (error.message.includes("already in use by another user")) {
        res.status(409).json({ error: error.message });
      } else if (error.message.includes("User not found")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update user: " + error.message });
      }
    }
  });

  // Patch user (partial update)
  app.patch("/api/users/:id", validateBody(updateUserSchema), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log("PATCH - Updating user with data:", JSON.stringify(req.body, null, 2));
      
      const updatedUser = await storage.updateUser(userId, req.body);
      console.log("PATCH - User updated successfully:", JSON.stringify(updatedUser, null, 2));
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user:", error);
      
      // Handle specific error types
      if (error.message.includes("already in use by another user")) {
        res.status(409).json({ error: error.message });
      } else if (error.message.includes("User not found")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Failed to update user: " + error.message });
      }
    }
  });

  // Delete user
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`Attempting to delete user with ID: ${userId}`);

      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        console.log(`User with ID ${userId} not found`);
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`User exists, proceeding with deletion:`, existingUser);
      const deleted = await storage.deleteUser(userId);
      console.log(`Deletion result:`, deleted);

      if (deleted) {
        console.log(`User ${userId} deleted successfully`);
        res.json({ success: true, message: "User deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete user" });
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user: " + error.message });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove sensitive information
      const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
      };

      res.json(safeUser);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user: " + error.message });
    }
  });

  // Get user color preferences
  app.get("/api/users/:id/color-preferences", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const preferences = await storage.getUserColorPreferences(userId);
      res.json(preferences || {});
    } catch (error: any) {
      console.error("Error fetching user color preferences:", error);
      res.status(500).json({ error: "Failed to fetch color preferences: " + error.message });
    }
  });

  // Update user color preferences
  app.put("/api/users/:id/color-preferences", validateBody(insertUserColorPreferencesSchema.partial()), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`Saving color preferences for user ${userId}:`, req.body);

      // Delete existing preferences
      const deleted = await storage.deleteUserColorPreferences(userId);
      console.log(`Deleted existing color preferences for user ${userId}:`, deleted);

      // Create new preferences
      const result = await storage.createUserColorPreferences({
        userId,
        ...req.body
      });
      console.log(`Created new color preferences for user ${userId}:`, result);

      res.json(result);
    } catch (error: any) {
      console.error("Error updating user color preferences:", error);
      res.status(500).json({ error: "Failed to update color preferences: " + error.message });
    }
  });
} 