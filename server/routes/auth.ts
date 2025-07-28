import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { sendSMS, isTwilioConfigured } from "../sms";
import { sendEmail } from "../email";
import { hashPassword, comparePassword } from "../utils/password";
import { 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  NotFoundError,
  asyncHandler 
} from "../utils/errors";
import LoggerService, { getLogContext } from "../utils/logger";
import { validateRequest } from "../middleware/error-handler";

export function registerAuthRoutes(app: Express, storage: IStorage) {
  // Login endpoint
  app.post("/api/login", asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const context = getLogContext(req);

    if (!username || !password) {
      throw new ValidationError("Username and password are required");
    }

    const user = await storage.getUserByUsername(username);
    if (!user) {
      LoggerService.warn("Login attempt with invalid username", { ...context, username });
      throw new AuthenticationError("Invalid credentials");
    }

    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      LoggerService.warn("Login attempt with invalid password", { ...context, username, userId: user.id });
      throw new AuthenticationError("Invalid credentials");
    }

    LoggerService.logAuthentication("login", user.id, context);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  }));

  // Register endpoint
  app.post("/api/register", validateRequest(insertUserSchema), asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, firstName, lastName } = req.body;
    const context = getLogContext(req);

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      throw new ConflictError("Username already exists");
    }

    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      throw new ConflictError("Email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "client",
    });

    LoggerService.logAuthentication("register", newUser.id, context);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    });
  }));

  // Register staff endpoint
  app.post("/api/register/staff", validateRequest(insertUserSchema), asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, firstName, lastName } = req.body;
    const context = getLogContext(req);

    LoggerService.info("Staff registration attempt", { ...context, username, email });

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      throw new ConflictError("Username already exists");
    }

    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      throw new ConflictError("Email already exists");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with staff role
    const newUser = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "staff",
    });

    LoggerService.logAuthentication("staff_register", newUser.id, context);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
    });
  }));

  // Forgot password endpoint
  app.post("/api/forgot-password", asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const context = getLogContext(req);

    if (!email) {
      throw new ValidationError("Email is required");
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      LoggerService.info("Password reset requested for non-existent email", { ...context, email });
      return res.json({ success: true, message: "If the email exists, a reset link has been sent" });
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await storage.updateUser(user.id, {
      resetToken,
      resetTokenExpiry: resetExpiry,
    });

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const emailSent = await sendEmail({
      to: email,
              from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gloupheadspa.app',
      subject: 'Password Reset Request - Glo Head Spa',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${user.firstName || user.username},</p>
          <p>You have requested to reset your password for your Glo Head Spa account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            Best regards,<br>
            The Glo Head Spa Team
          </p>
        </div>
      `
    });

    if (emailSent) {
      LoggerService.logCommunication("email", "password_reset_sent", { ...context, userId: user.id });
      res.json({ success: true, message: "If the email exists, a reset link has been sent" });
    } else {
      LoggerService.error("Failed to send password reset email", { ...context, userId: user.id });
      res.status(500).json({ error: "Failed to send reset email" });
    }
  }));

  // Reset password endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      // Find user with this reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password: " + error.message });
    }
  });

  // Forgot password via SMS endpoint
  app.post("/api/forgot-password-sms", asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;
    const context = getLogContext(req);

    if (!phone) {
      throw new ValidationError("Phone number is required");
    }

    // Find user by phone number
    const user = await storage.getUserByPhone(phone);
    if (!user) {
      // Don't reveal if phone exists or not for security
      LoggerService.info("SMS password reset requested for non-existent phone", { ...context, phone });
      return res.json({ success: true, message: "If the phone number exists, a reset code has been sent" });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset code (using a custom field or separate table in production)
    // For now, we'll skip storing the reset code in the user table
    LoggerService.info("SMS reset code generated", { ...context, userId: user.id });

    // Send SMS with reset code
    const message = `Your Glo Head Spa password reset code is: ${resetCode}. This code expires in 15 minutes.`;
    
    if (await isTwilioConfigured()) {
      const smsSent = await sendSMS(phone, message);
      if (smsSent) {
        LoggerService.logCommunication("sms", "password_reset_sent", { ...context, userId: user.id });
        res.json({ success: true, message: "If the phone number exists, a reset code has been sent" });
      } else {
        LoggerService.error("Failed to send SMS reset code", { ...context, userId: user.id });
        res.status(500).json({ error: "Failed to send reset code" });
      }
    } else {
      // In development/test mode, just return the code
      LoggerService.info("SMS reset code (test mode)", { ...context, userId: user.id, testCode: resetCode });
      res.json({ 
        success: true, 
        message: "Reset code sent (test mode)", 
        testCode: resetCode 
      });
    }
  }));

  // Change password endpoint
  app.post("/api/change-password", asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user?.id;
    const context = getLogContext(req);

    if (!userId) {
      throw new AuthenticationError("Authentication required");
    }

    if (!currentPassword || !newPassword) {
      throw new ValidationError("Current password and new password are required");
    }

    const user = await storage.getUser(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      LoggerService.warn("Password change attempt with incorrect current password", { ...context, userId });
      throw new ValidationError("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await storage.updateUser(userId, { password: hashedPassword });

        LoggerService.logAuthentication("password_change", userId, context);
    res.json({ success: true, message: "Password changed successfully" });
  }));
} 