import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import type { IStorage } from "./storage.js";
import { z } from "zod";
import { LLMService } from "./llm-service.js";
import { SMSAutoRespondService } from "./sms-auto-respond-service.js";
import { AutoRespondService } from "./auto-respond-service.js";

// speakeasy and qrcode are optional; remove imports if not used in this module
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
  insertStaffScheduleSchema,
} from "../shared/schema.js";

// Import route registration functions
import { registerAuthRoutes } from "./routes/auth.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerAppointmentRoutes } from "./routes/appointments.js";
import { registerAppointmentPhotoRoutes } from "./routes/appointment-photos.js";
import { registerServiceRoutes } from "./routes/services.js";
import { registerProductRoutes } from "./routes/products.js";
import { registerLocationRoutes } from "./routes/locations.js";
import { registerPermissionRoutes } from "./routes/permissions.js";
import { registerBusinessSettingsRoutes } from "./routes/business-settings.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerPaymentRoutes } from "./routes/payments.js";
import { registerMarketingRoutes } from "./routes/marketing.js";
import { registerFormsRoutes } from "./routes/forms.js";
import { registerBusinessKnowledgeRoutes } from "./routes/business-knowledge.js";
import { registerLLMRoutes } from "./routes/llm.js";
import { registerSmsAutoRespondRoutes } from "./routes/sms-auto-respond.js";
import createTerminalRoutes from "./routes/terminal-routes.js";
import helcimPaymentsRouter from "./routes/payments/helcim.js";

// Custom schema for staff service with custom rates
const staffServiceWithRatesSchema = insertStaffServiceSchema.extend({
  customRate: z.number().nullable().optional(),
  customCommissionRate: z.number().nullable().optional(),
});

// Helcim is now the primary payment processor

export async function registerRoutes(app: Express, storage: IStorage, autoRenewalService?: any): Promise<Server> {
  if (!app || !storage) {
    throw new Error('App and storage are required');
  }

  // Create HTTP server
  const server = createServer(app);

  // Initialize LLM Service
  const llmService = new LLMService(storage);
  
  // Initialize SMS Auto-Respond Service
  const smsAutoRespondService = SMSAutoRespondService.getInstance(storage);
  
  // Initialize Email Auto-Respond Service
  const autoRespondService = new AutoRespondService(storage);

  // Register all route modules
  registerAuthRoutes(app, storage);
  registerUserRoutes(app, storage);
  registerAppointmentRoutes(app, storage);
  // Register appointment photos routes (used by AppointmentPhotos component)
  registerAppointmentPhotoRoutes(app, storage);
  registerServiceRoutes(app, storage);
  registerProductRoutes(app, storage);
  registerLocationRoutes(app, storage);
  registerPermissionRoutes(app);
  registerBusinessSettingsRoutes(app, storage);
  registerNotificationRoutes(app, storage);
  registerPaymentRoutes(app, storage);
  registerMarketingRoutes(app, storage);
  registerFormsRoutes(app, storage);
  registerBusinessKnowledgeRoutes(app, storage);
  registerLLMRoutes(app, storage);
  registerSmsAutoRespondRoutes(app, storage);

  // Register terminal routes
  app.use('/api/terminal', createTerminalRoutes(storage));
  // Enable helcim payment routes
  app.use('/api/payments/helcim', helcimPaymentsRouter);

  // Staff routes
  app.get("/api/staff", async (req: Request, res: Response) => {
    try {
      const staff = await storage.getAllStaff();
      res.json(staff);
    } catch (error) {
      console.error("Error getting staff:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get staff"
      });
    }
  });

  // Get a single staff member by id (needed by appointment details)
  app.get("/api/staff/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid staff id" });
      }

      let staffMember = await storage.getStaff(id);
      // Fallback: some data paths may pass userId instead of staff.id
      if (!staffMember && (storage as any).getStaffByUserId) {
        staffMember = await (storage as any).getStaffByUserId(id);
      }
      // Final fallback: search from list
      if (!staffMember && (storage as any).getAllStaff) {
        const list = await (storage as any).getAllStaff();
        staffMember = list.find((s: any) => s?.id === id);
      }

      if (!staffMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json(staffMember);
    } catch (error) {
      console.error("Error getting staff member:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get staff member",
      });
    }
  });

  // Return services assigned to a specific staff member (detailed service objects)
  app.get("/api/staff/:staffId/services", async (req: Request, res: Response) => {
    try {
      const staffId = parseInt(req.params.staffId);
      if (Number.isNaN(staffId)) {
        return res.status(400).json({ error: "Invalid staffId" });
      }

      // Get assignments
      const assignments = await storage.getStaffServices(staffId);

      // Map to full service objects and include assignment metadata
      const services = (
        await Promise.all(assignments.map(async (assignment) => {
          const service = await storage.getService(assignment.serviceId);
          if (!service) return null;
          return {
            ...service,
            staffServiceId: assignment.id,
            staffId: assignment.staffId,
            customRate: assignment.customRate ?? null,
            customCommissionRate: assignment.customCommissionRate ?? null,
          };
        }))
      ).filter(Boolean);

      return res.json(services);
    } catch (error) {
      console.error("Error getting services for staff:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get services for staff",
      });
    }
  });

  app.get("/api/rooms", async (req: Request, res: Response) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error getting rooms:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get rooms"
      });
    }
  });

  app.get("/api/devices", async (req: Request, res: Response) => {
    try {
      const devices = await storage.getAllDevices();
      res.json(devices);
    } catch (error) {
      console.error("Error getting devices:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get devices"
      });
    }
  });

  app.post("/api/staff", async (req: Request, res: Response) => {
    try {
      const staffData = req.body;
      
      // Validate the staff data using the schema
      const validatedData = insertStaffSchema.parse({
        userId: staffData.userId,
        title: staffData.title,
        bio: staffData.bio ?? null,
        locationId: staffData.locationId ?? null,
        commissionType: staffData.commissionType,
        commissionRate: staffData.commissionRate ?? null,
        hourlyRate: staffData.hourlyRate ?? null,
        fixedRate: staffData.fixedRate ?? null,
        // Intentionally omit photoUrl to avoid failing on DBs without this column
      });
      
      // Create the staff record
      const staff = await storage.createStaff(validatedData);
      
      res.status(201).json(staff);
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create staff member"
      });
    }
  });

  // Update a staff member
  app.patch("/api/staff/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid staff id" });
      }

      const existing = await storage.getStaff(id);
      if (!existing) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Accept both snake_case and camelCase from client
      const body = req.body || {};
      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.bio !== undefined) updateData.bio = body.bio;
      if (body.locationId !== undefined) updateData.locationId = body.locationId;
      if (body.commission_type !== undefined || body.commissionType !== undefined) {
        updateData.commissionType = body.commission_type ?? body.commissionType;
      }
      if (body.commission_rate !== undefined || body.commissionRate !== undefined) {
        updateData.commissionRate = body.commission_rate ?? body.commissionRate;
      }
      if (body.hourly_rate !== undefined || body.hourlyRate !== undefined) {
        updateData.hourlyRate = body.hourly_rate ?? body.hourlyRate;
      }
      if (body.fixed_rate !== undefined || body.fixedRate !== undefined) {
        updateData.fixedRate = body.fixed_rate ?? body.fixedRate;
      }
      // Omit photoUrl to avoid touching a column that may not exist in some deployments

      const updated = await storage.updateStaff(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update staff"
      });
    }
  });

  // Staff-services assignments
  app.get("/api/staff-services", async (req: Request, res: Response) => {
    try {
      const staffIdParam = req.query.staffId as string | undefined;
      if (staffIdParam) {
        const staffId = parseInt(staffIdParam);
        const list = await storage.getStaffServices(staffId);
        return res.json(list);
      }
      const list = await storage.getAllStaffServices();
      return res.json(list);
    } catch (error) {
      console.error("Error getting staff services:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get staff services",
      });
    }
  });

  app.post("/api/staff-services", async (req: Request, res: Response) => {
    try {
      // Validate input (staffId, serviceId required; custom fields optional)
      const data = staffServiceWithRatesSchema.parse(req.body);

      // If an assignment already exists, update custom rates instead of duplicating
      const existing = await storage.getStaffServiceAssignment(data.staffId, data.serviceId);
      if (existing) {
        const updated = await storage.updateStaffService(existing.id, {
          customRate: data.customRate ?? null,
          customCommissionRate: data.customCommissionRate ?? null,
        } as any);
        return res.status(200).json(updated);
      }

      const created = await storage.assignServiceToStaff({
        staffId: data.staffId,
        serviceId: data.serviceId,
        customRate: data.customRate ?? null,
        customCommissionRate: data.customCommissionRate ?? null,
      } as any);
      return res.status(201).json(created);
    } catch (error) {
      console.error("Error creating staff service assignment:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create staff service assignment",
      });
    }
  });

  app.delete("/api/staff-services/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getStaffServiceById(id);
      if (!existing) {
        return res.status(404).json({ error: "Staff service assignment not found" });
      }

      const ok = await storage.removeServiceFromStaff(existing.staffId, existing.serviceId);
      if (!ok) {
        return res.status(500).json({ error: "Failed to delete staff service assignment" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting staff service assignment:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete staff service assignment",
      });
    }
  });

  // Staff schedules
  app.get("/api/schedules", async (req: Request, res: Response) => {
    try {
      const staffIdParam = req.query.staffId as string | undefined;
      const locationIdParam = req.query.locationId as string | undefined;

      let schedules = await storage.getAllStaffSchedules();

      if (staffIdParam) {
        const staffId = parseInt(staffIdParam);
        schedules = schedules.filter(s => s.staffId === staffId);
      }

      if (locationIdParam) {
        const locationId = parseInt(locationIdParam);
        schedules = schedules.filter(s => s.locationId === locationId);
      }

      return res.json(schedules);
    } catch (error) {
      console.error("Error getting schedules:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get schedules",
      });
    }
  });

  app.post("/api/schedules", async (req: Request, res: Response) => {
    try {
      const data = insertStaffScheduleSchema.parse(req.body);
      const created = await storage.createStaffSchedule(data as any);
      return res.status(201).json(created);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create schedule",
      });
    }
  });

  app.put("/api/schedules/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Allow partial updates
      const partialSchema = insertStaffScheduleSchema.partial();
      const updateData = partialSchema.parse(req.body);
      const updated = await storage.updateStaffSchedule(id, updateData as any);
      return res.json(updated);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to update schedule",
      });
    }
  });

  app.delete("/api/schedules/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const ok = await storage.deleteStaffSchedule(id);
      if (!ok) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to delete schedule",
      });
    }
  });

  return server;
}