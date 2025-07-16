// Quick API Update Guide for External Client Apps
// Copy and paste this into your client app to update to the new API

const API_KEY = 'glo-head-spa-external-2024';
const BASE_URL = 'https://your-glo-head-spa-domain.replit.app'; // Replace with your actual domain

// Helper function for all API calls
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// 1. Get all staff members with their schedules and services
async function getStaffAvailability(staffId = null) {
  const params = staffId ? `?staffId=${staffId}` : '';
  const response = await apiRequest(`/api/external/staff-availability${params}`);
  return response.data;
}

// 2. Get services, optionally filtered by staff or category
async function getServices(staffId = null, categoryId = null) {
  const params = new URLSearchParams();
  if (staffId) params.append('staffId', staffId);
  if (categoryId) params.append('categoryId', categoryId);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await apiRequest(`/api/external/services${queryString}`);
  return response.data;
}

// 3. Get service categories
async function getServiceCategories() {
  const response = await apiRequest('/api/external/service-categories');
  return response.data;
}

// 4. Book an appointment (this is the main one that was broken)
async function bookAppointment(appointmentData) {
  return await apiRequest('/api/appointments/webhook', {
    method: 'POST',
    body: JSON.stringify(appointmentData)
  });
}

// 5. Check if API is working
async function checkApiHealth() {
  const response = await fetch(`${BASE_URL}/api/external/health`);
  return response.json();
}

// Example usage:
async function exampleBooking() {
  try {
    // Check if API is working
    const health = await checkApiHealth();
    console.log('API Status:', health.status);
    
    // Get staff members
    const staff = await getStaffAvailability();
    console.log('Available staff:', staff.length);
    
    // Get services for a specific staff member
    const selectedStaffId = 6; // Replace with actual staff ID
    const services = await getServices(selectedStaffId);
    console.log('Services for staff:', services.length);
    
    // Book an appointment
    const appointmentData = {
      startTime: "2025-01-27T10:00:00Z",
      endTime: "2025-01-27T11:00:00Z",
      clientInfo: {
        firstName: "John",
        lastName: "Doe", 
        email: "john@example.com"
      },
      serviceInfo: {
        name: "Haircut",
        price: 50,
        duration: 60
      },
      staffInfo: {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@salon.com"
      }
    };
    
    const result = await bookAppointment(appointmentData);
    console.log('Appointment booked:', result.appointment.id);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getStaffAvailability,
    getServices,
    getServiceCategories,
    bookAppointment,
    checkApiHealth
  };
} 