// Mock storage for testing
class MockStorage {
  async getAllServices() {
    return [
      { id: 1, name: 'Signature Head Spa', price: 99, duration: 60 },
      { id: 2, name: 'Deluxe Head Spa', price: 160, duration: 90 },
      { id: 3, name: 'Platinum Head Spa', price: 220, duration: 120 }
    ];
  }

  async getAllStaff() {
    return [
      { id: 1, userId: 1, name: 'Sarah Johnson', title: 'Senior Therapist' },
      { id: 2, userId: 2, name: 'Mike Chen', title: 'Therapist' }
    ];
  }

  async getBusinessSettings() {
    return {
      businessName: 'Glo Head Spa',
      businessType: 'salon and spa'
    };
  }

  async findAvailableSlots(request) {
    // Mock available slots
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return [
      {
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0, 0),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0, 0),
        staffId: 1,
        staffName: 'Sarah Johnson',
        serviceId: 1,
        serviceName: 'Signature Head Spa',
        serviceDuration: 60,
        servicePrice: 99
      },
      {
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0, 0),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0, 0),
        staffId: 1,
        staffName: 'Sarah Johnson',
        serviceId: 1,
        serviceName: 'Signature Head Spa',
        serviceDuration: 60,
        servicePrice: 99
      },
      {
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0, 0),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 0, 0),
        staffId: 2,
        staffName: 'Mike Chen',
        serviceId: 1,
        serviceName: 'Signature Head Spa',
        serviceDuration: 60,
        servicePrice: 99
      }
    ];
  }

  async bookAppointment(request, slot) {
    return {
      success: true,
      appointment: {
        id: 'appt_123',
        serviceName: request.serviceName,
        date: request.date,
        time: request.time,
        clientName: request.clientName,
        clientPhone: request.clientPhone
      },
      message: "You're all set! Your appointment is confirmed, and we've sent a confirmation to your email. We look forward to seeing you!"
    };
  }
}

// Mock SMSAppointmentBookingService
class MockSMSAppointmentBookingService {
  constructor(storage) {
    this.storage = storage;
  }

  async findAvailableSlots(request) {
    return this.storage.findAvailableSlots(request);
  }

  async bookAppointment(request, slot) {
    return this.storage.bookAppointment(request, slot);
  }
}

// Mock SMSStructuredAssistant for testing
class MockSMSStructuredAssistant {
  constructor(storage) {
    this.storage = storage;
    this.appointmentBookingService = new MockSMSAppointmentBookingService(storage);
    this.conversationStates = new Map();
  }

  async processMessage(sms) {
    try {
      const state = this.getConversationState(sms.from);
      const userMessage = sms.body.trim().toLowerCase();

      console.log(`📱 Processing SMS from ${sms.from}: "${sms.body}"`);
      console.log(`📊 Current conversation state: ${state.step}`);

      // Handle start over requests
      if (this.isStartOverRequest(userMessage)) {
        this.clearConversationState(sms.from);
        return this.handleGreeting(sms);
      }

      // Process based on current step
      switch (state.step) {
        case 'greeting':
          return this.handleGreeting(sms);
        
        case 'get_service':
          return this.handleGetService(sms, userMessage);
        
        case 'get_date':
          return this.handleGetDate(sms, userMessage);
        
        case 'get_available_times':
          return this.handleGetAvailableTimes(sms);
        
        case 'get_chosen_time':
          return this.handleGetChosenTime(sms, userMessage);
        
        case 'get_client_info':
          return this.handleGetClientInfo(sms, userMessage);
        
        case 'confirm_details':
          return this.handleConfirmDetails(sms, userMessage);
        
        case 'book_appointment':
          return this.handleBookAppointment(sms);
        
        default:
          return this.handleGreeting(sms);
      }
    } catch (error) {
      console.error('Error processing SMS:', error);
      return {
        success: false,
        message: 'I encountered an error. Please try again or call us directly.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Step 1: Greeting & Task Identification
  handleGreeting(sms) {
    const state = this.getConversationState(sms.from);
    state.step = 'get_service';
    this.updateConversationState(sms.from, state);

    const message = "Hi! I'm your automated appointment booking assistant. I can help you book an appointment. What service would you like to book?";
    
    this.sendSMSResponse(sms, message);
    
    return {
      success: true,
      message: message,
      nextStep: 'get_service'
    };
  }

  // Step 2: Get Service
  handleGetService(sms, userMessage) {
    const state = this.getConversationState(sms.from);
    
    // Extract service from user message
    const service = this.extractService(userMessage);
    
    if (!service) {
      const message = "I'm sorry, I don't recognize that service. We offer Signature Head Spa ($99), Deluxe Head Spa ($160), and Platinum Head Spa ($220). Which would you like?";
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'get_service'
      };
    }

    // Update state with service
    state.service = service;
    state.step = 'get_date';
    this.updateConversationState(sms.from, state);

    const message = `Great! You'd like to book a ${service}. What day works best for you?`;
    this.sendSMSResponse(sms, message);
    
    return {
      success: true,
      message: message,
      nextStep: 'get_date'
    };
  }

  // Step 3: Get Date
  handleGetDate(sms, userMessage) {
    const state = this.getConversationState(sms.from);
    
    // Extract date from user message
    const date = this.extractDate(userMessage);
    
    if (!date) {
      const message = "I need a valid date. You can say 'tomorrow', 'Friday', or a specific date like 'August 15th'. What day works for you?";
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'get_date'
      };
    }

    // Update state with date
    state.date = date;
    state.step = 'get_available_times';
    this.updateConversationState(sms.from, state);

    const message = `Perfect! You'd like to come in on ${date}. Let me check what times are available for you.`;
    this.sendSMSResponse(sms, message);
    
    return {
      success: true,
      message: message,
      nextStep: 'get_available_times'
    };
  }

  // Step 4: Get Available Times (Function Call)
  async handleGetAvailableTimes(sms) {
    const state = this.getConversationState(sms.from);
    
    if (!state.service || !state.date) {
      const message = "I need both the service and date to check availability. Let's start over. What service would you like?";
      this.clearConversationState(sms.from);
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'get_service'
      };
    }

    try {
      // Call get_available_times function
      const availableTimesResult = await this.get_available_times(state.service, state.date);
      
      if (availableTimesResult.success && availableTimesResult.times.length > 0) {
        // Update state with available times
        state.availableTimes = availableTimesResult.times;
        state.step = 'get_chosen_time';
        this.updateConversationState(sms.from, state);

        const timesList = availableTimesResult.times.join(', ');
        const message = `Great! Here are the available times for ${state.service} on ${state.date}: ${timesList}. Which time works for you?`;
        this.sendSMSResponse(sms, message);
        
        return {
          success: true,
          message: message,
          nextStep: 'get_chosen_time'
        };
      } else {
        const message = `I'm sorry, but there are no available times for ${state.service} on ${state.date}. Please choose a different date.`;
        this.sendSMSResponse(sms, message);
        
        return {
          success: true,
          message: message,
          nextStep: 'get_date'
        };
      }
    } catch (error) {
      console.error('Error getting available times:', error);
      const message = "I encountered an error checking availability. Please try again or call us directly.";
      this.sendSMSResponse(sms, message);
      
      return {
        success: false,
        message: message,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Step 5: Get Chosen Time
  handleGetChosenTime(sms, userMessage) {
    const state = this.getConversationState(sms.from);
    
    if (!state.availableTimes) {
      const message = "I need to check available times first. Let me do that for you.";
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'get_available_times'
      };
    }

    // Extract chosen time from user message
    const chosenTime = this.extractTime(userMessage, state.availableTimes);
    
    if (!chosenTime) {
      const timesList = state.availableTimes.join(', ');
      const message = `Please choose one of the available times: ${timesList}.`;
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'get_chosen_time'
      };
    }

    // Update state with chosen time
    state.chosenTime = chosenTime;
    state.step = 'get_client_info';
    this.updateConversationState(sms.from, state);

    const message = `Perfect! You've chosen ${chosenTime}. Now I need your contact information to complete the booking. What's your full name?`;
    this.sendSMSResponse(sms, message);
    
    return {
      success: true,
      message: message,
      nextStep: 'get_client_info'
    };
  }

  // Step 6: Get Client Information
  handleGetClientInfo(sms, userMessage) {
    const state = this.getConversationState(sms.from);
    
    if (!state.clientName) {
      // First, get the name
      state.clientName = userMessage;
      state.step = 'get_client_info';
      this.updateConversationState(sms.from, state);

      const message = `Thanks ${userMessage}! What's your email address?`;
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'get_client_info'
      };
    } else if (!state.clientEmail) {
      // Then, get the email
      state.clientEmail = userMessage;
      state.step = 'get_client_info';
      this.updateConversationState(sms.from, state);

      const message = `Great! And what's your phone number?`;
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'get_client_info'
      };
    } else if (!state.clientPhone) {
      // Finally, get the phone number
      state.clientPhone = userMessage;
      state.step = 'confirm_details';
      this.updateConversationState(sms.from, state);

      const message = this.buildConfirmationMessage(state);
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'confirm_details'
      };
    }

    return {
      success: false,
      message: "I encountered an error. Please try again.",
      error: "Unexpected state in client info collection"
    };
  }

  // Step 7: Confirm Details
  handleConfirmDetails(sms, userMessage) {
    const state = this.getConversationState(sms.from);
    
    const isConfirmed = this.isConfirmation(userMessage);
    
    if (isConfirmed) {
      // Proceed to booking
      state.step = 'book_appointment';
      this.updateConversationState(sms.from, state);

      const message = "Perfect! I'm booking your appointment now.";
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'book_appointment'
      };
    } else {
      // User didn't confirm, ask again
      const message = this.buildConfirmationMessage(state);
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'confirm_details'
      };
    }
  }

  // Step 8: Book Appointment (Function Call)
  async handleBookAppointment(sms) {
    const state = this.getConversationState(sms.from);
    
    if (!state.service || !state.date || !state.chosenTime || !state.clientName || !state.clientEmail || !state.clientPhone) {
      const message = "I'm missing some information needed to book your appointment. Let's start over.";
      this.clearConversationState(sms.from);
      this.sendSMSResponse(sms, message);
      
      return {
        success: true,
        message: message,
        nextStep: 'get_service'
      };
    }

    try {
      // Call book_appointment function
      const bookingResult = await this.book_appointment(
        state.service,
        state.date,
        state.chosenTime,
        state.clientName,
        state.clientEmail,
        state.clientPhone
      );
      
      if (bookingResult.success) {
        // Clear conversation state after successful booking
        this.clearConversationState(sms.from);
        
        const message = bookingResult.message;
        this.sendSMSResponse(sms, message);
        
        return {
          success: true,
          message: message,
          nextStep: 'completed'
        };
      } else {
        const message = bookingResult.message;
        this.sendSMSResponse(sms, message);
        
        return {
          success: false,
          message: message,
          error: 'Booking failed'
        };
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      const message = "I'm sorry, there was an error booking your appointment. Please try again or call us directly.";
      this.sendSMSResponse(sms, message);
      
      return {
        success: false,
        message: message,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Function: get_available_times
  async get_available_times(service, date) {
    try {
      console.log(`🔍 Getting available times for ${service} on ${date}`);
      
      // Create appointment request
      const request = {
        serviceName: service,
        date: date,
        time: undefined,
        clientPhone: '',
        clientName: undefined
      };

      // Get available slots using the existing appointment booking service
      const availableSlots = await this.appointmentBookingService.findAvailableSlots(request);
      
      if (availableSlots.length === 0) {
        return {
          success: false,
          times: [],
          message: `I'm sorry, but there are no available times for ${service} on ${date}. Please choose a different date.`
        };
      }

      // Convert slots to time strings
      const times = availableSlots.map(slot => {
        const startTime = new Date(slot.startTime);
        const timeString = startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        console.log(`🕐 Converting slot time: ${slot.startTime} -> ${timeString}`);
        return timeString;
      });

      console.log(`📋 Available times: ${times.join(', ')}`);

      return {
        success: true,
        times: times,
        message: `Available times for ${service} on ${date}: ${times.join(', ')}`
      };
    } catch (error) {
      console.error('Error in get_available_times:', error);
      return {
        success: false,
        times: [],
        message: "I encountered an error checking availability. Please try again."
      };
    }
  }

  // Function: book_appointment
  async book_appointment(service, date, time, fullName, email, phone) {
    try {
      console.log(`📞 Booking appointment: ${service} on ${date} at ${time} for ${fullName}`);
      
      // Create appointment request
      const request = {
        serviceName: service,
        date: date,
        time: time,
        clientPhone: phone,
        clientName: fullName
      };

      // Find available slots
      const availableSlots = await this.appointmentBookingService.findAvailableSlots(request);
      
      if (availableSlots.length === 0) {
        return {
          success: false,
          message: "I'm sorry, but that time is not available. Please choose a different time or date."
        };
      }

      // Use the first available slot
      const bestSlot = availableSlots[0];

      // Book the appointment
      const bookingResult = await this.appointmentBookingService.bookAppointment(request, bestSlot);
      
      if (bookingResult.success) {
        return {
          success: true,
          message: "You're all set! Your appointment is confirmed, and we've sent a confirmation to your email. We look forward to seeing you!",
          appointmentId: bookingResult.appointment?.id
        };
      } else {
        return {
          success: false,
          message: "I'm sorry, there was an error booking your appointment. Please try again or call us at our main number."
        };
      }
    } catch (error) {
      console.error('Error in book_appointment:', error);
      return {
        success: false,
        message: "I'm sorry, there was an error booking your appointment. Please try again or call us directly."
      };
    }
  }

  // Helper methods for conversation state management
  getConversationState(phoneNumber) {
    let state = this.conversationStates.get(phoneNumber);
    
    if (!state) {
      state = {
        phoneNumber,
        step: 'greeting',
        lastUpdated: new Date()
      };
      this.conversationStates.set(phoneNumber, state);
    }
    
    return state;
  }

  updateConversationState(phoneNumber, state) {
    state.lastUpdated = new Date();
    this.conversationStates.set(phoneNumber, state);
  }

  clearConversationState(phoneNumber) {
    this.conversationStates.delete(phoneNumber);
  }

  // Helper methods for parsing user input
  extractService(text) {
    const services = [
      'signature head spa',
      'deluxe head spa', 
      'platinum head spa',
      'head spa'
    ];
    
    const lowerText = text.toLowerCase();
    
    for (const service of services) {
      if (lowerText.includes(service)) {
        return service;
      }
    }
    
    return null;
  }

  extractDate(text) {
    // Simple date extraction
    const datePatterns = [
      /tomorrow/i,
      /today/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
      /\d{1,2}\/\d{1,2}/,
      /\d{1,2}-\d{1,2}/,
      /august \d{1,2}|september \d{1,2}|october \d{1,2}|november \d{1,2}|december \d{1,2}/i
    ];
    
    for (const pattern of datePatterns) {
      if (pattern.test(text)) {
        return text.match(pattern)?.[0] || null;
      }
    }
    
    return null;
  }

  extractTime(text, availableTimes) {
    const lowerText = text.toLowerCase();
    console.log(`🔍 Extracting time from: "${text}"`);
    console.log(`📋 Available times: ${availableTimes.join(', ')}`);
    
    for (const time of availableTimes) {
      console.log(`🕐 Checking: "${time}" against "${lowerText}"`);
      if (lowerText.includes(time.toLowerCase())) {
        console.log(`✅ Match found: ${time}`);
        return time;
      }
    }
    
    console.log(`❌ No match found`);
    return null;
  }

  isStartOverRequest(text) {
    const startOverKeywords = ['start over', 'restart', 'begin again', 'new booking'];
    return startOverKeywords.some(keyword => text.includes(keyword));
  }

  isConfirmation(text) {
    const confirmKeywords = ['yes', 'correct', 'right', 'confirm', 'ok', 'sure', 'yep', 'yeah'];
    const denyKeywords = ['no', 'wrong', 'incorrect', 'cancel', 'stop', 'nope'];
    
    const lowerText = text.toLowerCase();
    
    for (const keyword of denyKeywords) {
      if (lowerText.includes(keyword)) {
        return false;
      }
    }
    
    for (const keyword of confirmKeywords) {
      if (lowerText.includes(keyword)) {
        return true;
      }
    }
    
    return false; // Default to false if unclear
  }

  buildConfirmationMessage(state) {
    return `Great! Just to confirm: you'd like to book a ${state.service} on ${state.date} at ${state.chosenTime}. And the details I have for you are Name: ${state.clientName}, Email: ${state.clientEmail}, Phone: ${state.clientPhone}. Is all of that correct?`;
  }

  async sendSMSResponse(sms, message) {
    console.log(`📤 SMS to ${sms.from}: "${message}"`);
  }
}

// Simple test for the structured SMS assistant
async function testSimpleSequence() {
  console.log('🧪 Testing Simple SMS Sequence\n');

  const storage = new MockStorage();
  const assistant = new MockSMSStructuredAssistant(storage);

  const testPhone = '+1234567890';
  
  // Step 1: Greeting
  console.log('📱 Step 1: Greeting');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'Hi, I want to book an appointment',
    timestamp: new Date().toISOString(),
    messageId: 'step_1'
  });
  console.log('');

  // Step 2: Service selection
  console.log('📱 Step 2: Service selection');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'I want the signature head spa',
    timestamp: new Date().toISOString(),
    messageId: 'step_2'
  });
  console.log('');

  // Step 3: Date selection
  console.log('📱 Step 3: Date selection');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'tomorrow',
    timestamp: new Date().toISOString(),
    messageId: 'step_3'
  });
  console.log('');

  // Step 4: Time selection (this should trigger get_available_times)
  console.log('📱 Step 4: Time selection');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: '9:00 AM',
    timestamp: new Date().toISOString(),
    messageId: 'step_4'
  });
  console.log('');

  // Step 5: Client name
  console.log('📱 Step 5: Client name');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'John Smith',
    timestamp: new Date().toISOString(),
    messageId: 'step_5'
  });
  console.log('');

  // Step 6: Client email
  console.log('📱 Step 6: Client email');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'john.smith@email.com',
    timestamp: new Date().toISOString(),
    messageId: 'step_6'
  });
  console.log('');

  // Step 7: Client phone
  console.log('📱 Step 7: Client phone');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: '+1234567890',
    timestamp: new Date().toISOString(),
    messageId: 'step_7'
  });
  console.log('');

  // Step 8: Confirmation
  console.log('📱 Step 8: Confirmation');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'yes, that\'s correct',
    timestamp: new Date().toISOString(),
    messageId: 'step_8'
  });
  console.log('');

  console.log('✅ Simple SMS Sequence test completed!');
}

// Run the test
testSimpleSequence().catch(console.error); 