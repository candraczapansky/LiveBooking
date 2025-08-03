import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage";
import { z } from "zod";
import { insertAppointmentSchema, insertAppointmentHistorySchema } from "@shared/schema";
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  asyncHandler 
} from "../utils/errors";
import LoggerService, { getLogContext } from "../utils/logger";
import { validateRequest, requireAuth } from "../middleware/error-handler";
import { sendEmail } from "../email";
import { sendSMS, isTwilioConfigured } from "../sms";

export function registerAppointmentRoutes(app: Express, storage: IStorage) {
  // TEST ENDPOINT: Check SendGrid configuration
  app.get("/api/test-sendgrid-config", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    
    console.log("🔧 TEST: Checking SendGrid configuration...");
    
    try {
      // Check environment variables
      const envApiKey = process.env.SENDGRID_API_KEY;
      const envFromEmail = process.env.SENDGRID_FROM_EMAIL;
      
      console.log("🔧 Environment variables:");
      console.log("  - SENDGRID_API_KEY:", envApiKey ? "SET" : "NOT SET");
      console.log("  - SENDGRID_FROM_EMAIL:", envFromEmail || "NOT SET");
      
      // Check database configuration
      let dbApiKey = null;
      let dbFromEmail = null;
      
      try {
        const { DatabaseConfig } = await import('../config');
        const { DatabaseStorage } = await import('../storage');
        const storage = new DatabaseStorage();
        const dbConfig = new DatabaseConfig(storage);
        
        dbApiKey = await dbConfig.getSendGridKey();
        dbFromEmail = await dbConfig.getSendGridFromEmail();
        
        console.log("🔧 Database configuration:");
        console.log("  - SendGrid API Key:", dbApiKey ? "SET" : "NOT SET");
        console.log("  - SendGrid From Email:", dbFromEmail || "NOT SET");
      } catch (error) {
        console.log("🔧 Database config error:", error);
      }
      
      // Test email sending with current config
      const finalApiKey = dbApiKey || envApiKey;
      const finalFromEmail = dbFromEmail || envFromEmail || 'noreply@gloheadspa.com';
      
      console.log("🔧 Final configuration:");
      console.log("  - API Key:", finalApiKey ? "AVAILABLE" : "MISSING");
      console.log("  - From Email:", finalFromEmail);
      
      if (finalApiKey) {
        console.log("🔧 Testing email send...");
        const testResult = await sendEmail({
          to: "test@example.com",
          from: finalFromEmail,
          subject: 'SendGrid Configuration Test',
          html: '<h1>Test</h1><p>This is a configuration test.</p>'
        });
        
        res.json({
          success: true,
          config: {
            apiKey: finalApiKey ? "SET" : "MISSING",
            fromEmail: finalFromEmail,
            testResult: testResult
          },
          message: "Configuration checked"
        });
      } else {
        res.json({
          success: false,
          error: "SendGrid API key not configured",
          message: "Please set up SendGrid API key in environment or database"
        });
      }
    } catch (error: any) {
      console.log("🔧 Configuration test error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error checking configuration"
      });
    }
  }));

  // TEST ENDPOINT: Test confirmation functionality
  app.get("/api/test-confirmation", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    
    console.log("🧪 TEST: Testing confirmation functionality...");
    LoggerService.info("Testing confirmation functionality", context);
    
    try {
      // Test email sending
      const testEmailResult = await sendEmail({
        to: "test@example.com",
        from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
        subject: 'TEST - Email Service Test',
        html: '<h1>Test Email</h1><p>This is a test email to verify the email service is working.</p>'
      });
      
      console.log("🧪 TEST: Email service result:", testEmailResult);
      LoggerService.info("Email service test result", { ...context, result: testEmailResult });
      
      // Test SMS sending
      const testSmsResult = await sendSMS("+1234567890", "TEST: SMS service test message");
      
      console.log("🧪 TEST: SMS service result:", testSmsResult);
      LoggerService.info("SMS service test result", { ...context, result: testSmsResult });
      
      res.json({
        success: true,
        emailTest: testEmailResult,
        smsTest: testSmsResult,
        message: "Confirmation services tested"
      });
    } catch (error: any) {
      console.log("🧪 TEST: Error testing confirmation services:", error);
      LoggerService.error("Error testing confirmation services", { ...context, error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Error testing confirmation services"
      });
    }
  }));

  // Get all appointments
  app.get("/api/appointments", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { staffId, clientId, date, status, locationId } = req.query;

    LoggerService.debug("Fetching appointments", { ...context, filters: { staffId, clientId, date, status, locationId } });

    let appointments;
    if (staffId) {
      appointments = await storage.getAppointmentsByStaff(parseInt(staffId as string));
    } else if (clientId) {
      appointments = await storage.getAppointmentsByClient(parseInt(clientId as string));
    } else if (date) {
      appointments = await storage.getAppointmentsByDate(new Date(date as string));
    } else if (locationId) {
      // If locationId is specified, get appointments for that location
      // If no appointments are found for the location, return all appointments (fallback)
      appointments = await storage.getAppointmentsByLocation(parseInt(locationId as string));
      if (appointments.length === 0) {
        // Fallback: return all appointments if none are assigned to the specific location
        appointments = await storage.getAllAppointments();
      }
    } else if (status) {
      // Filter appointments by status from all appointments
      const allAppointments = await storage.getAllAppointments();
      appointments = allAppointments.filter(apt => apt.status === status);
    } else {
      appointments = await storage.getAllAppointments();
    }

    LoggerService.info("Appointments fetched", { ...context, count: appointments.length });
    res.json(appointments);
  }));

  // Get active appointments (excluding cancelled)
  app.get("/api/appointments/active", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { staffId, date } = req.query;

    LoggerService.debug("Fetching active appointments", { ...context, filters: { staffId, date } });

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

    LoggerService.info("Active appointments fetched", { ...context, count: appointments.length });
    res.json(appointments);
  }));

  // Create new appointment
  app.post("/api/appointments", validateRequest(insertAppointmentSchema), asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const appointmentData = req.body;

    LoggerService.info("Creating new appointment", { ...context, appointmentData });

    // Validate appointment time conflicts
    const allAppointments = await storage.getAllAppointments();
    
    // Debug: Log the appointment data being checked
    LoggerService.info("Checking for conflicts", {
      ...context,
      newAppointment: {
        staffId: appointmentData.staffId,
        locationId: appointmentData.locationId,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        clientId: appointmentData.clientId
      },
      totalAppointments: allAppointments.length,
      sampleExistingAppointments: allAppointments.slice(0, 3).map(apt => ({
        id: apt.id,
        staffId: apt.staffId,
        locationId: apt.locationId,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status
      }))
    });
    
    const conflictingAppointments = allAppointments.filter(apt => {
      const isSameStaff = apt.staffId === appointmentData.staffId;
      // Handle null locationId - if appointmentData.locationId is null, don't filter by location
      const isSameLocation = appointmentData.locationId === null || apt.locationId === appointmentData.locationId;
      const isActive = apt.status !== 'cancelled' && apt.status !== 'completed';
      
      // Time overlap check
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      const newStart = new Date(appointmentData.startTime);
      const newEnd = new Date(appointmentData.endTime);
      
      const hasTimeOverlap = aptStart < newEnd && aptEnd > newStart;
      
      const isConflict = isSameStaff && isSameLocation && isActive && hasTimeOverlap;
      
      if (isSameStaff && isActive) {
        LoggerService.debug("Checking appointment for conflict", {
          ...context,
          existingAppointment: {
            id: apt.id,
            startTime: apt.startTime,
            endTime: apt.endTime,
            status: apt.status,
            locationId: apt.locationId
          },
          newAppointment: {
            startTime: appointmentData.startTime,
            endTime: appointmentData.endTime,
            locationId: appointmentData.locationId
          },
          isSameLocation,
          hasTimeOverlap,
          isConflict
        });
      }
      
      return isConflict;
    });

    if (conflictingAppointments.length > 0) {
      LoggerService.warn("Appointment time conflict detected", { 
        ...context, 
        conflictingAppointments: conflictingAppointments.map((apt: any) => ({
          id: apt.id,
          startTime: apt.startTime,
          endTime: apt.endTime,
          staffId: apt.staffId,
          locationId: apt.locationId,
          status: apt.status
        })),
        newAppointment: {
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          staffId: appointmentData.staffId,
          locationId: appointmentData.locationId
        }
      });
      
      throw new ConflictError("Appointment time conflicts with existing appointments");
    }

    const newAppointment = await storage.createAppointment(appointmentData);

    LoggerService.logAppointment("created", newAppointment.id, context);
    
    // NEW AUTOMATION SERVICE - Trigger automation for booking confirmation
    try {
      console.log("🚀 NEW AUTOMATION SERVICE: Triggering booking confirmation automation");
      
      // Import and initialize the new automation service
      const { AutomationService } = await import('../automation-service');
      const automationService = new AutomationService(storage);
      
      // Create automation context
      const automationContext = {
        appointmentId: newAppointment.id,
        clientId: newAppointment.clientId,
        serviceId: newAppointment.serviceId,
        staffId: newAppointment.staffId,
        startTime: newAppointment.startTime.toISOString(),
        endTime: newAppointment.endTime.toISOString(),
        status: newAppointment.status
      };
      
      console.log("📋 Automation context:", automationContext);
      
      // Trigger the booking confirmation automation
      await automationService.triggerBookingConfirmation(automationContext);
      
      console.log("✅ NEW AUTOMATION SERVICE: Booking confirmation automation completed");
      
    } catch (automationError: any) {
      console.error("❌ NEW AUTOMATION SERVICE: Error triggering automation:", automationError);
      console.error("❌ Automation error details:", automationError);
    }
    
    console.log("🎯 APPOINTMENT CREATED SUCCESSFULLY 🎯");
    console.log("Appointment ID:", newAppointment.id);
    console.log("About to enter confirmation code...");
    
    // SIMPLE TEST - This should always show up
    console.log("✅ CONFIRMATION CODE IS REACHED ✅");
    console.log("✅ CONFIRMATION CODE IS REACHED ✅");
    console.log("✅ CONFIRMATION CODE IS REACHED ✅");
    
    // CRITICAL DEBUG: Check if we reach the confirmation code
    console.log("🚨 APPOINTMENT CREATED - ABOUT TO SEND CONFIRMATIONS 🚨");
    console.log("Appointment ID:", newAppointment.id);
    console.log("Client ID:", newAppointment.clientId);
    console.log("Staff ID:", newAppointment.staffId);
    console.log("Service ID:", newAppointment.serviceId);
    
    // CRITICAL DEBUG: Check if we reach the confirmation code
    LoggerService.info("APPOINTMENT CREATED - ABOUT TO SEND CONFIRMATIONS", {
      ...context,
      appointmentId: newAppointment.id,
      clientId: newAppointment.clientId,
      staffId: newAppointment.staffId,
      serviceId: newAppointment.serviceId
    });

    // Send confirmation notifications
    LoggerService.info("=== APPOINTMENT CONFIRMATION DEBUG ===", {
      ...context,
      appointmentId: newAppointment.id,
      message: "Appointment created successfully, attempting to send confirmations..."
    });
    LoggerService.info("Appointment confirmation debug info", {
      ...context,
      appointmentId: newAppointment.id,
      clientId: newAppointment.clientId,
      staffId: newAppointment.staffId,
      serviceId: newAppointment.serviceId
    });
    
    LoggerService.info("ENTERING CONFIRMATION TRY BLOCK", {
      ...context,
      appointmentId: newAppointment.id
    });
    
    console.log("🚨 ENTERING CONFIRMATION TRY BLOCK 🚨");
    console.log("Appointment ID:", newAppointment.id);
    
    try {
      const client = await storage.getUser(newAppointment.clientId);
      const staff = await storage.getUser(newAppointment.staffId);
      const service = await storage.getService(newAppointment.serviceId);

      LoggerService.info("Client data retrieved", {
        ...context,
        appointmentId: newAppointment.id,
        clientFound: !!client,
        clientId: client?.id,
        clientEmail: client?.email,
        emailAppointmentReminders: client?.emailAppointmentReminders,
        smsAppointmentReminders: client?.smsAppointmentReminders,
        phone: client?.phone
      });
      LoggerService.info("Staff data retrieved", {
        ...context,
        appointmentId: newAppointment.id,
        staffFound: !!staff,
        staffId: staff?.id,
        staffName: staff ? `${staff.firstName} ${staff.lastName}` : null
      });
      LoggerService.info("Service data retrieved", {
        ...context,
        appointmentId: newAppointment.id,
        serviceFound: !!service,
        serviceId: service?.id,
        serviceName: service?.name
      });

      LoggerService.info("Attempting to send appointment confirmation", {
        ...context,
        appointmentId: newAppointment.id,
        clientId: newAppointment.clientId,
        staffId: newAppointment.staffId,
        serviceId: newAppointment.serviceId,
        clientFound: !!client,
        staffFound: !!staff,
        serviceFound: !!service,
        clientEmail: client?.email,
        clientEmailAppointmentReminders: client?.emailAppointmentReminders,
        clientSmsAppointmentReminders: client?.smsAppointmentReminders,
        clientPhone: client?.phone
      });

      // DEBUG: Log all retrieved data
      console.log("🔍 DEBUG: Retrieved data:");
      console.log("  - client:", client ? "FOUND" : "NOT FOUND");
      console.log("  - staff:", staff ? "FOUND" : "NOT FOUND");
      console.log("  - service:", service ? "FOUND" : "NOT FOUND");
      console.log("  - staffId being searched:", newAppointment.staffId);
      console.log("  - clientId being searched:", newAppointment.clientId);
      console.log("  - serviceId being searched:", newAppointment.serviceId);

      if (client && staff && service) {
        // TEMPORARY TEST: Force confirmation sending for debugging
        console.log("🔍 DEBUG: Client notification preferences:");
        console.log("  - emailAppointmentReminders:", client.emailAppointmentReminders);
        console.log("  - smsAppointmentReminders:", client.smsAppointmentReminders);
        console.log("  - client.email:", client.email);
        console.log("  - client.phone:", client.phone);
        
        // Send email confirmation
        if (client.emailAppointmentReminders && client.email) {
          LoggerService.info("Sending email confirmation", {
            ...context,
            appointmentId: newAppointment.id,
            to: client.email,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gloupheadspa.app'
          });
          
          try {
                          await sendEmail({
                to: client.email,
                from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
            subject: 'Appointment Confirmation - Glo Head Spa',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Appointment Confirmation</h2>
                <p>Hello ${client.firstName || client.username},</p>
                <p>Your appointment has been confirmed:</p>
                <ul>
                  <li><strong>Service:</strong> ${service.name}</li>
                  <li><strong>Date:</strong> ${new Date(newAppointment.startTime).toLocaleDateString()}</li>
                  <li><strong>Time:</strong> ${newAppointment.startTime} - ${newAppointment.endTime}</li>
                  <li><strong>Staff:</strong> ${staff.firstName} ${staff.lastName}</li>
                </ul>
                <p>We look forward to seeing you!</p>
              </div>
            `
          });
          LoggerService.logCommunication("email", "appointment_confirmation_sent", { ...context, userId: client.id });
            LoggerService.info("Email confirmation sent successfully", { ...context, appointmentId: newAppointment.id });
          } catch (emailError) {
            LoggerService.error("Failed to send email confirmation", { ...context, appointmentId: newAppointment.id }, emailError as Error);
          }
        } else {
          LoggerService.info("Email confirmation skipped - emailAppointmentReminders is false", {
            ...context,
            appointmentId: newAppointment.id,
            emailAppointmentReminders: client.emailAppointmentReminders
          });
          
          // TEMPORARY TEST: Force send email for debugging
          if (client.email) {
            console.log("🧪 TEST: Forcing email send for debugging...");
            try {
              await sendEmail({
                to: client.email,
                from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
                subject: 'TEST - Appointment Confirmation - Glo Head Spa',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">TEST - Appointment Confirmation</h2>
                    <p>Hello ${client.firstName || client.username},</p>
                    <p>This is a TEST email to verify email functionality:</p>
                    <ul>
                      <li><strong>Service:</strong> ${service.name}</li>
                      <li><strong>Date:</strong> ${new Date(newAppointment.startTime).toLocaleDateString()}</li>
                      <li><strong>Time:</strong> ${newAppointment.startTime} - ${newAppointment.endTime}</li>
                      <li><strong>Staff:</strong> ${staff ? `${staff.firstName} ${staff.lastName}` : 'Your stylist'}</li>
                    </ul>
                    <p>This is a test email to verify the email service is working.</p>
                  </div>
                `
              });
              console.log("✅ TEST EMAIL SENT SUCCESSFULLY ✅");
            } catch (testEmailError) {
              console.log("❌ TEST EMAIL FAILED:", testEmailError);
            }
          }
        }
      } else {
        // FALLBACK: Send confirmation even if some data is missing
        console.log("⚠️ FALLBACK: Some data missing, but attempting to send confirmation anyway");
        console.log("  - client:", client ? "FOUND" : "MISSING");
        console.log("  - staff:", staff ? "FOUND" : "MISSING");
        console.log("  - service:", service ? "FOUND" : "MISSING");
        
        if (client && service) {
          console.log("✅ FALLBACK: Client and service found, sending confirmation...");
          
          // Send email confirmation with fallback staff name
          if (client.emailAppointmentReminders && client.email) {
            try {
              await sendEmail({
                to: client.email,
                from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
                subject: 'Appointment Confirmation - Glo Head Spa',
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Appointment Confirmation</h2>
                    <p>Hello ${client.firstName || client.username},</p>
                    <p>Your appointment has been confirmed:</p>
                    <ul>
                      <li><strong>Service:</strong> ${service.name}</li>
                      <li><strong>Date:</strong> ${new Date(newAppointment.startTime).toLocaleDateString()}</li>
                      <li><strong>Time:</strong> ${newAppointment.startTime} - ${newAppointment.endTime}</li>
                      <li><strong>Staff:</strong> ${staff ? `${staff.firstName} ${staff.lastName}` : 'Your stylist'}</li>
                    </ul>
                    <p>We look forward to seeing you!</p>
                  </div>
                `
              });
              console.log("✅ FALLBACK EMAIL SENT SUCCESSFULLY ✅");
            } catch (emailError) {
              console.log("❌ FALLBACK EMAIL FAILED:", emailError);
              console.log("📧 Email service is not configured properly. SMS confirmations are working.");
              console.log("📧 To fix email: Verify sender identity in SendGrid or use a different email service.");
            }
          }
          
          // Send SMS confirmation with fallback staff name
        if (client.smsAppointmentReminders && client.phone) {
            try {
          const message = `Your Glo Head Spa appointment for ${service.name} on ${new Date(newAppointment.startTime).toLocaleDateString()} at ${newAppointment.startTime} has been confirmed.`;
              await sendSMS(client.phone, message);
              console.log("✅ FALLBACK SMS SENT SUCCESSFULLY ✅");
            } catch (smsError) {
              console.log("❌ FALLBACK SMS FAILED:", smsError);
            }
          }
        } else {
          console.log("❌ FALLBACK FAILED: Missing essential data (client or service)");
        }
      }

      // Send SMS confirmation (moved outside the main if block to handle both cases)
      if (client && client.smsAppointmentReminders && client.phone) {
        LoggerService.info("Sending SMS confirmation", {
          ...context,
          appointmentId: newAppointment.id,
          to: client.phone,
          smsAppointmentReminders: client.smsAppointmentReminders
        });
        
        try {
          const message = `Your Glo Head Spa appointment for ${service?.name || 'your service'} on ${new Date(newAppointment.startTime).toLocaleDateString()} at ${newAppointment.startTime} has been confirmed.`;
          await sendSMS(client.phone, message);
          LoggerService.logCommunication("sms", "appointment_confirmation_sent", { ...context, userId: client.id });
          LoggerService.info("SMS confirmation sent successfully", { ...context, appointmentId: newAppointment.id });
        } catch (smsError) {
          LoggerService.error("Failed to send SMS confirmation", { ...context, appointmentId: newAppointment.id }, smsError as Error);
        }
      } else {
        LoggerService.info("SMS confirmation skipped", {
          ...context,
          appointmentId: newAppointment.id,
          smsAppointmentReminders: client?.smsAppointmentReminders,
          hasPhone: !!client?.phone,
          phone: client?.phone
        });
      }
    } catch (error) {
      LoggerService.error("Failed to send appointment confirmation", { ...context, appointmentId: newAppointment.id }, error as Error);
      // Don't fail the appointment creation if notifications fail
    }

    res.status(201).json(newAppointment);
  }));

  // Get appointment by ID
  app.get("/api/appointments/:id", asyncHandler(async (req: Request, res: Response) => {
    const appointmentId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.debug("Fetching appointment", { ...context, appointmentId });

    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Appointment");
    }

    res.json(appointment);
  }));

  // Get appointments by client
  app.get("/api/appointments/client/:clientId", asyncHandler(async (req: Request, res: Response) => {
    const clientId = parseInt(req.params.clientId);
    const context = getLogContext(req);

    LoggerService.debug("Fetching client appointments", { ...context, clientId });

    const appointments = await storage.getAppointmentsByClient(clientId);
    res.json(appointments);
  }));

  // Update appointment
  app.put("/api/appointments/:id", validateRequest(insertAppointmentSchema.partial()), asyncHandler(async (req: Request, res: Response) => {
    const appointmentId = parseInt(req.params.id);
    const context = getLogContext(req);
    const updateData = req.body;

    LoggerService.info("Updating appointment", { ...context, appointmentId, updateData });

    const existingAppointment = await storage.getAppointment(appointmentId);
    if (!existingAppointment) {
      throw new NotFoundError("Appointment");
    }

    // Check for time conflicts if time is being updated
    if (updateData.startTime || updateData.endTime) {
      const allAppointments = await storage.getAllAppointments();
      const conflictingAppointments = allAppointments.filter((apt: any) => 
        apt.id !== appointmentId &&
        apt.staffId === (updateData.staffId || existingAppointment.staffId) &&
        apt.status !== 'cancelled' &&
        apt.status !== 'completed' &&
        ((new Date(apt.startTime) <= new Date(updateData.endTime || existingAppointment.endTime) && 
          new Date(apt.endTime) >= new Date(updateData.startTime || existingAppointment.startTime)))
      );

      if (conflictingAppointments.length > 0) {
        LoggerService.warn("Appointment update time conflict detected", { 
          ...context, 
          appointmentId,
          conflictingAppointments: conflictingAppointments.map((apt: any) => apt.id) 
        });
        throw new ConflictError("Updated appointment time conflicts with existing appointments");
      }
    }

    const updatedAppointment = await storage.updateAppointment(appointmentId, updateData);

    LoggerService.logAppointment("updated", appointmentId, context);

    res.json(updatedAppointment);
  }));

  // Delete appointment
  app.delete("/api/appointments/:id", asyncHandler(async (req: Request, res: Response) => {
    const appointmentId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.info("Deleting appointment", { ...context, appointmentId });

    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Appointment");
    }

    await storage.deleteAppointment(appointmentId);

    LoggerService.logAppointment("deleted", appointmentId, context);

    res.json({ success: true, message: "Appointment deleted successfully" });
  }));

  // Get cancelled appointments
  app.get("/api/cancelled-appointments", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { clientId, staffId } = req.query;

    LoggerService.debug("Fetching cancelled appointments", { ...context, filters: { clientId, staffId } });

    let appointments;
    if (clientId) {
      appointments = await storage.getCancelledAppointmentsByClient(parseInt(clientId as string));
    } else if (staffId) {
      appointments = await storage.getCancelledAppointmentsByStaff(parseInt(staffId as string));
    } else {
      appointments = await storage.getAllCancelledAppointments();
    }

    res.json(appointments);
  }));

  // Get appointment history
  app.get("/api/appointment-history", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { appointmentId } = req.query;

    LoggerService.debug("Fetching appointment history", { ...context, appointmentId });

    const history = await storage.getAppointmentHistory(parseInt(appointmentId as string));
    res.json(history);
  }));

  // Create appointment history entry
  app.post("/api/appointment-history", validateRequest(insertAppointmentHistorySchema), asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const historyData = req.body;

    LoggerService.info("Creating appointment history entry", { ...context, historyData });

    const newHistory = await storage.createAppointmentHistory(historyData);

    LoggerService.logAppointment("history_created", historyData.appointmentId, context);

    res.status(201).json(newHistory);
  }));

  // Send appointment reminder
  app.post("/api/appointments/:id/send-reminder", asyncHandler(async (req: Request, res: Response) => {
    const appointmentId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.info("Sending appointment reminder", { ...context, appointmentId });

    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Appointment");
    }

    const client = await storage.getUser(appointment.clientId);
    const staff = await storage.getUser(appointment.staffId);
    const service = await storage.getService(appointment.serviceId);

    if (!client || !staff || !service) {
      throw new NotFoundError("Appointment details");
    }

    let reminderSent = false;

    // Send email reminder
    if (client.emailAppointmentReminders && client.email) {
      try {
        await sendEmail({
          to: client.email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gloupheadspa.app',
          subject: 'Appointment Reminder - Glo Head Spa',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Appointment Reminder</h2>
              <p>Hello ${client.firstName || client.username},</p>
              <p>This is a reminder for your upcoming appointment:</p>
              <ul>
                <li><strong>Service:</strong> ${service.name}</li>
                <li><strong>Date:</strong> ${new Date(appointment.startTime).toLocaleDateString()}</li>
                <li><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</li>
                <li><strong>Staff:</strong> ${staff.firstName} ${staff.lastName}</li>
              </ul>
              <p>We look forward to seeing you!</p>
            </div>
          `
        });
        LoggerService.logCommunication("email", "appointment_reminder_sent", { ...context, userId: client.id });
        reminderSent = true;
      } catch (error) {
        LoggerService.error("Failed to send email reminder", { ...context, userId: client.id }, error as Error);
      }
    }

    // Send SMS reminder
    if (client.smsAppointmentReminders && client.phone) {
      try {
        const message = `Reminder: Your Glo Head Spa appointment for ${service.name} is tomorrow at ${appointment.startTime}.`;
        await sendSMS(client.phone, message);
        LoggerService.logCommunication("sms", "appointment_reminder_sent", { ...context, userId: client.id });
        reminderSent = true;
      } catch (error) {
        LoggerService.error("Failed to send SMS reminder", { ...context, userId: client.id }, error as Error);
      }
    }

    if (reminderSent) {
      res.json({ success: true, message: "Reminder sent successfully" });
    } else {
      res.status(400).json({ error: "No reminder preferences enabled for this client" });
    }
  }));

  // Send daily reminders (batch operation)
  app.post("/api/appointments/send-daily-reminders", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);

    LoggerService.info("Starting daily reminder batch", context);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const appointments = await storage.getAppointmentsByDate(tomorrow);
    let sentCount = 0;
    let errorCount = 0;

    for (const appointment of appointments) {
      try {
        const client = await storage.getUser(appointment.clientId);
        if (!client) continue;

        let reminderSent = false;

        // Send email reminder
        if (client.emailAppointmentReminders && client.email) {
          try {
            await sendEmail({
              to: client.email,
              from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gloupheadspa.app',
              subject: 'Appointment Reminder - Glo Head Spa',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">Appointment Reminder</h2>
                  <p>Hello ${client.firstName || client.username},</p>
                  <p>This is a reminder for your upcoming appointment tomorrow:</p>
                  <ul>
                    <li><strong>Date:</strong> ${tomorrow.toLocaleDateString()}</li>
                    <li><strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</li>
                  </ul>
                  <p>We look forward to seeing you!</p>
                </div>
              `
            });
            reminderSent = true;
          } catch (error) {
            LoggerService.error("Failed to send email reminder", { ...context, userId: client.id, appointmentId: appointment.id }, error as Error);
          }
        }

        // Send SMS reminder
        if (client.smsAppointmentReminders && client.phone) {
          try {
            const message = `Reminder: Your Glo Head Spa appointment is tomorrow at ${appointment.startTime}.`;
            await sendSMS(client.phone, message);
            reminderSent = true;
          } catch (error) {
            LoggerService.error("Failed to send SMS reminder", { ...context, userId: client.id, appointmentId: appointment.id }, error as Error);
          }
        }

        if (reminderSent) {
          sentCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        LoggerService.error("Error processing appointment reminder", { ...context, appointmentId: appointment.id }, error as Error);
      }
    }

    LoggerService.info("Daily reminder batch completed", { ...context, sentCount, errorCount, totalAppointments: appointments.length });

    res.json({ 
      success: true, 
      message: "Daily reminders processed", 
      sentCount, 
      errorCount, 
      totalAppointments: appointments.length 
    });
  }));
} 