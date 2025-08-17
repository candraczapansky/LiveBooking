import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage";
import { z } from "zod";
import { insertServiceSchema, insertServiceCategorySchema } from "@shared/schema";
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  asyncHandler 
} from "../utils/errors";
import LoggerService, { getLogContext } from "../utils/logger";
import { validateRequest, requireAuth } from "../middleware/error-handler";
import cache, { invalidateCache } from "../utils/cache";

export function registerServiceRoutes(app: Express, storage: IStorage) {
  // Get all services
  app.get("/api/services", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { category, categoryId, active, staffId } = req.query;

    LoggerService.debug("Fetching services", { ...context, filters: { category, categoryId, active, staffId } });

    let services;
    // Support both 'category' and 'categoryId' parameters for backwards compatibility
    const filterCategoryId = categoryId || category;
    if (filterCategoryId) {
      const categoryServices = await storage.getServicesByCategory(parseInt(filterCategoryId as string));
      // Add category information for consistency
      const categoryInfo = await storage.getServiceCategory(parseInt(filterCategoryId as string));
      services = categoryServices.map(service => ({
        ...service,
        category: categoryInfo ? {
          id: categoryInfo.id,
          name: categoryInfo.name,
          description: categoryInfo.description
        } : null
      }));
    } else if (active !== undefined) {
      services = await storage.getServicesByStatus(active === 'true');
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
            ...service
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

    res.json(service);
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
      // Import db and locations table for direct access
      const { db } = await import("../db");
      const { locations } = await import("@shared/schema");
      
      const allLocations = await db.select().from(locations);
      const defaultLocation = allLocations.find((loc: any) => loc.isDefault) || allLocations[0];
      if (defaultLocation) {
        serviceData.locationId = defaultLocation.id;
        console.log("🔍 DEBUG: Set default locationId:", defaultLocation.id);
      }
    }

    const newService = await storage.createService(serviceData);

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

    const existingService = await storage.getService(serviceId);
    if (!existingService) {
      throw new NotFoundError("Service");
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingService.name) {
      const nameConflict = await storage.getServiceByName(updateData.name);
      if (nameConflict && nameConflict.id !== serviceId) {
        throw new ConflictError("Service with this name already exists");
      }
    }

    const updatedService = await storage.updateService(serviceId, updateData);

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

    const assignment = await storage.assignServiceToStaff(staffId, serviceId);

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