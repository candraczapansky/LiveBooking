import { IStorage } from './storage.js';
import { z } from 'zod';

// Jotform API configuration
const JOTFORM_API_KEY = process.env.JOTFORM_API_KEY;
const JOTFORM_BASE_URL = 'https://api.jotform.com';

// Validation schema for Jotform webhook data
const jotformSubmissionSchema = z.object({
  formID: z.string(),
  submissionID: z.string(),
  created_at: z.string(),
  answers: z.record(z.any()).optional(),
  rawRequest: z.any().optional()
});

// Schema for mapping Jotform fields to appointment data
const jotformFieldMappingSchema = z.object({
  // Client information fields
  clientFirstName: z.string().optional(),
  clientLastName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  
  // Service information fields
  serviceName: z.string().optional(),
  servicePrice: z.number().optional(),
  serviceDuration: z.number().optional(),
  
  // Appointment information fields
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  appointmentNotes: z.string().optional(),
  
  // Staff information fields
  staffName: z.string().optional(),
  staffEmail: z.string().email().optional()
});

export class JotformIntegration {
  private storage: IStorage;
  private fieldMappings: Record<string, string>;

  constructor(storage: IStorage, fieldMappings: Record<string, string> = {}) {
    this.storage = storage;
    this.fieldMappings = fieldMappings;
  }

  /**
   * Process a Jotform webhook submission
   */
  async processSubmission(webhookData: any): Promise<{ success: boolean; appointment?: any; error?: string }> {
    try {
      console.log('Processing Jotform submission:', webhookData);

      // Validate webhook data
      const validationResult = jotformSubmissionSchema.safeParse(webhookData);
      if (!validationResult.success) {
        console.error('Invalid Jotform webhook data:', validationResult.error);
        return { success: false, error: 'Invalid webhook data' };
      }

      const { formID, submissionID, answers } = validationResult.data;

      // Extract field values from Jotform answers
      const fieldValues = this.extractFieldValues(answers || {});
      
      // Map to appointment data
      const appointmentData = this.mapToAppointmentData(fieldValues);
      
      if (!appointmentData) {
        return { success: false, error: 'Failed to map form data to appointment' };
      }

      // Create appointment using existing webhook endpoint logic
      const appointment = await this.createAppointmentFromJotform(appointmentData);

      // Delete the submission from Jotform
      await this.deleteJotformSubmission(formID, submissionID);

      return { success: true, appointment };
    } catch (error) {
      console.error('Error processing Jotform submission:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Extract field values from Jotform answers object
   */
  private extractFieldValues(answers: Record<string, any>): Record<string, any> {
    const fieldValues: Record<string, any> = {};

    for (const [questionId, answer] of Object.entries(answers)) {
      if (answer && typeof answer === 'object' && 'answer' in answer) {
        const fieldName = this.fieldMappings[questionId] || questionId;
        fieldValues[fieldName] = answer.answer;
      }
    }

    return fieldValues;
  }

  /**
   * Map extracted field values to appointment data
   */
  private mapToAppointmentData(fieldValues: Record<string, any>): any {
    try {
      // Parse appointment date and time
      const appointmentDate = fieldValues.appointmentDate || fieldValues.date;
      const appointmentTime = fieldValues.appointmentTime || fieldValues.time;
      
      if (!appointmentDate || !appointmentTime) {
        throw new Error('Missing appointment date or time');
      }

      // Combine date and time into ISO string
      const dateTimeString = `${appointmentDate}T${appointmentTime}:00`;
      const startTime = new Date(dateTimeString);
      const endTime = new Date(startTime.getTime() + (fieldValues.serviceDuration || 60) * 60000);

      return {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'confirmed',
        notes: fieldValues.appointmentNotes || 'Appointment from Jotform submission',
        clientInfo: {
          firstName: fieldValues.clientFirstName || 'Unknown',
          lastName: fieldValues.clientLastName || 'Client',
          email: fieldValues.clientEmail || `client_${Date.now()}@example.com`,
          phone: fieldValues.clientPhone || ''
        },
        serviceInfo: {
          name: fieldValues.serviceName || 'General Service',
          price: fieldValues.servicePrice || 50,
          duration: fieldValues.serviceDuration || 60,
          categoryName: 'General Services'
        },
        staffInfo: fieldValues.staffName ? {
          firstName: fieldValues.staffName.split(' ')[0] || 'Staff',
          lastName: fieldValues.staffName.split(' ').slice(1).join(' ') || 'Member',
          email: fieldValues.staffEmail || `staff_${Date.now()}@example.com`,
          title: 'Stylist'
        } : undefined
      };
    } catch (error) {
      console.error('Error mapping field values to appointment data:', error);
      return null;
    }
  }

  /**
   * Create appointment using existing storage methods
   */
  private async createAppointmentFromJotform(appointmentData: any): Promise<any> {
    const {
      startTime,
      endTime,
      notes,
      clientInfo,
      serviceInfo,
      staffInfo
    } = appointmentData;

    // Create or find client
    let clientId: number;
    if (clientInfo) {
      try {
        // Try to find existing client by email
        const existingClient = await this.storage.getUserByEmail(clientInfo.email);
        if (existingClient) {
          clientId = existingClient.id;
        } else {
          // Create new client
          const newClient = await this.storage.createUser({
            username: clientInfo.email,
            email: clientInfo.email,
            password: 'temp_password_' + Math.random().toString(36).substr(2, 9),
            role: 'client',
            firstName: clientInfo.firstName,
            lastName: clientInfo.lastName,
            phone: clientInfo.phone || null,
            emailPromotions: true,
            smsAccountManagement: true,
            smsAppointmentReminders: true,
            smsPromotions: true,
          });
          clientId = newClient.id;
        }
      } catch (error) {
        console.error('Error creating/finding client:', error);
        throw new Error('Failed to create or find client');
      }
    } else {
      throw new Error('Client information is required');
    }

    // Create or find service
    let serviceId: number;
    if (serviceInfo) {
      try {
        // Try to find existing service by name
        const services = await this.storage.getAllServices();
        let service = services.find(s => s.name.toLowerCase() === serviceInfo.name.toLowerCase());
        
        if (!service) {
          // Check if automatic service creation is disabled
          if (process.env.DISABLE_AUTOMATIC_SERVICE_CREATION === 'true') {
            console.log('Automatic service creation is disabled. Cannot create service from JotForm submission.');
            throw new Error('Automatic service creation is disabled. Please create services manually through the web interface.');
          }

          // Create new service
          const categories = await this.storage.getAllServiceCategories();
          let category = categories.find(c => c.name.toLowerCase() === (serviceInfo.categoryName || 'General Services').toLowerCase());
          
          if (!category) {
            category = await this.storage.createServiceCategory({
              name: serviceInfo.categoryName || 'General Services',
              description: 'Services from Jotform submissions'
            });
          }

          service = await this.storage.createService({
            name: serviceInfo.name,
            description: serviceInfo.description || 'Service from Jotform',
            price: serviceInfo.price,
            duration: serviceInfo.duration,
            categoryId: category.id,
            color: serviceInfo.color || '#3b82f6'
          });
        }
        serviceId = service.id;
      } catch (error) {
        console.error('Error creating/finding service:', error);
        throw new Error('Failed to create or find service');
      }
    } else {
      throw new Error('Service information is required');
    }

    // Create or find staff member
    let staffId: number;
    if (staffInfo) {
      try {
        // Try to find existing staff by email
        const existingStaffUser = await this.storage.getUserByEmail(staffInfo.email);
        let staffMember;
        
        if (existingStaffUser) {
          const staffMembers = await this.storage.getAllStaff();
          staffMember = staffMembers.find(s => s.userId === existingStaffUser.id);
        }
        
        if (!staffMember) {
          // Create new staff user and member
          const newStaffUser = await this.storage.createUser({
            username: staffInfo.email,
            email: staffInfo.email,
            password: 'temp_password_' + Math.random().toString(36).substr(2, 9),
            role: 'staff',
            firstName: staffInfo.firstName,
            lastName: staffInfo.lastName
          });

          staffMember = await this.storage.createStaff({
            userId: newStaffUser.id,
            title: staffInfo.title || 'Stylist',
            bio: staffInfo.bio || null,
            commissionType: 'commission',
            commissionRate: 0.3
          });
        }
        staffId = staffMember.id;
      } catch (error) {
        console.error('Error creating/finding staff:', error);
        throw new Error('Failed to create or find staff member');
      }
    } else {
      // Use default staff member or first available staff
      const staffMembers = await this.storage.getAllStaff();
      if (staffMembers.length === 0) {
        throw new Error('No staff members available');
      }
      staffId = staffMembers[0].id;
    }

    // Create the appointment with online booking method
    const appointment = await this.storage.createAppointment({
      clientId,
      serviceId,
      staffId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'confirmed',
      notes: notes || 'Appointment from Jotform submission',
      totalAmount: serviceInfo?.price || 0,
      bookingMethod: 'online',
      createdBy: null // Online bookings don't have a staff creator
    });

    return appointment;
  }

  /**
   * Delete a submission from Jotform
   */
  private async deleteJotformSubmission(formID: string, submissionID: string): Promise<void> {
    if (!JOTFORM_API_KEY) {
      console.warn('JOTFORM_API_KEY not set, skipping submission deletion');
      return;
    }

    try {
      const response = await fetch(`${JOTFORM_BASE_URL}/submission/${submissionID}`, {
        method: 'DELETE',
        headers: {
          'APIKEY': JOTFORM_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to delete Jotform submission:', response.status, response.statusText);
        throw new Error(`Failed to delete submission: ${response.statusText}`);
      }

      console.log(`Successfully deleted Jotform submission ${submissionID} from form ${formID}`);
    } catch (error) {
      console.error('Error deleting Jotform submission:', error);
      // Don't throw error here as the appointment was already created successfully
    }
  }

  /**
   * Get form submissions from Jotform (for testing/debugging)
   */
  async getFormSubmissions(formID: string): Promise<any[]> {
    if (!JOTFORM_API_KEY) {
      throw new Error('JOTFORM_API_KEY not set');
    }

    const response = await fetch(`${JOTFORM_BASE_URL}/form/${formID}/submissions`, {
      headers: {
        'APIKEY': JOTFORM_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch submissions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content || [];
  }

  /**
   * Set field mappings for a specific form
   */
  setFieldMappings(mappings: Record<string, string>): void {
    this.fieldMappings = { ...this.fieldMappings, ...mappings };
  }
} 