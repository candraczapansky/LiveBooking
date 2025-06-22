import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import Stripe from "stripe";
import {
  insertUserSchema,
  insertServiceCategorySchema,
  insertRoomSchema,
  insertDeviceSchema,
  insertServiceSchema,
  insertStaffSchema,
  insertStaffServiceSchema,
  insertAppointmentSchema,
  insertMembershipSchema,
  insertClientMembershipSchema,
  insertPaymentSchema,
  insertSavedPaymentMethodSchema,
  insertMarketingCampaignSchema
} from "@shared/schema";
import { sendSMS, isTwilioConfigured } from "./sms";

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
  customRate: z.number().optional(),
  customCommissionRate: z.number().optional(),
});

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_51RbYANP6cNUB4dEVf1nyRTSD5c5CeEntQf6BNkv7stG7VboQ1uRREl6GUdTe9v7nwC2ymFdbL8ns5wHNm0VhZckX00vFoAdCq8";
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

// Helper to validate request body using schema
function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: Function) => {
    try {
      console.log("Validating body with schema:", JSON.stringify(req.body, null, 2));
      req.body = schema.parse(req.body);
      console.log("Validation successful");
      next();
    } catch (error) {
      console.log("Validation failed:", error);
      res.status(400).json({ error: "Invalid request body" });
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add middleware to log all requests
  app.use((req, res, next) => {
    if (req.method === 'PUT' && req.url.includes('/services/')) {
      console.log(`PUT request received: ${req.method} ${req.url}`);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });

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
      
      // Verify current password (in real app, compare hashed passwords)
      if (user.password !== currentPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      // Update password (in real app, hash the new password)
      await storage.updateUser(userId, { password: newPassword });
      
      return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      return res.status(500).json({ error: "Failed to change password" });
    }
  });

  // Users routes
  app.get("/api/users", async (req, res) => {
    console.log("GET /api/users called");
    try {
      // Get all users from storage (this would typically be from a database)
      const users = Array.from((storage as any).users.values());
      console.log("Users found:", users.length);
      
      // Remove passwords from all users before sending
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      return res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
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
    const { categoryId } = req.query;
    
    let services;
    if (categoryId) {
      services = await storage.getServicesByCategory(parseInt(categoryId as string));
    } else {
      services = await storage.getAllServices();
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
    const allStaff = await storage.getAllStaff();
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
    const allStaffServices = Array.from((storage as any).staffServices.values());
    return res.status(200).json(allStaffServices);
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
    
    // Get detailed staff information
    const staffDetails = await Promise.all(
      staffServices.map(async (staffService) => {
        const staff = await storage.getStaff(staffService.staffId);
        const user = staff ? await storage.getUser(staff.userId) : null;
        return {
          staffServiceId: staffService.id,
          id: staff?.id,
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
    
    return res.status(200).json(staffDetails);
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
      appointments = Array.from((storage as any).appointments.values());
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

      // Update appointment status to paid
      await storage.updateAppointment(appointmentId, {
        status: 'confirmed',
        paymentStatus: 'paid'
      });

      // Create payment record for cash payment
      await storage.createPayment({
        clientId: appointment.clientId,
        amount: appointment.totalAmount || 0,
        method: 'cash',
        status: 'completed',
        appointmentId: appointmentId
      });

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

      // Check if gift card has sufficient balance
      const appointmentAmount = appointment.totalAmount || 0;
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

      // Update appointment status to paid
      await storage.updateAppointment(appointmentId, {
        status: 'confirmed',
        paymentStatus: 'paid'
      });

      // Create payment record for gift card payment
      await storage.createPayment({
        clientId: appointment.clientId,
        amount: appointmentAmount,
        method: 'gift_card',
        status: 'completed',
        appointmentId: appointmentId
      });

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

  // Stripe payment routes for appointment checkout
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, appointmentId, description } = req.body;
      
      if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          appointmentId: appointmentId?.toString() || "",
          type: "appointment_payment"
        },
        description: description || "Appointment Payment"
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({ 
        error: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Get all payments for verification
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      
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

  // Confirm payment and update appointment status
  app.post("/api/confirm-payment", async (req, res) => {
    try {
      const { paymentIntentId, appointmentId } = req.body;
      
      if (!paymentIntentId || !appointmentId) {
        return res.status(400).json({ error: "Payment intent ID and appointment ID are required" });
      }

      // Retrieve payment intent to verify it was successful
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Update appointment status to paid
        const appointment = await storage.getAppointment(appointmentId);
        if (appointment) {
          await storage.updateAppointment(appointmentId, {
            status: 'confirmed',
            paymentStatus: 'paid'
          });

          // Create payment record
          await storage.createPayment({
            clientId: appointment.clientId,
            amount: paymentIntent.amount / 100, // Convert back from cents
            method: 'card',
            status: 'completed',
            appointmentId: appointmentId,
            stripePaymentIntentId: paymentIntentId
          });

          res.json({ success: true, appointment });
        } else {
          res.status(404).json({ error: "Appointment not found" });
        }
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

  app.post("/api/marketing-campaigns", validateBody(insertMarketingCampaignSchema), async (req, res) => {
    try {
      // Convert sendDate string to Date object if provided
      const campaignData = { ...req.body };
      if (campaignData.sendDate && typeof campaignData.sendDate === 'string') {
        campaignData.sendDate = new Date(campaignData.sendDate);
      }
      
      const campaign = await storage.createMarketingCampaign(campaignData);
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

      if (campaign.type !== 'sms') {
        return res.status(400).json({ error: "This endpoint only supports SMS campaigns" });
      }

      // Check if Twilio is configured
      if (!isTwilioConfigured()) {
        return res.status(400).json({ 
          error: "SMS service not configured. Please configure Twilio credentials." 
        });
      }

      // Get recipients based on audience
      const recipients = await storage.getUsersByAudience(campaign.audience);
      
      if (recipients.length === 0) {
        return res.status(400).json({ error: "No recipients found for the selected audience" });
      }

      // Filter recipients with phone numbers
      const recipientsWithPhone = recipients.filter(user => user.phone);
      
      if (recipientsWithPhone.length === 0) {
        return res.status(400).json({ error: "No recipients have phone numbers" });
      }

      let sentCount = 0;
      let deliveredCount = 0;
      let failedCount = 0;

      // Send SMS to each recipient
      for (const recipient of recipientsWithPhone) {
        try {
          // Create recipient record
          const campaignRecipient = await storage.createMarketingCampaignRecipient({
            campaignId: campaign.id,
            userId: recipient.id,
            status: 'pending'
          });

          // Send SMS
          const smsResult = await sendSMS(recipient.phone!, campaign.content);
          
          if (smsResult.success) {
            sentCount++;
            deliveredCount++; // For SMS we assume delivered if sent successfully
            
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
              errorMessage: smsResult.error
            });
          }
        } catch (error: any) {
          failedCount++;
          console.error(`Error sending SMS to ${recipient.phone}:`, error);
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
        message: `SMS campaign sent successfully`,
        results: {
          totalRecipients: recipientsWithPhone.length,
          sentCount,
          deliveredCount,
          failedCount
        }
      });

    } catch (error: any) {
      console.error('Error sending SMS campaign:', error);
      res.status(500).json({ error: "Error sending SMS campaign: " + error.message });
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
    res.json({
      configured: isTwilioConfigured(),
      message: isTwilioConfigured() 
        ? "SMS service is configured and ready" 
        : "SMS service requires Twilio configuration (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)"
    });
  });

  // Setup SetupIntent for saving cards
  app.post("/api/create-setup-intent", async (req, res) => {
    try {
      const { clientId } = req.body;
      
      if (!clientId) {
        return res.status(400).json({ error: "Client ID is required" });
      }

      // Get or create Stripe customer
      const user = await storage.getUser(clientId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(clientId, customerId);
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });

      res.json({ 
        clientSecret: setupIntent.client_secret,
        customerId: customerId
      });
    } catch (error: any) {
      console.error('Setup intent creation error:', error);
      res.status(500).json({ 
        error: "Error creating setup intent: " + error.message 
      });
    }
  });

  // Save payment method after successful setup
  app.post("/api/save-payment-method", async (req, res) => {
    try {
      const { paymentMethodId, clientId } = req.body;
      
      if (!paymentMethodId || !clientId) {
        return res.status(400).json({ error: "Payment method ID and client ID are required" });
      }

      // Get payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      if (!paymentMethod.card) {
        return res.status(400).json({ error: "Invalid payment method" });
      }

      // Check if this is the first payment method for this client
      const existingMethods = await storage.getSavedPaymentMethodsByClient(clientId);
      const isDefault = existingMethods.length === 0;

      // Save to database
      const savedMethod = await storage.createSavedPaymentMethod({
        clientId: clientId,
        stripePaymentMethodId: paymentMethodId,
        cardBrand: paymentMethod.card.brand,
        cardLast4: paymentMethod.card.last4,
        cardExpMonth: paymentMethod.card.exp_month,
        cardExpYear: paymentMethod.card.exp_year,
        isDefault: isDefault
      });

      res.json(savedMethod);
    } catch (error: any) {
      console.error('Save payment method error:', error);
      res.status(500).json({ 
        error: "Error saving payment method: " + error.message 
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

      // Detach payment method from Stripe customer
      await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
      
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

  const httpServer = createServer(app);

  return httpServer;
}
