import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { z } from "zod";
import { insertUserSchema } from "../../shared/schema.js";
import { sendSMS, isTwilioConfigured } from "../sms.js";
import { sendEmail } from "../email.js";
import bcrypt from 'bcrypt';
import { 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  NotFoundError,
  asyncHandler 
} from "../utils/errors.js";
import LoggerService, { getLogContext } from "../utils/logger.js";
import { validateRequest, requireRole } from "../middleware/error-handler.js";
import { 
  generateToken, 
  authRateLimiter, 
  validateInput,
  sanitizeInputString,
  escapeHtml 
} from "../middleware/security.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

// Input validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const passwordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export function registerAuthRoutes(app: Express, storage: IStorage) {
  
  // Login endpoint with rate limiting
  app.post("/api/login", 
    authRateLimiter,
    validateInput(loginSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { username, password } = req.body;
      const context = getLogContext(req);

      // Sanitize inputs
      const sanitizedUsername = sanitizeInputString(username);
      const sanitizedPassword = password; // Don't sanitize password

      if (!sanitizedUsername || !sanitizedPassword) {
        throw new ValidationError("Username and password are required");
      }

      const user = await storage.getUserByUsername(sanitizedUsername);
      if (!user) {
        LoggerService.warn("Login attempt with invalid username", { 
          ...context, 
          username: sanitizedUsername,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
        throw new AuthenticationError("Invalid credentials");
      }

      // Support legacy plaintext passwords by auto-migrating to bcrypt on successful match
      let isValidPassword = false;
      const storedPassword = user.password || '';
      const isBcryptHash = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$');

      if (isBcryptHash) {
        isValidPassword = await bcrypt.compare(sanitizedPassword, storedPassword);
      } else {
        // Plaintext fallback
        if (sanitizedPassword === storedPassword) {
          isValidPassword = true;
          // Best-effort migrate plaintext password to bcrypt
          try {
            const hashed = await bcrypt.hash(sanitizedPassword, 10);
            await storage.updateUser(user.id, { password: hashed });
            LoggerService.logAuthentication("password_migrated", user.id, context);
          } catch (migrateErr) {
            LoggerService.warn("Password auto-migration failed (continuing login)", {
              ...context,
              userId: user.id,
              error: (migrateErr as any)?.message || String(migrateErr)
            });
          }
        }
      }

      if (!isValidPassword) {
        LoggerService.warn("Login attempt with invalid password", { 
          ...context, 
          username: sanitizedUsername, 
          userId: user.id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
        throw new AuthenticationError("Invalid credentials");
      }

      // For staff users, fetch their staff ID
      let staffId = null;
      if (user.role === 'staff' || user.role === 'admin') {
        const staffMember = await storage.getStaffByUserId(user.id);
        if (staffMember) {
          staffId = staffMember.id;
        }
      }

      // Generate JWT token with staff ID
      const token = generateToken({ ...user, staffId });

      LoggerService.logAuthentication("login", user.id, context);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          staffId,
        },
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      });
    })
  );

  // Register endpoint with enhanced validation
  app.post("/api/register", 
    validateInput(registerSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { username, email, password, firstName, lastName } = req.body;
      const context = getLogContext(req);

      // Sanitize inputs
      const sanitizedData = {
        username: sanitizeInputString(username),
        email: sanitizeInputString(email),
        firstName: escapeHtml(firstName),
        lastName: escapeHtml(lastName),
        password, // Don't sanitize password
      };

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(sanitizedData.username);
      if (existingUser) {
        throw new ConflictError("Username already exists");
      }

      const existingEmail = await storage.getUserByEmail(sanitizedData.email);
      if (existingEmail) {
        throw new ConflictError("Email already exists");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(sanitizedData.password, 10);

      // Create user
      const newUser = await storage.createUser({
        username: sanitizedData.username,
        email: sanitizedData.email,
        password: hashedPassword,
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        role: "client",
        emailPromotions: true,
        smsAccountManagement: true,
        smsAppointmentReminders: true,
        smsPromotions: true,
      });

      // Generate JWT token
      const token = generateToken(newUser);

      LoggerService.logAuthentication("register", newUser.id, context);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      });
    })
  );

  // Register staff endpoint (admin and staff only)
  app.post("/api/register/staff", 
    authenticateToken,
    requireRole(['admin', 'staff']),
    validateInput(registerSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { username, email, password, firstName, lastName } = req.body;
      const context = getLogContext(req);

      // Sanitize inputs
      const sanitizedData = {
        username: sanitizeInputString(username),
        email: sanitizeInputString(email),
        firstName: escapeHtml(firstName),
        lastName: escapeHtml(lastName),
        password, // Don't sanitize password
      };

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(sanitizedData.username);
      if (existingUser) {
        throw new ConflictError("Username already exists");
      }

      // For staff registration, allow existing email addresses since staff can also be clients
      // Only check if the email is already associated with a staff account
      const existingEmail = await storage.getUserByEmail(sanitizedData.email);
      console.log('🔍 Staff registration debug:');
      console.log('- Email being checked:', sanitizedData.email);
      console.log('- Existing email found:', !!existingEmail);
      if (existingEmail) {
        console.log('- Existing user role:', existingEmail.role);
        console.log('- Existing user ID:', existingEmail.id);
      }
      
      if (existingEmail && existingEmail.role === "staff") {
        console.log('❌ Blocking: Email already exists for a staff account');
        throw new ConflictError("Email already exists for a staff account");
      }

      // If email exists but is for a client, we'll allow it and update the role to staff
      let newUser;
      if (existingEmail && existingEmail.role !== "staff") {
        console.log('✅ Converting existing client to staff');
        // Update existing user to staff role
        await storage.updateUser(existingEmail.id, { role: "staff" });
        newUser = await storage.getUser(existingEmail.id);
        if (!newUser) {
          throw new Error("Failed to update existing user to staff role");
        }
        console.log('✅ Successfully converted client to staff');
      } else {
        console.log('✅ Creating new staff user');
        // Create new staff user
        const hashedPassword = await bcrypt.hash(sanitizedData.password, 10);
        newUser = await storage.createUser({
          username: sanitizedData.username,
          email: sanitizedData.email,
          password: hashedPassword,
          firstName: sanitizedData.firstName,
          lastName: sanitizedData.lastName,
          role: "staff",
        });
        console.log('✅ Successfully created new staff user');
      }

      // Generate JWT token
      const token = generateToken(newUser);

      LoggerService.logAuthentication("staff_register", newUser.id, context);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      });
    })
  );

  // Password reset request
  app.post("/api/auth/password-reset", 
    validateInput(passwordResetSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        const context = getLogContext(req);

        const sanitizedEmail = sanitizeInputString(email);

        // Try exact match first
        let user = await storage.getUserByEmail(sanitizedEmail);
        // Fallback: case-insensitive search if exact lookup fails
        if (!user) {
          try {
            const allUsers = await storage.getAllUsers();
            user = allUsers.find(u => (u.email || '').toLowerCase() === sanitizedEmail.toLowerCase());
          } catch {}
        }
        if (!user) {
          // Don't reveal if email exists or not
          LoggerService.warn("Password reset attempt for non-existent email", {
            ...context,
            email: sanitizedEmail,
            ip: req.ip,
          });
          
          return res.json({
            success: true,
            message: "If the email exists, a password reset link has been sent.",
          });
        }

        // Generate reset token without require/import to avoid ESM issues
        const resetToken = (globalThis as any).crypto && typeof (globalThis as any).crypto.randomUUID === 'function'
          ? (globalThis as any).crypto.randomUUID().replace(/-/g, '')
          : Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store reset token in database
        await storage.updateUser(user!.id, {
          resetToken,
          resetTokenExpiry,
        });

        // Build reset link using robust fallbacks
        const replitDomain = process.env.REPLIT_DOMAINS
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : undefined;
        const requestOrigin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
        const defaultDomain = 'https://gloheadspa.app';
        const baseUrl = (process.env.FRONTEND_URL
          || process.env.CUSTOM_DOMAIN
          || replitDomain
          || requestOrigin
          || defaultDomain).replace(/\/$/, '');
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

        // Try to send email; if it fails for any reason, fall back to success response and attempt SMS if phone exists
        try {
          await sendEmail({
            to: user!.email,
            from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
            subject: "Password Reset Request",
            html: `
              <h2>Password Reset Request</h2>
              <p>You requested a password reset for your account.</p>
              <p>Click the link below to reset your password:</p>
              <a href="${resetLink}">Reset Password</a>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this, please ignore this email.</p>
            `,
          });
          LoggerService.logAuthentication("password_reset_requested", user!.id, context);
        } catch (err: any) {
          LoggerService.warn("Password reset email send failed; continuing with fallback response", {
            ...context,
            userId: user!.id,
            error: err?.message || String(err),
          });
          // Best-effort SMS fallback if user has a phone and Twilio is configured
          try {
            if (user && user.phone && await isTwilioConfigured()) {
              await sendSMS(user.phone, `Reset your password: ${resetLink}`);
              LoggerService.logAuthentication("password_reset_sms_fallback", user.id, context);
            }
          } catch {}
        }

        // Always return success to the client to avoid blocking the flow
        return res.json({
          success: true,
          message: "If the email exists, a password reset link has been sent.",
        });
      } catch (routeError: any) {
        // Final guard: never expose internal errors; return a generic success message
        LoggerService.warn("Password reset route encountered an error; returning success fallback", {
          error: routeError?.message || String(routeError),
        });
        return res.json({
          success: true,
          message: "If the email exists, a password reset link has been sent.",
        });
      }
    })
  );

  // Password reset confirmation
  app.post("/api/auth/password-reset/confirm", 
    asyncHandler(async (req: Request, res: Response) => {
      const { token, newPassword } = req.body;
      const context = getLogContext(req);

      if (!token || !newPassword) {
        throw new ValidationError("Token and new password are required");
      }

      // Find user by reset token
      const users = await storage.getAllUsers();
      const user = users.find(u => u.resetToken === token && u.resetTokenExpiry && u.resetTokenExpiry > new Date());

      if (!user) {
        throw new AuthenticationError("Invalid or expired reset token");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      LoggerService.logAuthentication("password_reset_completed", user.id, context);

      res.json({
        success: true,
        message: "Password has been reset successfully.",
      });
    })
  );

  // Password reset via SMS: accept phone, if user exists generate token and SMS link
  app.post("/api/auth/password-reset/sms",
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { phone } = req.body || {};
        const context = getLogContext(req);

        const rawPhone = typeof phone === 'string' ? phone.trim() : '';
        if (!rawPhone) {
          return res.json({ success: true, message: "If the phone exists, a reset SMS has been sent." });
        }

        // Normalize phone: strip non-digits, ensure E.164 if possible
        const normalized = rawPhone.replace(/[^0-9]/g, '');
        const candidate = normalized.length === 10 ? `+1${normalized}` : (normalized.startsWith('+') ? normalized : `+${normalized}`);

        const users = await storage.getAllUsers();
        const user = users.find(u => (u.phone || '').replace(/[^0-9+]/g, '') === candidate.replace(/[^0-9+]/g, ''));

        if (!user) {
          LoggerService.warn("Password reset SMS attempt for non-existent phone", { ...context, phone: candidate });
          return res.json({ success: true, message: "If the phone exists, a reset SMS has been sent." });
        }

        // Generate reset token
        const resetToken = (globalThis as any).crypto && typeof (globalThis as any).crypto.randomUUID === 'function'
          ? (globalThis as any).crypto.randomUUID().replace(/-/g, '')
          : Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

        await storage.updateUser(user.id, { resetToken, resetTokenExpiry });

        // Build reset link similar to email flow
        const replitDomain = process.env.REPLIT_DOMAINS
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : undefined;
        const requestOrigin = req.get('origin') || `${req.protocol}://${req.get('host')}`;
        const defaultDomain = 'https://gloheadspa.app';
        const baseUrl = (process.env.FRONTEND_URL
          || process.env.CUSTOM_DOMAIN
          || replitDomain
          || requestOrigin
          || defaultDomain).replace(/\/$/, '');
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

        try {
          if (!isTwilioConfigured()) {
            throw new Error('Twilio not configured');
          }
          await sendSMS(user.phone!, `Reset your password: ${resetLink}`);
          LoggerService.logAuthentication("password_reset_sms_requested", user.id, context);
        } catch (err: any) {
          LoggerService.warn("Password reset SMS send failed; continuing with generic success", {
            ...context,
            userId: user.id,
            error: err?.message || String(err),
          });
        }

        return res.json({ success: true, message: "If the phone exists, a reset SMS has been sent." });
      } catch (routeError: any) {
        LoggerService.warn("Password reset SMS route error; returning generic success", { error: routeError?.message || String(routeError) });
        return res.json({ success: true, message: "If the phone exists, a reset SMS has been sent." });
      }
    })
  );

  // Change password (authenticated users)
  app.post("/api/auth/change-password", 
    validateInput(passwordChangeSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { currentPassword, newPassword } = req.body;
      const context = getLogContext(req);
      const currentUser = (req as any).user;

      if (!currentUser) {
        throw new AuthenticationError("Authentication required");
      }

      // Get user from database
      const user = await storage.getUserById(currentUser.id);
      if (!user) {
        throw new AuthenticationError("User not found");
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        LoggerService.warn("Invalid current password for password change", {
          ...context,
          userId: user.id,
          ip: req.ip,
        });
        throw new AuthenticationError("Current password is incorrect");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUser(user.id, {
        password: hashedPassword,
      });

      LoggerService.logAuthentication("password_changed", user.id, context);

      res.json({
        success: true,
        message: "Password changed successfully.",
      });
    })
  );

  // Logout endpoint (client-side token removal)
  app.post("/api/logout", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const currentUser = (req as any).user;

    if (currentUser) {
      LoggerService.logAuthentication("logout", currentUser.id, context);
    }

    res.json({
      success: true,
      message: "Logged out successfully.",
    });
  }));

  // Verify token endpoint
  app.get("/api/auth/verify", asyncHandler(async (req: Request, res: Response) => {
    const currentUser = (req as any).user;

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Get fresh user data from database
    const user = await storage.getUserById(currentUser.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Get staff information if user is staff
    let staffId = null;
    if (user.role === "staff") {
      const allStaff = await storage.getAllStaff();
      const staffMember = allStaff.find(s => s.userId === user.id);
      if (staffMember) {
        staffId = staffMember.id;
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        staffId,
      },
    });
  }));

  // TEMPORARY: Grant admin permissions to user 72
  app.post("/api/temp/grant-admin-72", asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get current user info
      const users = await storage.getAllUsers();
      const user = users.find(u => u.id === 1);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      console.log('Current user info:', {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });

      if (user.role === 'admin') {
        return res.json({
          success: true,
          message: "User already has admin role",
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        });
      }

      // Update user role to admin
      const updatedUser = await storage.updateUser(user.id, { role: 'admin' });

      console.log('✅ Successfully granted admin permissions!');
      res.json({
        success: true,
        message: "Admin permissions granted successfully!",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
        }
      });
    } catch (error) {
      console.error('Error granting admin permissions:', error);
      res.status(500).json({
        success: false,
        message: "Failed to grant admin permissions",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // Health check endpoint
  app.get("/api/health", asyncHandler(async (req: Request, res: Response) => {
    try {
      // Test database connection
      await storage.getAllUsers();
      
      res.json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
          email: process.env.SENDGRID_API_KEY ? "configured" : "not_configured",
          sms: await isTwilioConfigured() ? "configured" : "not_configured",
        },
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }));

  // TEMPORARY: Grant admin permissions to current user
  app.post("/api/temp/grant-admin", 
    authenticateToken,
    asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get current user from request (if authenticated)
      const currentUser = (req as any).user;
      
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Get fresh user data from database
      const user = await storage.getUserById(currentUser.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      console.log(`Granting admin permissions to user: ${user.username} (${user.firstName} ${user.lastName})`);
      console.log(`Current role: ${user.role}`);

      if (user.role === 'admin') {
        return res.json({
          success: true,
          message: "User already has admin role",
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      }

      // Update user role to admin
      const updatedUser = await storage.updateUser(user.id, { role: 'admin' });

      console.log(`Successfully granted admin permissions to ${user.username}`);

      res.json({
        success: true,
        message: "Admin permissions granted successfully!",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
        },
      });
    } catch (error) {
      console.error('Error granting admin permissions:', error);
      res.status(500).json({
        success: false,
        message: "Failed to grant admin permissions",
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }));
} 