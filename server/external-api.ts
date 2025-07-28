import { Express } from 'express';
import { IStorage } from './storage';
import { validateApiKey, optionalApiKey } from './middleware/auth';
import { z } from 'zod';

// Validation schemas
const appointmentWebhookSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  clientId: z.number().optional(),
  serviceId: z.number().optional(),
  staffId: z.number().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).default('confirmed'),
  notes: z.string().optional(),
  externalAppointmentId: z.string().optional(),
  clientInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional()
  }).optional(),
  serviceInfo: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().min(0),
    duration: z.number().min(1),
    categoryName: z.string().optional(),
    color: z.string().optional()
  }).optional(),
  staffInfo: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    title: z.string().optional(),
    bio: z.string().optional()
  }).optional()
});

export function registerExternalRoutes(app: Express, storage: IStorage) {
  
  // Health check endpoint (no auth required)
  app.get("/api/external/health", async (req, res) => {
    try {
      console.log('External API: Health check request received', {
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin'),
        authenticated: (req as any).authenticated || false
      });
      
      res.json({
        success: true,
        status: "External API is healthy",
        timestamp: new Date().toISOString(),
        authenticated: (req as any).authenticated || false,
        endpoints: {
          staffAvailability: "/api/external/staff-availability",
          services: "/api/external/services", 
          serviceCategories: "/api/external/service-categories",
          appointmentWebhook: "/api/appointments/webhook"
        }
      });
    } catch (error: any) {
      console.error('Error in health check:', error);
      res.status(500).json({ 
        error: "Health check failed",
        details: error.message 
      });
    }
  });

  // Staff availability endpoint (optional auth)
  app.get("/api/external/staff-availability", optionalApiKey, async (req, res) => {
    try {
      console.log('External API: Staff availability request received', { 
        query: req.query, 
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin'),
        authenticated: (req as any).authenticated
      });
      
      const { date, staffId } = req.query;
      
      // Validate staffId if provided
      if (staffId && isNaN(parseInt(staffId as string))) {
        return res.status(400).json({
          error: 'Invalid staffId parameter',
          message: 'staffId must be a valid number'
        });
      }
      
      // Get all staff with their user details
      const allStaff = await storage.getAllStaff();
      console.log(`External API: Found ${allStaff.length} staff members`);
      
      const staffWithDetails = await Promise.all(
        allStaff.map(async (staff) => {
          const user = await storage.getUser(staff.userId);
          const schedules = await storage.getStaffSchedulesByStaffId(staff.id);
          const services = await storage.getStaffServices(staff.id);
          
          // Get detailed service information
          const serviceDetails = await Promise.all(
            services.map(async (staffService) => {
              const service = await storage.getService(staffService.serviceId);
              const category = service ? await storage.getServiceCategory(service.categoryId) : null;
              return {
                id: service?.id,
                name: service?.name,
                duration: service?.duration,
                price: service?.price,
                category: category?.name,
                customRate: staffService.customRate,
                customCommissionRate: staffService.customCommissionRate
              };
            })
          );
          
          return {
            id: staff.id,
            userId: staff.userId,
            title: staff.title,
            commissionType: staff.commissionType,
            commissionRate: staff.commissionRate,
            hourlyRate: staff.hourlyRate,
            fixedRate: staff.fixedRate,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone
            } : null,
            schedules: schedules,
            services: serviceDetails.filter(s => s.id) // Remove null services
          };
        })
      );
      
      // Filter by specific staff member if requested
      const result = staffId 
        ? staffWithDetails.filter(staff => staff.id === parseInt(staffId as string))
        : staffWithDetails;
      
      console.log(`External API: Returning ${result.length} staff members`);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        filters: { date, staffId },
        authenticated: (req as any).authenticated
      });
    } catch (error: any) {
      console.error('Error fetching staff availability:', error);
      res.status(500).json({ 
        error: "Failed to fetch staff availability",
        details: error.message 
      });
    }
  });

  // Services endpoint (optional auth)
  app.get("/api/external/services", optionalApiKey, async (req, res) => {
    try {
      console.log('External API: Services request received', { 
        query: req.query, 
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin'),
        authenticated: (req as any).authenticated
      });
      
      const { categoryId, staffId } = req.query;
      
      // Validate query parameters
      if (categoryId && isNaN(parseInt(categoryId as string))) {
        return res.status(400).json({
          error: 'Invalid categoryId parameter',
          message: 'categoryId must be a valid number'
        });
      }
      
      if (staffId && isNaN(parseInt(staffId as string))) {
        return res.status(400).json({
          error: 'Invalid staffId parameter', 
          message: 'staffId must be a valid number'
        });
      }
      
      // Get all services with categories and assigned staff
      const allServices = await storage.getAllServices();
      console.log(`External API: Found ${allServices.length} services`);
      
      const servicesWithDetails = await Promise.all(
        allServices.map(async (service) => {
          const category = await storage.getServiceCategory(service.categoryId);
          const staffAssignments = await storage.getStaffServicesByService(service.id);
          
          // Get staff details for each assignment
          const assignedStaff = await Promise.all(
            staffAssignments.map(async (assignment) => {
              const staff = await storage.getStaff(assignment.staffId);
              const user = staff ? await storage.getUser(staff.userId) : null;
              return {
                staffId: staff?.id,
                customRate: assignment.customRate,
                customCommissionRate: assignment.customCommissionRate,
                staff: staff ? {
                  id: staff.id,
                  title: staff.title,
                  user: user ? {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email
                  } : null
                } : null
              };
            })
          );
          
          return {
            id: service.id,
            name: service.name,
            description: service.description,
            duration: service.duration,
            price: service.price,
            color: service.color,
            bufferTimeBefore: service.bufferTimeBefore,
            bufferTimeAfter: service.bufferTimeAfter,
            category: category ? {
              id: category.id,
              name: category.name,
              description: category.description
            } : null,
            assignedStaff: assignedStaff.filter(a => a.staff)
          };
        })
      );
      
      // Apply filters
      let filteredServices = servicesWithDetails;
      
      if (categoryId) {
        filteredServices = filteredServices.filter(service => 
          service.category?.id === parseInt(categoryId as string)
        );
      }
      
      if (staffId) {
        filteredServices = filteredServices.filter(service =>
          service.assignedStaff.some(assignment => 
            assignment.staffId === parseInt(staffId as string)
          )
        );
      }
      
      console.log(`External API: Returning ${filteredServices.length} services`);
      
      res.json({
        success: true,
        data: filteredServices,
        timestamp: new Date().toISOString(),
        filters: { categoryId, staffId },
        authenticated: (req as any).authenticated
      });
    } catch (error: any) {
      console.error('Error fetching services:', error);
      res.status(500).json({ 
        error: "Failed to fetch services",
        details: error.message 
      });
    }
  });

  // Service categories endpoint (optional auth)
  app.get("/api/external/service-categories", optionalApiKey, async (req, res) => {
    try {
      console.log('External API: Service categories request received', {
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin'),
        authenticated: (req as any).authenticated
      });
      
      const categories = await storage.getAllServiceCategories();
      
      res.json({
        success: true,
        data: categories,
        timestamp: new Date().toISOString(),
        authenticated: (req as any).authenticated
      });
    } catch (error: any) {
      console.error('Error fetching service categories:', error);
      res.status(500).json({ 
        error: "Failed to fetch service categories",
        details: error.message 
      });
    }
  });

  // Appointment webhook endpoint (requires auth)
  app.post("/api/appointments/webhook", validateApiKey, async (req, res) => {
    try {
      console.log('External API: Appointment webhook request received', {
        body: req.body,
        userAgent: req.get('User-Agent'),
        origin: req.get('Origin'),
        authenticated: (req as any).authenticated
      });
      
      // Validate request body
      const validationResult = appointmentWebhookSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.errors,
          message: 'Invalid appointment data provided'
        });
      }
      
      const {
        clientId,
        serviceId,
        staffId,
        startTime,
        endTime,
        notes,
        status = 'confirmed',
        externalAppointmentId,
        clientInfo,
        serviceInfo,
        staffInfo
      } = validationResult.data;

      let finalClientId = clientId;
      let finalServiceId = serviceId;
      let finalStaffId = staffId;

      // Validate that we have either IDs or info objects
      if (!clientId && !clientInfo) {
        return res.status(400).json({
          error: 'Missing client information',
          message: 'Either clientId or clientInfo is required'
        });
      }

      if (!serviceId && !serviceInfo) {
        return res.status(400).json({
          error: 'Missing service information',
          message: 'Either serviceId or serviceInfo is required'
        });
      }

      if (!staffId && !staffInfo) {
        return res.status(400).json({
          error: 'Missing staff information',
          message: 'Either staffId or staffInfo is required'
        });
      }

      // If client doesn't exist but clientInfo is provided, create the client
      if (!clientId && clientInfo) {
        try {
          const newClient = await storage.createUser({
            username: clientInfo.email || `client_${Date.now()}`,
            email: clientInfo.email || '',
            password: 'temp_password_' + Math.random().toString(36).substr(2, 9),
            role: 'client',
            firstName: clientInfo.firstName || '',
            lastName: clientInfo.lastName || '',
            phone: clientInfo.phone || '',
            address: clientInfo.address || null,
            city: clientInfo.city || null,
            state: clientInfo.state || null,
            zipCode: clientInfo.zipCode || null
          });
          finalClientId = newClient.id;
          console.log('Created new client from webhook:', newClient);
        } catch (error) {
          console.error('Failed to create client from webhook:', error);
          return res.status(400).json({ 
            error: "Failed to create client",
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // If service doesn't exist but serviceInfo is provided, create the service
      if (!serviceId && serviceInfo) {
        // Check if automatic service creation is disabled
        if (process.env.DISABLE_AUTOMATIC_SERVICE_CREATION === 'true') {
          console.log('Automatic service creation is disabled. Skipping service creation from webhook.');
          return res.status(400).json({ 
            error: "Automatic service creation is disabled",
            message: "Please create services manually through the web interface"
          });
        }

        try {
          // First ensure we have a category
          let categoryId: number | undefined;
          if (serviceInfo.categoryName) {
            const categories = await storage.getAllServiceCategories();
            let category = categories.find(c => c.name.toLowerCase() === serviceInfo.categoryName!.toLowerCase());
            if (!category) {
              category = await storage.createServiceCategory({
                name: serviceInfo.categoryName,
                description: `Category for ${serviceInfo.categoryName} services`
              });
            }
            categoryId = category.id;
          }

          const newService = await storage.createService({
            name: serviceInfo.name || 'External Service',
            description: serviceInfo.description || 'Service from external app',
            price: serviceInfo.price || 0,
            duration: serviceInfo.duration || 60,
            categoryId: categoryId || 1, // Default category if none provided
            color: serviceInfo.color || '#3b82f6'
          });
          finalServiceId = newService.id;
          console.log('Created new service from webhook:', newService);
        } catch (error) {
          console.error('Failed to create service from webhook:', error);
          return res.status(400).json({ 
            error: "Failed to create service",
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // If staff doesn't exist but staffInfo is provided, create the staff member
      if (!staffId && staffInfo) {
        try {
          const newStaffUser = await storage.createUser({
            username: staffInfo.email || `staff_${Date.now()}`,
            email: staffInfo.email || '',
            password: 'temp_password_' + Math.random().toString(36).substr(2, 9),
            role: 'staff',
            firstName: staffInfo.firstName || '',
            lastName: staffInfo.lastName || ''
          });

          const newStaff = await storage.createStaff({
            userId: newStaffUser.id,
            title: staffInfo.title || 'Stylist',
            bio: staffInfo.bio || null,
            commissionType: 'commission',
            commissionRate: 0.3
          });
          finalStaffId = newStaff.id;
          console.log('Created new staff from webhook:', newStaff);
        } catch (error) {
          console.error('Failed to create staff from webhook:', error);
          return res.status(400).json({ 
            error: "Failed to create staff member",
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Check for scheduling conflicts with existing active appointments (exclude cancelled)
      if (finalStaffId) {
        const staffAppointments = await storage.getActiveAppointmentsByStaff(finalStaffId);
        const newStart = new Date(startTime);
        const newEnd = new Date(endTime);
        
        const conflictingAppointment = staffAppointments.find(appointment => {
          const existingStart = new Date(appointment.startTime);
          const existingEnd = new Date(appointment.endTime);
          
          // Check for any overlap
          return newStart < existingEnd && newEnd > existingStart;
        });
        
        if (conflictingAppointment) {
          return res.status(409).json({ 
            error: "Scheduling Conflict",
            message: "The requested time slot conflicts with an existing appointment",
            conflictingAppointment: {
              id: conflictingAppointment.id,
              startTime: conflictingAppointment.startTime,
              endTime: conflictingAppointment.endTime
            }
          });
        }
        
        // Check for blocked schedules
        const appointmentDate = new Date(startTime);
        const dayName = appointmentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = appointmentDate.toISOString().slice(0, 10);
        
        const staffSchedules = await storage.getStaffSchedulesByStaffId(finalStaffId);
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
            return res.status(409).json({ 
              error: "Blocked Time Slot",
              message: "The requested time slot is blocked and unavailable for appointments",
              blockedSchedule: {
                startTime: blockedSchedule.startTime,
                endTime: blockedSchedule.endTime,
                dayOfWeek: blockedSchedule.dayOfWeek
              }
            });
          }
        }
      }

      // Calculate total amount from service if available
      let totalAmount = 0;
      if (finalServiceId) {
        try {
          const service = await storage.getService(finalServiceId);
          totalAmount = service?.price || 0;
        } catch (error) {
          console.log('Could not fetch service price, using 0');
        }
      }

      // Create the appointment
      const appointmentData = {
        clientId: finalClientId!,
        serviceId: finalServiceId!,
        staffId: finalStaffId!,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status,
        notes: notes || `Appointment from external app${externalAppointmentId ? ` (External ID: ${externalAppointmentId})` : ''}`,
        totalAmount,
        externalId: externalAppointmentId || null
      };

      const newAppointment = await storage.createAppointment(appointmentData);
      
      // Create notification for new appointment
      try {
        const client = finalClientId ? await storage.getUser(finalClientId) : null;
        const service = finalServiceId ? await storage.getService(finalServiceId) : null;
        
        await storage.createNotification({
          type: 'new_appointment',
          title: 'New Appointment from External App',
          description: `New appointment scheduled${client ? ` for ${client.firstName} ${client.lastName}` : ''}${service ? ` - ${service.name}` : ''}`,
          message: `New appointment scheduled${client ? ` for ${client.firstName} ${client.lastName}` : ''}${service ? ` - ${service.name}` : ''}`,
          relatedId: newAppointment.id,
          userId: null
        });
      } catch (error) {
        console.error('Failed to create notification for webhook appointment:', error);
      }

      console.log('Successfully created appointment from webhook:', newAppointment);
      
      res.status(201).json({
        success: true,
        message: "Appointment created successfully",
        appointment: newAppointment,
        createdEntities: {
          client: !clientId && clientInfo ? { id: finalClientId, created: true } : null,
          service: !serviceId && serviceInfo ? { id: finalServiceId, created: true } : null,
          staff: !staffId && staffInfo ? { id: finalStaffId, created: true } : null
        }
      });

    } catch (error: any) {
      console.error('Error processing appointment webhook:', error);
      res.status(500).json({ 
        error: "Failed to create appointment",
        details: error.message 
      });
    }
  });

  // Webhook status endpoint (no auth required)
  app.get("/api/appointments/webhook", async (req, res) => {
    res.json({
      status: "Appointment webhook endpoint is active",
      endpoint: "/api/appointments/webhook",
      method: "POST",
      authentication: "Required (API Key)",
      description: "Receives new appointments from external frontend applications",
      requiredFields: ["startTime", "endTime"],
      optionalFields: [
        "clientId", "serviceId", "staffId",
        "notes", "status", "externalAppointmentId",
        "clientInfo", "serviceInfo", "staffInfo"
      ],
      features: [
        "Auto-creates clients, services, and staff if not found",
        "Checks for scheduling conflicts",
        "Creates notifications",
        "Calculates service pricing",
        "Validates all input data"
      ]
    });
  });
} 