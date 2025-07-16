// Example client-side integration for external booking app
// This shows how to connect your client app to the Glo Head Spa API

const GLO_HEAD_SPA_CONFIG = {
  baseUrl: 'https://your-glo-head-spa-domain.replit.app',
  apiKey: 'glo-head-spa-external-2024' // In production, use environment variable
};

class GloHeadSpaAPI {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  // Helper method for API requests
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Check if API is healthy
  async checkHealth() {
    const response = await fetch(`${this.baseUrl}/api/external/health`);
    return response.json();
  }

  // Get all staff members with their schedules and services
  async getStaffAvailability(staffId = null) {
    const params = staffId ? `?staffId=${staffId}` : '';
    const response = await this.request(`/api/external/staff-availability${params}`);
    return response.data;
  }

  // Get services, optionally filtered by staff or category
  async getServices(staffId = null, categoryId = null) {
    const params = new URLSearchParams();
    if (staffId) params.append('staffId', staffId);
    if (categoryId) params.append('categoryId', categoryId);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request(`/api/external/services${queryString}`);
    return response.data;
  }

  // Get service categories
  async getServiceCategories() {
    const response = await this.request('/api/external/service-categories');
    return response.data;
  }

  // Book an appointment
  async bookAppointment(appointmentData) {
    return await this.request('/api/appointments/webhook', {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    });
  }
}

// Example usage in your client app
class BookingApp {
  constructor() {
    this.api = new GloHeadSpaAPI(GLO_HEAD_SPA_CONFIG);
    this.staff = [];
    this.services = [];
    this.categories = [];
    this.selectedStaff = null;
    this.selectedService = null;
    this.selectedDate = null;
    this.selectedTime = null;
  }

  // Initialize the booking app
  async initialize() {
    try {
      console.log('Initializing booking app...');
      
      // Check API health first
      const health = await this.api.checkHealth();
      console.log('API Status:', health.status);
      
      // Load initial data
      await this.loadStaff();
      await this.loadCategories();
      
      console.log('Booking app initialized successfully');
      this.renderBookingForm();
      
    } catch (error) {
      console.error('Failed to initialize booking app:', error);
      this.showError('Failed to connect to booking system');
    }
  }

  // Load all staff members
  async loadStaff() {
    try {
      this.staff = await this.api.getStaffAvailability();
      console.log(`Loaded ${this.staff.length} staff members`);
      this.renderStaffList();
    } catch (error) {
      console.error('Failed to load staff:', error);
      this.showError('Failed to load staff members');
    }
  }

  // Load service categories
  async loadCategories() {
    try {
      this.categories = await this.api.getServiceCategories();
      console.log(`Loaded ${this.categories.length} service categories`);
      this.renderCategoryList();
    } catch (error) {
      console.error('Failed to load categories:', error);
      this.showError('Failed to load service categories');
    }
  }

  // Load services for selected staff member
  async loadServicesForStaff(staffId) {
    try {
      this.services = await this.api.getServices(staffId);
      console.log(`Loaded ${this.services.length} services for staff ${staffId}`);
      this.renderServiceList();
    } catch (error) {
      console.error('Failed to load services:', error);
      this.showError('Failed to load services');
    }
  }

  // Handle staff selection
  async onStaffSelect(staffId) {
    this.selectedStaff = this.staff.find(s => s.id === staffId);
    this.selectedService = null;
    
    console.log('Selected staff:', this.selectedStaff);
    
    // Load services for this staff member
    await this.loadServicesForStaff(staffId);
    
    // Update UI
    this.renderStaffList();
    this.renderServiceList();
  }

  // Handle service selection
  onServiceSelect(serviceId) {
    this.selectedService = this.services.find(s => s.id === serviceId);
    console.log('Selected service:', this.selectedService);
    this.renderServiceList();
  }

  // Handle date selection
  onDateSelect(date) {
    this.selectedDate = date;
    console.log('Selected date:', date);
    this.renderTimeSlots();
  }

  // Handle time selection
  onTimeSelect(time) {
    this.selectedTime = time;
    console.log('Selected time:', time);
    this.renderBookingButton();
  }

  // Book the appointment
  async bookAppointment() {
    if (!this.selectedStaff || !this.selectedService || !this.selectedDate || !this.selectedTime) {
      this.showError('Please select all required fields');
      return;
    }

    try {
      // Calculate start and end times
      const startTime = new Date(this.selectedDate);
      const [hours, minutes] = this.selectedTime.split(':').map(Number);
      startTime.setHours(hours, minutes);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + this.selectedService.duration);

      // Prepare appointment data
      const appointmentData = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'confirmed',
        notes: 'Booked through external client app',
        clientInfo: {
          firstName: document.getElementById('firstName').value,
          lastName: document.getElementById('lastName').value,
          email: document.getElementById('email').value,
          phone: document.getElementById('phone').value
        },
        serviceInfo: {
          name: this.selectedService.name,
          description: this.selectedService.description,
          price: this.selectedService.price,
          duration: this.selectedService.duration,
          categoryName: this.selectedService.category?.name
        },
        staffInfo: {
          firstName: this.selectedStaff.user.firstName,
          lastName: this.selectedStaff.user.lastName,
          email: this.selectedStaff.user.email,
          title: this.selectedStaff.title
        }
      };

      console.log('Booking appointment:', appointmentData);

      // Send to Glo Head Spa
      const result = await this.api.bookAppointment(appointmentData);
      
      console.log('Appointment booked successfully:', result);
      this.showSuccess('Appointment booked successfully!');
      
      // Reset form
      this.resetForm();
      
    } catch (error) {
      console.error('Failed to book appointment:', error);
      this.showError(`Booking failed: ${error.message}`);
    }
  }

  // UI Rendering Methods (simplified examples)
  renderBookingForm() {
    const container = document.getElementById('booking-container');
    if (!container) return;

    container.innerHTML = `
      <div class="booking-form">
        <h2>Book Your Appointment</h2>
        
        <!-- Staff Selection -->
        <div class="form-section">
          <h3>Select Staff Member</h3>
          <div id="staff-list" class="staff-grid"></div>
        </div>

        <!-- Service Selection -->
        <div class="form-section">
          <h3>Select Service</h3>
          <div id="service-list" class="service-grid"></div>
        </div>

        <!-- Date and Time Selection -->
        <div class="form-section">
          <h3>Select Date & Time</h3>
          <input type="date" id="appointment-date" onchange="bookingApp.onDateSelect(this.value)">
          <div id="time-slots" class="time-grid"></div>
        </div>

        <!-- Client Information -->
        <div class="form-section">
          <h3>Your Information</h3>
          <input type="text" id="firstName" placeholder="First Name" required>
          <input type="text" id="lastName" placeholder="Last Name" required>
          <input type="email" id="email" placeholder="Email" required>
          <input type="tel" id="phone" placeholder="Phone">
        </div>

        <!-- Booking Button -->
        <div class="form-section">
          <button id="book-button" onclick="bookingApp.bookAppointment()" disabled>
            Book Appointment
          </button>
        </div>

        <!-- Messages -->
        <div id="messages"></div>
      </div>
    `;
  }

  renderStaffList() {
    const container = document.getElementById('staff-list');
    if (!container) return;

    container.innerHTML = this.staff.map(staff => `
      <div class="staff-card ${this.selectedStaff?.id === staff.id ? 'selected' : ''}" 
           onclick="bookingApp.onStaffSelect(${staff.id})">
        <h4>${staff.user.firstName} ${staff.user.lastName}</h4>
        <p>${staff.title}</p>
        <p>Services: ${staff.services.length}</p>
      </div>
    `).join('');
  }

  renderServiceList() {
    const container = document.getElementById('service-list');
    if (!container) return;

    if (!this.selectedStaff) {
      container.innerHTML = '<p>Please select a staff member first</p>';
      return;
    }

    container.innerHTML = this.services.map(service => `
      <div class="service-card ${this.selectedService?.id === service.id ? 'selected' : ''}" 
           onclick="bookingApp.onServiceSelect(${service.id})">
        <h4>${service.name}</h4>
        <p>${service.description}</p>
        <p>Duration: ${service.duration} minutes</p>
        <p>Price: $${service.price}</p>
      </div>
    `).join('');
  }

  renderTimeSlots() {
    const container = document.getElementById('time-slots');
    if (!container || !this.selectedStaff) return;

    // Generate time slots based on staff schedule
    const timeSlots = this.generateTimeSlots();
    
    container.innerHTML = timeSlots.map(time => `
      <button class="time-slot" onclick="bookingApp.onTimeSelect('${time}')">
        ${time}
      </button>
    `).join('');
  }

  generateTimeSlots() {
    // Simplified time slot generation
    // In a real app, you'd check staff schedules and existing appointments
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }

  renderBookingButton() {
    const button = document.getElementById('book-button');
    if (!button) return;

    const canBook = this.selectedStaff && this.selectedService && this.selectedDate && this.selectedTime;
    button.disabled = !canBook;
    button.textContent = canBook ? 'Book Appointment' : 'Please select all options';
  }

  resetForm() {
    this.selectedStaff = null;
    this.selectedService = null;
    this.selectedDate = null;
    this.selectedTime = null;
    this.services = [];
    
    this.renderStaffList();
    this.renderServiceList();
    this.renderTimeSlots();
    this.renderBookingButton();
    
    // Clear form fields
    document.getElementById('firstName').value = '';
    document.getElementById('lastName').value = '';
    document.getElementById('email').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('appointment-date').value = '';
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    const container = document.getElementById('messages');
    if (!container) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    container.appendChild(messageDiv);
    
    // Remove message after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }
}

// Initialize the booking app when the page loads
let bookingApp;

document.addEventListener('DOMContentLoaded', () => {
  bookingApp = new BookingApp();
  bookingApp.initialize();
});

// Example CSS for the booking form
const styles = `
  .booking-form {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .form-section {
    margin-bottom: 30px;
  }

  .staff-grid, .service-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 10px;
  }

  .staff-card, .service-card {
    border: 2px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    cursor: pointer;
    transition: border-color 0.3s;
  }

  .staff-card:hover, .service-card:hover {
    border-color: #9532b8;
  }

  .staff-card.selected, .service-card.selected {
    border-color: #9532b8;
    background-color: #f8f0ff;
  }

  .time-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 10px;
    margin-top: 10px;
  }

  .time-slot {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  .time-slot:hover {
    background-color: #f0f0f0;
  }

  input[type="text"], input[type="email"], input[type="tel"], input[type="date"] {
    width: 100%;
    padding: 10px;
    margin: 5px 0;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  button {
    background-color: #9532b8;
    color: white;
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }

  button:hover {
    background-color: #7a2a94;
  }

  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .message {
    padding: 10px;
    margin: 10px 0;
    border-radius: 4px;
  }

  .message.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .message.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
`;

// Add styles to the page
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet); 