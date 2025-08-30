import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { z } from "zod";
import { insertServiceSchema, insertServiceCategorySchema } from "../../shared/schema.js";
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  asyncHandler 
} from "../utils/errors.js";
import LoggerService, { getLogContext } from "../utils/logger.js";
import { validateRequest, requireAuth } from "../middleware/error-handler.js";
import cache, { invalidateCache } from "../utils/cache.js";

export function registerServiceRoutes(app: Express, storage: IStorage) {
  // Get all services
  app.get("/api/services", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { category, categoryId, active, staffId, locationId } = req.query as any;

    LoggerService.debug("Fetching services", { ...context, filters: { category, categoryId, active, staffId, locationId } });

    // Derive add-on services from mapping. We expose this as a separate `isAddOn` flag
    // and do NOT conflate it with `isHidden` (which strictly controls online visibility).
    const addOnIdSet = new Set<number>();
    try {
      const addOnMap = await storage.getAddOnMapping();
      for (const key of Object.keys(addOnMap || {})) {
        const id = parseInt(key, 10);
        if (!Number.isNaN(id)) addOnIdSet.add(id);
      }
    } catch {}

    let services;
    // Support both 'category' and 'categoryId' parameters for backwards compatibility
    const filterCategoryId = categoryId || category;
    if (filterCategoryId && !locationId && !staffId) {
      const categoryServices = await storage.getServicesByCategory(parseInt(filterCategoryId as string));
      // Add category information for consistency
      const categoryInfo = await storage.getServiceCategory(parseInt(filterCategoryId as string));
      services = categoryServices.map(service => ({
        ...service,
        isHidden: !!(service as any)?.isHidden,
        isAddOn: addOnIdSet.has((service as any)?.id),
        category: categoryInfo ? {
          id: categoryInfo.id,
          name: categoryInfo.name,
          description: categoryInfo.description
        } : null
      }));
    } else if (active !== undefined) {
      services = (await storage.getServicesByStatus(active === 'true')).map((service: any) => ({
        ...service,
        isHidden: !!service?.isHidden,
        isAddOn: addOnIdSet.has(service?.id)
      }));
    } else if (staffId) {
      const staffServices = await storage.getStaffServices(parseInt(staffId as string));
      // Get detailed service information for staff
      services = await Promise.all(
        staffServices.map(async (staffService) => {
          const service = await storage.getService(staffService.serviceId);
          return {
            staffServiceId: staffService.id,
            staffId: staffService.staffId,
            customRate: staffService.customRate,
            customCommissionRate: staffService.customCommissionRate,
            ...service,
            isHidden: !!(service as any)?.isHidden,
            isAddOn: addOnIdSet.has((service as any)?.id)
          };
        })
      );
    } else if (locationId) {
      // Filter services to those offered by at least one staff at this location
      const locId = parseInt(locationId as string);
      const allStaff = await storage.getAllStaff();
      const staffAtLocation = allStaff.filter((s: any) => String(s.locationId) === String(locId));
      const staffIds = staffAtLocation.map((s: any) => s.id);
      const allAssignments = await storage.getAllStaffServices();
      const serviceIdsAtLocation = new Set<number>(
        allAssignments
          .filter((a: any) => staffIds.includes(a.staffId))
          .map((a: any) => a.serviceId)
      );
      const base = filterCategoryId
        ? await storage.getServicesByCategory(parseInt(filterCategoryId as string))
        : await storage.getAllServices();
      // First, only services that at least one staff at this location can perform
      let filtered = base.filter((svc: any) => serviceIdsAtLocation.has(svc.id));
      // Then, apply explicit service->locations restriction mapping (if configured)
      try {
        const locationMap = await storage.getServiceLocationMapping();
        filtered = filtered.filter((svc: any) => {
          const key = String(svc.id);
          if (!Object.prototype.hasOwnProperty.call(locationMap, key)) return true; // unrestricted
          const allowed = locationMap[key] || [];
          return allowed.map(Number).includes(locId);
        });
      } catch {}
      services = await Promise.all(
        filtered.map(async (service: any) => {
          const category = await storage.getServiceCategory(service.categoryId);
          return {
            ...service,
            isHidden: !!service?.isHidden,
            isAddOn: addOnIdSet.has(service?.id),
            category: category ? {
              id: category.id,
              name: category.name,
              description: category.description
            } : null
          };
        })
      );
    } else {
      // Fetch all services with category information
      const allServices = await storage.getAllServices();
      services = await Promise.all(
        allServices.map(async (service) => {
          const category = await storage.getServiceCategory(service.categoryId);
          return {
            ...service,
            isHidden: !!(service as any)?.isHidden,
            isAddOn: addOnIdSet.has((service as any)?.id),
            category: category ? {
              id: category.id,
              name: category.name,
              description: category.description
            } : null
          };
        })
      );
    }

    LoggerService.info("Services fetched", { ...context, count: services.length });
    res.json(services);
  }));

  // Get service by ID
  app.get("/api/services/:id", asyncHandler(async (req: Request, res: Response) => {
    const serviceId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.debug("Fetching service", { ...context, serviceId });

    const service = await storage.getService(serviceId);
    if (!service) {
      throw new NotFoundError("Service");
    }

    // Also include derived isAddOn flag for editor UIs (presence of mapping entry)
    let isAddOn = false;
    try {
      const map = await storage.getAddOnMapping();
      isAddOn = Object.prototype.hasOwnProperty.call(map || {}, String(serviceId));
    } catch {}

    res.json({ ...service, isAddOn });
  }));

  // -----------------------------
  // Service-Location mapping endpoints
  // Returns array of locationIds that explicitly offer this service. If empty or missing,
  // the service is considered offered at all locations, subject to staff availability.
  app.get("/api/services/:id/locations", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const service = await storage.getService(id);
    if (!service) throw new NotFoundError("Service");
    const map = await storage.getServiceLocationMapping();
    const hasRestriction = Object.prototype.hasOwnProperty.call(map, String(id));
    const locs = map[String(id)] || [];
    res.json({ serviceId: id, locationIds: locs, isRestricted: !!hasRestriction });
  }));

  // Replace locations offering this service
  app.post("/api/services/:id/locations", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { locationIds } = req.body || {};
    if (!Array.isArray(locationIds)) {
      throw new ValidationError("locationIds must be an array of IDs");
    }
    const service = await storage.getService(id);
    if (!service) throw new NotFoundError("Service");
    const parsed = locationIds.map((n: any) => parseInt(n)).filter((n: any) => !Number.isNaN(n));
    if (parsed.length === 0) {
      // Clearing restrictions (offer at all locations)
      const map = await storage.getServiceLocationMapping();
      if (Object.prototype.hasOwnProperty.call(map, String(id))) {
        delete map[String(id)];
        await storage.setServiceLocationMapping(map);
      }
      return res.json({ success: true, cleared: true });
    }
    await storage.setLocationsForService(id, parsed);
    res.json({ success: true, cleared: false });
  }));

  // Add a single location to this service
  app.post("/api/services/:id/locations/:locationId", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const locationId = parseInt(req.params.locationId);
    const service = await storage.getService(id);
    if (!service) throw new NotFoundError("Service");
    await storage.addLocationToService(id, locationId);
    res.json({ success: true });
  }));

  // Remove a single location from this service
  app.delete("/api/services/:id/locations/:locationId", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const locationId = parseInt(req.params.locationId);
    const service = await storage.getService(id);
    if (!service) throw new NotFoundError("Service");
    await storage.removeLocationFromService(id, locationId);
    res.json({ success: true });
  }));

  // Create new service
  app.post("/api/services", asyncHandler(async (req: Request, res: Response) => {
    console.log("🔍 DEBUG: Service creation endpoint hit!");
    console.log("🔍 DEBUG: Raw request body:", JSON.stringify(req.body, null, 2));
    console.log("🔍 DEBUG: Request headers:", JSON.stringify(req.headers, null, 2));
    
    // Manual validation with detailed error reporting
    try {
      const validationResult = insertServiceSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("🔍 DEBUG: Validation failed!");
        console.log("🔍 DEBUG: Validation errors:", JSON.stringify(validationResult.error.errors, null, 2));
        return res.status(400).json({
          error: "ValidationError",
          message: "Request validation failed",
          details: validationResult.error.errors,
        });
      }
      console.log("🔍 DEBUG: Validation passed!");
      req.body = validationResult.data;
    } catch (validationError) {
      console.log("🔍 DEBUG: Validation exception:", validationError);
      return res.status(400).json({
        error: "ValidationError", 
        message: "Validation exception occurred",
        details: validationError
      });
    }
    
    const context = getLogContext(req);
    const serviceData = req.body;

    console.log("🔍 DEBUG: Service creation validated data:", JSON.stringify(serviceData, null, 2));
    LoggerService.info("Creating new service", { ...context, serviceData });

    // Check if service with same name already exists
    const existingService = await storage.getServiceByName(serviceData.name);
    if (existingService) {
      throw new ConflictError("Service with this name already exists");
    }

    // Set default location if not provided
    if (!serviceData.locationId) {
      // If a room is selected, prefer the room's location
      if (serviceData.roomId) {
        try {
          const room = await storage.getRoom(parseInt(String(serviceData.roomId)));
          if (room?.locationId) {
            serviceData.locationId = room.locationId;
            console.log("🔍 DEBUG: Set locationId from room:", room.locationId);
          }
        } catch {}
      }
      // Otherwise fall back to default location
      if (!serviceData.locationId) {
        const { db } = await import("../db.js");
        const { locations } = await import("../../shared/schema.js");
        const allLocations = await db.select().from(locations);
        const defaultLocation = allLocations.find((loc: any) => loc.isDefault) || allLocations[0];
        if (defaultLocation) {
          serviceData.locationId = defaultLocation.id;
          console.log("🔍 DEBUG: Set default locationId:", defaultLocation.id);
        }
      }
    } else if (serviceData.locationId && serviceData.roomId) {
      // If both provided and mismatch, align service location to room's location when available
      try {
        const room = await storage.getRoom(parseInt(String(serviceData.roomId)));
        if (room?.locationId && Number(serviceData.locationId) !== Number(room.locationId)) {
          console.warn("Service locationId mismatch with selected room. Aligning to room's location.", {
            serviceLocationId: serviceData.locationId,
            roomLocationId: room.locationId,
          });
          serviceData.locationId = room.locationId;
        }
      } catch {}
    }

    // Drop optional fields that may not exist in some DBs (defensive)
    const { description: _desc, ...safeServiceData } = serviceData as any;

    // Attempt to create the service. If the DB is missing optional columns
    // due to an older schema, gracefully retry without them.
    let newService;
    let attemptData: any = { ...safeServiceData };
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        newService = await storage.createService(attemptData);
        break;
      } catch (err: any) {
        const message = typeof err?.message === 'string' ? err.message : '';
        // Handle missing columns defensively
        const missingColMatch = message.match(/column\s+\"([a-z_]+)\"\s+of\s+relation\s+\"services\"\s+does\s+not\s+exist/i);
        if (missingColMatch) {
          const missingCol = missingColMatch[1];
          const colToProp: Record<string, string> = {
            location_id: 'locationId',
            room_id: 'roomId',
            buffer_time_before: 'bufferTimeBefore',
            buffer_time_after: 'bufferTimeAfter',
            is_hidden: 'isHidden',
            color: 'color',
            description: 'description',
          };
          const prop = colToProp[missingCol];
          if (prop && prop in attemptData) {
            console.warn(`Service creation failed due to missing column ${missingCol}. Retrying without ${prop}.`);
            const { [prop]: _removed, ...rest } = attemptData;
            attemptData = rest;
            continue;
          }
        }
        if (/column\s+\"description\"\s+does\s+not\s+exist/i.test(message)) {
          // Already dropped above, but keep for explicit clarity
          continue;
        }
        throw err;
      }
    }
    if (!newService) {
      throw new Error('Failed to create service after removing optional fields');
    }

    // Do not auto-create add-on mapping when a service is hidden; add-ons are managed explicitly via add-on endpoints

    // Invalidate relevant caches
    invalidateCache('services');
    invalidateCache('api:GET:/api/services');

    LoggerService.info("Service created", { ...context, serviceId: newService.id });

    res.status(201).json(newService);
  }));

  // Update service
  app.put("/api/services/:id", validateRequest(insertServiceSchema.partial()), asyncHandler(async (req: Request, res: Response) => {
    const serviceId = parseInt(req.params.id);
    const context = getLogContext(req);
    const updateData = req.body;

    LoggerService.info("Updating service", { ...context, serviceId, updateData });

    // Ensure required schema exists at runtime (in case of accidental column removal)
    try {
      const { db } = await import("../db.js");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS location_id INTEGER`);
    } catch (e) {
      // Non-fatal; continue and let downstream fallbacks handle if needed
    }

    const existingService = await storage.getService(serviceId);
    if (!existingService) {
      throw new NotFoundError("Service");
    }

    // If no locationId provided in update, maintain existing or set default
    try {
      if ((updateData as any).locationId === undefined || (updateData as any).locationId === null) {
        (updateData as any).locationId = existingService.locationId;
        if (!(updateData as any).locationId) {
          const { db } = await import("../db.js");
          const { locations } = await import("../../shared/schema.js");
          const allLocations = await db.select().from(locations);
          const defaultLocation = allLocations.find((loc: any) => loc.isDefault) || allLocations[0];
          if (defaultLocation) {
            (updateData as any).locationId = defaultLocation.id;
          }
        }
      }
    } catch {}

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingService.name) {
      const nameConflict = await storage.getServiceByName(updateData.name);
      if (nameConflict && nameConflict.id !== serviceId) {
        throw new ConflictError("Service with this name already exists");
      }
    }

    // Defensive update: handle older DBs missing optional columns by retrying without them
    let updatedService;
    let attemptData: any = { ...updateData };
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        updatedService = await storage.updateService(serviceId, attemptData);
        break;
      } catch (err: any) {
        const message = typeof err?.message === 'string' ? err.message : '';
        // Match both styles: with or without "of relation \"services\""
        const missingColMatch = message.match(/column\s+\"([a-z_]+)\"(?:\s+of\s+relation\s+\"services\")?\s+does\s+not\s+exist/i);
        if (missingColMatch) {
          const missingCol = missingColMatch[1];
          const colToProp: Record<string, string> = {
            location_id: 'locationId',
            room_id: 'roomId',
            buffer_time_before: 'bufferTimeBefore',
            buffer_time_after: 'bufferTimeAfter',
            is_hidden: 'isHidden',
            color: 'color',
            description: 'description',
          };
          const prop = colToProp[missingCol];
          if (prop && prop in attemptData) {
            console.warn(`Service update failed due to missing column ${missingCol}. Retrying without ${prop}.`);
            const { [prop]: _removed, ...rest } = attemptData;
            attemptData = rest;
            continue;
          }
        }
        if (/column\s+\"description\"\s+does\s+not\s+exist/i.test(message)) {
          // Already handled above, but keep for explicit clarity
          continue;
        }
        throw err;
      }
    }
    if (!updatedService) {
      throw new Error('Failed to update service after removing optional fields');
    }

    // Invalidate relevant caches
    invalidateCache('services');
    invalidateCache(`service:${serviceId}`);

    LoggerService.info("Service updated", { ...context, serviceId });

    res.json(updatedService);
  }));

  // Delete service
  app.delete("/api/services/:id", asyncHandler(async (req: Request, res: Response) => {
    const serviceId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.info("Deleting service", { ...context, serviceId });

    const service = await storage.getService(serviceId);
    if (!service) {
      throw new NotFoundError("Service");
    }

    // Check if service is being used in appointments
    const appointmentsWithService = await storage.getAppointmentsByService(serviceId);
    if (appointmentsWithService.length > 0) {
      throw new ConflictError("Cannot delete service that has associated appointments");
    }

    // Detach any staff-service assignments referencing this service to satisfy FK constraints
    try {
      const assignments = await storage.getStaffServicesByService(serviceId);
      for (const assignment of assignments) {
        await storage.removeServiceFromStaff(assignment.staffId as any, assignment.serviceId as any);
      }
    } catch (err) {
      // Log and continue; if FK persists, DB will surface error and be handled by error middleware
      console.warn("Failed to detach some staff-service assignments before service deletion", { serviceId, err });
    }

    // Clean up add-on mappings if they reference this service (either as add-on or base)
    try {
      const addOnMap = await storage.getAddOnMapping();
      let changed = false;
      // If the service is an add-on, remove its mapping entirely
      if (addOnMap[String(serviceId)]) {
        delete addOnMap[String(serviceId)];
        changed = true;
      }
      // If the service appears as a base service for any add-on, remove it from those arrays
      for (const key of Object.keys(addOnMap)) {
        const before = addOnMap[key].length;
        addOnMap[key] = addOnMap[key].filter((id) => Number(id) !== Number(serviceId));
        if (addOnMap[key].length !== before) changed = true;
      }
      if (changed) {
        await storage.setAddOnMapping(addOnMap);
      }
    } catch (err) {
      console.warn("Failed to clean add-on service mapping before service deletion", { serviceId, err });
    }

    await storage.deleteService(serviceId);

    // Invalidate relevant caches
    invalidateCache('services');
    invalidateCache(`service:${serviceId}`);

    LoggerService.info("Service deleted", { ...context, serviceId });

    res.json({ success: true, message: "Service deleted successfully" });
  }));

  // Get service categories
  app.get("/api/service-categories", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);

    LoggerService.debug("Fetching service categories", context);

    const categories = await storage.getAllServiceCategories();

    LoggerService.info("Service categories fetched", { ...context, count: categories.length });
    res.json(categories);
  }));

  // Get service category by ID
  app.get("/api/service-categories/:id", asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.debug("Fetching service category by ID", { ...context, categoryId });

    const category = await storage.getServiceCategory(categoryId);
    if (!category) {
      throw new NotFoundError("Service category");
    }

    LoggerService.info("Service category fetched", { ...context, categoryId });
    res.json(category);
  }));

  // Create service category
  app.post("/api/service-categories", validateRequest(insertServiceCategorySchema), asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const categoryData = req.body;

    LoggerService.info("Creating service category", { ...context, categoryData });

    // Check if category with same name already exists
    const existingCategory = await storage.getServiceCategoryByName(categoryData.name);
    if (existingCategory) {
      throw new ConflictError("Category with this name already exists");
    }

    const newCategory = await storage.createServiceCategory(categoryData);

    // Invalidate relevant caches
    invalidateCache('service-categories');

    LoggerService.info("Service category created", { ...context, categoryId: newCategory.id });

    res.status(201).json(newCategory);
  }));

  // Update service category
  app.put("/api/service-categories/:id", validateRequest(insertServiceCategorySchema.partial()), asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id);
    const context = getLogContext(req);
    const updateData = req.body;

    LoggerService.info("Updating service category", { ...context, categoryId, updateData });

    const existingCategory = await storage.getServiceCategory(categoryId);
    if (!existingCategory) {
      throw new NotFoundError("Service category");
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingCategory.name) {
      const nameConflict = await storage.getServiceCategoryByName(updateData.name);
      if (nameConflict && nameConflict.id !== categoryId) {
        throw new ConflictError("Category with this name already exists");
      }
    }

    const updatedCategory = await storage.updateServiceCategory(categoryId, updateData);

    // Invalidate relevant caches
    invalidateCache('service-categories');
    invalidateCache(`category:${categoryId}`);

    LoggerService.info("Service category updated", { ...context, categoryId });

    res.json(updatedCategory);
  }));

  // Delete service category
  app.delete("/api/service-categories/:id", asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.info("Deleting service category", { ...context, categoryId });

    const category = await storage.getServiceCategory(categoryId);
    if (!category) {
      throw new NotFoundError("Service category");
    }

    // Check if category is being used by services
    const servicesInCategory = await storage.getServicesByCategory(categoryId);
    if (servicesInCategory.length > 0) {
      throw new ConflictError("Cannot delete category that has associated services");
    }

    await storage.deleteServiceCategory(categoryId);

    // Invalidate relevant caches
    invalidateCache('service-categories');
    invalidateCache(`category:${categoryId}`);

    LoggerService.info("Service category deleted", { ...context, categoryId });

    res.json({ success: true, message: "Service category deleted successfully" });
  }));

  // Get services by staff member - Route moved to main routes.ts to avoid conflicts

  // Assign service to staff member
  app.post("/api/staff/:staffId/services/:serviceId", asyncHandler(async (req: Request, res: Response) => {
    const staffId = parseInt(req.params.staffId);
    const serviceId = parseInt(req.params.serviceId);
    const context = getLogContext(req);

    LoggerService.info("Assigning service to staff", { ...context, staffId, serviceId });

    // Check if staff member exists
    const staff = await storage.getUser(staffId);
    if (!staff || staff.role !== 'staff') {
      throw new NotFoundError("Staff member");
    }

    // Check if service exists
    const service = await storage.getService(serviceId);
    if (!service) {
      throw new NotFoundError("Service");
    }

    // Check if assignment already exists
    const existingAssignment = await storage.getStaffServiceAssignment(staffId, serviceId);
    if (existingAssignment) {
      throw new ConflictError("Service is already assigned to this staff member");
    }

    const assignment = await storage.assignServiceToStaff({ staffId, serviceId } as any);

    LoggerService.info("Service assigned to staff", { ...context, staffId, serviceId, assignmentId: assignment.id });

    res.status(201).json(assignment);
  }));

  // Remove service from staff member
  app.delete("/api/staff/:staffId/services/:serviceId", asyncHandler(async (req: Request, res: Response) => {
    const staffId = parseInt(req.params.staffId);
    const serviceId = parseInt(req.params.serviceId);
    const context = getLogContext(req);

    LoggerService.info("Removing service from staff", { ...context, staffId, serviceId });

    const assignment = await storage.getStaffServiceAssignment(staffId, serviceId);
    if (!assignment) {
      throw new NotFoundError("Service assignment");
    }

    await storage.removeServiceFromStaff(staffId, serviceId);

    LoggerService.info("Service removed from staff", { ...context, staffId, serviceId });

    res.json({ success: true, message: "Service removed from staff member" });
  }));

  // Get service availability
  app.get("/api/services/:id/availability", asyncHandler(async (req: Request, res: Response) => {
    const serviceId = parseInt(req.params.id);
    const { date, staffId } = req.query;
    const context = getLogContext(req);

    LoggerService.debug("Checking service availability", { ...context, serviceId, date, staffId });

    const service = await storage.getService(serviceId);
    if (!service) {
      throw new NotFoundError("Service");
    }

    // Get available time slots for the service
    const availableSlots = await storage.getServiceAvailability(
      serviceId,
      date ? new Date(date as string) : new Date(),
      staffId ? parseInt(staffId as string) : undefined
    );

    res.json({
      service,
      availableSlots,
      date: date || new Date().toISOString().split('T')[0]
    });
  }));

  // Get popular services
  app.get("/api/services/popular", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { limit = 10, period = '30' } = req.query; // period in days

    LoggerService.debug("Fetching popular services", { ...context, limit, period });

    const popularServices = await storage.getPopularServices(
      parseInt(limit as string),
      parseInt(period as string)
    );

    LoggerService.info("Popular services fetched", { ...context, count: popularServices.length });
    res.json(popularServices);
  }));

  // Get service statistics
  app.get("/api/services/:id/statistics", asyncHandler(async (req: Request, res: Response) => {
    const serviceId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;
    const context = getLogContext(req);

    LoggerService.debug("Fetching service statistics", { ...context, serviceId, startDate, endDate });

    const service = await storage.getService(serviceId);
    if (!service) {
      throw new NotFoundError("Service");
    }

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate as string) : new Date();

    const statistics = await storage.getServiceStatistics(serviceId, start, end);

    res.json({
      service,
      statistics,
      period: { start, end }
    });
  }));

  // -----------------------------
  // Add-on mapping endpoints
  // Map add-on service (hidden) to one or more base services it applies to
  app.get("/api/services/:id/add-on-bases", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const bases = await storage.getBaseServicesForAddOn(id);
    res.json({ addOnServiceId: id, baseServiceIds: bases });
  }));

  app.post("/api/services/:id/add-on-bases", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { baseServiceIds } = req.body || {};
    if (!Array.isArray(baseServiceIds)) {
      throw new ValidationError("baseServiceIds must be an array of IDs");
    }
    const parsed = baseServiceIds.map((n: any) => parseInt(n)).filter((n: any) => !Number.isNaN(n));
    // Persist mapping even if empty; presence of mapping marks it as an add-on.
    await storage.setBaseServicesForAddOn(id, parsed);
    res.json({ success: true });
  }));

  // Remove add-on mapping entirely (service is no longer an add-on)
  app.delete("/api/services/:id/add-on-bases", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    try {
      const map = await storage.getAddOnMapping();
      if (Object.prototype.hasOwnProperty.call(map, String(id))) {
        delete map[String(id)];
        await storage.setAddOnMapping(map);
      }
    } catch {}
    res.json({ success: true });
  }));

  app.post("/api/services/:id/add-on-bases/:baseId", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const baseId = parseInt(req.params.baseId);
    await storage.addBaseServiceToAddOn(id, baseId);
    res.json({ success: true });
  }));

  app.delete("/api/services/:id/add-on-bases/:baseId", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const baseId = parseInt(req.params.baseId);
    await storage.removeBaseServiceFromAddOn(id, baseId);
    res.json({ success: true });
  }));

  // Bulk update services
  app.put("/api/services/bulk-update", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { serviceIds, updates } = req.body;

    LoggerService.info("Bulk updating services", { ...context, serviceIds, updates });

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw new ValidationError("Service IDs array is required");
    }

    const results = [];
    for (const serviceId of serviceIds) {
      try {
        const updatedService = await storage.updateService(serviceId, updates);
        results.push({ serviceId, success: true, service: updatedService });
      } catch (error: any) {
        results.push({ serviceId, success: false, error: error.message });
      }
    }

    // Invalidate relevant caches
    invalidateCache('services');

    LoggerService.info("Bulk service update completed", { ...context, total: serviceIds.length, successful: results.filter(r => r.success).length });

    res.json({ results });
  }));

  // Import services from CSV
  app.post("/api/services/import", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { services } = req.body;

    LoggerService.info("Importing services", { ...context, count: services.length });

    if (!Array.isArray(services) || services.length === 0) {
      throw new ValidationError("Services array is required");
    }

    const results = [];
    for (const serviceData of services) {
      try {
        // Validate service data
        const validatedData = insertServiceSchema.parse(serviceData);
        
        // Check for existing service
        const existingService = await storage.getServiceByName(validatedData.name);
        if (existingService) {
          results.push({ name: validatedData.name, success: false, error: "Service already exists" });
          continue;
        }

        const newService = await storage.createService(validatedData);
        results.push({ name: validatedData.name, success: true, service: newService });
      } catch (error: any) {
        results.push({ name: serviceData.name || 'Unknown', success: false, error: error.message });
      }
    }

    // Invalidate relevant caches
    invalidateCache('services');

    LoggerService.info("Service import completed", { ...context, total: services.length, successful: results.filter(r => r.success).length });

    res.json({ results });
  }));
} 