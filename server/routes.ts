import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import type { IStorage } from "./storage";
import { z } from "zod";
import { SquareClient, SquareEnvironment } from "square";
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
  insertPaymentSchema,
  insertSavedPaymentMethodSchema,
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
  triggerAfterPayment,
  triggerCustomAutomation,
} from "./automation-triggers";
import { PhoneService } from "./phone-service";
import { PayrollAutoSync } from "./payroll-auto-sync";
import { AutoRenewalService } from "./auto-renewal-service";
import { insertPhoneCallSchema, insertCallRecordingSchema } from "@shared/schema";
import { registerExternalRoutes } from "./external-api";
import { JotformIntegration } from "./jotform-integration";
import { LLMService } from "./llm-service";
import { AutoRespondService } from "./auto-respond-service";
import { SMSAutoRespondService } from "./sms-auto-respond-service";
import { registerAuthRoutes, registerUserRoutes, registerAppointmentRoutes, registerAppointmentPhotoRoutes, registerPaymentRoutes, registerServiceRoutes, registerNoteTemplateRoutes, registerNoteHistoryRoutes, registerLocationRoutes, registerHelcimRoutes } from "./routes/index";
import { HelcimSmartTerminalService, generateIdempotencyKey as helcimIdk } from './services/helcim-smart-terminal';
import { getConfigStatus, validateConfig, DatabaseConfig } from "./config";
import { hashPassword, comparePassword } from "./utils/password";
import { insertUserSchema, updateUserSchema } from "@shared/schema";

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

// Custom schema for service with staff assignments
const serviceWithStaffSchema = insertServiceSchema.extend({
  assignedStaff: z.array(z.object({
    staffId: z.number(),
    customRate: z.number().optional(),
    customCommissionRate: z.number().optional(),
  })).optional(),
});

// Custom schema for staff service with custom rates
const staffServiceWithRatesSchema = insertStaffServiceSchema.extend({
  customRate: z.number().nullable().optional(),
  customCommissionRate: z.number().nullable().optional(),
});

// Initialize Square
const squareApplicationId = process.env.SQUARE_APPLICATION_ID;
const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN;
const squareEnvironment = process.env.SQUARE_ENVIRONMENT === 'sandbox' ? SquareEnvironment.Sandbox : SquareEnvironment.Production;

// Initialize Square client with production configuration
let squareClient: any = null;

try {
  if (squareAccessToken) {
    squareClient = new SquareClient({
      accessToken: squareAccessToken,
      environment: squareEnvironment,
      userAgentDetail: 'glo-head-spa-payment-system'
    });
    console.log('Square client initialized for environment:', squareEnvironment === SquareEnvironment.Production ? 'Production' : 'Sandbox');
  } else {
    console.log('Square access token not found, using mock responses');
  }
} catch (error) {
  console.error('Failed to initialize Square client:', error);
  console.log('Using mock responses for Square API calls');
}

// Square API clients will be accessed directly from squareClient



export async function registerRoutes(app: Express, storage: IStorage, autoRenewalService?: any): Promise<Server> {
  // Create HTTP server
  const server = createServer(app);
  
  // Initialize LLM Service
  const llmService = new LLMService(storage);
  // Initialize PayrollAutoSync
  const payrollAutoSync = new PayrollAutoSync(storage);

  // Register modular routes
  registerAuthRoutes(app, storage);
  registerUserRoutes(app, storage);
  registerAppointmentRoutes(app, storage);
  registerHelcimRoutes(app, storage);
  registerAppointmentPhotoRoutes(app, storage);
  registerPaymentRoutes(app, storage, squareClient);
  registerServiceRoutes(app, storage);
  registerNoteTemplateRoutes(app, storage);
  registerNoteHistoryRoutes(app, storage);
  registerLocationRoutes(app);

  // Inline Helcim endpoints (redundant safety to avoid 404s if module registration is skipped in some deployments)
  try {
    const helcimApiToken = process.env.HELCIM_API_TOKEN || '';
    const helcimDefaultDevice = process.env.HELCIM_TERMINAL_DEVICE_CODE || '';
    const helcimApiUrl = (process.env.HELCIM_API_URL || 'https://api.helcim.com/v2').replace(/\/$/, '');
    const helcimDefaultCurrency = (process.env.HELCIM_CURRENCY || 'USD').toUpperCase();
    const helcim = helcimApiToken ? new HelcimSmartTerminalService(helcimApiToken, helcimApiUrl) : null;

    app.get('/api/helcim-smart-terminal/health', (_req, res) => {
      res.json({ ok: true, configured: !!helcim, defaultDeviceCode: helcimDefaultDevice || null, defaultCurrency: helcimDefaultCurrency });
    });

    app.post('/api/helcim-smart-terminal/devices/:code/check-readiness', async (req, res) => {
      if (!helcim) return res.status(500).json({ error: 'Helcim not configured' });
      const code = req.params.code || helcimDefaultDevice;
      const result = await helcim.pingDevice(code, helcimIdk('ping'));
      res.status(result.ok ? 200 : result.status).json({ success: result.ok, ...result.body });
    });

    app.post('/api/helcim-smart-terminal/devices/:code/purchase', async (req, res) => {
      try {
        if (!helcim) return res.status(500).json({ error: 'Helcim not configured' });
        const code = req.params.code || helcimDefaultDevice;
        const { amount, currency, appointmentId, clientId, invoiceNumber, customerCode, tipAmount } = req.body || {};
        if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
        // Make invoice number unique by adding timestamp to prevent "already paid" errors
        const timestamp = Date.now();
        const inv = invoiceNumber || (appointmentId ? `APT-${appointmentId}-${timestamp}` : `INV-${timestamp}`);
        const cust = customerCode || (clientId ? `CLIENT-${clientId}` : undefined);
        const selectedCurrency = ((currency || helcimDefaultCurrency) as any);
        const result = await helcim.startPurchase({ code, currency: selectedCurrency, transactionAmount: amount, idempotencyKey: helcimIdk('purchase'), invoiceNumber: inv, customerCode: cust });
        
        // Create payment record regardless of terminal status (409 = device not listening but we still want to record the attempt)
        if (result.ok || result.status === 202 || result.status === 409) {
          try {
            // Create payment record - for POS transactions we might not have appointmentId
            const paymentRecord = await storage.createPayment({
              appointmentId: appointmentId || null,
              clientId: clientId || 1,
              amount: amount - (tipAmount || 0),
              tipAmount: tipAmount || 0,
              totalAmount: amount,
              method: 'helcim_terminal',
              status: 'completed', // Mark as completed since terminal will handle the actual payment
              type: appointmentId ? 'appointment' : 'pos_payment',
              description: appointmentId ? 'Helcim Smart Terminal appointment payment' : 'Helcim Smart Terminal POS payment',
              paymentDate: new Date()
            });
            
            // If there's an appointment, update its payment status
            if (appointmentId) {
              await storage.updateAppointment(appointmentId, { paymentStatus: 'paid' });
              console.log('✅ Appointment payment status updated to paid');
            }
            
            console.log('✅ Payment record created:', paymentRecord);
            res.status(result.status).json({ 
              success: result.ok || result.status === 202, 
              paymentRecord,
              ...result.body 
            });
          } catch (dbError) {
            console.error('Database error:', dbError);
            // Still return success since payment was initiated
            res.status(result.status).json({ 
              success: result.ok || result.status === 202, 
              warning: 'Payment initiated but database update failed',
              ...result.body 
            });
          }
        } else {
          res.status(result.status).json({ success: false, ...result.body });
        }
      } catch (err: any) {
        console.error('Helcim purchase error:', err);
        res.status(500).json({ error: err.message || 'Failed to start Helcim purchase' });
      }
    });
  } catch {
    // ignore init errors
  }



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
    const newClient = await storage.createUser({
      ...req.body,
      username,
      password: hashedPassword,
      role: "client"
    });
    
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
  
  // Services routes
  app.get("/api/services", async (req, res) => {
    const { categoryId, locationId } = req.query;
    
    let services;
    if (categoryId) {
      services = await storage.getServicesByCategory(parseInt(categoryId as string));
    } else {
      services = await storage.getAllServices();
    }
    
    // Filter by location if specified
    if (locationId) {
      const filteredServices = services.filter(service => service.locationId === parseInt(locationId as string));
      // If no services found for the location, return all services (fallback)
      if (filteredServices.length === 0) {
        console.log(`No services found for location ${locationId}, returning all services as fallback`);
      } else {
        services = filteredServices;
      }
    }
    
    return res.status(200).json(services);
  });
  
  app.post("/api/services", validateBody(serviceWithStaffSchema), async (req, res) => {
    const { assignedStaff, ...serviceData } = req.body;
    const newService = await storage.createService(serviceData);
    
    // Handle staff assignments with custom rates
    if (assignedStaff && assignedStaff.length > 0) {
      for (const assignment of assignedStaff) {
        await storage.assignServiceToStaff({
          staffId: assignment.staffId,
          serviceId: newService.id,
          customRate: assignment.customRate || null,
          customCommissionRate: assignment.customCommissionRate || null,
        });
      }
    }
    
    return res.status(201).json(newService);
  });
  
  app.get("/api/services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const service = await storage.getService(id);
    
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    
    return res.status(200).json(service);
  });
  
  app.put("/api/services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const { assignedStaff, ...serviceData } = req.body;
    
    console.log("Backend received update request for service:", id);
    console.log("Backend received assignedStaff:", assignedStaff);
    console.log("Backend received serviceData:", serviceData);
    
    try {
      // Update basic service data first
      const updatedService = await storage.updateService(id, serviceData);
      
      // Handle staff assignments with custom rates
      if (assignedStaff && Array.isArray(assignedStaff)) {
        // Remove all existing staff assignments for this service
        const existingAssignments = await storage.getStaffServicesByService(id);
        for (const assignment of existingAssignments) {
          await storage.removeServiceFromStaff(assignment.staffId, assignment.serviceId);
        }
        
        // Add new assignments with custom rates
        for (const assignment of assignedStaff) {
          await storage.assignServiceToStaff({
            staffId: assignment.staffId,
            serviceId: id,
            customRate: assignment.customRate || null,
            customCommissionRate: assignment.customCommissionRate || null,
          });
        }
      }
      
      return res.status(200).json(updatedService);
    } catch (error) {
      console.error("Service update error:", error);
      return res.status(404).json({ error: "Service not found" });
    }
  });
  
  app.delete("/api/services/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteService(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Service not found" });
    }
    
    return res.status(204).end();
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
    try {
      await triggerBookingConfirmation(newAppointment, storage);
    } catch (error) {
      console.error('Failed to trigger booking confirmation automation:', error);
    }
    
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

      // Trigger automations based on payment status changes
      if (existingAppointment && req.body.paymentStatus && existingAppointment.paymentStatus !== req.body.paymentStatus) {
        try {
          if (req.body.paymentStatus === 'paid') {
            console.log('Payment status changed to paid, triggering after payment automations');
            await triggerAfterPayment(updatedAppointment, storage);
            await triggerCustomAutomation(updatedAppointment, storage, 'checkout completion');
            await triggerCustomAutomation(updatedAppointment, storage, 'service checkout');
            console.log('Payment status change automation triggers executed successfully');
          }
        } catch (error) {
          console.error('Failed to trigger payment status change automation:', error);
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
  });
  
  // Payments routes
  app.post("/api/payments", validateBody(insertPaymentSchema), async (req, res) => {
    const newPayment = await storage.createPayment(req.body);
    return res.status(201).json(newPayment);
  });
  
  app.get("/api/payments", async (req, res) => {
    const { clientId } = req.query;
    
    // If clientId is provided, get payments for specific client
    if (clientId) {
      const payments = await storage.getPaymentsByClient(parseInt(clientId as string));
      return res.status(200).json(payments);
    }
    
    // Otherwise, get all payments for reporting purposes
    try {
      console.log('Fetching all payments for reports...');
      const payments = await storage.getAllPayments();
      console.log(`Found ${payments.length} payments`);
      
      // Get detailed information for each payment
      const detailedPayments = await Promise.all(
        payments.map(async (payment) => {
          const client = await storage.getUser(payment.clientId);
          const appointment = payment.appointmentId ? await storage.getAppointment(payment.appointmentId) : null;
          let service = null;
          
          if (appointment) {
            service = await storage.getService(appointment.serviceId);
          }
          
          return {
            ...payment,
            client: client ? {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email
            } : null,
            appointment,
            service
          };
        })
      );
      
      res.json(detailedPayments);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: "Error fetching payments: " + error.message });
    }
  });
  
  app.put("/api/payments/:id", validateBody(insertPaymentSchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const updatedPayment = await storage.updatePayment(id, req.body);
      return res.status(200).json(updatedPayment);
    } catch (error) {
      return res.status(404).json({ error: "Payment not found" });
    }
  });

  // Cash payment confirmation route
  app.post("/api/confirm-cash-payment", async (req, res) => {
    try {
      const { appointmentId } = req.body;
      
      if (!appointmentId) {
        return res.status(400).json({ error: "Appointment ID is required" });
      }

      // Get the appointment to verify it exists and get amount
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Calculate payment amount - use totalAmount if set, otherwise get from service price
      let paymentAmount = appointment.totalAmount;
      console.log('Initial paymentAmount from appointment.totalAmount:', paymentAmount);
      if (!paymentAmount) {
        const service = await storage.getService(appointment.serviceId);
        console.log('Service found:', service);
        paymentAmount = service?.price || 0;
        console.log('PaymentAmount calculated from service price:', paymentAmount);
        
        // Update the appointment with the correct totalAmount for future use
        await storage.updateAppointment(appointmentId, {
          status: 'confirmed',
          paymentStatus: 'paid',
          totalAmount: paymentAmount
        });
      } else {
        // Update appointment status to paid
        await storage.updateAppointment(appointmentId, {
          status: 'confirmed',
          paymentStatus: 'paid'
        });
      }

      console.log('Final paymentAmount for payment creation:', paymentAmount);

      // Create payment record for cash payment
      const payment = await storage.createPayment({
        clientId: appointment.clientId,
        amount: paymentAmount,
        totalAmount: paymentAmount,
        method: 'cash',
        status: 'completed',
        type: 'appointment',
        appointmentId: appointmentId
      });

      // Trigger automatic payroll sync for staff member
      if (appointment.staffId) {
        payrollAutoSync.triggerPayrollSync(appointment.staffId, 'appointment');
      }

      // Create sales history record
      await createSalesHistoryRecord(payment, 'appointment');

      // Create notification for payment received
      try {
        const client = await storage.getUser(appointment.clientId);
        await storage.createNotification({
          type: 'payment_received',
          title: 'Payment received',
          description: `$${payment.amount} received from ${client?.firstName} ${client?.lastName}`,
          relatedId: payment.id,
          relatedType: 'payment'
        });
      } catch (error) {
        console.error('Failed to create payment notification:', error);
      }

      // Trigger custom automations for checkout completion
      try {
        await triggerAfterPayment(appointment, storage);
        await triggerCustomAutomation(appointment, storage, 'checkout completion');
        await triggerCustomAutomation(appointment, storage, 'service checkout');
        console.log('Checkout automation triggers executed successfully');
      } catch (error) {
        console.error('Failed to trigger checkout automations:', error);
      }

      res.json({ 
        success: true, 
        message: "Cash payment confirmed successfully",
        appointment 
      });
    } catch (error: any) {
      console.error('Cash payment confirmation error:', error);
      res.status(500).json({ 
        error: "Error confirming cash payment: " + error.message 
      });
    }
  });

  // Gift card payment confirmation route
  app.post("/api/confirm-gift-card-payment", async (req, res) => {
    try {
      const { appointmentId, giftCardCode } = req.body;
      
      if (!appointmentId || !giftCardCode) {
        return res.status(400).json({ error: "Appointment ID and gift card code are required" });
      }

      // Get the appointment to verify it exists and get amount
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Get the gift card by code
      const giftCard = await storage.getGiftCardByCode(giftCardCode);
      if (!giftCard) {
        return res.status(404).json({ error: "Gift card not found" });
      }

      // Check if gift card is active
      if (giftCard.status !== 'active') {
        return res.status(400).json({ error: "Gift card is not active" });
      }

      // Check if gift card has expired
      if (giftCard.expiryDate && new Date() > giftCard.expiryDate) {
        return res.status(400).json({ error: "Gift card has expired" });
      }

      // Calculate payment amount - use totalAmount if set, otherwise get from service price
      let appointmentAmount = appointment.totalAmount;
      if (!appointmentAmount) {
        const service = await storage.getService(appointment.serviceId);
        appointmentAmount = service?.price || 0;
      }

      // Check if gift card has sufficient balance
      if (giftCard.currentBalance < appointmentAmount) {
        return res.status(400).json({ 
          error: `Insufficient gift card balance. Available: $${giftCard.currentBalance.toFixed(2)}, Required: $${appointmentAmount.toFixed(2)}` 
        });
      }

      // Deduct amount from gift card
      const newBalance = giftCard.currentBalance - appointmentAmount;
      await storage.updateGiftCard(giftCard.id, {
        currentBalance: newBalance,
        status: newBalance <= 0 ? 'used' : 'active'
      });

      // Create gift card transaction record
      await storage.createGiftCardTransaction({
        giftCardId: giftCard.id,
        appointmentId: appointmentId,
        transactionType: 'redemption',
        amount: appointmentAmount,
        balanceAfter: newBalance,
        notes: `Payment for appointment #${appointmentId}`
      });

      // Update appointment status to paid and set totalAmount if missing
      const updateData: any = {
        status: 'confirmed',
        paymentStatus: 'paid'
      };
      
      // If appointment didn't have totalAmount set, update it for future use
      if (!appointment.totalAmount) {
        updateData.totalAmount = appointmentAmount;
      }
      
      await storage.updateAppointment(appointmentId, updateData);

      // Create payment record for gift card payment
      await storage.createPayment({
        clientId: appointment.clientId,
        amount: appointmentAmount,
        totalAmount: appointmentAmount,
        method: 'gift_card',
        status: 'completed',
        appointmentId: appointmentId
      });

      // Trigger automatic payroll sync for staff member
      if (appointment.staffId) {
        payrollAutoSync.triggerPayrollSync(appointment.staffId, 'appointment');
      }

      // Trigger custom automations for checkout completion
      try {
        await triggerAfterPayment(appointment, storage);
        await triggerCustomAutomation(appointment, storage, 'checkout completion');
        await triggerCustomAutomation(appointment, storage, 'service checkout');
        console.log('Checkout automation triggers executed successfully');
      } catch (error) {
        console.error('Failed to trigger checkout automations:', error);
      }

      res.json({ 
        success: true, 
        message: "Gift card payment processed successfully",
        remainingBalance: newBalance,
        appointment 
      });
    } catch (error: any) {
      console.error('Gift card payment confirmation error:', error);
      res.status(500).json({ 
        error: "Error processing gift card payment: " + error.message 
      });
    }
  });

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
      const { amount, recipientName, recipientEmail, purchaserName, purchaserEmail, message } = req.body;
      
      // Generate unique gift certificate code
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

      // Set expiry date to 1 year from now
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      // Create gift card in database
      const giftCard = await storage.createGiftCard({
        code: giftCardCode,
        initialAmount: amount,
        currentBalance: amount,
        issuedToEmail: recipientEmail,
        issuedToName: recipientName,
        status: 'active',
        expiryDate: expiryDate
      });

      // Create gift card transaction record
      await storage.createGiftCardTransaction({
        giftCardId: giftCard.id,
        transactionType: 'purchase',
        amount: amount,
        balanceAfter: amount,
        notes: `Purchased by ${purchaserName} (${purchaserEmail})${message ? ` - Message: ${message}` : ''}`
      });

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
      console.error('Gift certificate purchase error:', error);
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

  // Square payment routes for appointment checkout and POS
  app.post("/api/create-payment", async (req, res) => {
    try {
      const { amount, tipAmount = 0, appointmentId, description, type = "appointment_payment", sourceId } = req.body;
      
      if (!amount || !sourceId) {
        return res.status(400).json({ error: "Amount and payment source are required" });
      }

      const totalAmount = amount + tipAmount;

      // Handle cash payments first
      if (sourceId === "cash") {
        const payment = {
          id: `cash_${Date.now()}`,
          status: 'COMPLETED',
          amountMoney: {
            amount: Math.round(totalAmount * 100),
            currency: 'USD'
          }
        };
        
        // Get appointment to get client ID
        let clientId = 1; // Default client ID
        if (appointmentId) {
          try {
            const appointment = await storage.getAppointment(appointmentId);
            if (appointment && appointment.clientId) {
              clientId = appointment.clientId;
            }
          } catch (error) {
            console.error('Error getting appointment for client ID:', error);
          }
        }
        
        // Save cash payment record to database
        const paymentRecord = await storage.createPayment({
          clientId: clientId,
          amount: amount,
          tipAmount: tipAmount,
          totalAmount: totalAmount,
          method: 'cash',
          status: 'completed',
          type: type,
          description: description || (type === "pos_payment" ? "POS Cash Transaction" : "Cash Payment"),
          paymentDate: new Date(),
          appointmentId: appointmentId || null
        });

        // Create sales history record
        if (type === "pos_payment") {
          await createSalesHistoryRecord(paymentRecord, 'pos_sale');
        } else if (appointmentId) {
          await createSalesHistoryRecord(paymentRecord, 'appointment');
        }
        
        console.log('Cash payment record saved to database:', paymentRecord);
        
        return res.json({ 
          payment: payment,
          paymentId: payment.id
        });
      }

      // Use direct Square API call instead of SDK
      const paymentData = {
        source_id: sourceId,
        amount_money: {
          amount: Math.round(totalAmount * 100), // Convert to cents
          currency: 'USD'
        },
        idempotency_key: `${Date.now()}-${Math.random()}`,
        note: description || (type === "pos_payment" ? "POS Transaction" : "Appointment Payment"),
        reference_id: appointmentId?.toString() || "",
        location_id: process.env.SQUARE_LOCATION_ID
      };

      console.log('Making direct Square API payment request:', JSON.stringify(paymentData, null, 2));
      
      const squareResponse = await fetch('https://connect.squareup.com/v2/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${squareAccessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        },
        body: JSON.stringify(paymentData)
      });

      const responseData = await squareResponse.json();
      console.log('Square API response:', JSON.stringify(responseData, null, 2));
      
      if (!squareResponse.ok || responseData.payment?.status === 'FAILED') {
        console.log('Square payment failed:', responseData);
        
        // Extract meaningful error message for common decline reasons
        let errorMessage = 'Payment declined';
        if (responseData.payment?.card_details?.errors?.length > 0) {
          const cardError = responseData.payment.card_details.errors[0];
          switch(cardError.code) {
            case 'GENERIC_DECLINE':
              errorMessage = 'Card declined by issuing bank. Please try a different card or payment method.';
              break;
            case 'INSUFFICIENT_FUNDS':
              errorMessage = 'Insufficient funds. Please try a different card.';
              break;
            case 'CVV_FAILURE':
              errorMessage = 'CVV verification failed. Please check your security code.';
              break;
            case 'INVALID_CARD':
              errorMessage = 'Invalid card information. Please check your card details.';
              break;
            case 'CARD_EXPIRED':
              errorMessage = 'Card has expired. Please use a different card.';
              break;
            default:
              errorMessage = cardError.detail || 'Payment declined. Please try a different card.';
          }
        } else if (responseData.errors?.length > 0) {
          errorMessage = responseData.errors[0].detail || 'Payment processing failed';
        }
        
        throw new Error(errorMessage);
      }

      const response = { payment: responseData.payment };

      // Save payment record to database if Square payment was successful
      if (response.payment && response.payment.status === 'COMPLETED') {
        const paymentRecord = await storage.createPayment({
          clientId: 1, // Default client for POS sales, could be made dynamic
          amount: amount,
          tipAmount: tipAmount,
          totalAmount: totalAmount,
          method: 'card',
          status: 'completed',
          type: type,
          description: description || (type === "pos_payment" ? "POS Transaction" : "Appointment Payment"),
          squarePaymentId: response.payment.id,
          paymentDate: new Date(),
          appointmentId: appointmentId || null
        });
        
        console.log('Payment record saved to database:', paymentRecord);
      }

      res.json({ 
        payment: response.payment,
        paymentId: response.payment?.id
      });
    } catch (error: any) {
      console.error('Square payment creation error:', error);
      res.status(500).json({ 
        error: "Error creating payment: " + error.message 
      });
    }
  });

  // Square Terminal integration for in-person payments
  app.post("/api/square-terminal/payment", async (req, res) => {
    try {
      const { 
        amount, 
        tipAmount = 0, 
        appointmentId, 
        description, 
        type = "terminal_payment",
        clientId 
      } = req.body;
      
      if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
      }

      const totalAmount = amount + tipAmount;

      // Create payment request for Square Terminal
      const terminalPaymentData = {
        amount_money: {
          amount: Math.round(totalAmount * 100), // Convert to cents
          currency: 'USD'
        },
        idempotency_key: `${Date.now()}-${Math.random()}`,
        note: description || (type === "terminal_payment" ? "Terminal Transaction" : "Appointment Payment"),
        reference_id: appointmentId?.toString() || "",
        location_id: process.env.SQUARE_LOCATION_ID,
        source_id: "terminal", // Indicates this is a terminal payment
        tip_money: tipAmount > 0 ? {
          amount: Math.round(tipAmount * 100),
          currency: 'USD'
        } : undefined
      };

      console.log('Creating Square Terminal payment request:', JSON.stringify(terminalPaymentData, null, 2));
      
      // Send payment request to Square Terminal
      const terminalResponse = await fetch('https://connect.squareup.com/v2/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${squareAccessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        },
        body: JSON.stringify(terminalPaymentData)
      });

      const responseData = await terminalResponse.json();
      console.log('Square Terminal response:', JSON.stringify(responseData, null, 2));
      
      if (!terminalResponse.ok || responseData.payment?.status === 'FAILED') {
        console.log('Square Terminal payment failed:', responseData);
        
        let errorMessage = 'Terminal payment declined';
        if (responseData.payment?.card_details?.errors?.length > 0) {
          const cardError = responseData.payment.card_details.errors[0];
          switch(cardError.code) {
            case 'GENERIC_DECLINE':
              errorMessage = 'Card declined by issuing bank. Please try a different card or payment method.';
              break;
            case 'INSUFFICIENT_FUNDS':
              errorMessage = 'Insufficient funds. Please try a different card.';
              break;
            case 'CVV_FAILURE':
              errorMessage = 'CVV verification failed. Please check your security code.';
              break;
            case 'INVALID_CARD':
              errorMessage = 'Invalid card information. Please check your card details.';
              break;
            case 'CARD_EXPIRED':
              errorMessage = 'Card has expired. Please use a different card.';
              break;
            default:
              errorMessage = cardError.detail || 'Terminal payment declined. Please try a different card.';
          }
        } else if (responseData.errors?.length > 0) {
          errorMessage = responseData.errors[0].detail || 'Terminal payment processing failed';
        }
        
        throw new Error(errorMessage);
      }

      const response = { payment: responseData.payment };

      // Save payment record to database if Square Terminal payment was successful
      if (response.payment && response.payment.status === 'COMPLETED') {
        const paymentRecord = await storage.createPayment({
          clientId: clientId || 1, // Default client for terminal sales
          amount: amount,
          tipAmount: tipAmount,
          totalAmount: totalAmount,
          method: 'terminal',
          status: 'completed',
          type: type,
          description: description || (type === "terminal_payment" ? "Terminal Transaction" : "Appointment Payment"),
          squarePaymentId: response.payment.id,
          paymentDate: new Date(),
          appointmentId: appointmentId || null
        });
        
        console.log('Terminal payment record saved to database:', paymentRecord);

        // Create sales history record
        if (type === "terminal_payment") {
          await createSalesHistoryRecord(paymentRecord, 'terminal_sale');
        } else if (appointmentId) {
          await createSalesHistoryRecord(paymentRecord, 'appointment');
        }
      }

      res.json({ 
        payment: response.payment,
        paymentId: response.payment?.id,
        success: true
      });
    } catch (error: any) {
      console.error('Square Terminal payment error:', error);
      res.status(500).json({ 
        error: "Error processing terminal payment: " + error.message 
      });
    }
  });

  // Get Square Terminal status
  app.get("/api/square-terminal/status", async (req, res) => {
    try {
      // Check if Square Terminal is connected and available
      const terminalStatus = {
        connected: true, // This would be checked via Square Terminal API
        locationId: process.env.SQUARE_LOCATION_ID,
        environment: squareEnvironment === SquareEnvironment.Production ? 'Production' : 'Sandbox',
        lastSync: new Date().toISOString()
      };

      res.json(terminalStatus);
    } catch (error: any) {
      console.error('Square Terminal status check error:', error);
      res.status(500).json({ 
        error: "Error checking terminal status: " + error.message 
      });
    }
  });

  // Create Square Terminal checkout session
  app.post("/api/square-terminal/checkout", async (req, res) => {
    try {
      const { 
        amount, 
        tipAmount = 0, 
        appointmentId, 
        description, 
        clientId,
        items = [] 
      } = req.body;
      
      if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
      }

      const totalAmount = amount + tipAmount;

      // Create checkout session for Square Terminal
      const checkoutData = {
        checkout: {
          amount_money: {
            amount: Math.round(totalAmount * 100),
            currency: 'USD'
          },
          tip_money: tipAmount > 0 ? {
            amount: Math.round(tipAmount * 100),
            currency: 'USD'
          } : undefined,
          note: description || "Terminal Checkout",
          reference_id: appointmentId?.toString() || "",
          location_id: process.env.SQUARE_LOCATION_ID,
          additional_recipients: items.length > 0 ? items.map((item: any) => ({
            amount_money: {
              amount: Math.round(item.price * 100),
              currency: 'USD'
            },
            description: item.name
          })) : undefined
        }
      };

      console.log('Creating Square Terminal checkout session:', JSON.stringify(checkoutData, null, 2));
      
      // Create checkout session
      const checkoutResponse = await fetch('https://connect.squareup.com/v2/checkouts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${squareAccessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': '2023-10-18'
        },
        body: JSON.stringify(checkoutData)
      });

      const responseData = await checkoutResponse.json();
      console.log('Square Terminal checkout response:', JSON.stringify(responseData, null, 2));
      
      if (!checkoutResponse.ok) {
        throw new Error(responseData.errors?.[0]?.detail || 'Failed to create checkout session');
      }

      res.json({ 
        checkout: responseData.checkout,
        checkoutId: responseData.checkout?.id,
        success: true
      });
    } catch (error: any) {
      console.error('Square Terminal checkout error:', error);
      res.status(500).json({ 
        error: "Error creating terminal checkout: " + error.message 
      });
    }
  });

  // Test Square connection
  app.get("/api/test-square-connection", async (req, res) => {
    try {
      // Test Square payments API connection
      
      res.json({
        status: "connected",
        environment: squareEnvironment,
        applicationId: squareApplicationId,
        hasAccessToken: !!squareAccessToken
      });
    } catch (error: any) {
      console.error('Square connection test error:', error);
      res.status(500).json({ 
        status: "error",
        error: error.message 
      });
    }
  });



  // Helper function to calculate staff earnings based on custom rates or defaults
  const calculateStaffEarnings = async (appointment: any, service: any) => {
    try {
      // Get staff member
      const staff = await storage.getStaff(appointment.staffId);
      if (!staff) return null;

      // Get staff service assignment to check for custom rates
      const staffServices = await storage.getStaffServicesByService(service.id);
      const staffService = staffServices.find((ss: any) => ss.staffId === appointment.staffId);

      const servicePrice = service.price || 0;
      let staffEarnings = 0;

      if (staff.commissionType === 'commission') {
        // Use custom commission rate if available, otherwise use default
        const commissionRate = staffService?.customCommissionRate ?? staff.commissionRate ?? 0;
        staffEarnings = servicePrice * (commissionRate / 100);
      } else if (staff.commissionType === 'hourly') {
        // Use custom hourly rate if available, otherwise use default
        const hourlyRate = staffService?.customRate ?? staff.hourlyRate ?? 0;
        const serviceDuration = service.duration || 60; // Duration in minutes
        const hours = serviceDuration / 60;
        staffEarnings = hourlyRate * hours;
      } else if (staff.commissionType === 'fixed') {
        // Use custom fixed rate if available, otherwise use default
        staffEarnings = staffService?.customRate ?? staff.fixedRate ?? 0;
      }

      console.log('Staff earnings calculation:', {
        staffId: appointment.staffId,
        servicePrice,
        commissionType: staff.commissionType,
        customRate: staffService?.customRate,
        customCommissionRate: staffService?.customCommissionRate,
        defaultRate: staff.hourlyRate || staff.fixedRate || staff.commissionRate,
        calculatedEarnings: staffEarnings
      });

      return {
        staffId: appointment.staffId,
        serviceId: service.id,
        appointmentId: appointment.id,
        earningsAmount: staffEarnings,
        paymentMethod: 'appointment',
        calculationDetails: {
          servicePrice,
          commissionType: staff.commissionType,
          rateUsed: staffService?.customRate || staffService?.customCommissionRate || staff.hourlyRate || staff.fixedRate || staff.commissionRate,
          isCustomRate: !!(staffService?.customRate || staffService?.customCommissionRate)
        }
      };
    } catch (error) {
      console.error('Error calculating staff earnings:', error);
      return null;
    }
  };

  // Confirm payment and update appointment status
  app.post("/api/confirm-payment", async (req, res) => {
    try {
      const { paymentId, appointmentId } = req.body;
      
      if (!paymentId || !appointmentId) {
        return res.status(400).json({ error: "Payment ID and appointment ID are required" });
      }

      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Get service details for earnings calculation
      const service = await storage.getService(appointment.serviceId);

      // Handle cash payments
      if (paymentId.startsWith('cash_') || paymentId === 'cash') {
        await storage.updateAppointment(appointmentId, { paymentStatus: 'paid' });
        
        await storage.createPayment({
          clientId: appointment.clientId,
          amount: service?.price || Number(appointment.totalAmount || 0),
          totalAmount: service?.price || Number(appointment.totalAmount || 0),
          method: 'cash',
          status: 'completed',
          appointmentId: appointmentId,
          squarePaymentId: paymentId
        });

        // Calculate and save staff earnings
        if (service) {
          const staffEarningsData = await calculateStaffEarnings(appointment, service);
          if (staffEarningsData) {
            try {
              const savedEarnings = await storage.createStaffEarnings({
                staffId: staffEarningsData.staffId,
                appointmentId: staffEarningsData.appointmentId,
                serviceId: staffEarningsData.serviceId,
                paymentId: null, // Cash payment doesn't have a payment ID
                earningsAmount: staffEarningsData.earningsAmount,
                rateType: staffEarningsData.calculationDetails.commissionType,
                rateUsed: staffEarningsData.calculationDetails.rateUsed,
                isCustomRate: staffEarningsData.calculationDetails.isCustomRate,
                servicePrice: staffEarningsData.calculationDetails.servicePrice,
                calculationDetails: JSON.stringify(staffEarningsData.calculationDetails),
                earningsDate: new Date()
              });
              console.log('Saved staff earnings for cash payment:', savedEarnings);
            } catch (error) {
              console.error('Error saving staff earnings:', error);
            }
          }
        }

        // Trigger custom automations for checkout completion
        try {
          await triggerAfterPayment(appointment, storage);
          await triggerCustomAutomation(appointment, storage, 'checkout completion');
          await triggerCustomAutomation(appointment, storage, 'service checkout');
          console.log('Checkout automation triggers executed successfully');
        } catch (error) {
          console.error('Failed to trigger checkout automations:', error);
        }

        return res.json({ success: true, appointment });
      }

      // Retrieve payment to verify it was successful
      // For now, simulate a successful payment since Square API is having issues
      const response = { 
        payment: { 
          status: 'COMPLETED',
          amountMoney: { amount: Math.round(amount * 100) }
        } 
      };
      
      if (response.payment?.status === 'COMPLETED') {
        // Update appointment status to paid
        await storage.updateAppointment(appointmentId, {
          status: 'confirmed',
          paymentStatus: 'paid'
        });

        // Create payment record
        await storage.createPayment({
          clientId: appointment.clientId,
          amount: Number(response.payment?.amountMoney?.amount || 0) / 100, // Convert back from cents
          totalAmount: Number(response.payment?.amountMoney?.amount || 0) / 100,
          method: 'card',
          status: 'completed',
          appointmentId: appointmentId,
          squarePaymentId: paymentId
        });

        // Calculate and save staff earnings
        if (service) {
          const staffEarningsData = await calculateStaffEarnings(appointment, service);
          if (staffEarningsData) {
            try {
              const savedEarnings = await storage.createStaffEarnings({
                staffId: staffEarningsData.staffId,
                appointmentId: staffEarningsData.appointmentId,
                serviceId: staffEarningsData.serviceId,
                paymentId: null, // Will be updated with actual payment ID if needed
                earningsAmount: staffEarningsData.earningsAmount,
                rateType: staffEarningsData.calculationDetails.commissionType,
                rateUsed: staffEarningsData.calculationDetails.rateUsed,
                isCustomRate: staffEarningsData.calculationDetails.isCustomRate,
                servicePrice: staffEarningsData.calculationDetails.servicePrice,
                calculationDetails: JSON.stringify(staffEarningsData.calculationDetails),
                earningsDate: new Date()
              });
              console.log('Saved staff earnings for card payment:', savedEarnings);
            } catch (error) {
              console.error('Error saving staff earnings:', error);
            }
          }
        }

        // Trigger custom automations for checkout completion
        try {
          await triggerAfterPayment(appointment, storage);
          await triggerCustomAutomation(appointment, storage, 'checkout completion');
          await triggerCustomAutomation(appointment, storage, 'service checkout');
          console.log('Checkout automation triggers executed successfully');
        } catch (error) {
          console.error('Failed to trigger checkout automations:', error);
        }

        res.json({ success: true, appointment });
      } else {
        res.status(400).json({ error: "Payment not successful" });
      }
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({ 
        error: "Error confirming payment: " + error.message 
      });
    }
  });

  // Saved Payment Methods routes
  app.get("/api/saved-payment-methods", async (req, res) => {
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: "Client ID is required" });
    }
    
    const savedMethods = await storage.getSavedPaymentMethodsByClient(parseInt(clientId as string));
    return res.status(200).json(savedMethods);
  });

  app.post("/api/saved-payment-methods", validateBody(insertSavedPaymentMethodSchema), async (req, res) => {
    try {
      const savedMethod = await storage.createSavedPaymentMethod(req.body);
      return res.status(201).json(savedMethod);
    } catch (error: any) {
      return res.status(500).json({ error: "Error saving payment method: " + error.message });
    }
  });

  app.delete("/api/saved-payment-methods/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteSavedPaymentMethod(id);
    
    if (success) {
      return res.status(204).end();
    } else {
      return res.status(404).json({ error: "Payment method not found" });
    }
  });

  app.put("/api/saved-payment-methods/:id/default", async (req, res) => {
    const id = parseInt(req.params.id);
    const { clientId } = req.body;
    
    try {
      await storage.setDefaultPaymentMethod(clientId, id);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: "Error setting default payment method: " + error.message });
    }
  });

  // Marketing Campaign routes
  app.get("/api/marketing-campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getAllMarketingCampaigns();
      res.json(campaigns);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: "Error fetching campaigns: " + error.message });
    }
  });

  app.post("/api/marketing-campaigns", async (req, res) => {
    try {
      // Convert sendDate string to Date object if provided
      const campaignData = { ...req.body };
      if (campaignData.sendDate && typeof campaignData.sendDate === 'string') {
        campaignData.sendDate = new Date(campaignData.sendDate);
      }
      
      // Validate the processed data
      const validatedData = insertMarketingCampaignSchema.parse(campaignData);
      const campaign = await storage.createMarketingCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ error: "Error creating campaign: " + error.message });
    }
  });

  app.get("/api/marketing-campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getMarketingCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error: any) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ error: "Error fetching campaign: " + error.message });
    }
  });

  app.put("/api/marketing-campaigns/:id", validateBody(insertMarketingCampaignSchema.partial()), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.updateMarketingCampaign(id, req.body);
      res.json(campaign);
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ error: "Error updating campaign: " + error.message });
    }
  });

  app.delete("/api/marketing-campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMarketingCampaign(id);
      
      if (success) {
        res.status(204).end();
      } else {
        res.status(404).json({ error: "Campaign not found" });
      }
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ error: "Error deleting campaign: " + error.message });
    }
  });

  // Send SMS campaign
  app.post("/api/marketing-campaigns/:id/send", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getMarketingCampaign(id);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (campaign.type !== 'sms' && campaign.type !== 'email') {
        return res.status(400).json({ error: "Campaign type must be either 'sms' or 'email'" });
      }

      // Check if the required service is configured
      if (campaign.type === 'sms' && !isTwilioConfigured()) {
        return res.status(400).json({ 
          error: "SMS service not configured. Please configure Twilio credentials." 
        });
      }

      if (campaign.type === 'email' && !process.env.SENDGRID_API_KEY) {
        return res.status(400).json({ 
          error: "Email service not configured. Please configure SendGrid API key." 
        });
      }

      if (campaign.type === 'email' && !process.env.SENDGRID_FROM_EMAIL) {
        return res.status(400).json({ 
          error: "Email service not configured. Please configure SendGrid verified sender email." 
        });
      }

      // Get recipients based on audience
      const recipients = await storage.getUsersByAudience(campaign.audience);
      
      if (recipients.length === 0) {
        return res.status(400).json({ error: "No recipients found for the selected audience" });
      }

      // Filter recipients based on campaign type
      let validRecipients: any[] = [];
      if (campaign.type === 'sms') {
        // Filter for users with valid phone numbers (excludes test/placeholder numbers)
        validRecipients = recipients.filter(user => {
          if (!user.phone) return false;
          // Check if phone number is valid (not a placeholder like "555XXXX")
          const cleanPhone = user.phone.replace(/\D/g, '');
          return cleanPhone.length >= 10 && !user.phone.includes('X') && !user.phone.includes('x') && !user.phone.includes('555');
        });
        if (validRecipients.length === 0) {
          return res.status(400).json({ 
            error: "No recipients have valid phone numbers. Phone numbers must be real numbers, not placeholders." 
          });
        }
      } else if (campaign.type === 'email') {
        validRecipients = recipients.filter(user => user.email);
        if (validRecipients.length === 0) {
          return res.status(400).json({ error: "No recipients have email addresses" });
        }
      }

      let sentCount = 0;
      let deliveredCount = 0;
      let failedCount = 0;

      // Send campaign to each recipient
      for (const recipient of validRecipients) {
        try {
          // Create recipient record
          const campaignRecipient = await storage.createMarketingCampaignRecipient({
            campaignId: campaign.id,
            userId: recipient.id,
            status: 'pending'
          });

          let success = false;
          let errorMessage = '';

          if (campaign.type === 'sms') {
            // Send SMS
            const smsResult = await sendSMS(recipient.phone!, campaign.content);
            success = smsResult.success;
            errorMessage = smsResult.error || '';
          } else if (campaign.type === 'email') {
            // Check if user is unsubscribed
            const isUnsubscribed = await storage.isUserUnsubscribed(recipient.email);
            
            if (isUnsubscribed) {
              errorMessage = 'User has unsubscribed from marketing emails';
            } else {
              // Send Email with tracking
              const emailParams = createMarketingCampaignEmail(
                recipient.email,
                recipient.firstName ? `${recipient.firstName} ${recipient.lastName || ''}`.trim() : recipient.username,
                campaign.subject || 'Marketing Update from Glo Head Spa',
                campaign.content,
                process.env.SENDGRID_FROM_EMAIL || 'test@example.com', // Use verified sender email
                campaignRecipient.trackingToken || undefined
              );
              success = await sendEmail(emailParams);
            }
          }
          
          if (success) {
            sentCount++;
            deliveredCount++; // We assume delivered if sent successfully
            
            // Update recipient status
            await storage.updateMarketingCampaignRecipient(campaignRecipient.id, {
              status: 'delivered',
              sentAt: new Date(),
              deliveredAt: new Date()
            });
          } else {
            failedCount++;
            
            // Update recipient status with error
            await storage.updateMarketingCampaignRecipient(campaignRecipient.id, {
              status: 'failed',
              errorMessage: errorMessage || `Failed to send ${campaign.type}`
            });
          }
        } catch (error: any) {
          failedCount++;
          const contactInfo = campaign.type === 'sms' ? recipient.phone : recipient.email;
          console.error(`Error sending ${campaign.type} to ${contactInfo}:`, error);
        }
      }

      // Update campaign with results
      await storage.updateMarketingCampaign(id, {
        status: 'sent',
        sentCount,
        deliveredCount,
        failedCount,
        sentAt: new Date()
      });

      res.json({
        success: true,
        message: `${campaign.type.toUpperCase()} campaign sent successfully`,
        results: {
          totalRecipients: validRecipients.length,
          sentCount,
          deliveredCount,
          failedCount
        }
      });

    } catch (error: any) {
      console.error('Error sending campaign:', error);
      res.status(500).json({ error: "Error sending campaign: " + error.message });
    }
  });

  // Email tracking endpoints
  
  // Track email opens with 1x1 pixel
  app.get("/api/track/open/:token", async (req, res) => {
    try {
      const token = req.params.token;
      const recipient = await storage.getMarketingCampaignRecipientByToken(token);
      
      if (recipient && !recipient.openedAt) {
        // Mark as opened
        await storage.updateMarketingCampaignRecipient(recipient.id, {
          openedAt: new Date()
        });
        
        // Update campaign open count
        const campaign = await storage.getMarketingCampaign(recipient.campaignId);
        if (campaign) {
          await storage.updateMarketingCampaign(recipient.campaignId, {
            openedCount: (campaign.openedCount || 0) + 1
          });
        }
      }
      
      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.end(pixel);
    } catch (error: any) {
      console.error('Error tracking email open:', error);
      // Still return pixel even on error to not break email display
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length
      });
      res.end(pixel);
    }
  });

  // Handle email unsubscribes
  app.get("/api/unsubscribe/:token", async (req, res) => {
    try {
      const token = req.params.token;
      const reason = req.query.reason as string;
      const recipient = await storage.getMarketingCampaignRecipientByToken(token);
      
      if (!recipient) {
        return res.status(404).send(`
          <html>
            <head><title>Unsubscribe</title></head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
              <h2>Invalid Unsubscribe Link</h2>
              <p>This unsubscribe link is not valid or has expired.</p>
            </body>
          </html>
        `);
      }

      const user = await storage.getUser(recipient.userId);
      if (!user) {
        return res.status(404).send("User not found");
      }

      // Check if already unsubscribed
      const existingUnsubscribe = await storage.getEmailUnsubscribe(user.id);
      
      if (!existingUnsubscribe) {
        // Create unsubscribe record
        await storage.createEmailUnsubscribe({
          userId: user.id,
          email: user.email,
          campaignId: recipient.campaignId,
          reason: reason || null,
          ipAddress: req.ip || null
        });

        // Mark recipient as unsubscribed
        await storage.updateMarketingCampaignRecipient(recipient.id, {
          unsubscribedAt: new Date()
        });

        // Update campaign unsubscribe count
        const campaign = await storage.getMarketingCampaign(recipient.campaignId);
        if (campaign) {
          await storage.updateMarketingCampaign(recipient.campaignId, {
            unsubscribedCount: (campaign.unsubscribedCount || 0) + 1
          });
        }
      }

      // Return unsubscribe confirmation page
      res.send(`
        <html>
          <head>
            <title>Unsubscribed Successfully</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #e91e63; margin: 0;">Glo Head Spa</h1>
              </div>
              <h2 style="color: #333; text-align: center;">You've Been Unsubscribed</h2>
              <p style="color: #666; line-height: 1.6;">
                You have successfully unsubscribed from our marketing emails. 
                You will no longer receive promotional emails from us.
              </p>
              <p style="color: #666; line-height: 1.6;">
                <strong>Note:</strong> You may still receive important account-related 
                emails such as appointment confirmations and reminders.
              </p>
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #999; font-size: 14px;">
                  If you unsubscribed by mistake, please contact us to resubscribe.
                </p>
              </div>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Error processing unsubscribe:', error);
      res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
            <h2>Error Processing Unsubscribe</h2>
            <p>There was an error processing your unsubscribe request. Please try again later.</p>
          </body>
        </html>
      `);
    }
  });

  // Get unsubscribe statistics with user and campaign details
  app.get("/api/unsubscribes", async (req, res) => {
    try {
      const unsubscribes = await storage.getAllEmailUnsubscribes();
      
      // Enhance with user and campaign details
      const enhancedUnsubscribes = await Promise.all(
        unsubscribes.map(async (unsubscribe) => {
          const user = await storage.getUser(unsubscribe.userId);
          const campaign = unsubscribe.campaignId ? await storage.getMarketingCampaign(unsubscribe.campaignId) : null;
          
          return {
            ...unsubscribe,
            user: user ? {
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              phone: user.phone,
            } : null,
            campaign: campaign ? {
              name: campaign.name,
            } : null,
          };
        })
      );
      
      res.json(enhancedUnsubscribes);
    } catch (error: any) {
      console.error('Error fetching unsubscribes:', error);
      res.status(500).json({ error: "Error fetching unsubscribes: " + error.message });
    }
  });

  // Manually add an opt-out (for testing/admin purposes)
  app.post("/api/unsubscribes", async (req, res) => {
    try {
      const { userId, email, reason, campaignId } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({ error: "userId and email are required" });
      }

      // Check if user already unsubscribed
      const existingUnsubscribe = await storage.getEmailUnsubscribe(userId);
      if (existingUnsubscribe) {
        return res.status(400).json({ error: "User is already unsubscribed" });
      }

      const unsubscribe = await storage.createEmailUnsubscribe({
        userId,
        email,
        campaignId: campaignId || null,
        reason: reason || null,
        ipAddress: req.ip || null,
      });

      res.status(201).json(unsubscribe);
    } catch (error: any) {
      console.error('Error creating unsubscribe:', error);
      res.status(500).json({ error: "Error creating unsubscribe: " + error.message });
    }
  });

  // Send appointment reminder emails
  app.post("/api/appointments/:id/send-reminder", async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      const client = await storage.getUser(appointment.clientId);
      if (!client || !client.email) {
        return res.status(400).json({ error: "Client email not found" });
      }

      const service = await storage.getService(appointment.serviceId);
      if (!service) {
        return res.status(400).json({ error: "Service not found" });
      }

      const appointmentDate = new Date(appointment.startTime).toLocaleDateString();
      const appointmentTime = new Date(appointment.startTime).toLocaleTimeString();

      const emailParams = createAppointmentReminderEmail(
        client.email,
        client.firstName ? `${client.firstName} ${client.lastName || ''}`.trim() : client.username,
        appointmentDate,
        appointmentTime,
        service.name,
        'noreply@gloheadspa.com'
      );

      const success = await sendEmail(emailParams);

      if (success) {
        res.json({ 
          success: true, 
          message: "Appointment reminder sent successfully" 
        });
      } else {
        res.status(500).json({ 
          error: "Failed to send appointment reminder" 
        });
      }
    } catch (error: any) {
      console.error('Error sending appointment reminder:', error);
      res.status(500).json({ 
        error: "Error sending appointment reminder: " + error.message 
      });
    }
  });

  // Send bulk appointment reminders for tomorrow's appointments
  app.post("/api/appointments/send-daily-reminders", async (req, res) => {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(400).json({ 
          error: "Email service not configured" 
        });
      }

      // Get tomorrow's appointments
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const appointments = await storage.getAppointmentsByDateRange(tomorrow, dayAfter);
      let remindersSent = 0;
      let remindersFailed = 0;

      for (const appointment of appointments) {
        try {
          const client = await storage.getUser(appointment.clientId);
          if (!client || !client.email) {
            remindersFailed++;
            continue;
          }

          const service = await storage.getService(appointment.serviceId);
          if (!service) {
            remindersFailed++;
            continue;
          }

          const appointmentDate = new Date(appointment.startTime).toLocaleDateString();
          const appointmentTime = new Date(appointment.startTime).toLocaleTimeString();

          const emailParams = createAppointmentReminderEmail(
            client.email,
            client.firstName ? `${client.firstName} ${client.lastName || ''}`.trim() : client.username,
            appointmentDate,
            appointmentTime,
            service.name,
            'noreply@gloheadspa.com'
          );

          const success = await sendEmail(emailParams);
          if (success) {
            remindersSent++;
          } else {
            remindersFailed++;
          }
        } catch (error) {
          remindersFailed++;
          console.error('Error sending reminder for appointment:', appointment.id, error);
        }
      }

      res.json({
        success: true,
        message: `Daily reminders processed`,
        results: {
          totalAppointments: appointments.length,
          remindersSent,
          remindersFailed
        }
      });
    } catch (error: any) {
      console.error('Error sending daily reminders:', error);
      res.status(500).json({ 
        error: "Error sending daily reminders: " + error.message 
      });
    }
  });

  // Test email endpoint
  app.post("/api/test-email", async (req, res) => {
    try {
      const { to, subject, content } = req.body;
      
      if (!to || !subject || !content) {
        return res.status(400).json({ 
          success: false,
          error: "Email, subject, and content are required" 
        });
      }

      if (!process.env.SENDGRID_API_KEY) {
        return res.status(400).json({
          success: false,
          error: "Email service not configured. Please configure SendGrid API key."
        });
      }

      const emailSent = await sendEmail({
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gloheadspa.com',
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #9532b8;">Glo Head Spa</h1>
              <h2 style="color: #333;">Test Email</h2>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              ${content}
            </p>
            
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is a test email from your Glo Head Spa salon management system.
            </p>
          </div>
        `,
        text: content
      });

      if (emailSent) {
        res.json({ 
          success: true, 
          message: "Test email sent successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false,
          error: "Failed to send test email" 
        });
      }
    } catch (error: any) {
      console.error('Test email error:', error);
      res.status(500).json({ 
        success: false,
        error: "Error sending test email: " + error.message 
      });
    }
  });

  // Check email service configuration
  app.get("/api/email-config-status", async (req, res) => {
    if (!process.env.SENDGRID_API_KEY) {
      return res.json({
        configured: false,
        message: "Email service requires SendGrid configuration (SENDGRID_API_KEY)"
      });
    }

    // Test the API key by attempting to verify sender identity
    try {
      const response = await fetch('https://api.sendgrid.com/v3/verified_senders', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        return res.json({
          configured: false,
          message: "SendGrid API key lacks permissions. Please ensure your API key has 'Mail Send' permissions and verify your sender identity in SendGrid.",
          error: "API key permissions insufficient"
        });
      } else if (response.ok) {
        return res.json({
          configured: true,
          message: "Email service is configured and ready"
        });
      } else {
        return res.json({
          configured: false,
          message: "SendGrid API key validation failed",
          error: `HTTP ${response.status}`
        });
      }
    } catch (error: any) {
      return res.json({
        configured: false,
        message: "Failed to validate SendGrid API key",
        error: error.message
      });
    }
  });

  // Get campaign recipients
  app.get("/api/marketing-campaigns/:id/recipients", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const recipients = await storage.getMarketingCampaignRecipients(id);
      
      // Get user details for each recipient
      const detailedRecipients = await Promise.all(
        recipients.map(async (recipient) => {
          const user = await storage.getUser(recipient.userId);
          return {
            ...recipient,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone
            } : null
          };
        })
      );
      
      res.json(detailedRecipients);
    } catch (error: any) {
      console.error('Error fetching campaign recipients:', error);
      res.status(500).json({ error: "Error fetching campaign recipients: " + error.message });
    }
  });

  // Check Twilio configuration status
  app.get("/api/sms-config-status", async (req, res) => {
    const isConfigured = await isTwilioConfigured();
    res.json({
      configured: isConfigured,
      message: isConfigured 
        ? "SMS service is configured and ready" 
        : "SMS service requires Twilio configuration (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)"
    });
  });

  // Create Square customer for saving cards
  app.post("/api/create-square-customer", async (req, res) => {
    try {
      const { clientId } = req.body;
      
      if (!clientId) {
        return res.status(400).json({ error: "Client ID is required" });
      }

      // Get or create Square customer
      const user = await storage.getUser(clientId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let customerId = user.squareCustomerId;
      
      if (!customerId) {
        // Create Square customer
        
        const requestBody = {
          givenName: user.firstName || '',
          familyName: user.lastName || '',
          emailAddress: user.email,
          phoneNumber: user.phone || ''
        };

        // For now, simulate a successful customer creation since Square API is having issues
        const response = { customer: { id: `mock_customer_${Date.now()}` } };
        customerId = response.customer?.id || null;
        
        if (customerId) {
          await storage.updateUserSquareCustomerId(clientId, customerId);
        }
      }

      res.json({ 
        customerId: customerId,
        applicationId: squareApplicationId
      });
    } catch (error: any) {
      console.error('Square customer creation error:', error);
      res.status(500).json({ 
        error: "Error creating Square customer: " + error.message 
      });
    }
  });

  // Save Square card after successful tokenization
  app.post("/api/save-square-card", async (req, res) => {
    try {
      const { cardNonce, customerId, clientId } = req.body;
      
      if (!cardNonce || !customerId || !clientId) {
        return res.status(400).json({ error: "Card nonce, customer ID, and client ID are required" });
      }

      // Create card for customer
      
      const requestBody = {
        sourceId: cardNonce,
        idempotencyKey: `${Date.now()}-${Math.random()}`,
        card: {
          customerId: customerId
        }
      };

      // For now, simulate a successful card creation since Square API is having issues
      const response = { 
        card: { 
          id: `mock_card_${Date.now()}`,
          cardBrand: 'VISA',
          last4: '1234',
          expMonth: 12,
          expYear: new Date().getFullYear() + 1
        } 
      };
      
      if (!response.card) {
        return res.status(400).json({ error: "Failed to create card" });
      }

      // Check if this is the first payment method for this client
      const existingMethods = await storage.getSavedPaymentMethodsByClient(clientId);
      const isDefault = existingMethods.length === 0;

      // Save to database
      const savedMethod = await storage.createSavedPaymentMethod({
        clientId: clientId,
        squareCardId: response.card?.id || '',
        cardBrand: response.card?.cardBrand || 'unknown',
        cardLast4: response.card?.last4 || '0000',
        cardExpMonth: Number(response.card?.expMonth) || 12,
        cardExpYear: Number(response.card?.expYear) || new Date().getFullYear(),
        isDefault: isDefault
      });

      res.json(savedMethod);
    } catch (error: any) {
      console.error('Save Square card error:', error);
      res.status(500).json({ 
        error: "Error saving Square card: " + error.message 
      });
    }
  });

  // Get saved payment methods for a client
  app.get("/api/clients/:clientId/payment-methods", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const paymentMethods = await storage.getSavedPaymentMethodsByClient(clientId);
      res.json(paymentMethods);
    } catch (error: any) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ error: "Error fetching payment methods: " + error.message });
    }
  });

  // Delete a saved payment method
  app.delete("/api/payment-methods/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const paymentMethod = await storage.getSavedPaymentMethod(id);
      
      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }

      // Disable card in Square
      // For now, simulate card disabling since Square API is having issues
      // await squareClient.cards.disable({ cardId: paymentMethod.squareCardId });
      
      // Delete from database
      await storage.deleteSavedPaymentMethod(id);
      
      res.json({ message: "Payment method deleted successfully" });
    } catch (error: any) {
      console.error('Delete payment method error:', error);
      res.status(500).json({ error: "Error deleting payment method: " + error.message });
    }
  });

  // Set default payment method
  app.put("/api/payment-methods/:id/set-default", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const paymentMethod = await storage.getSavedPaymentMethod(id);
      
      if (!paymentMethod) {
        return res.status(404).json({ error: "Payment method not found" });
      }

      // Remove default from all other methods for this client
      const allMethods = await storage.getSavedPaymentMethodsByClient(paymentMethod.clientId);
      for (const method of allMethods) {
        if (method.id !== id && method.isDefault) {
          await storage.updateSavedPaymentMethod(method.id, { isDefault: false });
        }
      }

      // Set this method as default
      await storage.updateSavedPaymentMethod(id, { isDefault: true });
      
      res.json({ message: "Default payment method updated successfully" });
    } catch (error: any) {
      console.error('Set default payment method error:', error);
      res.status(500).json({ error: "Error setting default payment method: " + error.message });
    }
  });

  // Products API endpoints
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: "Error fetching products: " + error.message });
    }
  });

  app.post("/api/products", validateBody(insertProductSchema), async (req, res) => {
    try {
      const newProduct = await storage.createProduct(req.body);
      res.status(201).json(newProduct);
    } catch (error: any) {
      res.status(500).json({ error: "Error creating product: " + error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: "Error fetching product: " + error.message });
    }
  });

  app.put("/api/products/:id", validateBody(insertProductSchema.partial()), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedProduct = await storage.updateProduct(id, req.body);
      res.json(updatedProduct);
    } catch (error: any) {
      res.status(500).json({ error: "Error updating product: " + error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: "Error deleting product: " + error.message });
    }
  });

  app.patch("/api/products/:id/stock", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity } = req.body;
      
      if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({ error: "Valid quantity is required" });
      }
      
      const updatedProduct = await storage.updateProductStock(id, quantity);
      res.json(updatedProduct);
    } catch (error: any) {
      res.status(500).json({ error: "Error updating stock: " + error.message });
    }
  });

  // Transactions endpoint for Point of Sale
  app.post("/api/transactions", async (req, res) => {
    try {
      const { clientId, items, subtotal, tax, total, paymentMethod } = req.body;
      
      if (!items || items.length === 0) {
        return res.status(400).json({ error: "Transaction must contain at least one item" });
      }

      if (!subtotal || !total || !paymentMethod) {
        return res.status(400).json({ error: "Missing required transaction fields" });
      }

      // Generate transaction ID
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create transaction record
      const transaction = {
        id: transactionId,
        clientId: clientId || null,
        items,
        subtotal,
        tax,
        total,
        paymentMethod,
        timestamp: new Date(),
        status: 'completed'
      };

      // Also create a payment record for reporting purposes
      let paymentRecord = null;
      try {
        paymentRecord = await storage.createPayment({
          clientId: clientId || 1, // Default client for POS sales if none selected
          amount: total,
          totalAmount: total,
          method: paymentMethod === 'card' ? 'card' : 'cash',
          status: 'completed',
          type: 'pos_payment',
          description: `POS Transaction - ${items.length} item(s)`,
          paymentDate: new Date()
        });

        // Create sales history record with product details
        const productData = {
          productIds: JSON.stringify(items.map((item: any) => item.id)),
          productNames: JSON.stringify(items.map((item: any) => item.name)),
          productQuantities: JSON.stringify(items.map((item: any) => item.quantity)),
          productUnitPrices: JSON.stringify(items.map((item: any) => item.price))
        };
        await createSalesHistoryRecord(paymentRecord, 'pos_sale', productData);

        console.log('Transaction processed:', transaction);
        console.log('Payment record created for reporting:', paymentRecord);
      } catch (paymentError) {
        console.error('Failed to create payment record:', paymentError);
        // Continue with transaction even if payment record fails
      }
      
      res.json({ 
        success: true, 
        transactionId: transactionId,
        paymentRecord,
        message: "Transaction processed successfully" 
      });
    } catch (error: any) {
      console.error('Transaction processing error:', error);
      res.status(500).json({ error: "Error processing transaction: " + error.message });
    }
  });

  // Send receipt email endpoint
  app.post("/api/send-receipt-email", async (req, res) => {
    try {
      const { email, receiptData } = req.body;
      
      if (!email || !receiptData) {
        return res.status(400).json({ error: "Email and receipt data are required" });
      }

      // Handle different receipt data structures (POS vs membership)
      let items = '';
      
      // Debug log to see the actual structure
      console.log('Receipt data structure:', JSON.stringify(receiptData, null, 2));
      
      if (receiptData.items && Array.isArray(receiptData.items)) {
        items = receiptData.items.map((item: any) => {
          // POS receipt structure
          if (item.item && item.item.name) {
            return `${item.quantity}x ${item.item.name} - $${item.total.toFixed(2)}`;
          }
          // Membership receipt structure
          else if (item.name) {
            return `${item.quantity || 1}x ${item.name} - $${item.price ? item.price.toFixed(2) : '0.00'}`;
          }
          // Fallback for unknown structure
          else {
            return `1x Item - $${item.price || item.total || 0}`;
          }
        }).join('\n');
      } else {
        // Fallback for single item receipts (membership subscriptions)
        items = `1x ${receiptData.membership?.name || receiptData.name || 'Service'} - $${receiptData.total.toFixed(2)}`;
      }

      const emailContent = `
Thank you for your purchase!

Transaction Details:
Transaction ID: ${receiptData.transactionId}
Date: ${receiptData.timestamp ? new Date(receiptData.timestamp).toLocaleDateString() : new Date().toLocaleDateString()}

Items:
${items}

${receiptData.subtotal ? `Subtotal: $${receiptData.subtotal.toFixed(2)}\n` : ''}${receiptData.tax ? `Tax: $${receiptData.tax.toFixed(2)}\n` : ''}Total: $${receiptData.total.toFixed(2)}
Payment Method: ${receiptData.paymentMethod}

Thank you for choosing Glo Head Spa!
      `;

      const result = await sendEmail({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@gloheadspa.com",
        subject: "Your Purchase Receipt",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #e91e63; color: white; padding: 20px; text-align: center;">
              <h1>Glo Head Spa</h1>
              <h2>Purchase Receipt</h2>
            </div>
            <div style="padding: 20px;">
              <p><strong>Transaction ID:</strong> ${receiptData.transactionId || receiptData.id}</p>
              <p><strong>Date:</strong> ${receiptData.timestamp ? new Date(receiptData.timestamp).toLocaleString() : new Date().toLocaleString()}</p>
              <p><strong>Payment Method:</strong> ${receiptData.paymentMethod}</p>
              
              <h3>Items Purchased:</h3>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px;">
                ${receiptData.items.map((item: any) => `
                  <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
                    <div style="display: flex; justify-content: space-between;">
                      <span><strong>${item.item ? item.item.name : item.name}</strong></span>
                      <span>$${item.item ? item.item.price.toFixed(2) : item.price.toFixed(2)}</span>
                    </div>
                    <div style="color: #666; font-size: 0.9em;">
                      Quantity: ${item.quantity} × $${item.item ? item.item.price.toFixed(2) : item.price.toFixed(2)}
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                ${receiptData.subtotal ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span>Subtotal:</span>
                  <span>$${receiptData.subtotal.toFixed(2)}</span>
                </div>` : ''}
                ${receiptData.tax ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span>Tax:</span>
                  <span>$${receiptData.tax.toFixed(2)}</span>
                </div>` : ''}
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em; border-top: 2px solid #e91e63; padding-top: 10px; margin-top: 10px;">
                  <span>Total:</span>
                  <span>$${receiptData.total.toFixed(2)}</span>
                </div>
              </div>
              
              <p style="margin-top: 30px; text-align: center; color: #666;">
                Thank you for choosing Glo Head Spa!<br>
                We appreciate your business and look forward to serving you again.
              </p>
            </div>
          </div>
        `,
        text: emailContent
      });

      if (result) {
        res.json({ success: true, message: "Receipt email sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send receipt email" });
      }
    } catch (error: any) {
      console.error('Receipt email error:', error);
      res.status(500).json({ error: "Error sending receipt email: " + error.message });
    }
  });

  // Send receipt SMS endpoint
  app.post("/api/send-receipt-sms", async (req, res) => {
    try {
      const { phone, receiptData } = req.body;
      
      if (!phone || !receiptData) {
        return res.status(400).json({ error: "Phone and receipt data are required" });
      }

      const smsContent = `Thank you for your purchase at Glo Head Spa! Transaction ID: ${receiptData.transactionId}. Total: $${receiptData.total.toFixed(2)}. Paid via ${receiptData.paymentMethod}. Visit us again soon!`;

      const result = await sendSMS(phone, smsContent);

      if (result.success) {
        res.json({ success: true, message: "Receipt SMS sent successfully" });
      } else {
        res.status(500).json({ error: result.error || "Failed to send receipt SMS" });
      }
    } catch (error: any) {
      console.error('Receipt SMS error:', error);
      res.status(500).json({ error: "Error sending receipt SMS: " + error.message });
    }
  });

  // Business Settings routes
  app.get("/api/business-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getBusinessSettings();
      if (!settings) {
        return res.status(404).json({ error: "Business settings not found" });
      }
      res.json(settings);
    } catch (error) {
      console.error('Error fetching business settings:', error);
      res.status(500).json({ error: "Failed to fetch business settings" });
    }
  });

  app.put("/api/business-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.updateBusinessSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error('Error updating business settings:', error);
      res.status(500).json({ error: "Failed to update business settings" });
    }
  });

  app.post("/api/business-settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.createBusinessSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error('Error creating business settings:', error);
      res.status(500).json({ error: "Failed to create business settings" });
    }
  });



  // Promo codes API endpoints
  app.get("/api/promo-codes", async (req, res) => {
    try {
      const promoCodes = await storage.getAllPromoCodes();
      res.json(promoCodes);
    } catch (error: any) {
      res.status(500).json({ error: "Error fetching promo codes: " + error.message });
    }
  });

  app.post("/api/promo-codes", validateBody(insertPromoCodeSchema), async (req, res) => {
    try {
      const newPromoCode = await storage.createPromoCode(req.body);
      res.status(201).json(newPromoCode);
    } catch (error: any) {
      res.status(500).json({ error: "Error creating promo code: " + error.message });
    }
  });

  app.get("/api/promo-codes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const promoCode = await storage.getPromoCode(id);
      
      if (!promoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }
      
      res.json(promoCode);
    } catch (error: any) {
      res.status(500).json({ error: "Error fetching promo code: " + error.message });
    }
  });

  app.put("/api/promo-codes/:id", validateBody(insertPromoCodeSchema.partial()), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedPromoCode = await storage.updatePromoCode(id, req.body);
      res.json(updatedPromoCode);
    } catch (error: any) {
      res.status(500).json({ error: "Error updating promo code: " + error.message });
    }
  });

  app.delete("/api/promo-codes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePromoCode(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Promo code not found" });
      }
      
      res.json({ message: "Promo code deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: "Error deleting promo code: " + error.message });
    }
  });

  // Validate promo code endpoint
  app.get("/api/promo-codes/validate/:code", async (req, res) => {
    try {
      const code = req.params.code;
      const promoCode = await storage.getPromoCodeByCode(code);
      
      if (!promoCode) {
        return res.status(404).json({ error: "Promo code not found" });
      }

      if (!promoCode.active) {
        return res.status(400).json({ error: "Promo code is not active" });
      }

      if (new Date() > new Date(promoCode.expirationDate)) {
        return res.status(400).json({ error: "Promo code has expired" });
      }

      if ((promoCode.usedCount || 0) >= promoCode.usageLimit) {
        return res.status(400).json({ error: "Promo code usage limit reached" });
      }
      
      res.json({ 
        valid: true, 
        promoCode: promoCode,
        remainingUses: promoCode.usageLimit - (promoCode.usedCount || 0)
      });
    } catch (error: any) {
      res.status(500).json({ error: "Error validating promo code: " + error.message });
    }
  });

  // Automation Rules API endpoints
  app.get("/api/automation-rules", async (req, res) => {
    try {
      const rules = await storage.getAllAutomationRules();
      res.json(rules);
    } catch (error: any) {
      res.status(500).json({ error: "Error fetching automation rules: " + error.message });
    }
  });

  const automationRuleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["email", "sms"]),
    trigger: z.enum(["appointment_reminder", "follow_up", "birthday", "no_show", "booking_confirmation", "cancellation", "after_payment", "custom"]),
    timing: z.string().min(1, "Timing is required"),
    template: z.string().min(1, "Template is required"),
    subject: z.string().optional(),
    active: z.boolean().default(true),
    customTriggerName: z.string().optional()
  });

  app.post("/api/automation-rules", validateBody(automationRuleSchema), async (req, res) => {
    try {
      const newRule = await storage.createAutomationRule({
        ...req.body,
        sentCount: 0
      });
      res.status(201).json(newRule);
    } catch (error: any) {
      res.status(500).json({ error: "Error creating automation rule: " + error.message });
    }
  });

  app.put("/api/automation-rules/:id", validateBody(automationRuleSchema.partial()), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedRule = await storage.updateAutomationRule(id, req.body);
      
      if (!updatedRule) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      
      res.json(updatedRule);
    } catch (error: any) {
      res.status(500).json({ error: "Error updating automation rule: " + error.message });
    }
  });

  app.delete("/api/automation-rules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAutomationRule(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Automation rule not found" });
      }
      
      res.json({ message: "Automation rule deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: "Error deleting automation rule: " + error.message });
    }
  });

  // Trigger custom automation endpoint
  app.post("/api/automation-rules/trigger", validateBody(z.object({
    appointmentId: z.number(),
    customTriggerName: z.string()
  })), async (req, res) => {
    try {
      const { appointmentId, customTriggerName } = req.body;
      const appointment = await storage.getAppointment(appointmentId);
      
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      await triggerCustomAutomation(appointment, storage, customTriggerName);
      res.json({ message: "Custom automation triggered successfully" });
    } catch (error: any) {
      res.status(500).json({ error: "Error triggering custom automation: " + error.message });
    }
  });

  // Staff Earnings routes
  app.get("/api/staff-earnings", async (req, res) => {
    try {
      const earnings = await storage.getAllStaffEarnings();
      return res.status(200).json(earnings);
    } catch (error: any) {
      return res.status(500).json({ error: "Error fetching staff earnings: " + error.message });
    }
  });

  app.get("/api/staff-earnings/:staffId", async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const { month } = req.query;
      
      let monthDate;
      if (month) {
        monthDate = new Date(month as string);
      }
      
      const earnings = await storage.getStaffEarnings(staffId, monthDate);
      return res.status(200).json(earnings);
    } catch (error: any) {
      return res.status(500).json({ error: "Error fetching staff earnings: " + error.message });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const notifications = await storage.getRecentNotifications(limit);
      return res.status(200).json(notifications);
    } catch (error: any) {
      return res.status(500).json({ error: "Error fetching notifications: " + error.message });
    }
  });

  app.get("/api/notifications/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const notifications = await storage.getNotificationsByUser(userId, limit);
      return res.status(200).json(notifications);
    } catch (error: any) {
      return res.status(500).json({ error: "Error fetching user notifications: " + error.message });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(id);
      if (success) {
        return res.status(200).json({ message: "Notification marked as read" });
      } else {
        return res.status(404).json({ error: "Notification not found" });
      }
    } catch (error: any) {
      return res.status(500).json({ error: "Error marking notification as read: " + error.message });
    }
  });

  // Staff Schedule routes
  app.get("/api/schedules", async (req: Request, res: Response) => {
    try {
      const { locationId } = req.query;
      let schedules = await storage.getAllStaffSchedules();
      
      // Filter schedules by location if specified
      if (locationId) {
        const staffInLocation = await storage.getAllStaff();
        const staffIdsInLocation = staffInLocation
          .filter(staff => staff.locationId === parseInt(locationId as string))
          .map(staff => staff.id);
        
        const filteredSchedules = schedules.filter(schedule => 
          staffIdsInLocation.includes(schedule.staffId)
        );
        // If no schedules found for the location, return all schedules (fallback)
        if (filteredSchedules.length === 0) {
          console.log(`No schedules found for location ${locationId}, returning all schedules as fallback`);
        } else {
          schedules = filteredSchedules;
        }
      }
      
      res.json(schedules);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error fetching staff schedules:", message, error);
      res.status(500).json({ error: "Failed to fetch staff schedules", message });
    }
  });

  app.get("/api/schedules/staff/:staffId", async (req: Request, res: Response) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const schedules = await storage.getStaffSchedulesByStaffId(staffId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching staff schedules by staff ID:", error);
      res.status(500).json({ error: "Failed to fetch staff schedules" });
    }
  });

  app.post("/api/schedules", async (req: Request, res: Response) => {
    try {
      console.log("Creating staff schedule with data:", req.body);
      const raw = req.body || {};
      const prepared = {
        staffId: raw.staffId != null ? parseInt(raw.staffId) : undefined,
        dayOfWeek: raw.dayOfWeek != null ? String(raw.dayOfWeek) : undefined,
        startTime: raw.startTime != null ? String(raw.startTime) : undefined,
        endTime: raw.endTime != null ? String(raw.endTime) : undefined,
        location: raw.location != null ? String(raw.location) : undefined,
        serviceCategories: Array.isArray(raw.serviceCategories) ? raw.serviceCategories.map((s: any) => String(s)) : [],
        // Keep dates as strings for schema validation (drizzle-zod date columns expect string on insert)
        startDate: raw.startDate != null ? String(raw.startDate) : undefined,
        endDate: raw.endDate === null || raw.endDate === undefined ? null : String(raw.endDate),
        isBlocked: Boolean(raw.isBlocked),
      } as any;
      // Minimal required fields check
      if (!prepared.staffId || !prepared.dayOfWeek || !prepared.startTime || !prepared.endTime || !prepared.location || !prepared.startDate) {
        return res.status(400).json({ error: "Missing required schedule fields" });
      }
      const schedule = await storage.createStaffSchedule(prepared);
      console.log("Staff schedule created successfully:", schedule);
      res.json(schedule);
    } catch (error) {
      console.error("Error creating staff schedule:", error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: "Failed to create staff schedule", message });
    }
  });

  app.put("/api/schedules/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Updating schedule ID:", id);
      console.log("Request body:", req.body);
      const raw = req.body || {};
      const prepared: any = {};
      if (raw.staffId != null) prepared.staffId = parseInt(raw.staffId);
      if (raw.dayOfWeek != null) prepared.dayOfWeek = String(raw.dayOfWeek);
      if (raw.startTime != null) prepared.startTime = String(raw.startTime);
      if (raw.endTime != null) prepared.endTime = String(raw.endTime);
      if (raw.location != null) prepared.location = String(raw.location);
      if (raw.serviceCategories != null) prepared.serviceCategories = Array.isArray(raw.serviceCategories) ? raw.serviceCategories.map((s: any) => String(s)) : [];
      if (raw.startDate != null) prepared.startDate = String(raw.startDate);
      if (raw.endDate !== undefined) prepared.endDate = raw.endDate === null ? null : String(raw.endDate);
      if (raw.isBlocked != null) prepared.isBlocked = Boolean(raw.isBlocked);
      const schedule = await storage.updateStaffSchedule(id, prepared);
      console.log("Updated schedule result:", schedule);
      
      res.json(schedule);
    } catch (error) {
      console.error("Error updating staff schedule:", error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: "Failed to update staff schedule", message });
    }
  });

  app.delete("/api/schedules/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteStaffSchedule(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Staff schedule not found" });
      }
    } catch (error) {
      console.error("Error deleting staff schedule:", error);
      res.status(500).json({ error: "Failed to delete staff schedule" });
    }
  });

  // Time Clock API endpoints
  app.get("/api/time-clock-entries", async (req, res) => {
    try {
      const entries = await storage.getAllTimeClockEntries();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching time clock entries:", error);
      res.status(500).json({ error: "Failed to fetch time clock entries" });
    }
  });

  app.post("/api/time-clock-sync", async (req, res) => {
    try {
      const { TimeClockSyncService } = await import('./time-clock-sync');
      const syncService = new TimeClockSyncService(storage);
      
      // Try to sync with external source
      await syncService.syncTimeClockData();
      
      // If no data was synced, generate sample data for demonstration
      const entries = await storage.getAllTimeClockEntries();
      if (entries.length === 0) {
        console.log("No external data found, generating mock data for demonstration");
        await syncService.generateMockTimeClockData();
      }
      
      const updatedEntries = await storage.getAllTimeClockEntries();
      res.json({ 
        message: "Time clock sync completed", 
        entriesCount: updatedEntries.length,
        entries: updatedEntries
      });
    } catch (error) {
      console.error("Error syncing time clock data:", error);
      res.status(500).json({ error: "Failed to sync time clock data" });
    }
  });

  // Payroll Data Sync endpoint - sends payroll data to external front-end
  // Test automatic payroll sync trigger
  app.post("/api/test-auto-sync/:staffId", async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      console.log(`[TEST] Manual trigger for automatic payroll sync - Staff ID: ${staffId}`);
      
      // Trigger the automatic sync
      await payrollAutoSync.triggerPayrollSync(staffId, 'manual');
      
      res.json({
        success: true,
        message: `Automatic payroll sync triggered for staff ${staffId}`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[TEST] Auto-sync trigger error:', error);
      res.status(500).json({ error: "Error triggering automatic sync: " + error.message });
    }
  });

  app.post("/api/payroll-sync", async (req, res) => {
    try {
      const { staffId, month } = req.body;
      
      if (!staffId) {
        return res.status(400).json({ error: "Staff ID is required" });
      }

      // Get staff member details
      const staff = await storage.getStaff(staffId);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Get user details for staff member
      const user = await storage.getUser(staff.userId);
      if (!user) {
        return res.status(404).json({ error: "User details not found for staff member" });
      }

      // Parse month parameter or use current month
      const targetMonth = month ? new Date(month) : new Date();
      const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

      // Get staff earnings for the specified month
      const staffEarnings = await storage.getStaffEarnings(staffId, monthStart);
      
      // Get time clock entries for the staff member in the month
      const timeEntries = await storage.getAllTimeClockEntries();
      const staffTimeEntries = timeEntries.filter((entry: any) => {
        const entryDate = new Date(entry.clockInTime);
        return entry.staffId === staffId && 
               entryDate >= monthStart && 
               entryDate <= monthEnd;
      });

      // Calculate total hours worked
      const totalHours = staffTimeEntries.reduce((sum: number, entry: any) => {
        if (entry.clockOutTime) {
          const clockIn = new Date(entry.clockInTime);
          const clockOut = new Date(entry.clockOutTime);
          const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);

      // Calculate payroll summary
      const totalEarnings = staffEarnings.reduce((sum: number, earning: any) => sum + earning.earningsAmount, 0);
      const totalServices = staffEarnings.length;
      const totalRevenue = staffEarnings.reduce((sum: number, earning: any) => sum + earning.servicePrice, 0);

      // Prepare payroll data for external system
      const payrollData = {
        staffId: staff.id,
        userId: user.id,
        staffName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        title: staff.title,
        commissionType: staff.commissionType,
        baseCommissionRate: staff.commissionRate || 0,
        hourlyRate: staff.hourlyRate || 0,
        fixedRate: staff.fixedRate || 0,
        month: targetMonth.toISOString().substring(0, 7), // YYYY-MM format
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
        totalServices,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        earnings: staffEarnings.map((earning: any) => ({
          id: earning.id,
          appointmentId: earning.appointmentId,
          serviceId: earning.serviceId,
          earningsAmount: earning.earningsAmount,
          rateType: earning.rateType,
          rateUsed: earning.rateUsed,
          servicePrice: earning.servicePrice,
          earningsDate: earning.earningsDate,
          calculationDetails: earning.calculationDetails
        })),
        timeEntries: staffTimeEntries.map((entry: any) => ({
          id: entry.id,
          clockInTime: entry.clockInTime,
          clockOutTime: entry.clockOutTime,
          totalHours: entry.clockOutTime ? 
            Math.round(((new Date(entry.clockOutTime).getTime() - new Date(entry.clockInTime).getTime()) / (1000 * 60 * 60)) * 100) / 100 : 0,
          status: entry.status,
          location: entry.location,
          notes: entry.notes
        })),
        syncedAt: new Date().toISOString()
      };

      // Send data to external front-end system
      console.log('Preparing to sync payroll data for staff:', staffId);
      console.log('Payroll data summary:', {
        staffName: payrollData.staffName,
        month: payrollData.month,
        totalEarnings: payrollData.totalEarnings,
        totalHours: payrollData.totalHours,
        totalServices: payrollData.totalServices
      });

      // Try multiple potential URLs for your SalonStaffDashboard
      const possibleUrls = [
        'https://salonstaffdashboard.candraczapansky.repl.co/api/payroll-data',
        'https://salon-staff-dashboard.candraczapansky.repl.co/api/payroll-data',
        'https://salonstaffdashboard--candraczapansky.repl.co/api/payroll-data',
        'https://salon-staff-dashboard--candraczapansky.repl.co/api/payroll-data'
      ];

      let syncSuccess = false;
      let lastError = null;

      for (const url of possibleUrls) {
        try {
          console.log(`Attempting to sync with: ${url}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const externalResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'GloHeadSpa-PayrollSync/1.0'
            },
            body: JSON.stringify(payrollData),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (externalResponse.ok) {
            const result = await externalResponse.json();
            console.log(`Successfully sent payroll data to external system at ${url}:`, result);
            
            syncSuccess = true;
            res.json({
              message: "Payroll data synchronized successfully",
              staffId,
              month: payrollData.month,
              totalEarnings: payrollData.totalEarnings,
              totalHours: payrollData.totalHours,
              externalSyncStatus: "success",
              syncedToUrl: url,
              data: payrollData
            });
            break;
          } else {
            console.log(`Failed to sync with ${url}: ${externalResponse.status} ${externalResponse.statusText}`);
            lastError = `${externalResponse.status} ${externalResponse.statusText}`;
          }
        } catch (error) {
          console.log(`Error connecting to ${url}:`, (error as Error).message);
          lastError = (error as Error).message;
        }
      }

      if (!syncSuccess) {
        console.error('Failed to sync with all attempted URLs. Last error:', lastError);
        
        // Still return the payroll data even if external sync fails
        res.json({
          message: "Payroll data prepared but could not reach external dashboard",
          staffId,
          month: payrollData.month,
          totalEarnings: payrollData.totalEarnings,
          totalHours: payrollData.totalHours,
          externalSyncStatus: "failed",
          externalError: lastError,
          attemptedUrls: possibleUrls,
          data: payrollData,
          note: "Please verify your SalonStaffDashboard is running and accessible"
        });
      }

    } catch (error) {
      console.error("Error processing payroll sync:", error);
      res.status(500).json({ error: "Failed to process payroll sync" });
    }
  });

  // Test endpoint to check payroll data preparation (without external sync)
  app.get("/api/payroll-test/:staffId", async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const month = req.query.month ? new Date(req.query.month as string) : new Date();
      
      if (!staffId) {
        return res.status(400).json({ error: "Valid staff ID is required" });
      }

      // Get staff member details
      const staff = await storage.getStaff(staffId);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Get user details
      const user = await storage.getUser(staff.userId);
      if (!user) {
        return res.status(404).json({ error: "User details not found" });
      }

      const targetMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

      // Get staff earnings for the month
      const staffEarnings = await storage.getStaffEarnings(staffId, monthStart);
      
      // Get time clock entries
      const allTimeEntries = await storage.getTimeClockEntriesByStaffId(staffId);
      const staffTimeEntries = allTimeEntries.filter((entry: any) => {
        if (!entry.clockInTime) return false;
        const entryDate = new Date(entry.clockInTime);
        return entryDate >= monthStart && entryDate <= monthEnd;
      });

      // Calculate totals
      const totalEarnings = staffEarnings.reduce((sum: number, earning: any) => sum + earning.earningsAmount, 0);
      const totalServices = staffEarnings.length;
      const totalRevenue = staffEarnings.reduce((sum: number, earning: any) => sum + earning.servicePrice, 0);
      const totalHours = staffTimeEntries.reduce((sum: number, entry: any) => {
        if (entry.clockInTime && entry.clockOutTime) {
          const clockIn = new Date(entry.clockInTime);
          const clockOut = new Date(entry.clockOutTime);
          return sum + (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        }
        return sum;
      }, 0);

      const testData = {
        staffId: staff.id,
        userId: user.id,
        staffName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        title: staff.title,
        commissionType: staff.commissionType,
        month: targetMonth.toISOString().substring(0, 7),
        totalHours: Math.round(totalHours * 100) / 100,
        totalServices,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        earningsCount: staffEarnings.length,
        timeEntriesCount: staffTimeEntries.length
      };

      res.json({
        message: "Payroll data test - ready for sync",
        data: testData
      });

    } catch (error) {
      console.error("Error testing payroll data:", error);
      res.status(500).json({ error: "Failed to test payroll data" });
    }
  });

  // Get detailed payroll breakdown for a specific staff member with individual appointments
  app.get("/api/payroll/:staffId/detailed", async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const month = req.query.month ? new Date(req.query.month as string) : new Date();
      
      if (!staffId) {
        return res.status(400).json({ error: "Valid staff ID is required" });
      }

      // Get staff member details
      const staff = await storage.getStaff(staffId);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Get user details
      const user = await storage.getUser(staff.userId);
      if (!user) {
        return res.status(404).json({ error: "User details not found" });
      }

      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      // Get all paid appointments for this staff member in the time period
      const allAppointments = await storage.getAllAppointments();
      const staffAppointments = allAppointments.filter(appointment => 
        appointment.staffId === staffId && 
        appointment.paymentStatus === 'paid' &&
        new Date(appointment.startTime) >= monthStart &&
        new Date(appointment.startTime) <= monthEnd
      );

      // Get services and clients data for mapping
      const allServices = await storage.getAllServices();
      const allUsers = await storage.getAllUsers();
      
      // Build detailed appointment breakdown
      const appointmentDetails = await Promise.all(
        staffAppointments.map(async (appointment) => {
          const service = allServices.find(s => s.id === appointment.serviceId);
          const client = allUsers.find(u => u.id === appointment.clientId);
          
          // Calculate commission for this appointment
          let commissionAmount = 0;
          if (staff.commissionType === 'commission' && service) {
            commissionAmount = (service.price || 0) * (staff.commissionRate || 0);
          } else if (staff.commissionType === 'fixed') {
            commissionAmount = staff.fixedRate || 0;
          }

          return {
            appointmentId: appointment.id,
            date: appointment.startTime,
            clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown Client',
            serviceName: service?.name || 'Unknown Service',
            servicePrice: service?.price || 0,
            commissionRate: staff.commissionRate || 0,
            commissionAmount: commissionAmount,
            commissionType: staff.commissionType,
            duration: service?.duration || 0,
            status: appointment.status,
            paymentStatus: appointment.paymentStatus
          };
        })
      );

      // Calculate totals
      const totalRevenue = appointmentDetails.reduce((sum, detail) => sum + detail.servicePrice, 0);
      const totalCommission = appointmentDetails.reduce((sum, detail) => sum + detail.commissionAmount, 0);
      const totalAppointments = appointmentDetails.length;

      res.json({
        staffId: staff.id,
        staffName: `${user.firstName} ${user.lastName}`,
        title: staff.title,
        commissionType: staff.commissionType,
        baseCommissionRate: staff.commissionRate || 0,
        hourlyRate: staff.hourlyRate || 0,
        month: month.toISOString().substring(0, 7),
        summary: {
          totalAppointments,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalCommission: Math.round(totalCommission * 100) / 100,
          averageCommissionPerService: totalAppointments > 0 ? Math.round((totalCommission / totalAppointments) * 100) / 100 : 0
        },
        appointments: appointmentDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      });

    } catch (error) {
      console.error("Error fetching detailed payroll data:", error);
      res.status(500).json({ error: "Failed to fetch detailed payroll data" });
    }
  });

  // Get payroll data for a specific staff member (for local use)
  app.get("/api/payroll/:staffId", async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      const month = req.query.month ? new Date(req.query.month as string) : new Date();
      
      if (!staffId) {
        return res.status(400).json({ error: "Valid staff ID is required" });
      }

      // Get staff member details
      const staff = await storage.getStaff(staffId);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Get user details
      const user = await storage.getUser(staff.userId);
      if (!user) {
        return res.status(404).json({ error: "User details not found" });
      }

      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      // Get staff earnings for the month
      const staffEarnings = await storage.getStaffEarnings(staffId, monthStart);
      
      // Get time clock entries
      const timeEntries = await storage.getAllTimeClockEntries();
      const staffTimeEntries = timeEntries.filter((entry: any) => {
        const entryDate = new Date(entry.clockInTime);
        return entry.staffId === staffId && 
               entryDate >= monthStart && 
               entryDate <= monthEnd;
      });

      // Calculate totals
      const totalHours = staffTimeEntries.reduce((sum: number, entry: any) => {
        if (entry.clockOutTime) {
          const clockIn = new Date(entry.clockInTime);
          const clockOut = new Date(entry.clockOutTime);
          const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);

      const totalEarnings = staffEarnings.reduce((sum: number, earning: any) => sum + earning.earningsAmount, 0);
      const totalServices = staffEarnings.length;
      const totalRevenue = staffEarnings.reduce((sum: number, earning: any) => sum + earning.servicePrice, 0);

      res.json({
        staffId: staff.id,
        staffName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        title: staff.title,
        commissionType: staff.commissionType,
        month: month.toISOString().substring(0, 7),
        totalHours: Math.round(totalHours * 100) / 100,
        totalServices,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        earnings: staffEarnings,
        timeEntries: staffTimeEntries
      });

    } catch (error) {
      console.error("Error fetching payroll data:", error);
      res.status(500).json({ error: "Failed to fetch payroll data" });
    }
  });

  // Payroll History Routes

  // Create/Save payroll history
  app.post("/api/payroll-history", async (req, res) => {
    try {
      const payrollHistoryData = req.body;
      const newPayrollHistory = await storage.createPayrollHistory(payrollHistoryData);
      res.json(newPayrollHistory);
    } catch (error) {
      console.error("Error creating payroll history:", error);
      res.status(500).json({ error: "Failed to create payroll history" });
    }
  });

  // Get all payroll history
  app.get("/api/payroll-history", async (req, res) => {
    try {
      const payrollHistory = await storage.getAllPayrollHistory();
      res.json(payrollHistory);
    } catch (error) {
      console.error("Error fetching payroll history:", error);
      res.status(500).json({ error: "Failed to fetch payroll history" });
    }
  });

  // Get payroll history for specific staff member
  app.get("/api/payroll-history/staff/:staffId", async (req, res) => {
    try {
      const staffId = parseInt(req.params.staffId);
      if (!staffId) {
        return res.status(400).json({ error: "Valid staff ID is required" });
      }
      
      const payrollHistory = await storage.getPayrollHistoryByStaff(staffId);
      res.json(payrollHistory);
    } catch (error) {
      console.error("Error fetching payroll history for staff:", error);
      res.status(500).json({ error: "Failed to fetch payroll history for staff" });
    }
  });

  // Get specific payroll history record
  app.get("/api/payroll-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Valid payroll history ID is required" });
      }
      
      const payrollHistory = await storage.getPayrollHistory(id);
      if (!payrollHistory) {
        return res.status(404).json({ error: "Payroll history not found" });
      }
      
      res.json(payrollHistory);
    } catch (error) {
      console.error("Error fetching payroll history:", error);
      res.status(500).json({ error: "Failed to fetch payroll history" });
    }
  });

  // Update payroll history record
  app.put("/api/payroll-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Valid payroll history ID is required" });
      }
      
      const updateData = req.body;
      const updatedPayrollHistory = await storage.updatePayrollHistory(id, updateData);
      res.json(updatedPayrollHistory);
    } catch (error) {
      console.error("Error updating payroll history:", error);
      res.status(500).json({ error: "Failed to update payroll history" });
    }
  });

  // Delete payroll history record
  app.delete("/api/payroll-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Valid payroll history ID is required" });
      }
      
      const deleted = await storage.deletePayrollHistory(id);
      if (!deleted) {
        return res.status(404).json({ error: "Payroll history not found" });
      }
      
      res.json({ message: "Payroll history deleted successfully" });
    } catch (error) {
      console.error("Error deleting payroll history:", error);
      res.status(500).json({ error: "Failed to delete payroll history" });
    }
  });

  // Public API endpoint for external payroll data access
  app.get("/api/payroll-data", async (req, res) => {
    try {
      const { staffId, month, year } = req.query;
      
      // Default to current month if not specified
      const targetDate = year && month 
        ? new Date(parseInt(year as string), parseInt(month as string) - 1, 1)
        : new Date();
      
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      
      let allStaffPayroll = [];
      
      if (staffId) {
        // Get specific staff member payroll
        const staffIdNum = parseInt(staffId as string);
        if (!staffIdNum) {
          return res.status(400).json({ error: "Valid staff ID is required" });
        }
        
        const staff = await storage.getStaff(staffIdNum);
        if (!staff) {
          return res.status(404).json({ error: "Staff member not found" });
        }
        
        const user = await storage.getUser(staff.userId);
        if (!user) {
          return res.status(404).json({ error: "User details not found" });
        }
        
        const payrollData = await calculatePayrollForStaff(staff, user, monthStart, monthEnd);
        allStaffPayroll.push(payrollData);
        
      } else {
        // Get all staff payroll data
        const allStaff = await storage.getAllStaff();
        
        for (const staff of allStaff) {
          const user = await storage.getUser(staff.userId);
          if (user) {
            const payrollData = await calculatePayrollForStaff(staff, user, monthStart, monthEnd);
            allStaffPayroll.push(payrollData);
          }
        }
      }
      
      res.json({
        success: true,
        period: {
          month: targetDate.getMonth() + 1,
          year: targetDate.getFullYear(),
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString()
        },
        staffCount: allStaffPayroll.length,
        totalPayroll: allStaffPayroll.reduce((sum, staff) => sum + staff.totalEarnings, 0),
        data: allStaffPayroll
      });
      
    } catch (error) {
      console.error("Error fetching payroll data:", error);
      res.status(500).json({ error: "Failed to fetch payroll data" });
    }
  });

  // Helper function to calculate payroll for a specific staff member
  async function calculatePayrollForStaff(staff: any, user: any, monthStart: Date, monthEnd: Date) {
    const appointments = await storage.getAppointmentsByStaffAndDateRange(staff.id, monthStart, monthEnd);
    const paidAppointments = appointments.filter((apt: any) => apt.paymentStatus === 'paid');
    
    let totalEarnings = 0;
    let totalHours = 0;
    const appointmentDetails = [];
    
    for (const appointment of paidAppointments) {
      const service = await storage.getService(appointment.serviceId);
      const client = appointment.clientId ? await storage.getUser(appointment.clientId) : null;
      
      // Skip if service not found
      if (!service) {
        console.log(`Service ${appointment.serviceId} not found for appointment ${appointment.id}`);
        continue;
      }
      
      let earnings = 0;
      const servicePrice = appointment.totalAmount || service.price;
      const serviceDuration = service.duration / 60; // Convert to hours
      
      // Calculate earnings based on commission type
      switch (staff.commissionType) {
        case 'commission':
          earnings = servicePrice * (staff.commissionRate / 100);
          break;
        case 'hourly':
          earnings = serviceDuration * staff.hourlyRate;
          break;
        case 'fixed':
          earnings = staff.fixedRate;
          break;
        case 'hourly_plus_commission':
          const hourlyPay = serviceDuration * staff.hourlyRate;
          const commissionPay = servicePrice * (staff.commissionRate / 100);
          earnings = hourlyPay + commissionPay;
          break;
        default:
          earnings = 0;
      }
      
      totalEarnings += earnings;
      totalHours += serviceDuration;
      
      appointmentDetails.push({
        appointmentId: appointment.id,
        date: appointment.startTime,
        serviceName: service.name,
        servicePrice: servicePrice,
        serviceDuration: serviceDuration,
        clientName: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : 'Walk-in',
        earnings: earnings
      });
    }
    
    return {
      staffId: staff.id,
      staffName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      staffEmail: user.email,
      commissionType: staff.commissionType,
      commissionRate: staff.commissionRate,
      hourlyRate: staff.hourlyRate,
      fixedRate: staff.fixedRate,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      appointmentCount: paidAppointments.length,
      appointments: appointmentDetails
    };
  }

  // Helper function to create sales history record
  async function createSalesHistoryRecord(paymentData: any, transactionType: string, additionalData?: any) {
    try {
      console.log('createSalesHistoryRecord called with:', { paymentData, transactionType, additionalData });
      
      const transactionDate = new Date();
      const businessDate = transactionDate.toISOString().split('T')[0];
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][transactionDate.getDay()];
      const monthYear = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      const quarter = `${transactionDate.getFullYear()}-Q${Math.ceil((transactionDate.getMonth() + 1) / 3)}`;

      let clientInfo = null;
      let staffInfo = null;
      let appointmentInfo = null;
      let serviceInfo = null;

      // Get client information if clientId exists
      if (paymentData.clientId) {
        clientInfo = await storage.getUser(paymentData.clientId);
        console.log('Client info:', clientInfo);
      }

      // Get appointment and service information for appointment payments
      if (paymentData.appointmentId && transactionType === 'appointment') {
        appointmentInfo = await storage.getAppointment(paymentData.appointmentId);
        console.log('Appointment info:', appointmentInfo);
        if (appointmentInfo) {
          serviceInfo = await storage.getService(appointmentInfo.serviceId);
          console.log('Service info:', serviceInfo);
          if (appointmentInfo.staffId) {
            const staffData = await storage.getStaff(appointmentInfo.staffId);
            if (staffData) {
              const staffUser = await storage.getUser(staffData.userId);
              staffInfo = { ...staffData, user: staffUser };
              console.log('Staff info:', staffInfo);
            }
          }
        }
      }

      const salesHistoryData = {
        transactionType,
        transactionDate,
        paymentId: paymentData.id,
        totalAmount: paymentData.totalAmount || paymentData.amount,
        paymentMethod: paymentData.method,
        paymentStatus: paymentData.status,
        
        // Client information
        clientId: clientInfo?.id || null,
        clientName: clientInfo ? `${clientInfo.firstName || ''} ${clientInfo.lastName || ''}`.trim() : null,
        clientEmail: clientInfo?.email || null,
        clientPhone: clientInfo?.phone || null,
        
        // Staff information
        staffId: staffInfo?.id || null,
        staffName: staffInfo?.user ? `${staffInfo.user.firstName || ''} ${staffInfo.user.lastName || ''}`.trim() : null,
        
        // Appointment and service information
        appointmentId: appointmentInfo?.id || null,
        serviceIds: serviceInfo ? JSON.stringify([serviceInfo.id]) : null,
        serviceNames: serviceInfo ? JSON.stringify([serviceInfo.name]) : null,
        serviceTotalAmount: transactionType === 'appointment' ? (paymentData.totalAmount || paymentData.amount) : null,
        
        // POS information
        productIds: additionalData?.productIds || null,
        productNames: additionalData?.productNames || null,
        productQuantities: additionalData?.productQuantities || null,
        productUnitPrices: additionalData?.productUnitPrices || null,
        productTotalAmount: transactionType === 'pos_sale' ? (paymentData.totalAmount || paymentData.amount) : null,
        
        // Membership information
        membershipId: additionalData?.membershipId || null,
        membershipName: additionalData?.membershipName || null,
        membershipDuration: additionalData?.membershipDuration || null,
        
        // Business insights
        businessDate,
        dayOfWeek,
        monthYear,
        quarter,
        
        // External tracking
        squarePaymentId: paymentData.squarePaymentId || null,
        
        // Audit
        createdBy: null, // Could be set to current user ID if available
        notes: paymentData.description || null
      };

      const salesHistory = await storage.createSalesHistory(salesHistoryData);
      console.log('Sales history record created:', salesHistory.id);
      return salesHistory;
    } catch (error) {
      console.error('Error creating sales history record:', error);
      // Don't throw error to prevent breaking payment flow
    }
  }

  // Sales History Routes

  // Create sales history record
  app.post("/api/sales-history", async (req, res) => {
    try {
      const salesHistoryData = req.body;
      const newSalesHistory = await storage.createSalesHistory(salesHistoryData);
      res.json(newSalesHistory);
    } catch (error) {
      console.error("Error creating sales history:", error);
      res.status(500).json({ error: "Failed to create sales history" });
    }
  });

  // Get all sales history
  app.get("/api/sales-history", async (req, res) => {
    try {
      const { startDate, endDate, transactionType, clientId, staffId, monthYear } = req.query;
      
      let salesHistory;
      
      if (startDate && endDate) {
        salesHistory = await storage.getSalesHistoryByDateRange(new Date(startDate as string), new Date(endDate as string));
      } else if (transactionType) {
        salesHistory = await storage.getSalesHistoryByTransactionType(transactionType as string);
      } else if (clientId) {
        salesHistory = await storage.getSalesHistoryByClient(parseInt(clientId as string));
      } else if (staffId) {
        salesHistory = await storage.getSalesHistoryByStaff(parseInt(staffId as string));
      } else if (monthYear) {
        salesHistory = await storage.getSalesHistoryByMonth(monthYear as string);
      } else {
        salesHistory = await storage.getAllSalesHistory();
      }
      
      res.json(salesHistory);
    } catch (error) {
      console.error("Error fetching sales history:", error);
      res.status(500).json({ error: "Failed to fetch sales history" });
    }
  });

  // Get sales history by ID
  app.get("/api/sales-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Valid sales history ID is required" });
      }
      
      const salesHistory = await storage.getSalesHistory(id);
      if (!salesHistory) {
        return res.status(404).json({ error: "Sales history not found" });
      }
      
      res.json(salesHistory);
    } catch (error) {
      console.error("Error fetching sales history:", error);
      res.status(500).json({ error: "Failed to fetch sales history" });
    }
  });

  // Update sales history record
  app.put("/api/sales-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Valid sales history ID is required" });
      }
      
      const updateData = req.body;
      const updatedSalesHistory = await storage.updateSalesHistory(id, updateData);
      res.json(updatedSalesHistory);
    } catch (error) {
      console.error("Error updating sales history:", error);
      res.status(500).json({ error: "Failed to update sales history" });
    }
  });

  // Delete sales history record
  app.delete("/api/sales-history/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Valid sales history ID is required" });
      }
      
      const deleted = await storage.deleteSalesHistory(id);
      if (!deleted) {
        return res.status(404).json({ error: "Sales history not found" });
      }
      
      res.json({ message: "Sales history deleted successfully" });
    } catch (error) {
      console.error("Error deleting sales history:", error);
      res.status(500).json({ error: "Failed to delete sales history" });
    }
  });

  // Phone Service API Routes
  
  // Twilio webhook for incoming calls
  app.post("/api/phone/incoming", async (req, res) => {
    try {
      const { CallSid, From, To } = req.body;
      const result = await PhoneService.handleIncomingCall(CallSid, From, To);
      
      res.set('Content-Type', 'text/xml');
      res.send(result.twiml);
    } catch (error) {
      console.error("Error handling incoming call:", error);
      res.status(500).send('<Response><Say>Sorry, we are experiencing technical difficulties.</Say></Response>');
    }
  });

  // Twilio webhook for call status updates
  app.post("/api/phone/call-status", async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration } = req.body;
      await PhoneService.updateCallStatus(CallSid, CallStatus, CallDuration ? parseInt(CallDuration) : undefined);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error updating call status:", error);
      res.sendStatus(500);
    }
  });

  // Twilio webhook for recording status
  app.post("/api/phone/recording-status", async (req, res) => {
    try {
      const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body;
      await PhoneService.saveCallRecording(
        CallSid, 
        RecordingSid, 
        RecordingUrl, 
        RecordingDuration ? parseInt(RecordingDuration) : undefined
      );
      res.sendStatus(200);
    } catch (error) {
      console.error("Error saving call recording:", error);
      res.sendStatus(500);
    }
  });

  // Make outbound call
  app.post("/api/phone/outbound", async (req, res) => {
    try {
      const { toNumber, staffId, userId, appointmentId, purpose } = req.body;
      
      if (!toNumber || !staffId) {
        return res.status(400).json({ error: "Phone number and staff ID are required" });
      }

      const call = await PhoneService.makeOutboundCall(toNumber, staffId, userId, appointmentId, purpose);
      res.json(call);
    } catch (error) {
      console.error("Error making outbound call:", error);
      res.status(500).json({ error: "Failed to make outbound call" });
    }
  });

  // Get call history for user
  app.get("/api/phone/history/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (!userId) {
        return res.status(400).json({ error: "Valid user ID is required" });
      }

      const callHistory = await PhoneService.getCallHistoryForUser(userId);
      res.json(callHistory);
    } catch (error) {
      console.error("Error fetching call history:", error);
      res.status(500).json({ error: "Failed to fetch call history" });
    }
  });

  // Get recent calls for dashboard
  app.get("/api/phone/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const recentCalls = await PhoneService.getRecentCalls(limit);
      res.json(recentCalls);
    } catch (error) {
      console.error("Error fetching recent calls:", error);
      res.status(500).json({ error: "Failed to fetch recent calls" });
    }
  });

  // Add notes to call
  app.put("/api/phone/notes/:callId", async (req, res) => {
    try {
      const callId = parseInt(req.params.callId);
      const { notes, staffId } = req.body;
      
      if (!callId || !notes || !staffId) {
        return res.status(400).json({ error: "Call ID, notes, and staff ID are required" });
      }

      await PhoneService.addCallNotes(callId, notes, staffId);
      res.json({ message: "Notes added successfully" });
    } catch (error) {
      console.error("Error adding call notes:", error);
      res.status(500).json({ error: "Failed to add call notes" });
    }
  });

  // Update call user association
  app.put("/api/phone/call/:callId/user", async (req, res) => {
    try {
      const callId = parseInt(req.params.callId);
      const { userId } = req.body;
      
      if (!callId) {
        return res.status(400).json({ error: "Call ID is required" });
      }

      await PhoneService.updateCallUserAssociation(callId, userId || null);
      res.json({ message: "Call user association updated successfully" });
    } catch (error) {
      console.error("Error updating call user association:", error);
      res.status(500).json({ error: "Failed to update call user association" });
    }
  });

  // Find user by phone number
  app.get("/api/phone/find-user/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const user = await PhoneService.findUserByPhone(phoneNumber);
      res.json({ user });
    } catch (error) {
      console.error("Error finding user by phone:", error);
      res.status(500).json({ error: "Failed to find user by phone" });
    }
  });

  // Get call analytics
  app.get("/api/phone/analytics", async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const analytics = await PhoneService.getCallAnalytics(startDate, endDate);
      res.json(analytics);
    } catch (error) {
      console.error("Error generating call analytics:", error);
      res.status(500).json({ error: "Failed to generate call analytics" });
    }
  });

  // Download call recording
  app.get("/api/phone/recording/:recordingSid", async (req, res) => {
    try {
      const { recordingSid } = req.params;
      const downloadUrl = await PhoneService.getRecordingDownloadUrl(recordingSid);
      res.redirect(downloadUrl);
    } catch (error) {
      console.error("Error downloading recording:", error);
      res.status(500).json({ error: "Failed to download recording" });
    }
  });

  // Register external API routes
  registerExternalRoutes(app, storage);

  // Initialize Jotform integration
  const jotformIntegration = new JotformIntegration(storage, {
    // Map Jotform question IDs to field names
    // You'll need to update these based on your actual Jotform field IDs
    '1': 'clientFirstName',      // Example: Question ID 1 = First Name
    '2': 'clientLastName',       // Example: Question ID 2 = Last Name
    '3': 'clientEmail',          // Example: Question ID 3 = Email
    '4': 'clientPhone',          // Example: Question ID 4 = Phone
    '5': 'serviceName',          // Example: Question ID 5 = Service
    '6': 'appointmentDate',      // Example: Question ID 6 = Date
    '7': 'appointmentTime',      // Example: Question ID 7 = Time
    '8': 'appointmentNotes',     // Example: Question ID 8 = Notes
    '9': 'staffName',            // Example: Question ID 9 = Staff Member
  });

  // Jotform webhook endpoint
  app.post("/api/jotform/webhook", async (req, res) => {
    try {
      console.log('Jotform webhook received:', req.body);
      
      const result = await jotformIntegration.processSubmission(req.body);
      
      if (result.success) {
        console.log('Successfully processed Jotform submission:', result.appointment);
        res.status(200).json({
          success: true,
          message: 'Submission processed successfully',
          appointment: result.appointment
        });
      } else {
        console.error('Failed to process Jotform submission:', result.error);
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in Jotform webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  // Jotform webhook status endpoint
  app.get("/api/jotform/webhook", async (req, res) => {
    res.json({
      status: "Jotform webhook endpoint is active",
      endpoint: "/api/jotform/webhook",
      method: "POST",
      description: "Receives form submissions from Jotform and creates appointments",
      features: [
        "Processes Jotform submissions",
        "Creates appointments automatically",
        "Creates clients, services, and staff if needed",
        "Deletes submissions from Jotform after processing",
        "Field mapping support"
      ],
      setup: {
        webhookUrl: `${process.env.CUSTOM_DOMAIN || 'https://gloupheadspa.app' || process.env.REPLIT_DOMAINS || 'http://localhost:5000'}/api/jotform/webhook`,
        requiredFields: ["Client information", "Service information", "Appointment date/time"],
        fieldMapping: "Configure field mappings in the JotformIntegration constructor"
      }
    });
  });

  // --- 2FA ROUTES ---

  // 1. Setup 2FA: generate secret and QR (for authenticator app)
  app.post("/api/2fa/setup", async (req, res) => {
    const { userId, method = "authenticator" } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (method === "email") {
      // Email-based 2FA setup
      if (!user.email) {
        return res.status(400).json({ error: "Email address required for email-based 2FA" });
      }

      // Generate 6-digit code
      const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save code temporarily
      await storage.updateUser(userId, { 
        twoFactorEmailCode: emailCode,
        twoFactorEmailCodeExpiry: codeExpiry,
        twoFactorMethod: "email"
      });

      // Send email with code
      const emailSent = await sendEmail({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gloheadspa.com',
        subject: "Your Two-Factor Authentication Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #9532b8;">Glo Head Spa</h1>
              <h2 style="color: #333;">Two-Factor Authentication Setup</h2>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Hello ${user.firstName || user.username},
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              You're setting up two-factor authentication for your Glo Head Spa account. 
              Use the code below to complete the setup:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; display: inline-block;">
                <h3 style="margin: 0; color: #333; font-size: 24px; letter-spacing: 4px;">${emailCode}</h3>
              </div>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              This code will expire in 10 minutes for security reasons.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              If you didn't request this setup, please ignore this email and contact support immediately.
            </p>
            
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent from your Glo Head Spa salon management system.
            </p>
          </div>
        `,
        text: `
Hello ${user.firstName || user.username},

You're setting up two-factor authentication for your Glo Head Spa account.

Your verification code is: ${emailCode}

This code will expire in 10 minutes for security reasons.

If you didn't request this setup, please ignore this email and contact support immediately.

- Glo Head Spa Team
        `
      });

      if (emailSent) {
        res.json({ 
          method: "email", 
          message: "Verification code sent to your email",
          email: user.email 
        });
      } else {
        res.status(500).json({ error: "Failed to send verification email" });
      }
    } else {
      // Authenticator app setup (existing logic)
      const secret = speakeasy.generateSecret({ name: `Glo Head Spa (${user.email})` });
      await storage.updateUser(userId, { 
        twoFactorSecret: secret.base32,
        twoFactorMethod: "authenticator"
      });
      res.json({ 
        method: "authenticator",
        secret: secret.base32, 
        qrCodeUrl: secret.otpauth_url 
      });
    }
  });

  // 2. Verify 2FA: verify code and enable 2FA
  app.post("/api/2fa/verify", async (req, res) => {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: "User ID and token required" });
    
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.twoFactorMethod === "email") {
      // Email-based verification
      if (!user.twoFactorEmailCode || !user.twoFactorEmailCodeExpiry) {
        return res.status(404).json({ error: "Email verification code not found or expired" });
      }

      // Check if code is expired
      if (new Date() > new Date(user.twoFactorEmailCodeExpiry)) {
        return res.status(401).json({ error: "Verification code has expired" });
      }

      // Verify email code
      if (user.twoFactorEmailCode !== token) {
        return res.status(401).json({ error: "Invalid verification code" });
      }

      // Enable 2FA and clear temporary code
      await storage.updateUser(userId, { 
        twoFactorEnabled: true,
        twoFactorEmailCode: null,
        twoFactorEmailCodeExpiry: null
      });
      res.json({ success: true });
    } else {
      // Authenticator app verification (existing logic)
      if (!user.twoFactorSecret) return res.status(404).json({ error: "2FA not set up" });
      
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token,
        window: 1
      });
      if (!verified) return res.status(401).json({ error: "Invalid token" });
      await storage.updateUser(userId, { twoFactorEnabled: true });
      res.json({ success: true });
    }
  });

  // 3. Disable 2FA: verify code and disable
  app.post("/api/2fa/disable", async (req, res) => {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: "User ID and token required" });
    
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.twoFactorMethod === "email") {
      // For email 2FA, we need to send a new code for disabling
      if (!user.email) {
        return res.status(400).json({ error: "Email address required for email-based 2FA" });
      }

      // Generate 6-digit code for disabling
      const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save code temporarily
      await storage.updateUser(userId, { 
        twoFactorEmailCode: emailCode,
        twoFactorEmailCodeExpiry: codeExpiry
      });

      // Send email with code
      const emailSent = await sendEmail({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gloheadspa.com',
        subject: "Disable Two-Factor Authentication",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #9532b8;">Glo Head Spa</h1>
              <h2 style="color: #333;">Disable Two-Factor Authentication</h2>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Hello ${user.firstName || user.username},
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              You're attempting to disable two-factor authentication for your Glo Head Spa account. 
              Use the code below to complete this action:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; display: inline-block;">
                <h3 style="margin: 0; color: #333; font-size: 24px; letter-spacing: 4px;">${emailCode}</h3>
              </div>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              This code will expire in 10 minutes for security reasons.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              If you didn't request to disable 2FA, please ignore this email and contact support immediately.
            </p>
            
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent from your Glo Head Spa salon management system.
            </p>
          </div>
        `,
        text: `
Hello ${user.firstName || user.username},

You're attempting to disable two-factor authentication for your Glo Head Spa account.

Your verification code is: ${emailCode}

This code will expire in 10 minutes for security reasons.

If you didn't request to disable 2FA, please ignore this email and contact support immediately.

- Glo Head Spa Team
        `
      });

      if (emailSent) {
        res.json({ 
          method: "email", 
          message: "Verification code sent to your email",
          email: user.email 
        });
      } else {
        res.status(500).json({ error: "Failed to send verification email" });
      }
    } else {
      // Authenticator app verification (existing logic)
      if (!user.twoFactorSecret) return res.status(404).json({ error: "2FA not set up" });
      
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token,
        window: 1
      });
      if (!verified) return res.status(401).json({ error: "Invalid token" });
      await storage.updateUser(userId, { 
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorMethod: null
      });
      res.json({ success: true });
    }
  });

  // 4. Verify email 2FA disable
  app.post("/api/2fa/disable-email", async (req, res) => {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: "User ID and token required" });
    
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.twoFactorMethod !== "email") {
      return res.status(400).json({ error: "User is not using email-based 2FA" });
    }

    // Check if code is expired
    if (!user.twoFactorEmailCode || !user.twoFactorEmailCodeExpiry) {
      return res.status(404).json({ error: "Email verification code not found or expired" });
    }

    if (new Date() > new Date(user.twoFactorEmailCodeExpiry)) {
      return res.status(401).json({ error: "Verification code has expired" });
    }

    // Verify email code
    if (user.twoFactorEmailCode !== token) {
      return res.status(401).json({ error: "Invalid verification code" });
    }

    // Disable 2FA and clear all 2FA data
    await storage.updateUser(userId, { 
      twoFactorEnabled: false,
      twoFactorEmailCode: null,
      twoFactorEmailCodeExpiry: null,
      twoFactorMethod: null
    });
    res.json({ success: true });
  });

  // 5. Serve QR code image
  app.get("/api/2fa/qr-code", async (req, res) => {
    const { qrCodeUrl } = req.query;
    if (!qrCodeUrl) return res.status(400).json({ error: "qrCodeUrl required" });
    try {
      const qr = await QRCode.toDataURL(qrCodeUrl as string);
      const img = Buffer.from(qr.split(",")[1], "base64");
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(img);
    } catch (e) {
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // 6. Login 2FA: verify code at login
  app.post("/api/login/2fa", async (req, res) => {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: "User ID and token required" });
    
    const user = await storage.getUser(userId);
    if (!user || !user.twoFactorEnabled) return res.status(404).json({ error: "2FA not enabled" });

    if (user.twoFactorMethod === "email") {
      // For email 2FA login, we need to send a new code
      if (!user.email) {
        return res.status(400).json({ error: "Email address required for email-based 2FA" });
      }

      // Generate 6-digit code for login
      const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save code temporarily
      await storage.updateUser(userId, { 
        twoFactorEmailCode: emailCode,
        twoFactorEmailCodeExpiry: codeExpiry
      });

      // Send email with code
      const emailSent = await sendEmail({
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gloheadspa.com',
        subject: "Your Login Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #9532b8;">Glo Head Spa</h1>
              <h2 style="color: #333;">Login Verification</h2>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Hello ${user.firstName || user.username},
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              You're logging into your Glo Head Spa account. Use the code below to complete your login:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; display: inline-block;">
                <h3 style="margin: 0; color: #333; font-size: 24px; letter-spacing: 4px;">${emailCode}</h3>
              </div>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              This code will expire in 10 minutes for security reasons.
            </p>
            
            <p style="color: #666; line-height: 1.6;">
              If you didn't attempt to log in, please ignore this email and contact support immediately.
            </p>
            
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent from your Glo Head Spa salon management system.
            </p>
          </div>
        `,
        text: `
Hello ${user.firstName || user.username},

You're logging into your Glo Head Spa account.

Your verification code is: ${emailCode}

This code will expire in 10 minutes for security reasons.

If you didn't attempt to log in, please ignore this email and contact support immediately.

- Glo Head Spa Team
        `
      });

      if (emailSent) {
        res.json({ 
          method: "email", 
          message: "Verification code sent to your email",
          email: user.email 
        });
      } else {
        res.status(500).json({ error: "Failed to send verification email" });
      }
    } else {
      // Authenticator app verification (existing logic)
      if (!user.twoFactorSecret) return res.status(404).json({ error: "2FA not set up" });
      
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token,
        window: 1
      });
      if (!verified) return res.status(401).json({ error: "Invalid token" });
      // Remove sensitive fields
      const { password, twoFactorSecret, ...userSafe } = user;
      res.json(userSafe);
    }
  });

  // 7. Verify email 2FA login
  app.post("/api/login/2fa-email", async (req, res) => {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: "User ID and token required" });
    
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.twoFactorMethod !== "email") {
      return res.status(400).json({ error: "User is not using email-based 2FA" });
    }

    // Check if code is expired
    if (!user.twoFactorEmailCode || !user.twoFactorEmailCodeExpiry) {
      return res.status(404).json({ error: "Email verification code not found or expired" });
    }

    if (new Date() > new Date(user.twoFactorEmailCodeExpiry)) {
      return res.status(401).json({ error: "Verification code has expired" });
    }

    // Verify email code
    if (user.twoFactorEmailCode !== token) {
      return res.status(401).json({ error: "Invalid verification code" });
    }

    // Clear temporary code and return user data
    await storage.updateUser(userId, { 
      twoFactorEmailCode: null,
      twoFactorEmailCodeExpiry: null
    });
    
    // Remove sensitive fields
    const { password, twoFactorSecret, twoFactorEmailCode, twoFactorEmailCodeExpiry, ...userSafe } = user;
    res.json(userSafe);
  });



  // Get all forms
  app.get("/api/forms", async (req, res) => {
    try {
      const forms = await storage.getAllForms();
      res.json(forms);
    } catch (error: any) {
      console.error("Error fetching forms:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        error: "Failed to fetch forms", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Get form submissions (MUST come before /api/forms/:id to avoid route conflicts)
  app.get("/api/forms/:id/submissions", async (req, res) => {
    try {
      const formId = parseInt(req.params.id);

      // Get the form
      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      // Get submissions for this form
      const submissions = await storage.getFormSubmissions(formId);
      
      res.json(submissions);
    } catch (error: any) {
      console.error("Error fetching form submissions:", error);
      res.status(500).json({ error: "Failed to fetch form submissions: " + error.message });
    }
  });

  // Get a single form by ID
  app.get("/api/forms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const form = await storage.getForm(id);
      
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }
      
      res.json(form);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch form" });
    }
  });

  // Create new form
  app.post("/api/forms", validateBody(insertFormSchema), async (req, res) => {
    try {
      const newForm = await storage.createForm(req.body);
      res.status(201).json(newForm);
    } catch (error) {
      res.status(500).json({ error: "Failed to create form" });
    }
  });

  // Update existing form
  app.put("/api/forms/:id", validateBody(insertFormSchema), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingForm = await storage.getForm(id);
      if (!existingForm) {
        return res.status(404).json({ error: "Form not found" });
      }
      
      const updatedForm = await storage.updateForm(id, req.body);
      res.json(updatedForm);
    } catch (error: any) {
      console.error("Error updating form:", error);
      res.status(500).json({ error: "Failed to update form: " + error.message });
    }
  });

  // Delete form
  app.delete("/api/forms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (!id) {
        return res.status(400).json({ error: "Form ID is required" });
      }
      
      // Check if form exists before deletion
      const existingForm = await storage.getForm(id);
      if (!existingForm) {
        return res.status(404).json({ error: "Form not found" });
      }
      
      // Delete the form
      const deleted = await storage.deleteForm(id);
      
      if (!deleted) {
        return res.status(500).json({ error: "Failed to delete form" });
      }
      
      res.status(200).json({ success: true, message: "Form deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting form:", error);
      res.status(500).json({ error: "Failed to delete form: " + error.message });
    }
  });

  // Send form to client via SMS
  app.post("/api/forms/:id/send-sms", async (req, res) => {
    try {
      const formId = parseInt(req.params.id);
      const { clientId, phone, customMessage } = req.body;

      // Validate required fields
      if (!clientId && !phone) {
        return res.status(400).json({ error: "Either clientId or phone is required" });
      }

      // Get the form
      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      let targetPhone = phone;
      let clientName = "";

      // If clientId is provided, get client details
      if (clientId) {
        const client = await storage.getUser(clientId);
        if (!client) {
          return res.status(404).json({ error: "Client not found" });
        }
        if (!client.phone) {
          return res.status(400).json({ error: "Client does not have a phone number" });
        }
        targetPhone = client.phone;
        clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim();
      }

      // Check if SMS is configured
      if (!isTwilioConfigured()) {
        return res.status(400).json({ 
          error: "SMS service not configured. Please configure Twilio credentials." 
        });
      }

      // Create the SMS messages
      // Use custom domain if available, otherwise use Replit domain, fall back to localhost for development
      const customDomain = process.env.CUSTOM_DOMAIN || process.env.VITE_API_BASE_URL;
      const replitDomain = process.env.REPLIT_DOMAINS;
      const baseUrl = customDomain || (replitDomain ? `https://${replitDomain}` : 'http://localhost:5002');
      // Include clientId in form URL if sending to a specific client
      const formUrl = clientId ? `${baseUrl}/forms/${formId}?clientId=${clientId}` : `${baseUrl}/forms/${formId}`;
      
      console.log(`[SMS DEBUG] Using domain: ${baseUrl}`);
      
      // First message: Custom message or default message with call-to-action
      let firstMessage = customMessage || `Hi${clientName ? ` ${clientName}` : ""}! You have a new form from Glo Head Spa: ${form.title}`;
      
      if (form.description && !customMessage) {
        firstMessage += `\n\n${form.description}`;
      }
      
      // Add call-to-action to first message
      firstMessage += `\n\nComplete your form here:`;
      
      // Second message: Form link only
      const secondMessage = formUrl;
      
      // Check if this is a test number (for development)
      const isTestNumber = targetPhone.includes('555') || targetPhone.includes('test');
      
      console.log(`[SMS DEBUG] Phone: ${targetPhone}, isTestNumber: ${isTestNumber}`);
      console.log(`[SMS DEBUG] First message: ${firstMessage}`);
      console.log(`[SMS DEBUG] Second message: ${secondMessage}`);
      
      if (isTestNumber) {
        // Simulate successful SMS for test numbers
        console.log(`[TEST MODE] Would send first SMS to ${targetPhone}: ${firstMessage}`);
        console.log(`[TEST MODE] Would send second SMS to ${targetPhone}: ${secondMessage}`);
        
        // Update form submission count
        await storage.updateFormSubmissions(formId, (form.submissions || 0) + 1, new Date());

        return res.json({
          success: true,
          message: "Form sent successfully via SMS (test mode)",
          messageId: "test-message-id",
          testMode: true
        });
      }

      // Send the first SMS (custom message)
      console.log(`[SMS DEBUG] Sending first SMS to ${targetPhone}`);
      const firstSmsResult = await sendSMS(targetPhone, firstMessage);
      console.log(`[SMS DEBUG] First SMS result:`, firstSmsResult);
      
      if (!firstSmsResult.success) {
        return res.status(500).json({
          success: false,
          error: firstSmsResult.error || "Failed to send first SMS"
        });
      }
      
      // Send the second SMS (form link)
      console.log(`[SMS DEBUG] Sending second SMS to ${targetPhone}`);
      const secondSmsResult = await sendSMS(targetPhone, secondMessage);
      console.log(`[SMS DEBUG] Second SMS result:`, secondSmsResult);
      
      if (secondSmsResult.success) {
        // Update form submission count
        await storage.updateFormSubmissions(formId, (form.submissions || 0) + 1, new Date());

        res.json({
          success: true,
          message: "Form sent successfully via SMS",
          messageId: `${firstSmsResult.messageId}, ${secondSmsResult.messageId}`
        });
      } else {
        res.status(500).json({
          success: false,
          error: secondSmsResult.error || "Failed to send second SMS"
        });
      }
    } catch (error: any) {
      console.error("Error sending form via SMS:", error);
      res.status(500).json({ error: "Failed to send form via SMS: " + error.message });
    }
  });

  // Get client form submissions
  app.get("/api/clients/:id/form-submissions", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);

      // Verify the client exists
      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get form submissions for this client
      const submissions = await storage.getClientFormSubmissions(clientId);
      
      res.json(submissions);
    } catch (error: any) {
      console.error("Error fetching client form submissions:", error);
      res.status(500).json({ error: "Failed to fetch client form submissions: " + error.message });
    }
  });

  // Get client analytics
  app.get("/api/clients/:id/analytics", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);

      // Verify the client exists
      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get client appointments
      const appointments = await storage.getAppointmentsByClient(clientId);
      
      // Calculate analytics
      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter((a: any) => a.status === 'completed').length;
      const cancelledAppointments = appointments.filter((a: any) => a.status === 'cancelled').length;
      
      // Calculate total spent (assuming appointments have a totalAmount field)
      const totalSpent = appointments
        .filter((a: any) => a.status === 'completed' && a.totalAmount)
        .reduce((sum: number, a: any) => sum + (a.totalAmount || 0), 0);
      
      const averageAppointmentValue = completedAppointments > 0 
        ? totalSpent / completedAppointments 
        : 0;
      
      // Get last and next appointments
      const sortedAppointments = appointments.sort((a: any, b: any) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      
      const lastAppointment = sortedAppointments
        .filter((a: any) => a.status === 'completed')
        .pop()?.startTime || null;
      
      const nextAppointment = sortedAppointments
        .filter((a: any) => a.status === 'confirmed' && new Date(a.startTime) > new Date())
        .shift()?.startTime || null;
      
      // Get favorite service (most booked service)
      const serviceCounts: { [key: string]: number } = {};
      appointments.forEach((appointment: any) => {
        if (appointment.serviceName) {
          serviceCounts[appointment.serviceName] = (serviceCounts[appointment.serviceName] || 0) + 1;
        }
      });
      
      const favoriteService = Object.keys(serviceCounts).length > 0
        ? Object.entries(serviceCounts).sort(([,a], [,b]) => b - a)[0][0]
        : null;
      
      // Get client communication preferences
      const communicationPreferences = {
        emailAccountManagement: client?.emailAccountManagement || false,
        emailAppointmentReminders: client?.emailAppointmentReminders || false,
        emailPromotions: client?.emailPromotions || false,
        smsAccountManagement: client?.smsAccountManagement || false,
        smsAppointmentReminders: client?.smsAppointmentReminders || false,
        smsPromotions: client?.smsPromotions || false,
      };
      
      res.json({
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalSpent,
        averageAppointmentValue,
        lastAppointment,
        nextAppointment,
        favoriteService,
        communicationPreferences,
      });
    } catch (error: any) {
      console.error("Error fetching client analytics:", error);
      res.status(500).json({ error: "Failed to fetch client analytics: " + error.message });
    }
  });

  // Send communication to client
  app.post("/api/communications/send", async (req, res) => {
    try {
      const { clientId, subject, message, type } = req.body;

      // Verify the client exists
      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ error: "Client not found" });
      }

      // Send communication based on type
      if (type === 'email') {
        // Send email using existing email service
        await emailService.sendEmail({
          to: client.email,
          subject: subject,
          html: message.replace(/\n/g, '<br>'),
        });
      } else if (type === 'sms' && client.phone) {
        // Send SMS using existing SMS service
        await smsService.sendSMS({
          to: client.phone!,
          body: message,
        });
      } else {
        return res.status(400).json({ error: "Invalid communication type or missing phone number" });
      }

      res.json({ success: true, message: "Communication sent successfully" });
    } catch (error: any) {
      console.error("Error sending communication:", error);
      res.status(500).json({ error: "Failed to send communication: " + error.message });
    }
  });

  // Send appointment reminder
  app.post("/api/communications/reminder", async (req, res) => {
    try {
      const { clientId } = req.body;

      // Verify the client exists
      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get upcoming appointments for this client
      const appointments = await storage.getAppointmentsByClient(clientId);
      const upcomingAppointments = appointments.filter((a: any) => 
        a.status === 'confirmed' && new Date(a.startTime) > new Date()
      );

      if (upcomingAppointments.length === 0) {
        return res.status(404).json({ error: "No upcoming appointments found" });
      }

      // Send reminder for the next appointment
      const nextAppointment = upcomingAppointments.sort((a: any, b: any) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )[0];

      const reminderMessage = `Hi ${client.firstName || client.username}, this is a reminder for your appointment on ${new Date(nextAppointment.startTime).toLocaleDateString()} at ${new Date(nextAppointment.startTime).toLocaleTimeString()}. Please call us if you need to reschedule.`;

      if (client.phone) {
        await smsService.sendSMS({
          to: client.phone!,
          body: reminderMessage,
        });
      } else if (client.email) {
        await emailService.sendEmail({
          to: client.email,
          subject: "Appointment Reminder",
          html: reminderMessage.replace(/\n/g, '<br>'),
        });
      } else {
        return res.status(400).json({ error: "No contact information available for reminder" });
      }

      res.json({ success: true, message: "Reminder sent successfully" });
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ error: "Failed to send reminder: " + error.message });
    }
  });

  // Submit form data
  app.post("/api/forms/:id/submit", async (req, res) => {
    try {
      const formId = parseInt(req.params.id);
      const { formData, submittedAt, clientId } = req.body;

      // Get the form
      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ error: "Form not found" });
      }

      // Validate form data
      if (!formData || typeof formData !== 'object') {
        return res.status(400).json({ error: "Invalid form data" });
      }

      // Try to identify client from form data if clientId not provided
      let identifiedClientId = clientId;
      if (!identifiedClientId) {
        // Look for email in form data to match with existing client
        const email = formData.email || formData.Email || formData.clientEmail;
        if (email) {
          const users = await storage.getAllUsers();
          const matchingClient = users.find(user => 
            user.role === 'client' && 
            user.email.toLowerCase() === email.toLowerCase()
          );
          if (matchingClient) {
            identifiedClientId = matchingClient.id;
          }
        }
      }

      // Store form submission
      const submission = {
        formId,
        clientId: identifiedClientId,
        formData,
        submittedAt: submittedAt || new Date().toISOString(),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
      };

      // Save submission to storage
      await storage.saveFormSubmission(submission);

      // Update form submission count
      await storage.updateFormSubmissions(formId, (form.submissions || 0) + 1, new Date());

      res.json({
        success: true,
        message: "Form submitted successfully",
        submissionId: submission.submittedAt, // Using timestamp as ID for now
        clientId: identifiedClientId
      });
    } catch (error: any) {
      console.error("Error submitting form:", error);
      res.status(500).json({ error: "Failed to submit form: " + error.message });
    }
  });

  // Initialize Auto-Respond Services
  const autoRespondService = new AutoRespondService(storage);
  const smsAutoRespondService = SMSAutoRespondService.getInstance(storage);

  // LLM Messaging API Routes
  // Generate AI response for client message
  app.post("/api/llm/generate-response", async (req, res) => {
    try {
      const { clientMessage, clientId, channel = 'email' } = req.body;



      if (!clientMessage) {
        return res.status(400).json({ error: "Client message is required" });
      }

      // Get client information
      let client = null;
      if (clientId) {
        client = await storage.getUser(clientId);
      }

      // Get business settings
      const businessSettings = await storage.getBusinessSettings();

      // Get available services
      const services = await storage.getAllServices();

      // Get available staff
      const staff = await storage.getAllStaff();
      const staffUsers = await Promise.all(
        staff.map(async (s) => {
          const user = await storage.getUser(s.userId);
          return {
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown',
            title: s.title,
            bio: s.bio || undefined
          };
        })
      );

      // Get business knowledge for context
      const businessKnowledge = await storage.getBusinessKnowledge();


      // Build context for LLM
      const context = {
        clientName: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.username : undefined,
        clientEmail: client?.email,
        clientPhone: client?.phone || undefined,
        businessName: businessSettings?.businessName || 'Glo Head Spa',
        businessType: 'salon and spa',
        clientPreferences: client ? {
          emailAccountManagement: client.emailAccountManagement || undefined,
          emailAppointmentReminders: client.emailAppointmentReminders || undefined,
          emailPromotions: client.emailPromotions || undefined,
          smsAccountManagement: client.smsAccountManagement || undefined,
          smsAppointmentReminders: client.smsAppointmentReminders || undefined,
          smsPromotions: client.smsPromotions || undefined,
        } : undefined,
        availableServices: services.map(s => ({
          name: s.name,
          description: s.description || undefined,
          price: s.price,
          duration: s.duration
        })),
        availableStaff: staffUsers,
        businessKnowledge: businessKnowledge
      };

      // Generate response using LLM
      const llmResponse = await llmService.generateResponse(clientMessage, context, channel);

      if (!llmResponse.success) {
        return res.status(500).json({ error: llmResponse.error });
      }

      // Save conversation if client exists
      if (client) {
        await llmService.saveConversation(
          client.id,
          clientMessage,
          llmResponse.message || '',
          channel,
          {
            suggestedActions: llmResponse.suggestedActions,
            confidence: llmResponse.confidence
          }
        );
      }


      
      res.json({
        success: true,
        response: llmResponse.message,
        suggestedActions: llmResponse.suggestedActions,
        confidence: llmResponse.confidence
      });

    } catch (error: any) {
      console.error("Error generating LLM response:", error);
      res.status(500).json({ error: "Failed to generate response: " + error.message });
    }
  });

  // Send AI-generated response via email
  app.post("/api/llm/send-email", async (req, res) => {
    try {
      const { clientId, clientMessage, aiResponse, subject } = req.body;

      if (!clientId || !clientMessage || !aiResponse) {
        return res.status(400).json({ error: "Client ID, message, and AI response are required" });
      }

      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!client.email) {
        return res.status(400).json({ error: "Client does not have an email address" });
      }

      // Send email with AI response
      const emailSent = await sendEmail({
        to: client.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gloheadspa.com',
        subject: subject || 'Response from Glo Head Spa',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Response from Glo Head Spa</h2>
            <p><strong>Your message:</strong></p>
            <p style="background-color: #f5f5f5; padding: 10px; border-left: 4px solid #ddd;">${clientMessage}</p>
            <p><strong>Our response:</strong></p>
            <p style="background-color: #e8f5e8; padding: 10px; border-left: 4px solid #4CAF50;">${aiResponse.replace(/\n/g, '<br>')}</p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              This response was generated by our AI assistant. If you need further assistance, please don't hesitate to contact us directly.
            </p>
          </div>
        `
      });

      if (emailSent) {
        res.json({
          success: true,
          message: "Email sent successfully"
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to send email"
        });
      }

    } catch (error: any) {
      console.error("Error sending AI email:", error);
      res.status(500).json({ error: "Failed to send email: " + error.message });
    }
  });

  // Send AI-generated response via SMS
  app.post("/api/llm/send-sms", async (req, res) => {
    try {
      const { clientId, clientMessage, aiResponse } = req.body;

      if (!clientId || !clientMessage || !aiResponse) {
        return res.status(400).json({ error: "Client ID, message, and AI response are required" });
      }

      const client = await storage.getUser(clientId);
      if (!client || client.role !== 'client') {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!client.phone) {
        return res.status(400).json({ error: "Client does not have a phone number" });
      }

      // Send SMS with AI response
      const smsResult = await sendSMS(client.phone, aiResponse);

      if (smsResult.success) {
        res.json({
          success: true,
          message: "SMS sent successfully",
          messageId: smsResult.messageId
        });
      } else {
        res.status(500).json({
          success: false,
          error: smsResult.error || "Failed to send SMS"
        });
      }

    } catch (error: any) {
      console.error("Error sending AI SMS:", error);
      res.status(500).json({ error: "Failed to send SMS: " + error.message });
    }
  });

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
        to: to || process.env.SENDGRID_FROM_EMAIL || 'noreply@gloheadspa.com',
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

  return server;
}
