import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertUserSchema,
  insertServiceCategorySchema,
  insertServiceSchema,
  insertStaffSchema,
  insertStaffServiceSchema,
  insertAppointmentSchema,
  insertMembershipSchema,
  insertClientMembershipSchema,
  insertPaymentSchema
} from "@shared/schema";

// Helper to validate request body using schema
function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: Function) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: "Invalid request body" });
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    const user = await storage.getUserByUsername(username);
    
    if (!user || user.password !== password) { // In real app, compare hashed passwords
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json(userWithoutPassword);
  });
  
  app.post("/api/register", validateBody(insertUserSchema), async (req, res) => {
    const { username, email } = req.body;
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }
    
    // Create new user with client role by default
    const newUser = await storage.createUser({
      ...req.body,
      role: "client"
    });
    
    // Remove password from response
    const { password, ...userWithoutPassword } = newUser;
    
    return res.status(201).json(userWithoutPassword);
  });
  
  // Service Categories routes
  app.get("/api/service-categories", async (req, res) => {
    const categories = await storage.getAllServiceCategories();
    return res.status(200).json(categories);
  });
  
  app.post("/api/service-categories", validateBody(insertServiceCategorySchema), async (req, res) => {
    const newCategory = await storage.createServiceCategory(req.body);
    return res.status(201).json(newCategory);
  });
  
  app.get("/api/service-categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const category = await storage.getServiceCategory(id);
    
    if (!category) {
      return res.status(404).json({ error: "Service category not found" });
    }
    
    return res.status(200).json(category);
  });
  
  app.put("/api/service-categories/:id", validateBody(insertServiceCategorySchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const updatedCategory = await storage.updateServiceCategory(id, req.body);
      return res.status(200).json(updatedCategory);
    } catch (error) {
      return res.status(404).json({ error: "Service category not found" });
    }
  });
  
  app.delete("/api/service-categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteServiceCategory(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Service category not found" });
    }
    
    return res.status(204).end();
  });
  
  // Services routes
  app.get("/api/services", async (req, res) => {
    const { categoryId } = req.query;
    
    let services;
    if (categoryId) {
      services = await storage.getServicesByCategory(parseInt(categoryId as string));
    } else {
      services = await storage.getAllServices();
    }
    
    return res.status(200).json(services);
  });
  
  app.post("/api/services", validateBody(insertServiceSchema), async (req, res) => {
    const newService = await storage.createService(req.body);
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
  
  app.put("/api/services/:id", validateBody(insertServiceSchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const updatedService = await storage.updateService(id, req.body);
      return res.status(200).json(updatedService);
    } catch (error) {
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
    const allStaff = await storage.getAllStaff();
    
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
    
    return res.status(200).json(staffWithUserDetails);
  });
  
  app.post("/api/staff", validateBody(insertStaffSchema), async (req, res) => {
    const { userId } = req.body;
    
    // Verify user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    
    // Update user role to staff if it's not already
    if (user.role !== "staff") {
      await storage.updateUser(userId, { role: "staff" });
    }
    
    const newStaff = await storage.createStaff(req.body);
    return res.status(201).json(newStaff);
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
  
  // Staff Services routes
  app.post("/api/staff-services", validateBody(insertStaffServiceSchema), async (req, res) => {
    const newStaffService = await storage.assignServiceToStaff(req.body);
    return res.status(201).json(newStaffService);
  });
  
  app.get("/api/staff/:staffId/services", async (req, res) => {
    const staffId = parseInt(req.params.staffId);
    const staffServices = await storage.getStaffServices(staffId);
    
    // Get detailed service information
    const servicesDetails = await Promise.all(
      staffServices.map(async (staffService) => {
        const service = await storage.getService(staffService.serviceId);
        return {
          staffServiceId: staffService.id,
          staffId: staffService.staffId,
          ...service
        };
      })
    );
    
    return res.status(200).json(servicesDetails);
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
    const { clientId, staffId, date } = req.query;
    
    let appointments;
    if (clientId) {
      appointments = await storage.getAppointmentsByClient(parseInt(clientId as string));
    } else if (staffId) {
      appointments = await storage.getAppointmentsByStaff(parseInt(staffId as string));
    } else if (date) {
      appointments = await storage.getAppointmentsByDate(new Date(date as string));
    } else {
      // Return today's appointments by default
      appointments = await storage.getAppointmentsByDate(new Date());
    }
    
    // Get detailed information for each appointment
    const detailedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
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
      })
    );
    
    return res.status(200).json(detailedAppointments);
  });
  
  app.post("/api/appointments", validateBody(insertAppointmentSchema), async (req, res) => {
    const newAppointment = await storage.createAppointment(req.body);
    return res.status(201).json(newAppointment);
  });
  
  app.get("/api/appointments/:id", async (req, res) => {
    const id = parseInt(req.params.id);
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
  
  app.put("/api/appointments/:id", validateBody(insertAppointmentSchema.partial()), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const updatedAppointment = await storage.updateAppointment(id, req.body);
      return res.status(200).json(updatedAppointment);
    } catch (error) {
      return res.status(404).json({ error: "Appointment not found" });
    }
  });
  
  app.delete("/api/appointments/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteAppointment(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    
    return res.status(204).end();
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
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: "Client ID is required" });
    }
    
    const clientMemberships = await storage.getClientMembershipsByClient(parseInt(clientId as string));
    
    // Get detailed membership information
    const detailedMemberships = await Promise.all(
      clientMemberships.map(async (clientMembership) => {
        const membership = await storage.getMembership(clientMembership.membershipId);
        return {
          ...clientMembership,
          membership
        };
      })
    );
    
    return res.status(200).json(detailedMemberships);
  });
  
  app.post("/api/client-memberships", validateBody(insertClientMembershipSchema), async (req, res) => {
    const newClientMembership = await storage.createClientMembership(req.body);
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
  
  // Payments routes
  app.post("/api/payments", validateBody(insertPaymentSchema), async (req, res) => {
    const newPayment = await storage.createPayment(req.body);
    return res.status(201).json(newPayment);
  });
  
  app.get("/api/payments", async (req, res) => {
    const { clientId } = req.query;
    
    if (!clientId) {
      return res.status(400).json({ error: "Client ID is required" });
    }
    
    const payments = await storage.getPaymentsByClient(parseInt(clientId as string));
    return res.status(200).json(payments);
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

  // Stripe payment intent creation
  app.post("/api/create-payment-intent", async (req, res) => {
    const { amount } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }
    
    // In a real app, this would call Stripe API
    // Since we don't have actual Stripe integration, we'll mock the response
    return res.status(200).json({
      clientSecret: "mock_client_secret_" + Math.random().toString(36).substring(2, 15)
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
