import { IStorage } from './storage.js';
import { SMSAppointmentBookingService } from './sms-appointment-booking.js';
import { sendSMS } from './sms.js';

interface ConversationState {
  phoneNumber: string;
  step: 'greeting' | 'get_service' | 'get_date' | 'get_available_times' | 'get_chosen_time' | 'get_client_info' | 'confirm_details' | 'book_appointment' | 'completed';
  service?: string;
  date?: string;
  availableTimes?: string[];
  chosenTime?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  lastUpdated: Date;
}

interface SMSMessage {
  from: string;
  to: string;
  body: string;
  timestamp: string;
  messageId: string;
}

interface AssistantResponse {
  success: boolean;
  message: string;
  nextStep?: string;
  error?: string;
}

interface AvailableTimesResult {
  success: boolean;
  times: string[];
  message: string;
}

interface BookingResult {
  success: boolean;
  message: string;
  appointmentId?: string;
}

export class SMSStructuredAssistant {
  private storage: IStorage;
  private appointmentBookingService: SMSAppointmentBookingService;
  private conversationStates: Map<string, ConversationState> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
    this.appointmentBookingService = new SMSAppointmentBookingService(storage);
  }

  /**
   * Main entry point for processing incoming SMS messages
   */
  async processMessage(sms: SMSMessage): Promise<AssistantResponse> {
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

  /**
   * Step 1: Greeting & Task Identification
   */
  private handleGreeting(sms: SMSMessage): AssistantResponse {
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

  /**
   * Step 2: Get Service
   */
  private handleGetService(sms: SMSMessage, userMessage: string): AssistantResponse {
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

  /**
   * Step 3: Get Date
   */
  private handleGetDate(sms: SMSMessage, userMessage: string): AssistantResponse {
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

  /**
   * Step 4: Get Available Times (Function Call)
   */
  private async handleGetAvailableTimes(sms: SMSMessage): Promise<AssistantResponse> {
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

  /**
   * Step 5: Get Chosen Time
   */
  private handleGetChosenTime(sms: SMSMessage, userMessage: string): AssistantResponse {
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

  /**
   * Step 6: Get Client Information
   */
  private handleGetClientInfo(sms: SMSMessage, userMessage: string): AssistantResponse {
    const state = this.getConversationState(sms.from);
    
    // This is a simplified version - in a real implementation, you'd want to parse
    // the user's response to extract name, email, and phone more intelligently
    // For now, we'll assume the user provides their name in this message
    
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

  /**
   * Step 7: Confirm Details
   */
  private handleConfirmDetails(sms: SMSMessage, userMessage: string): AssistantResponse {
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

  /**
   * Step 8: Book Appointment (Function Call)
   */
  private async handleBookAppointment(sms: SMSMessage): Promise<AssistantResponse> {
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

  /**
   * Function: get_available_times
   * Purpose: Fetches a list of available appointment times for a specific service on a given date
   */
  private async get_available_times(service: string, date: string): Promise<AvailableTimesResult> {
    try {
      console.log(`🔍 Getting available times for ${service} on ${date}`);
      
      // Parse the date
      const parsedDate = this.parseDate(date);
      if (!parsedDate) {
        return {
          success: false,
          times: [],
          message: "I couldn't understand the date format. Please provide a valid date."
        };
      }

      // Create appointment request
      const request = {
        serviceName: service,
        date: date,
        time: undefined,
        clientPhone: '', // We don't have the phone number yet
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
        return startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      });

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

  /**
   * Function: book_appointment
   * Purpose: Books the appointment in the calendar and creates a new client profile in the database
   */
  private async book_appointment(
    service: string,
    date: string,
    time: string,
    fullName: string,
    email: string,
    phone: string
  ): Promise<BookingResult> {
    try {
      console.log(`📞 Booking appointment: ${service} on ${date} at ${time} for ${fullName}`);
      
      // Parse the date and time
      const parsedDate = this.parseDate(date);
      const parsedTime = this.parseTime(time);
      
      if (!parsedDate || !parsedTime) {
        return {
          success: false,
          message: "I need a valid date and time to book your appointment. Please provide both clearly."
        };
      }

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

      // Find the best matching slot
      const targetDateTime = new Date(parsedDate);
      targetDateTime.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
      
      const bestSlot = availableSlots.find(slot => {
        const slotTime = new Date(slot.startTime);
        return Math.abs(slotTime.getTime() - targetDateTime.getTime()) < 30 * 60 * 1000; // Within 30 minutes
      }) || availableSlots[0];

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
  private getConversationState(phoneNumber: string): ConversationState {
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

  private updateConversationState(phoneNumber: string, state: ConversationState): void {
    state.lastUpdated = new Date();
    this.conversationStates.set(phoneNumber, state);
  }

  private clearConversationState(phoneNumber: string): void {
    this.conversationStates.delete(phoneNumber);
  }

  // Helper methods for parsing user input
  private extractService(text: string): string | null {
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

  private extractDate(text: string): string | null {
    // Simple date extraction - in a real implementation, you'd want more sophisticated parsing
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

  private extractTime(text: string, availableTimes: string[]): string | null {
    const lowerText = text.toLowerCase();
    
    for (const time of availableTimes) {
      if (lowerText.includes(time.toLowerCase())) {
        return time;
      }
    }
    
    return null;
  }

  private parseDate(dateStr: string): Date | null {
    // Simple date parsing - in a real implementation, you'd want more sophisticated parsing
    const today = new Date();
    
    if (dateStr.toLowerCase() === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    
    if (dateStr.toLowerCase() === 'today') {
      return today;
    }
    
    // Try to parse as MM/DD or MM-DD
    const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
      const month = parseInt(match[1]) - 1;
      const day = parseInt(match[2]);
      const date = new Date(today.getFullYear(), month, day);
      return date;
    }
    
    return null;
  }

  private parseTime(timeStr: string): { hours: number; minutes: number } | null {
    // Parse time in format like "10:30 AM" or "2:00 PM"
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return { hours, minutes };
    }
    
    return null;
  }

  private isStartOverRequest(text: string): boolean {
    const startOverKeywords = ['start over', 'restart', 'begin again', 'new booking'];
    return startOverKeywords.some(keyword => text.includes(keyword));
  }

  private isConfirmation(text: string): boolean {
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

  private buildConfirmationMessage(state: ConversationState): string {
    return `Great! Just to confirm: you'd like to book a ${state.service} on ${state.date} at ${state.chosenTime}. And the details I have for you are Name: ${state.clientName}, Email: ${state.clientEmail}, Phone: ${state.clientPhone}. Is all of that correct?`;
  }

  private async sendSMSResponse(sms: SMSMessage, message: string): Promise<void> {
    try {
      await sendSMS(sms.from, message);
      console.log(`📤 Sent SMS to ${sms.from}: "${message}"`);
    } catch (error) {
      console.error('Error sending SMS response:', error);
    }
  }
} 