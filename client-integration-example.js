/**
 * Client Integration Example for Glo Head Spa
 * 
 * This file contains example code that can be integrated into your client booking app
 * to send appointments to the salon management system.
 * 
 * Replace the configuration values with your actual salon app details.
 */

// Configuration - Update these values for your salon
const SALON_CONFIG = {
  // Your salon app's webhook URL
  webhookUrl: 'https://salon-sync-client-candraczapansky.replit.app/api/appointments/webhook',
  
  // Your API key (get this from the salon app administrator)
  apiKey: 'glo-head-spa-external-2024',
  
  // Default service information (can be overridden per appointment)
  defaultService: {
    name: 'Signature Head Spa',
    price: 99.00,
    duration: 60,
    categoryName: 'Head Spa'
  }
};

/**
 * Send appointment to salon management system
 * @param {Object} appointmentData - Appointment information
 * @returns {Promise<Object>} - Response from salon system
 */
async function sendAppointmentToSalon(appointmentData) {
  try {
    // Prepare the request payload
    const payload = {
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime,
      notes: appointmentData.notes || '',
      externalAppointmentId: appointmentData.externalId || `ext-${Date.now()}`,
      
      // Client information
      clientInfo: {
        firstName: appointmentData.client.firstName,
        lastName: appointmentData.client.lastName,
        email: appointmentData.client.email,
        phone: appointmentData.client.phone || '',
        address: appointmentData.client.address || '',
        city: appointmentData.client.city || '',
        state: appointmentData.client.state || '',
        zipCode: appointmentData.client.zipCode || ''
      },
      
      // Service information (use provided or default)
      serviceInfo: appointmentData.service || SALON_CONFIG.defaultService,
      
      // Staff information (if specified)
      ...(appointmentData.staff && {
        staffInfo: {
          firstName: appointmentData.staff.firstName,
          lastName: appointmentData.staff.lastName,
          email: appointmentData.staff.email,
          title: appointmentData.staff.title || 'Stylist'
        }
      })
    };
    
    // Make the API request
    const response = await fetch(SALON_CONFIG.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SALON_CONFIG.apiKey}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Log success
    console.log('✅ Appointment sent to salon system successfully:', {
      appointmentId: result.appointment.id,
      clientId: result.appointment.clientId,
      serviceId: result.appointment.serviceId
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to send appointment to salon system:', error);
    throw error;
  }
}

/**
 * Check if salon system is available
 * @returns {Promise<boolean>} - True if system is healthy
 */
async function checkSalonSystemHealth() {
  try {
    const healthUrl = SALON_CONFIG.webhookUrl.replace('/api/appointments/webhook', '/api/external/health');
    const response = await fetch(healthUrl);
    
    if (response.ok) {
      const healthData = await response.json();
      console.log('🏥 Salon system health check passed:', healthData.status);
      return true;
    } else {
      console.warn('⚠️ Salon system health check failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Salon system health check error:', error);
    return false;
  }
}

/**
 * Example usage functions
 */

// Example 1: Book a basic appointment
async function bookBasicAppointment() {
  const appointment = {
    startTime: '2024-01-20T14:00:00Z',
    endTime: '2024-01-20T15:00:00Z',
    client: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890'
    },
    notes: 'First-time client, prefers morning appointments'
  };
  
  try {
    const result = await sendAppointmentToSalon(appointment);
    console.log('Appointment booked successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to book appointment:', error);
    throw error;
  }
}

// Example 2: Book appointment with custom service
async function bookCustomServiceAppointment() {
  const appointment = {
    startTime: '2024-01-21T10:00:00Z',
    endTime: '2024-01-21T11:30:00Z',
    client: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+1987654321',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345'
    },
    service: {
      name: 'Deluxe Head Spa',
      description: '90-minute premium head spa treatment',
      price: 160.00,
      duration: 90,
      categoryName: 'Premium Head Spa',
      color: '#8b5cf6'
    },
    notes: 'Returning client, prefers afternoon appointments'
  };
  
  try {
    const result = await sendAppointmentToSalon(appointment);
    console.log('Custom service appointment booked successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to book custom service appointment:', error);
    throw error;
  }
}

// Example 3: Book appointment with specific staff member
async function bookStaffSpecificAppointment() {
  const appointment = {
    startTime: '2024-01-22T16:00:00Z',
    endTime: '2024-01-22T17:00:00Z',
    client: {
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'mike.johnson@example.com',
      phone: '+1555123456'
    },
    staff: {
      firstName: 'Sarah',
      lastName: 'Wilson',
      email: 'sarah.wilson@gloheadspa.com',
      title: 'Senior Stylist'
    },
    notes: 'Client specifically requested Sarah'
  };
  
  try {
    const result = await sendAppointmentToSalon(appointment);
    console.log('Staff-specific appointment booked successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to book staff-specific appointment:', error);
    throw error;
  }
}

// Example 4: Handle booking errors gracefully
async function bookAppointmentWithErrorHandling() {
  const appointment = {
    startTime: '2024-01-23T14:00:00Z',
    endTime: '2024-01-23T15:00:00Z',
    client: {
      firstName: 'Alice',
      lastName: 'Brown',
      email: 'alice.brown@example.com',
      phone: '+1777888999'
    }
  };
  
  try {
    // First check if salon system is healthy
    const isHealthy = await checkSalonSystemHealth();
    if (!isHealthy) {
      throw new Error('Salon system is currently unavailable');
    }
    
    const result = await sendAppointmentToSalon(appointment);
    console.log('Appointment booked successfully:', result);
    
    // Update your local system with the salon appointment ID
    updateLocalAppointmentWithSalonId(appointment.externalId, result.appointment.id);
    
    return result;
    
  } catch (error) {
    console.error('Booking failed:', error.message);
    
    // Handle specific error types
    if (error.message.includes('Scheduling Conflict')) {
      // Offer alternative time slots
      suggestAlternativeTimes(appointment);
    } else if (error.message.includes('Blocked Time Slot')) {
      // Offer different time slots
      suggestDifferentTimes(appointment);
    } else if (error.message.includes('Salon system is currently unavailable')) {
      // Queue for later processing
      queueAppointmentForLater(appointment);
    } else {
      // General error - show user-friendly message
      showUserError('Unable to book appointment at this time. Please try again later.');
    }
    
    throw error;
  }
}

// Helper functions (implement these based on your app's needs)
function updateLocalAppointmentWithSalonId(externalId, salonId) {
  console.log(`Updating local appointment ${externalId} with salon ID ${salonId}`);
  // Implement based on your local storage system
}

function suggestAlternativeTimes(appointment) {
  console.log('Suggesting alternative times for appointment');
  // Implement based on your app's UI
}

function suggestDifferentTimes(appointment) {
  console.log('Suggesting different times for appointment');
  // Implement based on your app's UI
}

function queueAppointmentForLater(appointment) {
  console.log('Queueing appointment for later processing');
  // Implement based on your app's storage system
}

function showUserError(message) {
  console.log('Showing user error:', message);
  // Implement based on your app's UI
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sendAppointmentToSalon,
    checkSalonSystemHealth,
    bookBasicAppointment,
    bookCustomServiceAppointment,
    bookStaffSpecificAppointment,
    bookAppointmentWithErrorHandling,
    SALON_CONFIG
  };
}

// Browser/global usage
if (typeof window !== 'undefined') {
  window.SalonIntegration = {
    sendAppointmentToSalon,
    checkSalonSystemHealth,
    bookBasicAppointment,
    bookCustomServiceAppointment,
    bookStaffSpecificAppointment,
    bookAppointmentWithErrorHandling,
    SALON_CONFIG
  };
}



