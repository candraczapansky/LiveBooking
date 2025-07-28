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
  // Get all appointments
  app.get("/api/appointments", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { staffId, clientId, date, status } = req.query;

    LoggerService.debug("Fetching appointments", { ...context, filters: { staffId, clientId, date, status } });

    let appointments;
    if (staffId) {
      appointments = await storage.getAppointmentsByStaff(parseInt(staffId as string));
    } else if (clientId) {
      appointments = await storage.getAppointmentsByClient(parseInt(clientId as string));
    } else if (date) {
      appointments = await storage.getAppointmentsByDate(new Date(date as string));
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
    const conflictingAppointments = allAppointments.filter(apt => 
      apt.staffId === appointmentData.staffId &&
      apt.status !== 'cancelled' &&
      apt.status !== 'completed' &&
      ((new Date(apt.startTime) <= new Date(appointmentData.endTime) && 
        new Date(apt.endTime) >= new Date(appointmentData.startTime)))
    );

    if (conflictingAppointments.length > 0) {
      LoggerService.warn("Appointment time conflict detected", { 
        ...context, 
        conflictingAppointments: conflictingAppointments.map((apt: any) => apt.id) 
      });
      throw new ConflictError("Appointment time conflicts with existing appointments");
    }

    const newAppointment = await storage.createAppointment(appointmentData);

    LoggerService.logAppointment("created", newAppointment.id, context);

    // Send confirmation notifications
    try {
      const client = await storage.getUser(newAppointment.clientId);
      const staff = await storage.getUser(newAppointment.staffId);
      const service = await storage.getService(newAppointment.serviceId);

      if (client && staff && service) {
        // Send email confirmation
        if (client.emailAccountManagement) {
          await sendEmail({
            to: client.email,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@gloupheadspa.app',
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
        }

        // Send SMS confirmation
        if (client.smsAppointmentReminders && client.phone) {
          const message = `Your Glo Head Spa appointment for ${service.name} on ${new Date(newAppointment.startTime).toLocaleDateString()} at ${newAppointment.startTime} has been confirmed.`;
          await sendSMS(client.phone, message);
          LoggerService.logCommunication("sms", "appointment_confirmation_sent", { ...context, userId: client.id });
        }
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