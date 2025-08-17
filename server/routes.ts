import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import type { IStorage } from "./storage";
import { z } from "zod";

import speakeasy from "speakeasy";
import QRCode from "qrcode";
import {
  insertClientSchema,
  insertServiceCategorySchema,
  insertRoomSchema,
  insertDeviceSchema,
  insertServiceSchema,
  insertProductSchema,
  insertStaffSchema,
  insertStaffServiceSchema,
  insertAppointmentSchema,
  insertAppointmentHistorySchema,
  insertMembershipSchema,
  insertClientMembershipSchema,

  insertMarketingCampaignSchema,
  insertPromoCodeSchema,
  insertStaffScheduleSchema,
  insertFormSchema,
  insertUserColorPreferencesSchema,
  insertNoteTemplateSchema
} from "@shared/schema";
import { sendSMS, isTwilioConfigured } from "./sms";
import { 
  sendEmail, 
  sendBulkEmail, 
  createAppointmentReminderEmail, 
  createMarketingCampaignEmail, 
  createAccountUpdateEmail 
} from "./email";
import { 
  triggerBookingConfirmation, 
  triggerCancellation, 
  triggerNoShow, 

  triggerCustomAutomation,
} from "./automation-triggers";
import { PhoneService } from "./phone-service";

import { insertPhoneCallSchema, insertCallRecordingSchema } from "@shared/schema";
import { registerExternalRoutes } from "./external-api";
import { JotformIntegration } from "./jotform-integration";
import { LLMService } from "./llm-service";
import { AutoRespondService } from "./auto-respond-service";
import { SMSAutoRespondService } from "./sms-auto-respond-service";
import { SMSStructuredAssistant } from "./sms-structured-assistant";
import { registerAuthRoutes, registerUserRoutes, registerAppointmentRoutes, registerAppointmentPhotoRoutes, registerServiceRoutes, registerNoteTemplateRoutes, registerNoteHistoryRoutes, registerLocationRoutes } from "./routes/index";
import { registerPermissionRoutes } from "./routes/permissions";
import { registerReportRoutes } from "./routes/reports";
import { registerMarketingRoutes } from "./routes/marketing";
import { emailMarketingRoutes, initializeEmailMarketingRoutes } from "./routes/email-marketing";
import { getConfigStatus, validateConfig, DatabaseConfig } from "./config";
import { hashPassword, comparePassword } from "./utils/password";
import { getFormPublicUrl, debugUrlConfig } from "./utils/url";
import { insertUserSchema, updateUserSchema } from "@shared/schema";

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
        firstName?: string;
        lastName?: string;
      };
    }
  }
}

// Helper to validate request body using schema
function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Validating body with schema:", JSON.stringify(req.body, null, 2));
      req.body = schema.parse(req.body);
      console.log("Validation successful");
      next();
    } catch (error) {
      console.log("Validation failed:", error);
      
      // Provide more detailed error messages for Zod validation errors
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => {
          const field = err.path.join('.');
          return `${field}: ${err.message}`;
        });
        return res.status(400).json({ 
          error: "Validation failed", 
          details: errorMessages.join(', ')
        });
      }
      
      res.status(400).json({ error: "Invalid request body" });
    }
  };
}

// Custom schema for staff service with custom rates
const staffServiceWithRatesSchema = insertStaffServiceSchema.extend({
  customRate: z.number().nullable().optional(),
  customCommissionRate: z.number().nullable().optional(),
});

// Helcim is now the primary payment processor

export async function registerRoutes(app: Express, storage: IStorage, autoRenewalService?: any): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);

  // Initialize LLM Service
  const llmService = new LLMService(storage);
  
  // Initialize SMS Auto-Respond Service
  const smsAutoRespondService = SMSAutoRespondService.getInstance(storage);
  
  // Initialize Email Auto-Respond Service
  const autoRespondService = new AutoRespondService(storage);
  
  // Initialize SMS Structured Assistant
  const smsStructuredAssistant = new SMSStructuredAssistant(storage);

  // Register modular routes
  registerAuthRoutes(app, storage);
  registerUserRoutes(app, storage);
  registerAppointmentRoutes(app, storage);
  registerAppointmentPhotoRoutes(app, storage);
  // registerPaymentRoutes(app, storage); // Temporarily disabled to test Helcim payment
  registerServiceRoutes(app, storage);
  registerNoteTemplateRoutes(app, storage);
  registerNoteHistoryRoutes(app, storage);
  registerLocationRoutes(app);
  registerReportRoutes(app, storage);
  registerPermissionRoutes(app, storage);
  registerMarketingRoutes(app, storage);
  
  // Initialize and register email marketing routes
  initializeEmailMarketingRoutes(storage);
  app.use('/api/email-marketing', emailMarketingRoutes);



  // Client registration route (without username/password)
  app.post("/api/clients", validateBody(insertClientSchema), async (req, res) => {
    const { email } = req.body;
    
    // Check if email already exists
    const existingUsers = await storage.getAllUsers();
    const existingUser = existingUsers.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    // Generate a unique username for the client
    const username = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const password = Math.random().toString(36).substring(2, 12); // Generate temporary password
    
    // Hash password and create new client
    const hashedPassword = await hashPassword(password);
    
    // Ensure default values are set for email preferences
    const clientData = {
      ...req.body,
      username,
      password: hashedPassword,
      role: "client",
      // Set default values for email and SMS preferences
      emailAppointmentReminders: req.body.emailAppointmentReminders !== undefined ? req.body.emailAppointmentReminders : true,
      smsAppointmentReminders: req.body.smsAppointmentReminders !== undefined ? req.body.smsAppointmentReminders : true,
      emailAccountManagement: req.body.emailAccountManagement !== undefined ? req.body.emailAccountManagement : true,
      smsAccountManagement: req.body.smsAccountManagement !== undefined ? req.body.smsAccountManagement : false,
      emailPromotions: req.body.emailPromotions !== undefined ? req.body.emailPromotions : false,
      smsPromotions: req.body.smsPromotions !== undefined ? req.body.smsPromotions : false
    };
    
    console.log('Creating client with data:', JSON.stringify(clientData, null, 2));
    
    const newClient = await storage.createUser(clientData);
    
    // Remove password from response
    const { password: _, ...clientWithoutPassword } = newClient;
    
    return res.status(201).json(clientWithoutPassword);
  });

  // Enhanced CSV client import route
  app.post("/api/clients/import", async (req, res) => {
    try {
      const { clients } = req.body;
      
      if (!Array.isArray(clients) || clients.length === 0) {
        return res.status(400).json({ error: "Invalid clients data" });
      }

      // Add a reasonable limit to prevent server overload
      if (clients.length > 25000) {
        return res.status(400).json({ 
          error: "Import too large. Maximum 25,000 clients per import allowed." 
        });
      }

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[]
      };

      console.log(`Processing ${clients.length} clients...`);
      console.log('Sample client data:', clients.slice(0, 3));
      console.log('First client validation check:', {
        firstName: clients[0]?.firstName,
        lastName: clients[0]?.lastName,
        hasFirstName: !!clients[0]?.firstName,
        hasLastName: !!clients[0]?.lastName,
        firstNameType: typeof clients[0]?.firstName,
        lastNameType: typeof clients[0]?.lastName
      });

      for (const clientData of clients) {
        try {
          // Basic validation - require at least one name field
          if (!clientData.firstName && !clientData.lastName) {
            console.log(`Skipping client - missing both names:`, clientData);
            results.errors.push(`Row ${results.imported + results.skipped + 1}: Missing both first name and last name`);
            results.skipped++;
            continue;
          }

          // Ensure we have at least one name field
          const firstName = clientData.firstName?.trim() || '';
          const lastName = clientData.lastName?.trim() || '';
          
          // If both are empty, skip
          if (!firstName && !lastName) {
            console.log(`Skipping client - both names empty after trim:`, clientData);
            results.errors.push(`Row ${results.imported + results.skipped + 1}: Missing both first name and last name`);
            results.skipped++;
            continue;
          }

          // Handle email - generate unique if missing or duplicate
          let email = clientData.email?.trim() || '';
          if (!email) {
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            email = `client.${timestamp}.${randomSuffix}@placeholder.com`;
          } else {
            // Check if email already exists
            const existingUser = await storage.getUserByEmail(email);
            if (existingUser) {
              const timestamp = Date.now();
              const randomSuffix = Math.random().toString(36).substring(2, 6);
              const emailParts = email.split('@');
              email = `${emailParts[0]}+${timestamp}-${randomSuffix}@${emailParts[1]}`;
            }
          }

          // Handle phone number - format plain 10-digit numbers or generate placeholder
          let phone = clientData.phone?.trim() || '';
          console.log(`Processing phone number: "${clientData.phone}" -> "${phone}"`);
          console.log(`Phone data type: ${typeof clientData.phone}, length: ${clientData.phone?.length}`);
          
          if (!phone) {
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            phone = `555-000-${timestamp}-${randomSuffix}`;
            console.log(`Generated placeholder phone: ${phone}`);
          } else {
            // Format plain 10-digit numbers to (XXX) XXX-XXXX format
            const cleanPhone = phone.replace(/\D/g, ''); // Remove all non-digits
            console.log(`Cleaned phone: "${phone}" -> "${cleanPhone}"`);
            
            if (cleanPhone.length === 10) {
              phone = `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
              console.log(`Formatted 10-digit phone: ${phone}`);
            } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
              // Handle 11-digit numbers starting with 1
              phone = `(${cleanPhone.slice(1, 4)}) ${cleanPhone.slice(4, 7)}-${cleanPhone.slice(7)}`;
              console.log(`Formatted 11-digit phone: ${phone}`);
            } else {
              console.log(`Keeping phone as-is: ${phone}`);
              // Try to format any 10-digit number that wasn't caught above
              if (cleanPhone.length === 10) {
                phone = `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
                console.log(`Formatted 10-digit phone after cleanup: ${phone}`);
              }
            }
            // If it doesn't match expected patterns, keep as is
            
            // Check if phone number already exists and generate unique if needed
            const existingUserWithPhone = await storage.getUserByPhone(phone);
            if (existingUserWithPhone) {
              console.log(`Phone number already exists: ${phone}, generating unique version`);
              const timestamp = Date.now();
              const randomSuffix = Math.random().toString(36).substring(2, 6);
              const phoneParts = phone.replace(/[^\d]/g, ''); // Get just digits
              if (phoneParts.length >= 7) {
                phone = `(${phoneParts.slice(0, 3)}) ${phoneParts.slice(3, 6)}-${phoneParts.slice(6, 10)}-${timestamp}-${randomSuffix}`;
              } else {
                phone = `${phone}-${timestamp}-${randomSuffix}`;
              }
              console.log(`Generated unique phone: ${phone}`);
            }
          }

          // Generate unique username and password
          const username = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const password = Math.random().toString(36).substring(2, 12);

          // Create user with all required fields
          const newClient = {
            email,
            firstName: firstName,
            lastName: lastName,
            phone,
            username,
            password,
            role: "client" as const,
            // Default communication preferences
            emailAccountManagement: true,
            emailAppointmentReminders: true,
            emailPromotions: false,
            smsAccountManagement: false,
            smsAppointmentReminders: true,
            smsPromotions: false,
          };

          // Hash password and create user
          const hashedPassword = await hashPassword(newClient.password);
          const createdUser = await storage.createUser({
            ...newClient,
            password: hashedPassword
          });

          results.imported++;
          console.log(`✅ Imported client: ${createdUser.firstName} ${createdUser.lastName} - Phone: ${createdUser.phone}`);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error processing client:`, clientData, error);
          results.errors.push(`Row ${results.imported + results.skipped + 1}: ${errorMessage}`);
          results.skipped++;
        }
      }

      console.log(`Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`);
      return res.status(200).json(results);
    } catch (error) {
      console.error("CSV import error:", error);
      return res.status(500).json({ error: "Failed to import clients" });
    }
  });

  // Change password route
  app.post("/api/change-password", async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "User ID, current password, and new password are required" });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long" });
    }
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      // Hash and update password
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedNewPassword });
      
      return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      return res.status(500).json({ error: "Failed to change password" });
    }
  });





  // Users routes
  app.get("/api/users", async (req, res) => {
    console.log("GET /api/users called - DEBUG VERSION");
    try {
      const { search, role } = req.query;
      let users;
      
      if (search && typeof search === 'string') {
        // Search users by name, email, or phone
        users = await storage.searchUsers(search);
      } else if (role && typeof role === 'string') {
        // Filter users by role
        console.log('🔍 Filtering users by role:', role);
        users = await storage.getUsersByRole(role);
        console.log('🔍 Users found with role filter:', users.length);
        if (users.length > 0) {
          console.log('🔍 First user with role filter:', users[0]);
        }
      } else {
        users = await storage.getAllUsers();
      }
      
      console.log("Users found:", users.length);
      if (users.length > 0) {
        console.log("First user object:", users[0]);
        console.log("First user keys:", Object.keys(users[0]));
      }
      // Remove passwords from all users before sending
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      // Debug log: print the first user object and its keys
      if (usersWithoutPasswords.length > 0) {
        console.log('API response - first user object:', usersWithoutPasswords[0]);
        console.log('API response - first user keys:', Object.keys(usersWithoutPasswords[0]));
        
        // Check if phone field exists in the response
        const firstUser = usersWithoutPasswords[0];
        console.log('Phone field check:', {
          hasPhone: 'phone' in firstUser,
          phoneValue: firstUser.phone,
          phoneType: typeof firstUser.phone,
          phoneLength: firstUser.phone?.length
        });
        
        // Check how many users have phone numbers
        const usersWithPhones = usersWithoutPasswords.filter((u: any) => u.phone && u.phone.trim() !== '');
        console.log('Users with phones in API response:', usersWithPhones.length, 'out of', usersWithoutPasswords.length);
      }
      
      return res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });



  // Update user profile route
  app.put("/api/users/:id", validateBody(updateUserSchema), async (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    console.log("Updating user with data:", JSON.stringify(req.body, null, 2));
    console.log("User ID:", userId);
    console.log("Request body keys:", Object.keys(req.body));
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      console.log("Existing user found:", user.id, user.email);
      
      // Update user profile with all provided fields including communication preferences
      const updatedUser = await storage.updateUser(userId, req.body);
      
      console.log("User updated successfully:", JSON.stringify(updatedUser, null, 2));
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      return res.status(200).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({ 
        error: "Failed to update user profile",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // PATCH route for user updates (used by staff form)
  app.patch("/api/users/:id", validateBody(updateUserSchema), async (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    console.log("PATCH - Updating user with data:", JSON.stringify(req.body, null, 2));
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Update user profile with all provided fields
      const updatedUser = await storage.updateUser(userId, req.body);
      
      console.log("PATCH - User updated successfully:", JSON.stringify(updatedUser, null, 2));
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      return res.status(200).json(userWithoutPassword);
    } catch (error: any) {
      console.error("PATCH - Error updating user profile:", error);
      console.error("PATCH - Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({ 
        error: "Failed to update user profile",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Delete user route
  app.delete("/api/users/:id", async (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    try {
      console.log(`Attempting to delete user with ID: ${userId}`);
      
      // Check if user exists before deletion
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        console.log(`User with ID ${userId} not found`);
        return res.status(404).json({ error: "User not found" });
      }
      
      console.log(`User exists, proceeding with deletion:`, existingUser);
      
      // Delete the user
      const deleted = await storage.deleteUser(userId);
      console.log(`Deletion result:`, deleted);
      
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete user" });
      }
      
      console.log(`User ${userId} deleted successfully`);
      return res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      
      // Handle specific constraint errors
      if (error.message && error.message.includes("associated appointments")) {
        return res.status(400).json({ 
          error: error.message,
          type: "constraint_violation"
        });
      }
      
      return res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Individual user route
  app.get("/api/users/:id", async (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    try {
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // User Color Preferences routes
  app.get("/api/users/:id/color-preferences", async (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    try {
      const preferences = await storage.getUserColorPreferences(userId);
      return res.status(200).json(preferences || null);
    } catch (error: any) {
      console.error('Error fetching color preferences:', error);
      return res.status(500).json({ error: "Failed to fetch color preferences" });
    }
  });

  app.put("/api/users/:id/color-preferences", validateBody(insertUserColorPreferencesSchema.partial()), async (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    try {
      console.log(`Saving color preferences for user ${userId}:`, req.body);
      
      // Always delete ALL existing preferences first to ensure clean slate
      const deleted = await storage.deleteUserColorPreferences(userId);
      console.log(`Deleted existing color preferences for user ${userId}:`, deleted);
      
      // Create new preferences with the provided data
      const result = await storage.createUserColorPreferences({
        userId,
        ...req.body
      });
      
      console.log(`Created new color preferences for user ${userId}:`, result);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Error saving color preferences:', error);
      return res.status(500).json({ error: "Failed to save color preferences" });
    }
  });
  


  // Rooms routes
  app.get("/api/rooms", async (req, res) => {
    const rooms = await storage.getAllRooms();
    return res.status(200).json(rooms);
  });

  app.post("/api/rooms", validateBody(insertRoomSchema), async (req, res) => {
    const newRoom = await storage.createRoom(req.body);
    return res.status(201).json(newRoom);
  });

  app.put("/api/rooms/:id", validateBody(insertRoomSchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const updatedRoom = await storage.updateRoom(id, req.body);
      return res.status(200).json(updatedRoom);
    } catch (error) {
      return res.status(404).json({ error: "Room not found" });
    }
  });

  app.delete("/api/rooms/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteRoom(id);
    if (deleted) {
      return res.status(200).json({ message: "Room deleted successfully" });
    } else {
      return res.status(404).json({ error: "Room not found" });
    }
  });

  // Devices routes
  app.get("/api/devices", async (req, res) => {
    const devices = await storage.getAllDevices();
    return res.status(200).json(devices);
  });

  app.post("/api/devices", validateBody(insertDeviceSchema), async (req, res) => {
    const newDevice = await storage.createDevice(req.body);
    return res.status(201).json(newDevice);
  });

  app.put("/api/devices/:id", validateBody(insertDeviceSchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const updatedDevice = await storage.updateDevice(id, req.body);
      return res.status(200).json(updatedDevice);
    } catch (error) {
      return res.status(404).json({ error: "Device not found" });
    }
  });

  app.delete("/api/devices/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteDevice(id);
    if (deleted) {
      return res.status(200).json({ message: "Device deleted successfully" });
    } else {
      return res.status(404).json({ error: "Device not found" });
    }
  });
  
  // Staff routes
  app.get("/api/staff", async (req, res) => {
    try {
      const { locationId } = req.query;
      let allStaff;
      
      if (locationId) {
        // Filter staff by location
        allStaff = await storage.getAllStaff();
        const filteredStaff = allStaff.filter(staff => staff.locationId === parseInt(locationId as string));
        // If no staff found for the location, return all staff (fallback)
        if (filteredStaff.length === 0) {
          console.log(`No staff found for location ${locationId}, returning all staff as fallback`);
        } else {
          allStaff = filteredStaff;
        }
      } else {
        allStaff = await storage.getAllStaff();
      }
      
      console.log("Current staff in storage:", allStaff);
      
      // Get user details for each staff member
      const staffWithUserDetails = await Promise.all(
        allStaff.map(async (staffMember) => {
          const user = await storage.getUser(staffMember.userId);
          return {
            ...staffMember,
            user: user ? { 
              id: user.id,
              username: user.username,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone
            } : null
          };
        })
      );
      
      console.log("Staff with user details:", staffWithUserDetails);
      return res.status(200).json(staffWithUserDetails);
    } catch (error) {
      console.error("Error fetching staff:", error);
      return res.status(500).json({ error: "Failed to fetch staff" });
    }
  });
  
  app.post("/api/staff", validateBody(insertStaffSchema), async (req, res) => {
    try {
      console.log("POST /api/staff received data:", req.body);
      const { userId, title, commissionType, commissionRate, hourlyRate, fixedRate } = req.body;
      
      // Enhanced validation
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      if (!title?.trim()) {
        return res.status(400).json({ error: "Job title is required" });
      }
      
      // Validate commission type and related fields
      if (commissionType === 'commission' && (commissionRate === null || commissionRate === undefined || commissionRate < 0 || commissionRate > 1)) {
        return res.status(400).json({ error: "Commission rate must be between 0 and 100%" });
      }
      
      if (commissionType === 'hourly' && (!hourlyRate || hourlyRate <= 0)) {
        return res.status(400).json({ error: "Hourly rate must be greater than 0" });
      }
      
      if (commissionType === 'fixed' && (!fixedRate || fixedRate <= 0)) {
        return res.status(400).json({ error: "Fixed salary must be greater than 0" });
      }
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.log("User not found for ID:", userId);
        return res.status(400).json({ error: "User not found" });
      }
      
      console.log("Found user:", user);
      
      // Check if staff already exists for this user
      const existingStaff = await storage.getStaffByUserId(userId);
      if (existingStaff) {
        console.log("Staff already exists for user ID:", userId);
        return res.status(400).json({ error: "Staff member already exists for this user" });
      }
      
      // Update user role to staff if it's not already
      if (user.role !== "staff") {
        console.log("Updating user role from", user.role, "to staff");
        await storage.updateUser(userId, { role: "staff" });
      }
      
      console.log("Creating staff with validated data:", req.body);
      const newStaff = await storage.createStaff(req.body);
      console.log("Successfully created staff:", newStaff);
      
      return res.status(201).json(newStaff);
    } catch (error) {
      console.error("Error in /api/staff:", error);
      return res.status(500).json({ 
        error: "Failed to create staff member",
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  });
  
  app.get("/api/staff/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const staffMember = await storage.getStaff(id);
    
    if (!staffMember) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    
    const user = await storage.getUser(staffMember.userId);
    
    return res.status(200).json({
      ...staffMember,
      user: user ? { 
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone
      } : null
    });
  });
  
  app.put("/api/staff/:id", validateBody(insertStaffSchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const updatedStaff = await storage.updateStaff(id, req.body);
      return res.status(200).json(updatedStaff);
    } catch (error) {
      return res.status(404).json({ error: "Staff member not found" });
    }
  });

  app.patch("/api/staff/:id", validateBody(insertStaffSchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`PATCH /api/staff/${id} received data:`, req.body);
    try {
      const updatedStaff = await storage.updateStaff(id, req.body);
      console.log(`PATCH /api/staff/${id} updated successfully:`, updatedStaff);
      return res.status(200).json(updatedStaff);
    } catch (error) {
      console.error(`PATCH /api/staff/${id} error:`, error);
      return res.status(404).json({ error: "Staff member not found" });
    }
  });

  app.delete("/api/staff/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    console.log(`Attempting to delete staff member with ID: ${id}`);
    
    // Check if staff member exists before deletion
    const existingStaff = await storage.getStaff(id);
    console.log(`Staff member exists:`, existingStaff);
    
    const deleted = await storage.deleteStaff(id);
    console.log(`Deletion result:`, deleted);
    
    if (!deleted) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    
    return res.status(204).end();
  });
  
  // Staff Services routes
  app.get("/api/staff-services", async (req, res) => {
    try {
      const allStaffServices = await storage.getAllStaffServices();
      return res.status(200).json(allStaffServices);
    } catch (error: any) {
      console.error('Error fetching all staff services:', error);
      return res.status(500).json({ error: "Failed to fetch staff services: " + error.message });
    }
  });

  app.post("/api/staff-services", validateBody(staffServiceWithRatesSchema), async (req, res) => {
    const newStaffService = await storage.assignServiceToStaff(req.body);
    return res.status(201).json(newStaffService);
  });

  app.put("/api/staff-services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { customRate, customCommissionRate } = req.body;
    
    try {
      // Find the staff service and update it
      const existingStaffService = await storage.getStaffServiceById(id);
      if (!existingStaffService) {
        return res.status(404).json({ error: "Staff service not found" });
      }
      
      console.log("Updating staff service with data:", { customRate, customCommissionRate });
      
      const updatedStaffService = await storage.updateStaffService(id, {
        customRate: customRate || null,
        customCommissionRate: customCommissionRate || null,
      });
      
      console.log("Updated staff service result:", updatedStaffService);
      
      return res.status(200).json(updatedStaffService);
    } catch (error) {
      return res.status(404).json({ error: "Failed to update staff service" });
    }
  });

  app.patch("/api/staff-services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { customRate, customCommissionRate } = req.body;
    
    try {
      // Find the staff service and update it
      const existingStaffService = await storage.getStaffServiceById(id);
      if (!existingStaffService) {
        return res.status(404).json({ error: "Staff service not found" });
      }
      
      console.log("PATCH: Updating staff service with data:", { customRate, customCommissionRate });
      
      const updatedStaffService = await storage.updateStaffService(id, {
        customRate: customRate !== undefined ? customRate : existingStaffService.customRate,
        customCommissionRate: customCommissionRate !== undefined ? customCommissionRate : existingStaffService.customCommissionRate,
      });
      
      console.log("PATCH: Updated staff service result:", updatedStaffService);
      
      return res.status(200).json(updatedStaffService);
    } catch (error) {
      console.error("PATCH: Error updating staff service:", error);
      return res.status(500).json({ error: "Failed to update staff service" });
    }
  });

  app.get("/api/staff-services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    try {
      const staffService = await storage.getStaffServiceById(id);
      if (!staffService) {
        return res.status(404).json({ error: "Staff service not found" });
      }
      
      return res.status(200).json(staffService);
    } catch (error) {
      return res.status(404).json({ error: "Failed to get staff service" });
    }
  });
  
  app.get("/api/staff/:staffId/services", async (req, res) => {
    const staffId = parseInt(req.params.staffId);
    const staffServices = await storage.getStaffServices(staffId);
    
    console.log("Raw staff services from storage:", staffServices);
    
    // Get detailed service information
    const servicesDetails = await Promise.all(
      staffServices.map(async (staffService) => {
        const service = await storage.getService(staffService.serviceId);
        console.log("Staff service with rates:", {
          staffServiceId: staffService.id,
          customRate: staffService.customRate,
          customCommissionRate: staffService.customCommissionRate
        });
        return {
          staffServiceId: staffService.id,
          staffId: staffService.staffId,
          customRate: staffService.customRate,
          customCommissionRate: staffService.customCommissionRate,
          ...service
        };
      })
    );
    
    console.log("Final services details:", servicesDetails);
    
    return res.status(200).json(servicesDetails);
  });
  
  app.get("/api/services/:serviceId/staff", async (req, res) => {
    const serviceId = parseInt(req.params.serviceId);
    const staffServices = await storage.getStaffServicesByService(serviceId);
    
    // Get detailed staff information with custom rates
    const staffDetails = await Promise.all(
      staffServices.map(async (staffService) => {
        const staff = await storage.getStaff(staffService.staffId);
        const user = staff ? await storage.getUser(staff.userId) : null;
        return {
          staffServiceId: staffService.id,
          id: staff?.id,
          customRate: staffService.customRate,
          customCommissionRate: staffService.customCommissionRate,
          ...staff,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          } : null
        };
      })
    );
    
    // Filter out entries with missing staff or user data
    const validStaffDetails = staffDetails.filter(detail => detail.id && detail.user);
    
    return res.status(200).json(validStaffDetails);
  });

  app.delete("/api/staff-services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    // This needs to be implemented in storage
    return res.status(204).end();
  });

  app.delete("/api/staff/:staffId/services/:serviceId", async (req, res) => {
    const staffId = parseInt(req.params.staffId);
    const serviceId = parseInt(req.params.serviceId);
    
    const removed = await storage.removeServiceFromStaff(staffId, serviceId);
    
    if (!removed) {
      return res.status(404).json({ error: "Staff service assignment not found" });
    }
    
    return res.status(204).end();
  });
  
  // Staff Schedules routes
  app.get("/api/schedules", async (req, res) => {
    try {
      const { staffId } = req.query;
      
      let schedules;
      if (staffId) {
        schedules = await storage.getStaffSchedulesByStaffId(parseInt(staffId as string));
      } else {
        // Get all schedules from all staff
        schedules = await storage.getAllStaffSchedules();
      }
      
      return res.status(200).json(schedules);
    } catch (error) {
      console.error('Error in schedules GET route:', error);
      return res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  });

  app.post("/api/schedules", validateBody(insertStaffScheduleSchema), async (req, res) => {
    try {
      const newSchedule = await storage.createStaffSchedule(req.body);
      return res.status(201).json(newSchedule);
    } catch (error) {
      console.error('Error in schedules POST route:', error);
      return res.status(500).json({ error: 'Failed to create schedule' });
    }
  });

  app.put("/api/schedules/:id", validateBody(insertStaffScheduleSchema.partial()), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedSchedule = await storage.updateStaffSchedule(id, req.body);
      return res.status(200).json(updatedSchedule);
    } catch (error) {
      console.error('Error in schedules PUT route:', error);
      return res.status(500).json({ error: 'Failed to update schedule' });
    }
  });

  app.delete("/api/schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteStaffSchedule(id);
      if (deleted) {
        return res.status(204).end();
      } else {
        return res.status(404).json({ error: 'Schedule not found' });
      }
    } catch (error) {
      console.error('Error in schedules DELETE route:', error);
      return res.status(500).json({ error: 'Failed to delete schedule' });
    }
  });
  
  // Appointments routes
  app.get("/api/appointments", async (req, res) => {
    try {
      const { clientId, staffId, date } = req.query;
      
      let appointments;
      if (clientId) {
        appointments = await storage.getAppointmentsByClient(parseInt(clientId as string));
      } else if (staffId) {
        appointments = await storage.getAppointmentsByStaff(parseInt(staffId as string));
      } else if (date) {
        appointments = await storage.getAppointmentsByDate(new Date(date as string));
      } else {
        // Return all appointments when no filters are specified
        appointments = await storage.getAllAppointments();
      }
      
      // Get detailed information for each appointment with controlled concurrency
      const detailedAppointments: any[] = [];
      const batchSize = 3; // Reduced batch size to prevent connection overload
      
      for (let i = 0; i < appointments.length; i += batchSize) {
        const batch = appointments.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (appointment) => {
            try {
              const service = await storage.getService(appointment.serviceId);
              const client = await storage.getUser(appointment.clientId);
              const staffMember = await storage.getStaff(appointment.staffId);
              const staffUser = staffMember ? await storage.getUser(staffMember.userId) : null;
          
              return {
                ...appointment,
                service,
                client: client ? {
                  id: client.id,
                  username: client.username,
                  email: client.email,
                  firstName: client.firstName,
                  lastName: client.lastName,
                  phone: client.phone
                } : null,
                staff: staffMember ? {
                  ...staffMember,
                  user: staffUser ? {
                    id: staffUser.id,
                    username: staffUser.username,
                    email: staffUser.email,
                    firstName: staffUser.firstName,
                    lastName: staffUser.lastName
                  } : null
                } : null
              };
            } catch (error) {
              console.error('Error fetching appointment details:', error);
              // Return appointment with null details if there's an error
              return {
                ...appointment,
                service: null,
                client: null,
                staff: null
              };
            }
          })
        );
        detailedAppointments.push(...batchResults);
        
        // Add a small delay between batches to prevent overwhelming the database
        if (i + batchSize < appointments.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      return res.status(200).json(detailedAppointments);
    } catch (error) {
      console.error('Error in appointments route:', error);
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  });

  // New endpoint for active appointments (excluding cancelled)
  app.get("/api/appointments/active", async (req, res) => {
    try {
      const { clientId, staffId, date } = req.query;
      
      let appointments;
      if (staffId) {
        appointments = await storage.getActiveAppointmentsByStaff(parseInt(staffId as string));
      } else if (date) {
        appointments = await storage.getActiveAppointmentsByDate(new Date(date as string));
      } else {
        // For general active appointments, filter from all appointments
        const allAppointments = await storage.getAllAppointments();
        appointments = allAppointments.filter(apt => 
          apt.status === "pending" || apt.status === "confirmed" || apt.status === "completed"
        );
      }
      
      // Get detailed information for each appointment with controlled concurrency
      const detailedAppointments: any[] = [];
      const batchSize = 3; // Reduced batch size to prevent connection overload
      
      for (let i = 0; i < appointments.length; i += batchSize) {
        const batch = appointments.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (appointment) => {
            try {
              const service = await storage.getService(appointment.serviceId);
              const client = await storage.getUser(appointment.clientId);
              const staffMember = await storage.getStaff(appointment.staffId);
              const staffUser = staffMember ? await storage.getUser(staffMember.userId) : null;
          
              return {
                ...appointment,
                service,
                client: client ? {
                  id: client.id,
                  username: client.username,
                  email: client.email,
                  firstName: client.firstName,
                  lastName: client.lastName,
                  phone: client.phone
                } : null,
                staff: staffMember ? {
                  ...staffMember,
                  user: staffUser ? {
                    id: staffUser.id,
                    username: staffUser.username,
                    email: staffUser.email,
                    firstName: staffUser.firstName,
                    lastName: staffUser.lastName
                  } : null
                } : null
              };
            } catch (error) {
              console.error('Error fetching appointment details:', error);
              // Return appointment with null details if there's an error
              return {
                ...appointment,
                service: null,
                client: null,
                staff: null
              };
            }
          })
        );
        detailedAppointments.push(...batchResults);
        
        // Add a small delay between batches to prevent overwhelming the database
        if (i + batchSize < appointments.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      return res.status(200).json(detailedAppointments);
    } catch (error) {
      console.error('Error in appointments route:', error);
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  });


  
  app.post("/api/appointments", validateBody(insertAppointmentSchema), async (req, res) => {
    const { staffId, startTime, endTime } = req.body;
    
    // Check for overlapping appointments for the same staff member (excluding cancelled appointments)
    const existingAppointments = await storage.getActiveAppointmentsByStaff(staffId);
    const newStart = new Date(startTime);
    const newEnd = new Date(endTime);
    

    
    const conflictingAppointment = existingAppointments.find(appointment => {
      const existingStart = new Date(appointment.startTime);
      const existingEnd = new Date(appointment.endTime);
      
      // Check for any overlap: new appointment starts before existing ends AND new appointment ends after existing starts
      // Fixed to allow back-to-back appointments (new appointment can start exactly when previous ends)
      return newStart < existingEnd && newEnd > existingStart;
    });
    
    if (conflictingAppointment) {
      const conflictStart = new Date(conflictingAppointment.startTime).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      const conflictEnd = new Date(conflictingAppointment.endTime).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      
      return res.status(409).json({ 
        error: "Scheduling Conflict",
        message: `This time slot conflicts with an existing appointment (${conflictStart} - ${conflictEnd}). Please choose a different time slot.`
      });
    }
    
    // Check for blocked schedules
    const appointmentDate = new Date(startTime);
    const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = appointmentDate.toISOString().slice(0, 10);
    
    const staffSchedules = await storage.getStaffSchedulesByStaffId(staffId);
    const blockedSchedules = staffSchedules.filter((schedule: any) => 
      schedule.dayOfWeek === dayName &&
      schedule.startDate <= dateString &&
      (!schedule.endDate || schedule.endDate >= dateString) &&
      schedule.isBlocked
    );
    
    // Check if the appointment time falls within any blocked schedule
    for (const blockedSchedule of blockedSchedules) {
      const [blockStartHour, blockStartMinute] = blockedSchedule.startTime.split(':').map(Number);
      const [blockEndHour, blockEndMinute] = blockedSchedule.endTime.split(':').map(Number);
      
      const blockStart = new Date(appointmentDate);
      blockStart.setHours(blockStartHour, blockStartMinute, 0, 0);
      
      const blockEnd = new Date(appointmentDate);
      blockEnd.setHours(blockEndHour, blockEndMinute, 0, 0);
      
      // Check if the new appointment overlaps with the blocked time
      if (newStart < blockEnd && newEnd > blockStart) {
        const blockStartTime = blockStart.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        const blockEndTime = blockEnd.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        
        return res.status(409).json({ 
          error: "Blocked Time Slot",
          message: `This time slot is blocked and unavailable for appointments (${blockStartTime} - ${blockEndTime}). Please choose a different time slot.`
        });
      }
    }
    
    // Get service details to calculate total amount
    const service = await storage.getService(req.body.serviceId);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    
    // Create appointment data with calculated total amount
    const appointmentData = {
      ...req.body,
      totalAmount: service.price // Set totalAmount from service price
    };
    
    const newAppointment = await storage.createAppointment(appointmentData);
    
    // Create appointment history record for creation
    try {
      await storage.createAppointmentHistory({
        appointmentId: newAppointment.id,
        action: 'created',
        actionBy: newAppointment.clientId, // Assuming client created the appointment
        actionByRole: 'client',
        newValues: JSON.stringify(newAppointment),
        clientId: newAppointment.clientId,
        serviceId: newAppointment.serviceId,
        staffId: newAppointment.staffId,
        startTime: newAppointment.startTime,
        endTime: newAppointment.endTime,
        status: newAppointment.status,
        paymentStatus: newAppointment.paymentStatus,
        totalAmount: newAppointment.totalAmount,
        notes: newAppointment.notes,
        systemGenerated: false
      });
    } catch (error) {
      console.error('Failed to create appointment history:', error);
    }
    
    // Create notification for appointment booking
    try {
      const client = await storage.getUser(newAppointment.clientId);
      const service = await storage.getService(newAppointment.serviceId);
      const appointmentDate = new Date(newAppointment.startTime).toLocaleDateString();
      
      await storage.createNotification({
        type: 'appointment_booked',
        title: 'New appointment booked',
        description: `${client?.firstName} ${client?.lastName} booked ${service?.name} for ${appointmentDate}`,
        relatedId: newAppointment.id,
        relatedType: 'appointment'
      });
    } catch (error) {
      console.error('Failed to create appointment notification:', error);
    }
    
    // Trigger booking confirmation automation
    // DISABLED: This was causing duplicate SMS confirmations since SMS confirmations are handled directly in the appointment creation logic
    // SMS confirmations are sent directly in the appointment creation route, so automation is not needed here
    /* try {
      await triggerBookingConfirmation(newAppointment, storage);
    } catch (error) {
      console.error('Failed to trigger booking confirmation automation:', error);
    } */
    
    return res.status(201).json(newAppointment);
  });
  
  app.get("/api/appointments/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid appointment ID" });
    }
    const appointment = await storage.getAppointment(id);
    
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    
    const service = await storage.getService(appointment.serviceId);
    const client = await storage.getUser(appointment.clientId);
    const staffMember = await storage.getStaff(appointment.staffId);
    const staffUser = staffMember ? await storage.getUser(staffMember.userId) : null;
    
    return res.status(200).json({
      ...appointment,
      service,
      client: client ? {
        id: client.id,
        username: client.username,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone
      } : null,
      staff: staffMember ? {
        ...staffMember,
        user: staffUser ? {
          id: staffUser.id,
          username: staffUser.username,
          email: staffUser.email,
          firstName: staffUser.firstName,
          lastName: staffUser.lastName
        } : null
      } : null
    });
  });

  // Get appointments for a specific client
  app.get("/api/appointments/client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const appointments = await storage.getAppointmentsByClient(clientId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching client appointments:", error);
      res.status(500).json({ error: "Failed to fetch client appointments" });
    }
  });
  
  app.put("/api/appointments/:id", validateBody(insertAppointmentSchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const existingAppointment = await storage.getAppointment(id);
      if (!existingAppointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      // Check for overlapping appointments if time or staff is being changed
      if (req.body.staffId || req.body.startTime || req.body.endTime) {
        const staffId = req.body.staffId || existingAppointment.staffId;
        const startTime = req.body.startTime || existingAppointment.startTime;
        const endTime = req.body.endTime || existingAppointment.endTime;
        
        const staffAppointments = await storage.getActiveAppointmentsByStaff(staffId);
        const newStart = new Date(startTime);
        const newEnd = new Date(endTime);
        
        const conflictingAppointment = staffAppointments.find(appointment => {
          // Skip checking against the current appointment being updated
          if (appointment.id === id) return false;
          
          const existingStart = new Date(appointment.startTime);
          const existingEnd = new Date(appointment.endTime);
          
          // Check for any overlap
          return newStart < existingEnd && newEnd > existingStart;
        });
        
        if (conflictingAppointment) {
          const conflictStart = new Date(conflictingAppointment.startTime).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });
          const conflictEnd = new Date(conflictingAppointment.endTime).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });
          
          return res.status(409).json({ 
            error: "Scheduling Conflict",
            message: `The updated time slot conflicts with an existing appointment (${conflictStart} - ${conflictEnd}). Please choose a different time slot.`
          });
        }
        
        // Check for blocked schedules
        const appointmentDate = new Date(startTime);
        const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = appointmentDate.toISOString().slice(0, 10);
        
        const staffSchedules = await storage.getStaffSchedulesByStaffId(staffId);
        const blockedSchedules = staffSchedules.filter((schedule: any) => 
          schedule.dayOfWeek === dayName &&
          schedule.startDate <= dateString &&
          (!schedule.endDate || schedule.endDate >= dateString) &&
          schedule.isBlocked
        );
        
        // Check if the appointment time falls within any blocked schedule
        for (const blockedSchedule of blockedSchedules) {
          const [blockStartHour, blockStartMinute] = blockedSchedule.startTime.split(':').map(Number);
          const [blockEndHour, blockEndMinute] = blockedSchedule.endTime.split(':').map(Number);
          
          const blockStart = new Date(appointmentDate);
          blockStart.setHours(blockStartHour, blockStartMinute, 0, 0);
          
          const blockEnd = new Date(appointmentDate);
          blockEnd.setHours(blockEndHour, blockEndMinute, 0, 0);
          
          // Check if the new appointment overlaps with the blocked time
          if (newStart < blockEnd && newEnd > blockStart) {
            const blockStartTime = blockStart.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            const blockEndTime = blockEnd.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            });
            
            return res.status(409).json({ 
              error: "Blocked Time Slot",
              message: `The updated time slot is blocked and unavailable for appointments (${blockStartTime} - ${blockEndTime}). Please choose a different time slot.`
            });
          }
        }
      }
      
      const updatedAppointment = await storage.updateAppointment(id, req.body);
      
      // Create appointment history record for update
      try {
        const action = req.body.status && existingAppointment.status !== req.body.status 
          ? `status_changed_to_${req.body.status}` 
          : 'updated';
        
        await storage.createAppointmentHistory({
          appointmentId: id,
          action,
          actionBy: updatedAppointment.clientId, // Could be enhanced to track actual user
          actionByRole: 'client',
          previousValues: JSON.stringify(existingAppointment),
          newValues: JSON.stringify(updatedAppointment),
          clientId: updatedAppointment.clientId,
          serviceId: updatedAppointment.serviceId,
          staffId: updatedAppointment.staffId,
          startTime: updatedAppointment.startTime,
          endTime: updatedAppointment.endTime,
          status: updatedAppointment.status,
          paymentStatus: updatedAppointment.paymentStatus,
          totalAmount: updatedAppointment.totalAmount,
          notes: updatedAppointment.notes,
          systemGenerated: false
        });
      } catch (error) {
        console.error('Failed to create appointment history:', error);
      }
      
      // Trigger automations based on status changes
      if (existingAppointment && req.body.status && existingAppointment.status !== req.body.status) {
        try {
          switch (req.body.status) {
            case 'cancelled':
              await triggerCancellation(updatedAppointment, storage);
              break;
            case 'no_show':
              await triggerNoShow(updatedAppointment, storage);
              break;
          }
        } catch (error) {
          console.error('Failed to trigger status change automation:', error);
        }
      }


      
      return res.status(200).json(updatedAppointment);
    } catch (error) {
      return res.status(404).json({ error: "Appointment not found" });
    }
  });
  
  app.delete("/api/appointments/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { reason, cancelledBy, cancelledByRole } = req.body;
    
    try {
      // Move appointment to cancelled appointments table instead of hard delete
      const cancelledAppointment = await storage.moveAppointmentToCancelled(
        id, 
        reason || 'Appointment cancelled',
        cancelledBy,
        cancelledByRole || 'admin'
      );
      
      // Trigger cancellation automation using the original appointment data
      try {
        const originalAppointment = {
          id: cancelledAppointment.originalAppointmentId,
          clientId: cancelledAppointment.clientId,
          serviceId: cancelledAppointment.serviceId,
          staffId: cancelledAppointment.staffId,
          startTime: cancelledAppointment.startTime,
          endTime: cancelledAppointment.endTime,
          status: 'cancelled',
          paymentStatus: cancelledAppointment.paymentStatus,
          totalAmount: cancelledAppointment.totalAmount,
          notes: cancelledAppointment.notes
        };
        await triggerCancellation(originalAppointment, storage);
      } catch (error) {
        console.error('Failed to trigger cancellation automation:', error);
      }
      
      return res.status(200).json({ 
        success: true, 
        message: "Appointment cancelled successfully",
        cancelledAppointment 
      });
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      return res.status(500).json({ error: "Failed to cancel appointment: " + error.message });
    }
  });

  // Cancelled Appointment routes
  app.get("/api/cancelled-appointments", async (req, res) => {
    try {
      const cancelledAppointments = await storage.getAllCancelledAppointments();
      return res.status(200).json(cancelledAppointments);
    } catch (error: any) {
      console.error('Error fetching cancelled appointments:', error);
      return res.status(500).json({ error: "Failed to fetch cancelled appointments: " + error.message });
    }
  });

  app.get("/api/cancelled-appointments/client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const cancelledAppointments = await storage.getCancelledAppointmentsByClient(clientId);
      return res.status(200).json(cancelledAppointments);
    } catch (error: any) {
      console.error('Error fetching client cancelled appointments:', error);
      return res.status(500).json({ error: "Failed to fetch client cancelled appointments: " + error.message });
    }
  });

  app.get("/api/cancelled-appointments/staff/:staffId", async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const cancelledAppointments = await storage.getCancelledAppointmentsByStaff(staffId);
      return res.status(200).json(cancelledAppointments);
    } catch (error: any) {
      console.error('Error fetching staff cancelled appointments:', error);
      return res.status(500).json({ error: "Failed to fetch staff cancelled appointments: " + error.message });
    }
  });

  // External API routes are now handled by external-api.ts module

  // Appointment History routes
  app.get("/api/appointment-history", async (req, res) => {
    try {
      const history = await storage.getAllAppointmentHistory();
      return res.status(200).json(history);
    } catch (error: any) {
      return res.status(500).json({ error: "Error fetching appointment history: " + error.message });
    }
  });

  app.get("/api/appointment-history/:appointmentId", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      const history = await storage.getAppointmentHistory(appointmentId);
      return res.status(200).json(history);
    } catch (error: any) {
      return res.status(500).json({ error: "Error fetching appointment history: " + error.message });
    }
  });

  app.post("/api/appointment-history", validateBody(insertAppointmentHistorySchema), async (req, res) => {
    try {
      const newHistory = await storage.createAppointmentHistory(req.body);
      return res.status(201).json(newHistory);
    } catch (error: any) {
      return res.status(500).json({ error: "Error creating appointment history: " + error.message });
    }
  });
  
  // Memberships routes
  app.get("/api/memberships", async (req, res) => {
    const memberships = await storage.getAllMemberships();
    return res.status(200).json(memberships);
  });
  
  app.post("/api/memberships", validateBody(insertMembershipSchema), async (req, res) => {
    const newMembership = await storage.createMembership(req.body);
    return res.status(201).json(newMembership);
  });
  
  app.get("/api/memberships/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const membership = await storage.getMembership(id);
    
    if (!membership) {
      return res.status(404).json({ error: "Membership not found" });
    }
    
    return res.status(200).json(membership);
  });
  
  app.put("/api/memberships/:id", validateBody(insertMembershipSchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const updatedMembership = await storage.updateMembership(id, req.body);
      return res.status(200).json(updatedMembership);
    } catch (error) {
      return res.status(404).json({ error: "Membership not found" });
    }
  });
  
  app.delete("/api/memberships/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteMembership(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Membership not found" });
    }
    
    return res.status(204).end();
  });
  
  // Client Memberships routes
  app.get("/api/client-memberships", async (req, res) => {
    const { clientId, membershipId } = req.query;
    
    let clientMemberships;
    
    if (clientId) {
      // Get memberships for a specific client
      clientMemberships = await storage.getClientMembershipsByClient(parseInt(clientId as string));
    } else if (membershipId) {
      // Get all subscribers for a specific membership
      clientMemberships = await storage.getClientMembershipsByMembership(parseInt(membershipId as string));
    } else {
      // Get all client memberships
      clientMemberships = await storage.getAllClientMemberships();
    }
    
    // Get detailed membership and client information
    const detailedMemberships = await Promise.all(
      clientMemberships.map(async (clientMembership) => {
        const membership = await storage.getMembership(clientMembership.membershipId);
        const client = await storage.getUser(clientMembership.clientId);
        return {
          ...clientMembership,
          membership,
          client
        };
      })
    );
    
    return res.status(200).json(detailedMemberships);
  });
  
  app.post("/api/client-memberships", validateBody(insertClientMembershipSchema), async (req, res) => {
    const newClientMembership = await storage.createClientMembership(req.body);
    
    // Create notification for new membership
    try {
      const client = await storage.getUser(newClientMembership.clientId);
      const membership = await storage.getMembership(newClientMembership.membershipId);
      
      await storage.createNotification({
        type: 'new_membership',
        title: 'New membership purchased',
        description: `${client?.firstName} ${client?.lastName} purchased ${membership?.name} membership`,
        relatedId: newClientMembership.id,
        relatedType: 'membership'
      });
    } catch (error) {
      console.error('Failed to create membership notification:', error);
    }
    
    return res.status(201).json(newClientMembership);
  });
  
  app.put("/api/client-memberships/:id", validateBody(insertClientMembershipSchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const updatedClientMembership = await storage.updateClientMembership(id, req.body);
      return res.status(200).json(updatedClientMembership);
    } catch (error) {
      return res.status(404).json({ error: "Client membership not found" });
    }
  });
  
  // Auto-renewal management routes
  app.post("/api/auto-renewal/manual-check", async (req, res) => {
    try {
      if (!autoRenewalService) {
        return res.status(503).json({ error: "Auto-renewal service not available" });
      }
      
      const result = await autoRenewalService.manualRenewalCheck();
      res.json({ 
        message: "Manual renewal check completed",
        ...result
      });
    } catch (error: any) {
      console.error('Error during manual renewal check:', error);
      res.status(500).json({ error: "Error processing renewals: " + error.message });
    }
  });

  app.patch("/api/client-memberships/:id/auto-renewal", async (req, res) => {
    const id = parseInt(req.params.id);
    const { autoRenew, renewalDate, paymentMethodId } = req.body;
    
    try {
      const updatedMembership = await storage.updateClientMembership(id, {
        autoRenew: Boolean(autoRenew),
        renewalDate: renewalDate ? parseInt(renewalDate) : null,
        paymentMethodId: paymentMethodId || null
      });
      
      res.json({
        message: autoRenew ? "Auto-renewal enabled" : "Auto-renewal disabled",
        membership: updatedMembership
      });
    } catch (error: any) {
      console.error('Error updating auto-renewal settings:', error);
      res.status(500).json({ error: "Error updating auto-renewal settings: " + error.message });
    }


  // Gift card management routes
  app.post("/api/add-gift-card", async (req, res) => {
    try {
      const { giftCardCode, nickname } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!giftCardCode) {
        return res.status(400).json({ error: "Gift card code is required" });
      }

      // Check if gift card exists and is valid
      const giftCard = await storage.getGiftCardByCode(giftCardCode);
      if (!giftCard) {
        return res.status(404).json({ error: "Gift card not found" });
      }

      if (giftCard.status !== 'active') {
        return res.status(400).json({ error: "Gift card is not active" });
      }

      // Check if gift card is already saved by this user
      const userSavedCards = await storage.getSavedGiftCardsByClient(userId);
      const alreadySaved = userSavedCards.some(saved => saved.giftCardId === giftCard.id);
      
      if (alreadySaved) {
        return res.status(400).json({ error: "Gift card is already saved to your account" });
      }

      // Save the gift card
      const savedGiftCard = await storage.createSavedGiftCard({
        clientId: userId,
        giftCardId: giftCard.id,
        nickname: nickname || null
      });

      res.json({ 
        success: true, 
        savedGiftCard,
        giftCard: {
          id: giftCard.id,
          code: giftCard.code,
          currentBalance: giftCard.currentBalance,
          initialAmount: giftCard.initialAmount,
          status: giftCard.status
        }
      });
    } catch (error: any) {
      console.error('Add gift card error:', error);
      res.status(500).json({ 
        error: "Error adding gift card: " + error.message 
      });
    }
  });

  app.get("/api/saved-gift-cards", async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const savedCards = await storage.getSavedGiftCardsByClient(userId);
      const detailedCards = await Promise.all(
        savedCards.map(async (saved) => {
          const giftCard = await storage.getGiftCard(saved.giftCardId);
          return {
            ...saved,
            giftCard: giftCard ? {
              id: giftCard.id,
              code: giftCard.code,
              currentBalance: giftCard.currentBalance,
              initialAmount: giftCard.initialAmount,
              status: giftCard.status,
              expiryDate: giftCard.expiryDate
            } : null
          };
        })
      );

      res.json(detailedCards.filter(card => card.giftCard !== null));
    } catch (error: any) {
      console.error('Get saved gift cards error:', error);
      res.status(500).json({ 
        error: "Error retrieving saved gift cards: " + error.message 
      });
    }
  });

  app.delete("/api/saved-gift-cards/:id", async (req, res) => {
    try {
      const savedCardId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const savedCard = await storage.getSavedGiftCard(savedCardId);
      if (!savedCard) {
        return res.status(404).json({ error: "Saved gift card not found" });
      }

      if (savedCard.clientId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteSavedGiftCard(savedCardId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete saved gift card error:', error);
      res.status(500).json({ 
        error: "Error deleting saved gift card: " + error.message 
      });
    }
  });

  // Purchase gift certificate route
  app.post("/api/gift-certificates/purchase", async (req, res) => {
    try {
      console.log('🎁 BREADCRUMB 1: Gift certificate purchase request received');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const { amount, recipientName, recipientEmail, purchaserName, purchaserEmail, message, paymentId } = req.body;
      
      // STEP 1: Verify payment was successful
      if (!paymentId) {
        console.error('❌ BREADCRUMB ERROR: Gift certificate purchase attempted without payment ID');
        return res.status(400).json({ 
          error: "Payment verification required. Please complete payment first." 
        });
      }

      console.log('🎁 BREADCRUMB 2: Payment ID received:', paymentId);

      // Check if payment exists and was successful
      const payment = await storage.getPayment(paymentId);
      if (!payment) {
        console.error('❌ BREADCRUMB ERROR: Payment not found for gift certificate purchase:', paymentId);
        return res.status(400).json({ 
          error: "Payment not found. Please complete payment first." 
        });
      }

      console.log('🎁 BREADCRUMB 3: Payment found:', {
        paymentId,
        status: payment.status,
        amount: payment.totalAmount
      });

      if (payment.status !== 'completed') {
        console.error('❌ BREADCRUMB ERROR: Payment not completed for gift certificate purchase:', paymentId, payment.status);
        return res.status(400).json({ 
          error: `Payment not completed. Status: ${payment.status}` 
        });
      }

      console.log('✅ BREADCRUMB 4: Payment verified successfully for gift certificate purchase');

      // STEP 2: Generate unique gift certificate code
      const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let giftCardCode = generateCode();
      
      // Ensure the code is unique
      let existingCard = await storage.getGiftCardByCode(giftCardCode);
      while (existingCard) {
        giftCardCode = generateCode();
        existingCard = await storage.getGiftCardByCode(giftCardCode);
      }

      console.log('🎁 BREADCRUMB 5: Generated unique gift card code:', giftCardCode);

      // Set expiry date to 1 year from now
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      // STEP 3: Create gift card in database
      const giftCard = await storage.createGiftCard({
        code: giftCardCode,
        initialAmount: amount,
        currentBalance: amount,
        issuedToEmail: recipientEmail,
        issuedToName: recipientName,
        status: 'active',
        expiryDate: expiryDate
      });

      console.log('✅ BREADCRUMB 6: Gift card created in database:', {
        giftCardId: giftCard.id,
        code: giftCard.code,
        amount: giftCard.initialAmount,
        recipientEmail: giftCard.issuedToEmail,
        recipientName: giftCard.issuedToName
      });

      // STEP 4: Create gift card transaction record
      await storage.createGiftCardTransaction({
        giftCardId: giftCard.id,
        transactionType: 'purchase',
        amount: amount,
        balanceAfter: amount,
        notes: `Purchased by ${purchaserName} (${purchaserEmail})${message ? ` - Message: ${message}` : ''}`
      });

      console.log('✅ BREADCRUMB 7: Gift card transaction record created');

      // STEP 5: Prepare email data
      console.log('🎁 BREADCRUMB 8: Preparing email data for gift certificate confirmation');
      
      const emailData = {
        recipientEmail: recipientEmail,
        recipientName: recipientName,
        purchaserName: purchaserName,
        purchaserEmail: purchaserEmail,
        giftCardCode: giftCardCode,
        amount: amount,
        message: message,
        expiryDate: expiryDate
      };

      console.log('🎁 BREADCRUMB 9: Email data prepared:', JSON.stringify(emailData, null, 2));

      // STEP 6: Send gift certificate confirmation email
      console.log('🎁 BREADCRUMB 10: About to call sendEmail function for gift certificate confirmation');
      
      try {
        const emailResult = await sendEmail({
          to: recipientEmail,
          from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
          subject: 'Your Gift Certificate from Glo Head Spa',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #9532b8;">Glo Head Spa</h1>
                <h2 style="color: #333;">Gift Certificate</h2>
              </div>
              
              <p>Dear ${recipientName},</p>
              
              <p>You have received a gift certificate from <strong>${purchaserName}</strong>!</p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #9532b8; margin-top: 0;">Gift Certificate Details</h3>
                <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
                <p><strong>Code:</strong> <span style="font-family: monospace; background-color: #e9ecef; padding: 4px 8px; border-radius: 4px;">${giftCardCode}</span></p>
                <p><strong>Expires:</strong> ${expiryDate.toLocaleDateString()}</p>
                ${message ? `<p><strong>Message:</strong> "${message}"</p>` : ''}
              </div>
              
              <p>To use your gift certificate:</p>
              <ol>
                <li>Book an appointment online at <a href="https://gloupheadspa.app">gloupheadspa.app</a></li>
                <li>During checkout, enter your gift certificate code: <strong>${giftCardCode}</strong></li>
                <li>Your gift certificate will be applied to your appointment</li>
              </ol>
              
              <p>If you have any questions, please contact us.</p>
              
              <p>Thank you for choosing Glo Head Spa!</p>
              
              <hr style="border: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                This gift certificate was purchased by ${purchaserName} (${purchaserEmail})
              </p>
            </div>
          `,
          text: `
Gift Certificate from Glo Head Spa

Dear ${recipientName},

You have received a gift certificate from ${purchaserName}!

Gift Certificate Details:
- Amount: $${amount.toFixed(2)}
- Code: ${giftCardCode}
- Expires: ${expiryDate.toLocaleDateString()}
${message ? `- Message: "${message}"` : ''}

To use your gift certificate:
1. Book an appointment online at gloupheadspa.app
2. During checkout, enter your gift certificate code: ${giftCardCode}
3. Your gift certificate will be applied to your appointment

If you have any questions, please contact us.

Thank you for choosing Glo Head Spa!

This gift certificate was purchased by ${purchaserName} (${purchaserEmail})
          `
        });

        console.log('✅ BREADCRUMB 11: Email function call completed successfully');
        console.log('Email result:', emailResult);
        
      } catch (emailError) {
        console.error('❌ BREADCRUMB ERROR: Email sending failed:', emailError);
        console.error('Email error details:', JSON.stringify(emailError, null, 2));
        
        // Continue with the response even if email fails
        console.log('⚠️ Continuing with gift certificate creation despite email failure');
      }

      console.log('✅ BREADCRUMB 12: Gift certificate purchase process completed successfully');

      res.json({
        success: true,
        giftCard: {
          id: giftCard.id,
          code: giftCard.code,
          initialAmount: giftCard.initialAmount,
          currentBalance: giftCard.currentBalance,
          issuedToEmail: giftCard.issuedToEmail,
          issuedToName: giftCard.issuedToName,
          expiryDate: giftCard.expiryDate,
          status: giftCard.status
        }
      });

    } catch (error: any) {
      console.error('❌ BREADCRUMB ERROR: Gift certificate purchase process failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      res.status(500).json({ 
        error: "Error purchasing gift certificate: " + error.message 
      });
    }
  });

  app.get("/api/gift-card-balance/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      const giftCard = await storage.getGiftCardByCode(code);
      if (!giftCard) {
        return res.status(404).json({ error: "Gift card not found" });
      }

      res.json({
        code: giftCard.code,
        currentBalance: giftCard.currentBalance,
        initialAmount: giftCard.initialAmount,
        status: giftCard.status,
        expiryDate: giftCard.expiryDate
      });
    } catch (error: any) {
      console.error('Check gift card balance error:', error);
      res.status(500).json({ 
        error: "Error checking gift card balance: " + error.message 
      });
    }
  });










  




  // Helper function to calculate staff earnings based on custom rates or defaults
  const calculateStaffEarnings = async (appointment: any, service: any) => {
    try {
      // Implementation for staff earnings calculation
      return { success: true };
    } catch (error: any) {
      console.error("Error calculating staff earnings:", error);
      return { success: false, error: error.message };
    }
  };

  // Get all conversations for the conversations tab
  app.get("/api/llm/conversations", async (req, res) => {
    try {
      // Fetch all conversations from database
      const conversations = await storage.getLLMConversations();
      
      // Enrich conversations with client information
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv: any) => {
          if (conv.clientId) {
            const client = await storage.getUser(conv.clientId);
            return {
              ...conv,
              clientName: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.username : 'Unknown Client',
              clientEmail: client?.email || '',
              clientPhone: client?.phone || '',
              lastMessage: conv.clientMessage,
              status: 'responded' // All conversations in database have been responded to
            };
          }
          return {
            ...conv,
            clientName: 'Unknown Client',
            clientEmail: '',
            clientPhone: '',
            lastMessage: conv.clientMessage,
            status: 'responded'
          };
        })
      );

      res.json(enrichedConversations);

    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations: " + error.message });
    }
  });

  // Get conversation history for a specific client
  app.get("/api/llm/conversations/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ error: "Client not found" });
      }

      // Fetch real conversation history from database
      const conversations = await storage.getLLMConversations(clientId);

      res.json(conversations);

    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations: " + error.message });
    }
  });

  // Auto-Respond API Routes
  // Process incoming email for auto-response
  app.post("/api/auto-respond/process-email", async (req, res) => {
    try {
      const { from, to, subject, body, timestamp, messageId } = req.body;

      if (!from || !subject || !body) {
        return res.status(400).json({ error: "From, subject, and body are required" });
      }

      const result = await autoRespondService.processIncomingEmail({
        from,
        to: to || process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
        subject,
        body,
        timestamp: timestamp || new Date().toISOString(),
        messageId: messageId || `msg_${Date.now()}`
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error processing email for auto-response:", error);
      res.status(500).json({ error: "Failed to process email: " + error.message });
    }
  });

  // Get auto-respond configuration
  app.get("/api/auto-respond/config", async (req, res) => {
    try {
      const config = autoRespondService.getConfig();
      res.json(config);
    } catch (error: any) {
      console.error("Error getting auto-respond config:", error);
      res.status(500).json({ error: "Failed to get configuration: " + error.message });
    }
  });

  // Update auto-respond configuration
  app.put("/api/auto-respond/config", async (req, res) => {
    try {
      const newConfig = req.body;
      await autoRespondService.updateConfig(newConfig);
      res.json({ success: true, message: "Configuration updated successfully" });
    } catch (error: any) {
      console.error("Error updating auto-respond config:", error);
      res.status(500).json({ error: "Failed to update configuration: " + error.message });
    }
  });

  // Get auto-respond statistics
  app.get("/api/auto-respond/stats", async (req, res) => {
    try {
      const stats = await autoRespondService.getStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting auto-respond stats:", error);
      res.status(500).json({ error: "Failed to get statistics: " + error.message });
    }
  });

  // Email webhook for incoming emails (SendGrid Inbound Parse)
  app.post("/api/webhook/incoming-email", async (req, res) => {
    try {
      console.log('Incoming email webhook received:', {
        headers: req.headers,
        body: req.body
      });

      // Handle SendGrid Inbound Parse format
      const emailData = {
        from: req.body.from || req.body.sender,
        to: req.body.to || req.body.recipient,
        subject: req.body.subject || 'No Subject',
        body: req.body.text || req.body.html || req.body.body || '',
        timestamp: req.body.timestamp || new Date().toISOString(),
        messageId: req.body.message_id || `webhook_${Date.now()}`
      };

      // Process for auto-response
      const result = await autoRespondService.processIncomingEmail(emailData);

      console.log('Auto-respond result:', result);

      // Always return 200 to acknowledge receipt
      res.status(200).json({
        success: true,
        message: "Email processed",
        autoResponded: result.responseSent,
        reason: result.reason
      });

    } catch (error: any) {
      console.error("Error processing incoming email webhook:", error);
      // Still return 200 to prevent webhook retries
      res.status(200).json({
        success: false,
        error: "Failed to process email"
      });
    }
  });

  // Test auto-respond with sample email
  app.post("/api/auto-respond/test", async (req, res) => {
    try {
      const { from, subject, body } = req.body;

      if (!from || !subject || !body) {
        return res.status(400).json({ error: "From, subject, and body are required" });
      }

      const result = await autoRespondService.processIncomingEmail({
        from,
        to: 'info@gloheadspa.com', // Use a configured auto-respond email
        subject,
        body,
        timestamp: new Date().toISOString(),
        messageId: `test_${Date.now()}`
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error testing auto-respond:", error);
      res.status(500).json({ error: "Failed to test auto-respond: " + error.message });
    }
  });

  // AI Messaging Configuration API Routes
  // Get AI messaging configuration
  app.get("/api/ai-messaging/config", async (req, res) => {
    try {
      const config = await storage.getAiMessagingConfig();
      if (!config) {
        // Return default configuration if none exists
        const defaultConfig = {
          enabled: false,
          confidenceThreshold: 0.7,
          maxResponseLength: 160,
          businessHoursOnly: false,
          businessHoursStart: "09:00",
          businessHoursEnd: "17:00",
          businessHoursTimezone: "America/Chicago",
          emailEnabled: false,
          emailExcludedKeywords: JSON.stringify([]),
          emailExcludedDomains: JSON.stringify([]),
          emailAutoRespondEmails: JSON.stringify([]),
          smsEnabled: false,
          smsExcludedKeywords: JSON.stringify([]),
          smsExcludedPhoneNumbers: JSON.stringify([]),
          smsAutoRespondPhoneNumbers: JSON.stringify([]),
          excludedKeywords: JSON.stringify([]),
          totalProcessed: 0,
          responsesSent: 0,
          responsesBlocked: 0,
          averageConfidence: 0
        };
        res.json(defaultConfig);
      } else {
        res.json(config);
      }
    } catch (error: any) {
      console.error("Error getting AI messaging config:", error);
      res.status(500).json({ error: "Failed to get configuration: " + error.message });
    }
  });

  // Update AI messaging configuration
  app.put("/api/ai-messaging/config", async (req, res) => {
    try {
      const newConfig = req.body;
      let config = await storage.getAiMessagingConfig();
      
      if (!config) {
        // Create new configuration if none exists
        config = await storage.createAiMessagingConfig(newConfig);
      } else {
        // Update existing configuration
        config = await storage.updateAiMessagingConfig(config.id, newConfig);
      }
      
      res.json({ success: true, message: "Configuration updated successfully", config });
    } catch (error: any) {
      console.error("Error updating AI messaging config:", error);
      res.status(500).json({ error: "Failed to update configuration: " + error.message });
    }
  });

  // Get AI messaging statistics
  app.get("/api/ai-messaging/stats", async (req, res) => {
    try {
      const config = await storage.getAiMessagingConfig();
      if (!config) {
        return res.json({
          totalProcessed: 0,
          responsesSent: 0,
          responsesBlocked: 0,
          averageConfidence: 0,
          topReasons: []
        });
      }
      
      res.json({
        totalProcessed: config.totalProcessed || 0,
        responsesSent: config.responsesSent || 0,
        responsesBlocked: config.responsesBlocked || 0,
        averageConfidence: config.averageConfidence || 0,
        topReasons: []
      });
    } catch (error: any) {
      console.error("Error getting AI messaging stats:", error);
      res.status(500).json({ error: "Failed to get statistics: " + error.message });
    }
  });

  // SMS Auto-Respond API Routes
  // Process incoming SMS for auto-response
  app.post("/api/sms-auto-respond/process-sms", async (req, res) => {
    try {
      const { from, to, body, timestamp, messageId } = req.body;

      if (!from || !body) {
        return res.status(400).json({ error: "From and body are required" });
      }

      const result = await smsAutoRespondService.processIncomingSMS({
        from,
        to: to || process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        body,
        timestamp: timestamp || new Date().toISOString(),
        messageId: messageId || `sms_${Date.now()}`
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error processing SMS for auto-response:", error);
      res.status(500).json({ error: "Failed to process SMS: " + error.message });
    }
  });

  // Get SMS auto-respond configuration
  app.get("/api/sms-auto-respond/config", async (req, res) => {
    try {
      const config = await smsAutoRespondService.getConfig();
      res.json(config);
    } catch (error: any) {
      console.error("Error getting SMS auto-respond config:", error);
      res.status(500).json({ error: "Failed to get configuration: " + error.message });
    }
  });

  // Update SMS auto-respond configuration
  app.put("/api/sms-auto-respond/config", async (req, res) => {
    try {
      const newConfig = req.body;
      await smsAutoRespondService.updateConfig(newConfig);
      res.json({ success: true, message: "Configuration updated successfully" });
    } catch (error: any) {
      console.error("Error updating SMS auto-respond config:", error);
      res.status(500).json({ error: "Failed to update configuration: " + error.message });
    }
  });

  // Update SMS auto-respond phone numbers specifically
  app.put("/api/sms-auto-respond/phone-numbers", async (req, res) => {
    try {
      const { phoneNumbers } = req.body;
      
      if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
        return res.status(400).json({ error: "phoneNumbers array is required" });
      }
      
      await smsAutoRespondService.updateAutoRespondPhoneNumbers(phoneNumbers);
      res.json({ success: true, message: "Phone numbers updated successfully" });
    } catch (error: any) {
      console.error("Error updating SMS auto-respond phone numbers:", error);
      res.status(500).json({ error: "Failed to update phone numbers: " + error.message });
    }
  });

  // Get SMS auto-respond statistics
  app.get("/api/sms-auto-respond/stats", async (req, res) => {
    try {
      const stats = await smsAutoRespondService.getStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting SMS auto-respond stats:", error);
      res.status(500).json({ error: "Failed to get statistics: " + error.message });
    }
  });

  // SMS auto-responder health check
  app.get("/api/sms-auto-respond/health", async (req, res) => {
    try {
      const health = await smsAutoRespondService.healthCheck();
      res.json(health);
    } catch (error: any) {
      console.error("Error checking SMS auto-respond health:", error);
      res.status(500).json({ 
        status: 'unhealthy',
        error: "Failed to check health: " + error.message 
      });
    }
  });

  // Clear SMS auto-respond service instance (for development/testing)
  app.post("/api/sms-auto-respond/clear-instance", async (req, res) => {
    try {
      SMSAutoRespondService.clearInstance();
      res.json({ success: true, message: "SMS auto-responder service instance cleared" });
    } catch (error: any) {
      console.error("Error clearing SMS auto-respond service instance:", error);
      res.status(500).json({ error: "Failed to clear service instance: " + error.message });
    }
  });

  // Test SMS auto-responder
  app.post("/api/sms-auto-respond/test", async (req, res) => {
    try {
      const { from, to, body } = req.body;

      if (!from || !body) {
        return res.status(400).json({ error: "From and body are required" });
      }

      // Process test SMS
      const result = await smsAutoRespondService.processIncomingSMS({
        from,
        to: to || process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        body,
        timestamp: new Date().toISOString(),
        messageId: `test_${Date.now()}`
      });

      res.json({
        success: true,
        result,
        message: "Test SMS processed successfully"
      });
    } catch (error: any) {
      console.error("Error testing SMS auto-responder:", error);
      res.status(500).json({ error: "Failed to test SMS auto-responder: " + error.message });
    }
  });

  // SMS webhook for incoming messages (Twilio)
  app.post("/api/webhook/incoming-sms", async (req, res) => {
    try {
      console.log('Incoming SMS webhook received:', {
        headers: req.headers,
        body: req.body
      });

      // Handle Twilio webhook format
      const smsData = {
        from: req.body.From,
        to: req.body.To,
        body: req.body.Body || '',
        timestamp: req.body.Timestamp || new Date().toISOString(),
        messageId: req.body.MessageSid || `webhook_${Date.now()}`
      };

      // Process for auto-response
      const result = await smsAutoRespondService.processIncomingSMS(smsData);

      console.log('SMS auto-respond result:', result);

      // Return TwiML response for Twilio
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Auto-response handled by system -->
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.send(twiml);

    } catch (error: any) {
      console.error("Error processing incoming SMS webhook:", error);
      // Return empty TwiML response
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.status(500).send(twiml);
    }
  });

  // Structured SMS Assistant webhook for appointment booking
  app.post("/api/webhook/structured-sms", async (req, res) => {
    try {
      console.log('Structured SMS webhook received:', {
        headers: req.headers,
        body: req.body
      });

      // Handle Twilio webhook format
      const smsData = {
        from: req.body.From,
        to: req.body.To,
        body: req.body.Body || '',
        timestamp: req.body.Timestamp || new Date().toISOString(),
        messageId: req.body.MessageSid || `webhook_${Date.now()}`
      };

      // Process with structured assistant
      const result = await smsStructuredAssistant.processMessage(smsData);

      console.log('Structured SMS result:', result);

      // Return TwiML response for Twilio
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Structured response handled by system -->
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.send(twiml);

    } catch (error: any) {
      console.error("Error processing structured SMS webhook:", error);
      // Return empty TwiML response
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

      res.set('Content-Type', 'text/xml');
      res.status(500).send(twiml);
    }
  });

  return server;
}
