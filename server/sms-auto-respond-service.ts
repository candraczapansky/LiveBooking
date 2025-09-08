import { IStorage } from './storage.js';
import { LLMService } from './llm-service.js';
import { SMSAppointmentBookingService } from './sms-appointment-booking.js';
import { SMSAppointmentManagementService } from './sms-appointment-management.js';
import { sendSMS } from './sms.js';

interface SMSAutoRespondConfig {
  enabled: boolean;
  confidenceThreshold: number; // Minimum confidence to auto-respond
  maxResponseLength: number; // Maximum response length
  businessHoursOnly: boolean; // Only respond during business hours
  businessHours: {
    start: string; // "09:00"
    end: string; // "17:00"
    timezone: string; // "America/Chicago"
  };
  excludedKeywords: string[]; // Keywords that should not trigger auto-response
  excludedPhoneNumbers: string[]; // Phone numbers that should not trigger auto-response
  autoRespondPhoneNumbers: string[]; // Phone numbers that should receive auto-responses
}

interface IncomingSMS {
  from: string;
  to: string;
  body: string;
  timestamp: string;
  messageId: string;
}

interface SMSAutoRespondResult {
  success: boolean;
  responseSent: boolean;
  response?: string;
  confidence?: number;
  error?: string;
  reason?: string; // Why auto-response was not sent
}

interface BookingConversationState {
  phoneNumber: string;
  selectedService?: string;
  selectedDate?: string;
  selectedTime?: string;
  lastUpdated: Date;
  conversationStep: 'initial' | 'service_selected' | 'date_selected' | 'time_selected' | 'completed' | 'service_requested' | 'date_requested';
}

// Add new interface for conversation flow steps
interface ConversationFlowStep {
  id: string;
  type: 'trigger' | 'response' | 'question' | 'condition' | 'action';
  name: string;
  content: string;
  order: number;
  conditions?: {
    hasService?: boolean;
    hasDate?: boolean;
    hasTime?: boolean;
    conversationStep?: string;
  };
}

interface ConversationFlow {
  id: string;
  name: string;
  description: string;
  steps: ConversationFlowStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class SMSAutoRespondService {
  private storage: IStorage;
  private llmService: LLMService;
  private appointmentBookingService: SMSAppointmentBookingService;
  private appointmentManagementService: SMSAppointmentManagementService;
  private config: SMSAutoRespondConfig;
  private configLoaded: boolean = false;
  private conversationStates: Map<string, BookingConversationState> = new Map();

  // Add conversation flow management
  private conversationFlows: Map<string, ConversationFlow> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
    this.llmService = new LLMService(storage);
    this.appointmentBookingService = new SMSAppointmentBookingService(storage);
    this.appointmentManagementService = new SMSAppointmentManagementService(storage);
    this.config = {
      enabled: true,
      confidenceThreshold: 0.7,
      maxResponseLength: 500, // Increased from 160 to 500 characters
      businessHoursOnly: false,
      businessHours: {
        start: "09:00",
        end: "17:00",
        timezone: "America/Chicago"
      },
      excludedKeywords: [
        "urgent", "emergency", "complaint", "refund", "cancel", "cancellation",
        "reschedule", "change", "modify", "asap", "immediately", "help", "911"
      ],
      excludedPhoneNumbers: [],
      autoRespondPhoneNumbers: []
    };
    this.configLoaded = true; // Mark config as loaded
    this.initializeDefaultFlows(); // Initialize default conversation flows
  }

  static getInstance(storage: IStorage): SMSAutoRespondService {
    if (!(global as any).smsAutoRespondService) {
      (global as any).smsAutoRespondService = new SMSAutoRespondService(storage);
    }
    return (global as any).smsAutoRespondService;
  }

  static clearInstance(): void {
    if ((global as any).smsAutoRespondService) {
      delete (global as any).smsAutoRespondService;
      console.log('SMS Auto Responder Service singleton instance cleared');
    }
  }

  /**
   * Validate time format
   */
  private validateTimeFormat(time: string | undefined): { isValid: boolean; reason?: string } {
    if (!time) return { isValid: false, reason: 'No time provided' };
    
    // Check for malformed patterns
    if (time.includes('00 am') || time.includes('00 pm')) {
      return { isValid: false, reason: 'Malformed time format (00 am/pm)' };
    }
    
    // Check length
    if (time.length < 2) {
      return { isValid: false, reason: 'Time too short' };
    }
    
    // Check for numeric time patterns
    const timePattern = /^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i;
    const match = time.match(timePattern);
    
    if (match) {
      const hour = parseInt(match[1]);
      const minute = match[2] ? parseInt(match[2]) : 0;
      
      if (hour < 1 || hour > 12) {
        return { isValid: false, reason: 'Invalid hour' };
      }
      
      if (minute < 0 || minute > 59) {
        return { isValid: false, reason: 'Invalid minute' };
      }
      
      return { isValid: true };
    }
    
    return { isValid: false, reason: 'Invalid time format' };
  }

  /**
   * Determine message intent with improved logic
   */
  private getMessageIntent(smsText: string, phoneNumber: string): 'booking' | 'reschedule' | 'cancel' | 'business_question' | 'general' {
    const text = smsText.toLowerCase().trim();
    
    // Get current conversation state
    const conversationState = this.getConversationState(phoneNumber);
    const inBookingConversation = conversationState && conversationState.conversationStep !== 'initial';
    
    console.log(`🔍 Intent analysis for: "${smsText}"`);
    console.log(`🔍 Conversation state:`, conversationState);
    console.log(`🔍 In booking conversation:`, inBookingConversation);
    
    // PRIORITY 1: Check for explicit reschedule intent
    if (this.isRescheduleRequest(smsText)) {
      console.log(`✅ Intent: reschedule (explicit)`);
      return 'reschedule';
    }
    
    // PRIORITY 2: Check for explicit cancel intent
    if (this.isCancelRequest(smsText)) {
      console.log(`✅ Intent: cancel (explicit)`);
      return 'cancel';
    }
    
    // PRIORITY 3: Check for business questions (highest priority for non-booking)
    if (this.isBusinessQuestion(smsText)) {
      console.log(`✅ Intent: business_question (explicit)`);
      return 'business_question';
    }
    
    // PRIORITY 4: Check for explicit booking intent
    if (this.isAppointmentBookingRequest(smsText, phoneNumber)) {
      console.log(`✅ Intent: booking (explicit or context-based)`);
      return 'booking';
    }
    
    // PRIORITY 5: Check for simple greetings (should not be booking unless in booking context)
    const isSimpleGreeting = this.isSimpleGreeting(smsText);
    console.log(`🔍 isSimpleGreeting result:`, isSimpleGreeting);
    
    if (isSimpleGreeting) {
      console.log(`✅ Intent: general (simple greeting)`);
      return 'general';
    }
    
    // PRIORITY 6: Default to general for anything else
    console.log(`✅ Intent: general (default)`);
    return 'general';
  }

  /**
   * Improved appointment booking request detection
   */
  private isAppointmentBookingRequest(smsText: string, phoneNumber: string): boolean {
    const text = smsText.toLowerCase().trim();
    
    console.log(`🔍 isAppointmentBookingRequest called with: "${smsText}"`);
    
    // Check for explicit booking keywords
    const bookingKeywords = [
      'book', 'booking', 'appointment', 'schedule', 'reserve', 'make an appointment',
      'want to book', 'need an appointment', 'looking to book', 'can i book',
      'i want to book', 'i need to book', 'book me', 'book a', 'book the'
    ];
    
    // Check for service + booking combination
    const serviceKeywords = [
      'signature head spa', 'deluxe head spa', 'platinum head spa', 'head spa',
      'massage', 'facial', 'haircut', 'styling', 'treatment'
    ];
    
    // Check for time/date keywords
    const timeKeywords = [
      'today', 'tomorrow', 'next week', 'this week', 'monday', 'tuesday', 'wednesday',
      'thursday', 'friday', 'saturday', 'sunday', 'morning', 'afternoon', 'evening',
      'am', 'pm', 'o\'clock', 'at', 'for'
    ];
    
    // Check for availability questions (should be treated as booking requests)
    const availabilityKeywords = [
      'available', 'availability', 'when can i', 'what times', 'open slots',
      'do you have', 'can i get', 'is there', 'any openings', 'any slots'
    ];
    
    // Get conversation state
    const conversationState = this.getConversationState(phoneNumber);
    const inBookingConversation = conversationState && conversationState.conversationStep !== 'initial';
    
    console.log(`🔍 Booking request analysis for: "${smsText}"`);
    console.log(`🔍 Conversation state:`, conversationState);
    console.log(`🔍 In booking conversation:`, inBookingConversation);
    
    // PRIORITY 1: If it's clearly a pricing question, it's NOT a booking request
    if (text.includes('how much') || text.includes('cost') || text.includes('price') || text.includes('pricing')) {
      console.log(`❌ Not a booking request: Contains pricing keywords`);
      return false;
    }
    
    // PRIORITY 2: If it's a business information question, it's NOT a booking request
    if (text.includes('what services') || text.includes('services do you offer') || 
        text.includes('when are you open') || text.includes('what are your hours') ||
        text.includes('where are you') || text.includes('what\'s your address')) {
      console.log(`❌ Not a booking request: Contains business info keywords`);
      return false;
    }
    
    // PRIORITY 3: Check for explicit booking intent
    const hasBookingIntent = bookingKeywords.some(keyword => text.includes(keyword));
    console.log(`🔍 Has booking intent:`, hasBookingIntent);
    console.log(`🔍 Matching keywords:`, bookingKeywords.filter(keyword => text.includes(keyword)));
    
    if (hasBookingIntent) {
      console.log(`✅ Is a booking request: Contains explicit booking keywords`);
      return true;
    }
    
    // PRIORITY 4: Check for availability questions
    const hasAvailabilityIntent = availabilityKeywords.some(keyword => text.includes(keyword));
    if (hasAvailabilityIntent) {
      console.log(`✅ Is a booking request: Availability question`);
      return true;
    }
    
    // PRIORITY 5: Check for service + time/date combination
    const hasServiceAndTime = serviceKeywords.some(service => text.includes(service)) &&
                             timeKeywords.some(time => text.includes(time));
    if (hasServiceAndTime) {
      console.log(`✅ Is a booking request: Service + time combination`);
      return true;
    }
    
    // PRIORITY 6: If in booking conversation, treat as booking request
    if (inBookingConversation) {
      console.log(`✅ Is a booking request: In booking conversation`);
      return true;
    }
    
    // PRIORITY 7: Check for time/date keywords (SIMPLIFIED - treat as booking request)
    const hasTimeKeywords = timeKeywords.some(keyword => text.includes(keyword));
    if (hasTimeKeywords) {
      console.log(`✅ Is a booking request: Contains time/date keywords`);
      return true;
    }
    
    // PRIORITY 8: If it's a simple greeting, it's NOT a booking request
    if (this.isSimpleGreeting(smsText)) {
      console.log(`❌ Not a booking request: Simple greeting without booking context`);
      return false;
    }
    
    // Default: not a booking request
    console.log(`❌ Not a booking request: No clear booking intent detected`);
    return false;
  }

  /**
   * Check if message is a reschedule request
   */
  private isRescheduleRequest(smsText: string): boolean {
    const text = smsText.toLowerCase();
    const rescheduleKeywords = [
      'reschedule', 'change appointment', 'move appointment', 'change time',
      'move time', 'change date', 'move date', 'reschedule appointment'
    ];
    
    return rescheduleKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if message is a cancel request
   */
  private isCancelRequest(smsText: string): boolean {
    const text = smsText.toLowerCase();
    const cancelKeywords = [
      'cancel', 'cancellation', 'cancel appointment', 'cancel booking',
      'cancel my appointment', 'cancel my booking'
    ];
    
    return cancelKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Improved business question detection
   */
  private isBusinessQuestion(smsText: string): boolean {
    const text = smsText.toLowerCase().trim();
    
    // Business question keywords - expanded for better coverage
    const businessKeywords = [
      'what services', 'services do you offer', 'what do you offer',
      'when are you open', 'what are your hours', 'hours of operation',
      'where are you', 'what\'s your address', 'location', 'directions',
      'how much', 'cost', 'price', 'pricing', 'what does it cost',
      'do you have', 'do you offer', 'can you tell me', 'what time',
      'what days', 'are you open', 'when do you', 'where do you',
      'head spa cost', 'how much is', 'what\'s the price', 'what\'s the cost',
      'tell me about', 'information about', 'details about', 'what about',
      'do you do', 'can you do', 'offer any', 'have any', 'provide any'
    ];
    
    // Check if message contains business question keywords
    const isBusinessQuestion = businessKeywords.some(keyword => text.includes(keyword));
    
    console.log(`🔍 Business question analysis for: "${smsText}"`);
    console.log(`🔍 Is business question:`, isBusinessQuestion);
    
    return isBusinessQuestion;
  }

  /**
   * Improved simple greeting detection
   */
  private isSimpleGreeting(smsText: string): boolean {
    const text = smsText.toLowerCase().trim();
    
    const simpleGreetings = [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'
    ];
    
    const result = simpleGreetings.some(greeting => text === greeting);
    
    console.log('isSimpleGreeting debug:', {
      originalMessage: smsText,
      trimmedMessage: text,
      simpleGreetings: simpleGreetings,
      result: result
    });
    
    return result;
  }

  // Enhanced intent recognition methods
  private isBookingIntent(text: string): boolean {
    const bookingKeywords = ['book', 'appointment', 'schedule', 'reservation', 'booking', 'make appointment'];
    return bookingKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isRescheduleIntent(text: string): boolean {
    const rescheduleKeywords = ['reschedule', 'change', 'move', 'postpone', 'different time', 'different date'];
    return rescheduleKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isCancelIntent(text: string): boolean {
    const cancelKeywords = ['cancel', 'cancel appointment', 'cancel booking', 'no longer need', 'can\'t make it'];
    return cancelKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private isStartOverRequest(text: string): boolean {
    const startOverKeywords = ['start over', 'restart', 'begin again', 'new booking', 'start fresh'];
    return startOverKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  // Enhanced text extraction methods
  private extractServiceFromText(text: string): string | null {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('signature') || textLower.includes('basic')) {
      return 'Signature Head Spa';
    } else if (textLower.includes('deluxe') || textLower.includes('premium')) {
      return 'Deluxe Head Spa';
    } else if (textLower.includes('platinum') || textLower.includes('ultimate')) {
      return 'Platinum Head Spa';
    }
    
    return null;
  }

  private extractDateFromText(text: string): string | null {
    const textLower = text.toLowerCase();
    
    // Check for specific days
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      if (textLower.includes(day)) {
        return day.charAt(0).toUpperCase() + day.slice(1);
      }
    }
    
    // Check for tomorrow
    if (textLower.includes('tomorrow')) {
      return 'Tomorrow';
    }
    
    // Check for date patterns (like "July 30th", "30th", etc.)
    const datePatterns = [
      /(\d{1,2})(st|nd|rd|th)/i,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
      /(\d{1,2})\/(\d{1,2})/i
    ];
    
    for (const pattern of datePatterns) {
      if (pattern.test(text)) {
        return text.trim();
      }
    }
    
    return null;
  }

  private extractTimeFromText(text: string): string | null {
    const textLower = text.toLowerCase();
    
    // Check for specific time patterns
    const timePatterns = [
      { pattern: /3\s*(pm|p\.m\.)/i, time: '3:00 PM' },
      { pattern: /9\s*(am|a\.m\.)/i, time: '9:00 AM' },
      { pattern: /11\s*(am|a\.m\.)/i, time: '11:00 AM' },
      { pattern: /1\s*(pm|p\.m\.)/i, time: '1:00 PM' },
      { pattern: /5\s*(pm|p\.m\.)/i, time: '5:00 PM' },
      { pattern: /^3$/, time: '3:00 PM' },
      { pattern: /^9$/, time: '9:00 AM' },
      { pattern: /^11$/, time: '11:00 AM' },
      { pattern: /^1$/, time: '1:00 PM' },
      { pattern: /^5$/, time: '5:00 PM' }
    ];
    
    for (const { pattern, time } of timePatterns) {
      if (pattern.test(textLower)) {
        return time;
      }
    }
    
    return null;
  }

  /**
   * Get conversation state for a phone number
   */
  private getConversationState(phoneNumber: string): BookingConversationState | undefined {
    const state = this.conversationStates.get(phoneNumber);
    
    console.log(`🔍 Getting conversation state for ${phoneNumber}:`, state);
    
    if (state) {
      // Check if the state is stale (older than 6 minutes - reduced from 8)
      const now = new Date();
      const timeDiff = now.getTime() - state.lastUpdated.getTime();
      const sixMinutes = 6 * 60 * 1000; // 6 minutes in milliseconds
      
      if (timeDiff > sixMinutes) {
        console.log(`🔄 Clearing stale conversation state for ${phoneNumber} (${Math.round(timeDiff / 60000)} minutes old)`);
        this.conversationStates.delete(phoneNumber);
        return undefined;
      }
      
      // Check for malformed time data and clear if found
      if (state.selectedTime && 
          (state.selectedTime.includes('00 am') || 
           state.selectedTime.includes('00 pm') ||
           state.selectedTime === 'undefined' ||
           state.selectedTime === 'null' ||
           state.selectedTime === '' ||
           state.selectedTime.length < 2)) {
        console.log(`🔄 Clearing conversation state with malformed time: ${state.selectedTime}`);
        this.conversationStates.delete(phoneNumber);
        return undefined;
      }
      
      // Check for malformed service data and clear if found
      if (state.selectedService && 
          (state.selectedService === 'undefined' ||
           state.selectedService === 'null' ||
           state.selectedService === '' ||
           state.selectedService.length < 2)) {
        console.log(`🔄 Clearing conversation state with malformed service: ${state.selectedService}`);
        this.conversationStates.delete(phoneNumber);
        return undefined;
      }
      
      // Check for malformed date data and clear if found
      if (state.selectedDate && 
          (state.selectedDate === 'undefined' ||
           state.selectedDate === 'null' ||
           state.selectedDate === '' ||
           state.selectedDate.length < 2)) {
        console.log(`🔄 Clearing conversation state with malformed date: ${state.selectedDate}`);
        this.conversationStates.delete(phoneNumber);
        return undefined;
      }
      
      // If conversation has been in the same step for more than 10 minutes, clear it (increased from 2)
      if (state.conversationStep !== 'initial' && timeDiff > 10 * 60 * 1000) {
        console.log(`🔄 Clearing conversation state stuck in step: ${state.conversationStep} for ${Math.round(timeDiff / 60000)} minutes`);
        this.conversationStates.delete(phoneNumber);
        return undefined;
      }
      
      // Additional validation: Check if the state makes logical sense
      if (state.conversationStep === 'time_selected' && !state.selectedTime) {
        console.log(`🔄 Clearing conversation state: time_selected step but no time selected`);
        this.conversationStates.delete(phoneNumber);
        return undefined;
      }
      
      if (state.conversationStep === 'date_selected' && !state.selectedDate) {
        console.log(`🔄 Clearing conversation state: date_selected step but no date selected`);
        this.conversationStates.delete(phoneNumber);
        return undefined;
      }
      
      if (state.conversationStep === 'service_selected' && !state.selectedService) {
        console.log(`🔄 Clearing conversation state: service_selected step but no service selected`);
        this.conversationStates.delete(phoneNumber);
        return undefined;
      }
      
      return state;
    }
    
    return undefined;
  }

  /**
   * Update conversation state for a phone number
   */
  private updateConversationState(phoneNumber: string, updates: Partial<BookingConversationState>): void {
    const currentState = this.conversationStates.get(phoneNumber);
    
    const newState: BookingConversationState = {
      phoneNumber,
      selectedService: updates.selectedService || currentState?.selectedService,
      selectedDate: updates.selectedDate || currentState?.selectedDate,
      selectedTime: updates.selectedTime || currentState?.selectedTime,
      lastUpdated: new Date(),
      conversationStep: updates.conversationStep || currentState?.conversationStep || 'initial'
    };
    
    this.conversationStates.set(phoneNumber, newState);
    
    console.log(`📝 Updated conversation state for ${phoneNumber}:`, {
      step: newState.conversationStep,
      service: newState.selectedService,
      date: newState.selectedDate,
      time: newState.selectedTime
    });
  }

  /**
   * Clear conversation state for a phone number
   */
  private clearConversationState(phoneNumber: string): void {
    const wasDeleted = this.conversationStates.delete(phoneNumber);
    if (wasDeleted) {
      console.log(`🗑️ Cleared conversation state for ${phoneNumber}`);
    }
  }

  /**
   * Process an incoming SMS and determine if auto-response should be sent
   */
  async processIncomingSMS(sms: IncomingSMS): Promise<SMSAutoRespondResult> {
    try {
      console.log('SMS Auto Responder - Processing incoming SMS:', {
        from: sms.from,
        body: sms.body.substring(0, 50) + '...',
        timestamp: sms.timestamp
      });

      // Check if auto-respond is enabled
      if (!this.config.enabled) {
        return {
          success: true,
          responseSent: false,
          reason: "SMS auto-respond is disabled"
        };
      }

      // Check business hours if configured
      if (this.config.businessHoursOnly && !this.isWithinBusinessHours()) {
        return {
          success: true,
          responseSent: false,
          reason: "Outside business hours"
        };
      }

      // Check if SMS contains excluded keywords
      if (this.containsExcludedKeywords(sms.body)) {
        return {
          success: true,
          responseSent: false,
          reason: "Contains excluded keywords"
        };
      }

      // Check if SMS is from an excluded phone number
      if (this.isExcludedPhoneNumber(sms.from)) {
        return {
          success: true,
          responseSent: false,
          reason: "From excluded phone number"
        };
      }

      // Check if SMS is to an auto-respond phone number
      if (!this.isAutoRespondPhoneNumber(sms.to)) {
        return {
          success: true,
          responseSent: false,
          reason: "Not sent to auto-respond phone number"
        };
      }

      // Find or create client
      const client = await this.findOrCreateClient(sms.from);
      
      // Determine message intent
      const intent = this.getMessageIntent(sms.body, sms.from);
      console.log('SMS Auto Responder - Message intent:', {
        smsBody: sms.body,
        intent: intent
      });

      // Clear conversation state if intent changes significantly
      const conversationState = this.getConversationState(sms.from);
      // Clear conversation state if intent changes (but not for booking-related intents)
      // Also, don't clear if we're in a booking conversation and the message contains service keywords
      const containsServiceKeywords = sms.body.toLowerCase().includes('signature') || 
                                   sms.body.toLowerCase().includes('deluxe') || 
                                   sms.body.toLowerCase().includes('platinum') ||
                                   sms.body.toLowerCase().includes('head spa');
      
      // Don't clear state if we're in a booking conversation and the message looks like a continuation
      const isInBookingFlow = conversationState && 
                              conversationState.conversationStep !== 'initial' && 
                              (conversationState.selectedService || conversationState.selectedDate || conversationState.selectedTime);
      
      const isTimeResponse = sms.body.toLowerCase().match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i) ||
                           sms.body.toLowerCase().match(/(\d{1,2})\s*(am|pm)/i);
      
      const shouldPreserveState = isInBookingFlow || containsServiceKeywords || isTimeResponse;
      
      if (conversationState && 
          conversationState.conversationStep !== 'initial' && 
          intent !== 'booking' && 
          intent !== 'reschedule' && 
          intent !== 'cancel' &&
          !shouldPreserveState) {
        console.log('🔄 Clearing conversation state due to intent change');
        this.clearConversationState(sms.from);
      }

      // Handle different intents
      switch (intent) {
        case 'booking':
          console.log('SMS Auto Responder - Processing booking request');
          return await this.handleBookingRequest(sms, client);
          
        case 'reschedule':
          console.log('SMS Auto Responder - Processing reschedule request');
          return await this.handleRescheduleRequest(sms, client);
          
        case 'cancel':
          console.log('SMS Auto Responder - Processing cancel request');
          return await this.handleCancelRequest(sms, client);
          
        case 'business_question':
          console.log('SMS Auto Responder - Processing business question');
          return await this.handleBusinessQuestion(sms, client);
          
        case 'general':
        default:
          console.log('SMS Auto Responder - Processing general message');
          return await this.handleGeneralMessage(sms, client);
      }

    } catch (error: any) {
      console.error('Error processing SMS for auto-response:', error);
      return {
        success: false,
        responseSent: false,
        error: error.message || 'Unknown error processing SMS'
      };
    }
  }

  /**
   * Find or create a client record for the phone number
   */
  private async findOrCreateClient(phoneNumber: string): Promise<any> {
    try {
      // Try to find existing client by phone number
      const users = await this.storage.getAllUsers();
      let client: any = users.find((u: any) => 
        u.phone && u.phone.replace(/\D/g, '') === phoneNumber.replace(/\D/g, '')
      );

      if (!client) {
        // For now, just return a basic client object without creating a user
        // This avoids the complexity of user creation for SMS auto-respond
        client = {
          id: 0,
          phone: phoneNumber,
          firstName: `SMS Client`,
          lastName: phoneNumber,
          email: '',
          username: `sms_${Date.now()}`,
          password: `temp_${Date.now()}`,
          role: 'client',
          address: null,
          city: null,
          state: null,
          zipCode: null,
          profilePicture: null,
          resetToken: null,
          resetTokenExpiry: null,
          createdAt: null,
          // Add required fields with defaults
          emailAccountManagement: true,
          emailAppointmentReminders: true,
          emailPromotions: false,
          smsAccountManagement: false,
          smsAppointmentReminders: true,
          smsPromotions: false,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
          twoFactorMethod: 'authenticator',
          twoFactorEmailCode: null,
          twoFactorEmailCodeExpiry: null,
          helcimCustomerId: null,
          notes: null,
          birthday: null
        };
        console.log('Using temporary client for SMS auto-respond:', client);
      }

      return client;
    } catch (error) {
      console.error('Error finding/creating client:', error);
      // Return a basic client object if storage fails
      return {
        id: 'unknown',
        phone: phoneNumber,
        name: 'Unknown Client',
        email: ''
      };
    }
  }

  /**
   * Build context for LLM based on client and SMS
   */
  private async buildContext(client: any, sms: IncomingSMS): Promise<any> {
    try {
      // Get recent appointments for context
      const appointments = await this.storage.getAllAppointments();
      const clientAppointments = appointments.filter((apt: any) => 
        apt.client_id === client.id
      ).slice(-5); // Last 5 appointments

      // Get business information
      const businessSettings = await this.storage.getBusinessSettings();

      return {
        client: {
          name: client.name,
          phone: client.phone,
          email: client.email,
          recent_appointments: clientAppointments
        },
        business: {
          name: businessSettings?.businessName || 'Our Business',
          services: [],
          hours: '9 AM - 5 PM'
        },
        message_type: 'SMS',
        timestamp: sms.timestamp
      };
    } catch (error) {
      console.error('Error building context:', error);
      return {
        client: {
          name: client.name,
          phone: client.phone
        },
        business: {
          name: 'Our Business',
          hours: '9 AM - 5 PM'
        },
        message_type: 'SMS'
      };
    }
  }

  /**
   * Build enhanced context for LLM with comprehensive RAG data
   */
  private async buildEnhancedContext(client: any, sms: IncomingSMS): Promise<any> {
    try {
      console.log('🔍 Building enhanced RAG context for client:', client.id);
      
      // 1. Get real-time business data
      const businessSettings = await this.storage.getBusinessSettings();
      const services = await this.storage.getAllServices();
      const staff = await this.storage.getAllStaff();
      const businessKnowledge = await this.storage.getBusinessKnowledge();
      
      // 2. Get real-time availability data
      const existingAppointments = await this.storage.getAllAppointments();
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Filter appointments for next 7 days
      const upcomingAppointments = existingAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.startTime);
        return aptDate >= today && aptDate <= nextWeek;
      });
      
      // 3. Get client-specific data
      const clientAppointments = existingAppointments.filter((apt: any) => 
        apt.client_id === client.id
      ).slice(-10); // Last 10 appointments for better context
      
      const clientPreferences = {
        emailAccountManagement: client.emailAccountManagement || false,
        emailAppointmentReminders: client.emailAppointmentReminders || false,
        emailPromotions: client.emailPromotions || false,
        smsAccountManagement: client.smsAccountManagement || false,
        smsAppointmentReminders: client.smsAppointmentReminders || false,
        smsPromotions: client.smsPromotions || false,
      };
      
      // 4. Get staff details with schedules
      const staffWithSchedules = await Promise.all(
        staff.map(async (s) => {
          const user = await this.storage.getUser(s.userId);
          const schedules = await this.storage.getStaffSchedulesByStaffId(s.id);
          const staffServices = await this.storage.getStaffServices(s.id);
          
          return {
            id: s.id,
            name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown',
            title: s.title,
            bio: s.bio || undefined,
            schedules: schedules,
            services: staffServices.map((ss: any) => {
              const service = services.find(svc => svc.id === ss.serviceId);
              return service ? service.name : 'Unknown Service';
            })
          };
        })
      );
      
      // 5. Get real-time availability for next 7 days
      const availabilityData = await this.generateAvailabilityData(services, staffWithSchedules, upcomingAppointments);
      
      // 6. Categorize business knowledge for better retrieval
      const categorizedKnowledge = this.categorizeBusinessKnowledge(businessKnowledge);
      
      console.log('📊 Enhanced RAG Context Summary:');
      console.log(`- Services: ${services.length}`);
      console.log(`- Staff: ${staff.length}`);
      console.log(`- Business Knowledge: ${businessKnowledge.length} entries`);
      console.log(`- Upcoming Appointments: ${upcomingAppointments.length}`);
      console.log(`- Client Appointments: ${clientAppointments.length}`);
      console.log(`- Availability Slots: ${availabilityData.totalSlots}`);
      
      return {
        // Client Information
        client: {
          id: client.id,
          name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.username,
          phone: client.phone,
          email: client.email,
          preferences: clientPreferences,
          recent_appointments: clientAppointments.map((apt: any) => ({
            id: apt.id,
            service: apt.serviceName,
            date: apt.startTime,
            status: apt.status,
            totalAmount: apt.totalAmount
          })),
          total_appointments: clientAppointments.length
        },
        
        // Business Information
        business: {
          name: businessSettings?.businessName || 'Glo Head Spa',
          type: 'salon and spa',
          settings: businessSettings,
          current_time: new Date().toISOString(),
          timezone: 'America/Chicago'
        },
        
        // Real-time Service Data
        services: services.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || undefined,
          price: s.price,
          duration: s.duration
        })),
        
        // Real-time Staff Data
        staff: staffWithSchedules,
        
        // Real-time Availability
        availability: {
          next_7_days: availabilityData.next7Days,
          total_slots: availabilityData.totalSlots,
          popular_times: availabilityData.popularTimes,
          busy_days: availabilityData.busyDays
        },
        
        // Business Knowledge (FAQ) - Categorized
        businessKnowledge: {
          all: businessKnowledge,
          categorized: categorizedKnowledge,
          categories: Object.keys(categorizedKnowledge)
        },
        
        // Appointment Data
        appointments: {
          upcoming: upcomingAppointments.length,
          client_history: clientAppointments.length,
          recent_bookings: upcomingAppointments.slice(0, 5)
        },
        
        // Message Context
        message: {
          type: 'SMS',
          timestamp: sms.timestamp,
          body: sms.body,
          from: sms.from
        }
      };
      
    } catch (error) {
      console.error('Error building enhanced RAG context:', error);
      // Fallback to basic context
      return this.buildContext(client, sms);
    }
  }
  
  /**
   * Generate real-time availability data
   */
  private async generateAvailabilityData(services: any[], staffWithSchedules: any[], upcomingAppointments: any[]) {
    const today = new Date();
    const next7Days = [];
    let totalSlots = 0;
    const popularTimes: { [key: string]: number } = {};
    const busyDays: { [key: string]: number } = {};
    
    // Generate availability for next 7 days
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Count appointments for this day
      const dayAppointments = upcomingAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.startTime);
        return aptDate.toDateString() === targetDate.toDateString();
      });
      
      busyDays[dayName] = dayAppointments.length;
      
      // Calculate available slots for this day
      let daySlots = 0;
      for (const staff of staffWithSchedules) {
        const daySchedules = staff.schedules.filter((schedule: any) => 
          schedule.dayOfWeek === dayName && !schedule.isBlocked
        );
        
        for (const schedule of daySchedules) {
          // Calculate slots based on schedule and service durations
          const startTime = new Date(`2000-01-01T${schedule.startTime}`);
          const endTime = new Date(`2000-01-01T${schedule.endTime}`);
          const durationMs = endTime.getTime() - startTime.getTime();
          
          // Assume average service duration of 60 minutes
          const slotsPerDay = Math.floor(durationMs / (60 * 60 * 1000));
          daySlots += slotsPerDay;
          
          // Track popular times
          const timeSlot = `${startTime.getHours()}:00`;
          popularTimes[timeSlot] = (popularTimes[timeSlot] || 0) + 1;
        }
      }
      
      totalSlots += daySlots;
      next7Days.push({
        date: targetDate.toISOString().split('T')[0],
        day: dayName,
        available_slots: daySlots,
        booked_appointments: dayAppointments.length,
        availability_percentage: daySlots > 0 ? ((daySlots - dayAppointments.length) / daySlots * 100).toFixed(1) : '0'
      });
    }
    
    return {
      next7Days,
      totalSlots,
      popularTimes: Object.entries(popularTimes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([time, count]) => ({ time, count })),
      busyDays: Object.entries(busyDays)
        .sort(([,a], [,b]) => b - a)
        .map(([day, count]) => ({ day, count }))
    };
  }
  
  /**
   * Categorize business knowledge for better retrieval
   */
  private categorizeBusinessKnowledge(businessKnowledge: any[]) {
    const categorized: { [key: string]: any[] } = {};
    
    businessKnowledge.forEach(item => {
      const category = item.category || 'general';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(item);
    });
    
    return categorized;
  }

  /**
   * Check if current time is within business hours
   */
  private isWithinBusinessHours(): boolean {
    try {
      const now = new Date();
      const timezone = this.config.businessHours.timezone || 'America/Chicago';
      
      // Convert to business timezone
      const businessTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const currentTime = businessTime.toTimeString().substring(0, 5); // HH:MM format
      
      return currentTime >= this.config.businessHours.start && 
             currentTime <= this.config.businessHours.end;
    } catch (error) {
      console.error('Error checking business hours:', error);
      return true; // Default to allowing responses if timezone check fails
    }
  }

  /**
   * Check if SMS contains excluded keywords
   */
  private containsExcludedKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    return this.config.excludedKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if phone number is excluded
   */
  private isExcludedPhoneNumber(phoneNumber: string): boolean {
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    return this.config.excludedPhoneNumbers.some(excluded => 
      excluded.replace(/\D/g, '') === normalizedPhone
    );
  }

  /**
   * Check if SMS is sent to an auto-respond phone number
   */
  private isAutoRespondPhoneNumber(phoneNumber: string): boolean {
    if (this.config.autoRespondPhoneNumbers.length === 0) {
      return true; // If no specific numbers configured, respond to all
    }
    
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    return this.config.autoRespondPhoneNumbers.some(respondTo => 
      respondTo.replace(/\D/g, '') === normalizedPhone
    );
  }

  /**
   * Update SMS auto-respond configuration
   */
  async updateConfig(newConfig: Partial<SMSAutoRespondConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    console.log('SMS auto-respond configuration updated:', this.config);
  }

  /**
   * Update auto-respond phone numbers
   */
  async updateAutoRespondPhoneNumbers(phoneNumbers: string[]): Promise<void> {
    this.config.autoRespondPhoneNumbers = phoneNumbers;
    console.log('SMS auto-respond phone numbers updated:', phoneNumbers);
  }

  /**
   * Get SMS auto-respond configuration
   */
  getConfig(): SMSAutoRespondConfig {
    return { ...this.config };
  }

  /**
   * Generate a fallback response when LLM fails
   */
  private generateFallbackResponse(smsBody: string, context: any): string {
    const businessName = context.business?.name || 'our business';
    
    // Simple keyword-based responses
    if (smsBody.toLowerCase().includes('appointment') || smsBody.toLowerCase().includes('booking')) {
      return `Thank you for your message about appointments. Someone from ${businessName} will contact you soon to assist you.`;
    }
    
    if (smsBody.toLowerCase().includes('price') || smsBody.toLowerCase().includes('cost')) {
      return `Thank you for your inquiry about pricing. Please visit our website or call us for current rates.`;
    }
    
    if (smsBody.toLowerCase().includes('hours') || smsBody.toLowerCase().includes('open')) {
      return `Our business hours are ${context.business?.hours || '9 AM - 5 PM'}. Thank you for contacting us!`;
    }
    
    // Default response
    return `Thank you for your message. Someone from ${businessName} will respond to you shortly.`;
  }

  /**
   * Send fallback response
   */
  private async sendFallbackResponse(sms: IncomingSMS, response: string, client: any): Promise<SMSAutoRespondResult> {
    try {
      const smsResult = await sendSMS(sms.from, response);
      
      if (smsResult.success) {
        console.log('SMS fallback response sent successfully');
        await this.logAutoResponse(sms, response, 0.5, client); // Lower confidence for fallback
        
        return {
          success: true,
          responseSent: true,
          response: response,
          confidence: 0.5
        };
      } else {
        return {
          success: false,
          responseSent: false,
          error: smsResult.error
        };
      }
    } catch (error: any) {
      console.error('Error sending fallback SMS response:', error);
      return {
        success: false,
        responseSent: false,
        error: error.message || 'Failed to send fallback response'
      };
    }
  }

  /**
   * Log auto-response for statistics
   */
  private async logAutoResponse(sms: IncomingSMS, response: string, confidence: number, client: any): Promise<void> {
    try {
      // This would typically log to a database table
      console.log('SMS auto-response logged:', {
        client_id: client.id,
        from: sms.from,
        original_message: sms.body,
        response: response,
        confidence: confidence,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging SMS auto-response:', error);
    }
  }

  /**
   * Get SMS auto-respond statistics
   */
  async getStats(): Promise<any> {
    try {
      // This would typically query a database table for SMS auto-respond statistics
      // For now, return mock data
      return {
        totalProcessed: 0,
        responsesSent: 0,
        responsesBlocked: 0,
        averageConfidence: 0.75,
        topReasons: ["Outside business hours", "Contains excluded keywords", "Confidence too low"]
      };
    } catch (error) {
      console.error('Error getting SMS auto-respond stats:', error);
      return {
        totalProcessed: 0,
        responsesSent: 0,
        responsesBlocked: 0,
        averageConfidence: 0,
        topReasons: []
      };
    }
  }

  /**
   * Ensure OpenAI API key is available
   */
  private async ensureOpenAIKey(): Promise<boolean> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      return !!apiKey;
    } catch (error) {
      console.error('Error checking OpenAI API key:', error);
      return false;
    }
  }

  /**
   * Health check for SMS auto-respond service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; configLoaded: boolean; openAIKeyAvailable: boolean; storageConnected: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check if config is loaded
      if (!this.configLoaded) {
        issues.push('Configuration not loaded');
      }
      
      // Check if OpenAI key is available
      const openAIKeyAvailable = await this.ensureOpenAIKey();
      if (!openAIKeyAvailable) {
        issues.push('OpenAI API key not available');
      }
      
      // Check if storage is connected
      let storageConnected = false;
      try {
        await this.storage.getAllServices();
        storageConnected = true;
      } catch (error) {
        issues.push('Storage connection failed');
      }
      
      const status = issues.length === 0 ? 'healthy' : 'unhealthy';
      
      return {
        status,
        configLoaded: this.configLoaded,
        openAIKeyAvailable,
        storageConnected,
        issues
      };
    } catch (error) {
      console.error('Error during health check:', error);
      return {
        status: 'unhealthy',
        configLoaded: this.configLoaded,
        openAIKeyAvailable: false,
        storageConnected: false,
        issues: ['Health check failed']
      };
    }
  }

  /**
   * Initialize default conversation flows
   */
  private initializeDefaultFlows(): void {
    const bookingFlow: ConversationFlow = {
      id: 'booking-flow',
      name: 'Appointment Booking Flow',
      description: 'Handle appointment booking requests with proper conversation management',
      steps: [
        {
          id: 'step-1',
          type: 'trigger',
          name: 'Booking Request',
          content: 'book, appointment, schedule, want to book, need appointment',
          order: 1
        },
        {
          id: 'step-2',
          type: 'condition',
          name: 'Check Service',
          content: 'hasService',
          order: 2,
          conditions: { hasService: false }
        },
        {
          id: 'step-3',
          type: 'response',
          name: 'Ask for Service',
          content: 'Great! I\'d be happy to help you book an appointment. What type of service would you like?\n\nOur services include:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nJust let me know which service you\'d like to book! 💆‍♀️✨',
          order: 3
        },
        {
          id: 'step-4',
          type: 'condition',
          name: 'Check Date',
          content: 'hasDate',
          order: 4,
          conditions: { hasService: true, hasDate: false }
        },
        {
          id: 'step-5',
          type: 'response',
          name: 'Ask for Date',
          content: 'Perfect! What day would you like to come in? You can say "tomorrow", "Friday", or any day that works for you. 📅',
          order: 5
        },
        {
          id: 'step-6',
          type: 'condition',
          name: 'Check Time',
          content: 'hasTime',
          order: 6,
          conditions: { hasService: true, hasDate: true, hasTime: false }
        },
        {
          id: 'step-7',
          type: 'action',
          name: 'Show Available Times',
          content: 'showAvailableTimes',
          order: 7
        },
        {
          id: 'step-8',
          type: 'action',
          name: 'Book Appointment',
          content: 'bookAppointment',
          order: 8
        }
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.conversationFlows.set('booking-flow', bookingFlow);
  }

  /**
   * Execute conversation flow
   */
  private async executeConversationFlow(
    flowId: string, 
    sms: IncomingSMS, 
    client: any, 
    parsedRequest: any, 
    conversationState: any
  ): Promise<SMSAutoRespondResult> {
    const flow = this.conversationFlows.get(flowId);
    if (!flow) {
      console.log('❌ Conversation flow not found:', flowId);
      return this.handleBookingRequestFallback(sms, client);
    }

    console.log('🔄 Executing conversation flow:', flow.name);
    
    // Determine current step based on parsed request and conversation state
    const hasService = !!parsedRequest.serviceName || !!conversationState?.selectedService;
    const hasDate = !!parsedRequest.date || !!conversationState?.selectedDate;
    const hasTime = !!parsedRequest.time || !!conversationState?.selectedTime;
    
    console.log('📊 Flow state:', { hasService, hasDate, hasTime, conversationStep: conversationState?.conversationStep });

    // Find the appropriate step to execute
    let currentStep = flow.steps.find(step => {
      if (step.type === 'condition') {
        if (step.content === 'hasService' && !hasService) return true;
        if (step.content === 'hasDate' && hasService && !hasDate) return true;
        if (step.content === 'hasTime' && hasService && hasDate && !hasTime) return true;
      }
      return false;
    });

    // If no condition step matches, find the next action step
    if (!currentStep) {
      if (hasService && hasDate && hasTime) {
        currentStep = flow.steps.find(step => step.content === 'bookAppointment');
      } else if (hasService && hasDate) {
        currentStep = flow.steps.find(step => step.content === 'showAvailableTimes');
      } else if (hasService) {
        currentStep = flow.steps.find(step => step.content === 'hasDate');
      } else {
        currentStep = flow.steps.find(step => step.content === 'hasService');
      }
    }

    if (!currentStep) {
      console.log('❌ No matching step found in flow');
      return this.handleBookingRequestFallback(sms, client);
    }

    console.log('🎯 Executing step:', currentStep.name);

    // Execute the step
    switch (currentStep.type) {
      case 'response':
        return await this.executeResponseStep(currentStep, sms, client, parsedRequest, conversationState);
      
      case 'action':
        return await this.executeActionStep(currentStep, sms, client, parsedRequest, conversationState);
      
      default:
        console.log('❌ Unknown step type:', currentStep.type);
        return this.handleBookingRequestFallback(sms, client);
    }
  }

  // Execute response step
  private async executeResponseStep(
    step: ConversationFlowStep, 
    sms: IncomingSMS, 
    client: any, 
    parsedRequest: any, 
    conversationState: any
  ): Promise<SMSAutoRespondResult> {
    let response = step.content;
    
    // Replace placeholders with actual data
    if (parsedRequest.serviceName) {
      response = response.replace('{service}', parsedRequest.serviceName);
    }
    if (parsedRequest.date) {
      response = response.replace('{date}', parsedRequest.date);
    }
    
    // Update conversation state based on step
    if (step.name === 'Ask for Service') {
      this.updateConversationState(sms.from, {
        conversationStep: 'service_requested',
        lastUpdated: new Date()
      });
    } else if (step.name === 'Ask for Date') {
      this.updateConversationState(sms.from, {
        selectedService: parsedRequest.serviceName || conversationState?.selectedService,
        conversationStep: 'date_requested',
        lastUpdated: new Date()
      });
    }
    
    await this.sendSMSResponse(sms, response, 0.9, client);
    
    return {
      success: true,
      responseSent: true,
      response: response,
      confidence: 0.9
    };
  }

  // Execute action step
  private async executeActionStep(
    step: ConversationFlowStep, 
    sms: IncomingSMS, 
    client: any, 
    parsedRequest: any, 
    conversationState: any
  ): Promise<SMSAutoRespondResult> {
    if (step.content === 'showAvailableTimes') {
      return await this.showAvailableTimes(sms, client, parsedRequest, conversationState);
    } else if (step.content === 'bookAppointment') {
      return await this.bookAppointment(sms, client, parsedRequest, conversationState);
    }
    
    console.log('❌ Unknown action:', step.content);
    return this.handleBookingRequestFallback(sms, client);
  }

  // Show available times
  private async showAvailableTimes(
    sms: IncomingSMS, 
    client: any, 
    parsedRequest: any, 
    conversationState: any
  ): Promise<SMSAutoRespondResult> {
    try {
      const serviceName = parsedRequest.serviceName || conversationState?.selectedService || 'signature head spa';
      const date = parsedRequest.date || conversationState?.selectedDate;
      
      if (!date) {
        const response = 'What date would you like to come in? You can say "tomorrow", "Friday", or any day that works for you. 📅';
        await this.sendSMSResponse(sms, response, 0.9, client);
        return {
          success: true,
          responseSent: true,
          response: response,
          confidence: 0.9
        };
      }
      
      // Get available times for the specified date
      const enhancedRequest = {
        serviceName: serviceName,
        date: date,
        time: parsedRequest.time,
        clientPhone: sms.from,
        clientName: client.firstName
      };
      
      const bookingResult = await this.appointmentBookingService.processBookingRequestWithContext(
        enhancedRequest, 
        sms.from,
        this.getConversationState(sms.from)
      );
      
      if (bookingResult.success && bookingResult.appointment) {
        // Appointment was successfully booked
        this.clearConversationState(sms.from);
        await this.sendSMSResponse(sms, bookingResult.message, 1.0, client);
        return {
          success: true,
          responseSent: true,
          response: bookingResult.message,
          confidence: 1.0
        };
      } else {
        // Show available times
        await this.sendSMSResponse(sms, bookingResult.message, 0.9, client);
        return {
          success: true,
          responseSent: true,
          response: bookingResult.message,
          confidence: 0.9
        };
      }
    } catch (error) {
      console.error('Error showing available times:', error);
      return this.handleBookingRequestFallback(sms, client);
    }
  }

  // Book appointment
  private async bookAppointment(
    sms: IncomingSMS, 
    client: any, 
    parsedRequest: any, 
    conversationState: any
  ): Promise<SMSAutoRespondResult> {
    try {
      const enhancedRequest = {
        serviceName: parsedRequest.serviceName || conversationState?.selectedService,
        date: parsedRequest.date || conversationState?.selectedDate,
        time: parsedRequest.time || conversationState?.selectedTime,
        clientPhone: sms.from,
        clientName: client.firstName
      };
      
      const bookingResult = await this.appointmentBookingService.processBookingRequestWithContext(
        enhancedRequest, 
        sms.from,
        this.getConversationState(sms.from)
      );
      
      if (bookingResult.success && bookingResult.appointment) {
        this.clearConversationState(sms.from);
        await this.sendSMSResponse(sms, bookingResult.message, 1.0, client);
        return {
          success: true,
          responseSent: true,
          response: bookingResult.message,
          confidence: 1.0
        };
      } else {
        await this.sendSMSResponse(sms, bookingResult.message, 0.9, client);
        return {
          success: true,
          responseSent: true,
          response: bookingResult.message,
          confidence: 0.9
        };
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      return this.handleBookingRequestFallback(sms, client);
    }
  }

  // Fallback handler
  private async handleBookingRequestFallback(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    const response = 'I\'m sorry, but I\'m having trouble processing your booking request. Please call us at 918-932-5396 for assistance. 📞';
    await this.sendSMSResponse(sms, response, 0.7, client);
    return {
      success: true,
      responseSent: true,
      response: response,
      confidence: 0.7
    };
  }

  /**
   * Handle booking request
   */
  private async handleBookingRequest(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    try {
      // Get current conversation state
      const conversationState = this.getConversationState(sms.from);
      console.log('SMS Auto Responder - Current conversation state:', conversationState);
      
      // Parse the booking request with enhanced logic
      const parsedRequest = await this.appointmentBookingService.parseBookingRequest(sms.body, sms.from);
      console.log('SMS Auto Responder - Parsed request:', parsedRequest);
      
      // Enhanced intent recognition for booking requests
      const isBookingIntent = this.isBookingIntent(sms.body);
      const isRescheduleIntent = this.isRescheduleIntent(sms.body);
      const isCancelIntent = this.isCancelIntent(sms.body);
      
      // Always use structured LLM approach for booking flow
      return await this.handleStructuredBookingFlow(sms, client, conversationState || {
        phoneNumber: sms.from,
        lastUpdated: new Date(),
        conversationStep: 'initial'
      });
      
    } catch (error: any) {
      console.error('Error handling booking request:', error);
      return {
        success: false,
        responseSent: false,
        error: error.message || 'Failed to handle booking request'
      };
    }
  }

  /**
   * Handle structured booking flow using LLM function calling
   */
  private async handleStructuredBookingFlow(sms: IncomingSMS, client: any, conversationState: BookingConversationState): Promise<SMSAutoRespondResult> {
    try {
      console.log('🔄 Starting structured booking flow');
      console.log('📝 Current conversation state:', conversationState);
      console.log('📝 SMS body:', sms.body);
      
      // Check if all parameters are collected in the current message
      const hasService = conversationState.selectedService || sms.body.toLowerCase().includes('signature') || sms.body.toLowerCase().includes('deluxe') || sms.body.toLowerCase().includes('platinum');
      const hasDate = conversationState.selectedDate || sms.body.toLowerCase().match(/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
      const hasTime = conversationState.selectedTime || sms.body.toLowerCase().match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
      
      console.log('🔍 Parameter check:', { hasService, hasDate, hasTime });
      
      // If all three parameters are available, force booking
      if (hasService && hasDate && hasTime) {
        console.log('🎯 All parameters detected - forcing booking process');
        
        // Extract the actual values
        const service = conversationState.selectedService || (sms.body.toLowerCase().includes('signature') ? 'Signature Head Spa' : 
                                                           sms.body.toLowerCase().includes('deluxe') ? 'Deluxe Head Spa' : 'Platinum Head Spa');
        const date = conversationState.selectedDate || sms.body.toLowerCase().match(/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)?.[1] || 'tomorrow';
        const time = conversationState.selectedTime || sms.body.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i)?.[0] || '2:00 PM';
        
        console.log('📝 Extracted parameters:', { service, date, time });
        
        // Book the appointment directly
        const bookingResult = await this.appointmentBookingService.bookAppointmentStructured({
          service: service,
          date: date,
          time: time,
          clientPhone: sms.from,
          clientName: client?.firstName || undefined
        });
        
        // Clear conversation state
        this.clearConversationState(sms.from);
        
        await this.sendSMSResponse(sms, bookingResult.message, 1.0, client);
        
        return {
          success: true,
          responseSent: true,
          response: bookingResult.message,
          confidence: 1.0
        };
      }
      
      // Build context for LLM
      const context = await this.buildContext(client, sms);
      
      // Call LLM with structured booking
      const llmResponse = await this.llmService.generateStructuredBookingResponse(
        sms.body,
        context,
        conversationState
      );

      if (!llmResponse.success) {
        console.error('LLM Service Error:', llmResponse.error);
        return {
          success: false,
          responseSent: false,
          error: llmResponse.error || 'Failed to generate response'
        };
      }

      // Handle different function calls
      if (llmResponse.functionCall) {
        console.log('📞 Function call detected:', llmResponse.functionCall.name, llmResponse.functionCall.arguments);
        
        switch (llmResponse.functionCall.name) {
          case 'check_availability':
            return await this.handleCheckAvailability(sms, client, llmResponse.functionCall.arguments);
            
          case 'book_appointment':
            return await this.handleBookAppointment(sms, client, llmResponse.functionCall.arguments);
            
          case 'cancel_appointment':
            return await this.handleCancelAppointment(sms, client, llmResponse.functionCall.arguments);
            
          case 'reschedule_appointment':
            return await this.handleRescheduleAppointment(sms, client, llmResponse.functionCall.arguments);
            
          default:
            console.error('Unknown function call:', llmResponse.functionCall.name);
            return {
              success: false,
              responseSent: false,
              error: 'Unknown function call'
            };
        }
      } else {
        // Regular conversational response - update conversation state based on user input
        let updatedState = { ...conversationState };
        
        // Extract service if mentioned
        const serviceMatch = sms.body.toLowerCase().match(/(signature|deluxe|platinum)/);
        if (serviceMatch && !conversationState.selectedService) {
          const service = serviceMatch[1] === 'signature' ? 'Signature Head Spa' :
                         serviceMatch[1] === 'deluxe' ? 'Deluxe Head Spa' :
                         'Platinum Head Spa';
          updatedState.selectedService = service;
          updatedState.conversationStep = 'date_requested';
          console.log('📝 Updated service selection:', service);
        }
        
        // Extract date if mentioned
        const dateMatch = sms.body.toLowerCase().match(/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
        if (dateMatch && conversationState.selectedService && !conversationState.selectedDate) {
          updatedState.selectedDate = dateMatch[1];
          updatedState.conversationStep = 'time_selected';
          console.log('📝 Updated date selection:', dateMatch[1]);
        }
        
        // Check if all parameters are collected but LLM didn't call function
        if (updatedState.selectedService && updatedState.selectedDate && updatedState.selectedTime) {
          console.log('🚨 LLM didn\'t call function but all parameters collected - forcing function call');
          
          // Force availability check
          const availabilityResult = await this.appointmentBookingService.checkAvailability({
            service: updatedState.selectedService,
            date: updatedState.selectedDate,
            time: updatedState.selectedTime,
            clientPhone: sms.from,
            clientName: client?.firstName || undefined
          });
          
          if (availabilityResult.available) {
            // Book the appointment
            const bookingResult = await this.appointmentBookingService.bookAppointmentStructured({
              service: updatedState.selectedService,
              date: updatedState.selectedDate,
              time: updatedState.selectedTime,
              clientPhone: sms.from,
              clientName: client?.firstName || undefined
            });
            
            // Clear conversation state
            this.clearConversationState(sms.from);
            
            await this.sendSMSResponse(sms, bookingResult.message, 1.0, client);
            
            return {
              success: true,
              responseSent: true,
              response: bookingResult.message,
              confidence: 1.0
            };
          } else {
            // Suggest alternative times
            const response = `I'm sorry, ${updatedState.selectedTime} is not available. We have openings at 9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, and 5:00 PM. What time works for you?`;
            await this.sendSMSResponse(sms, response, 0.8, client);
            
            return {
              success: true,
              responseSent: true,
              response: response,
              confidence: 0.8
            };
          }
        }
        
        // Extract time if mentioned - be more flexible with time formats
        const timePatterns = [
          /(\d{1,2}):?(\d{2})?\s*(am|pm)/i,
          /(\d{1,2})\s*(am|pm)/i,
          /(\d{1,2}):(\d{2})\s*(am|pm)/i
        ];
        
        let timeMatch = null;
        for (const pattern of timePatterns) {
          timeMatch = sms.body.toLowerCase().match(pattern);
          if (timeMatch) break;
        }
        
        if (timeMatch && conversationState.selectedService && conversationState.selectedDate && !conversationState.selectedTime) {
          updatedState.selectedTime = sms.body;
          updatedState.conversationStep = 'completed';
          console.log('📝 Updated time selection:', sms.body);
          
          // Update conversation state immediately
          this.updateConversationState(sms.from, updatedState);
          
          // If all three parameters are collected, force a function call
          if (updatedState.selectedService && updatedState.selectedDate && updatedState.selectedTime) {
            console.log('🎯 All parameters collected - forcing function call');
            
            // Call availability check directly
            const availabilityResult = await this.appointmentBookingService.checkAvailability({
              service: updatedState.selectedService,
              date: updatedState.selectedDate,
              time: updatedState.selectedTime,
              clientPhone: sms.from,
              clientName: client?.firstName || undefined
            });
            
            if (availabilityResult.available) {
              // Book the appointment
              const bookingResult = await this.appointmentBookingService.bookAppointmentStructured({
                service: updatedState.selectedService,
                date: updatedState.selectedDate,
                time: updatedState.selectedTime,
                clientPhone: sms.from,
                clientName: client?.firstName || undefined
              });
              
              if (bookingResult.success) {
                // Clear conversation state after successful booking
                this.clearConversationState(sms.from);
                
                await this.sendSMSResponse(sms, bookingResult.message, 1.0, client);
                
                return {
                  success: true,
                  responseSent: true,
                  response: bookingResult.message,
                  confidence: 1.0
                };
              } else {
                await this.sendSMSResponse(sms, bookingResult.message, 0.8, client);
                
                return {
                  success: true,
                  responseSent: true,
                  response: bookingResult.message,
                  confidence: 0.8
                };
              }
            } else {
              // Suggest alternatives
              await this.sendSMSResponse(sms, availabilityResult.message, 0.9, client);
              
              return {
                success: true,
                responseSent: true,
                response: availabilityResult.message,
                confidence: 0.9
              };
            }
          }
        }
        
        // Update conversation state
        this.updateConversationState(sms.from, updatedState);
        
        // Send the LLM response
        await this.sendSMSResponse(sms, llmResponse.message || 'I didn\'t understand that. Could you please clarify?', llmResponse.confidence || 0.8, client);
        
        return {
          success: true,
          responseSent: true,
          response: llmResponse.message || 'I didn\'t understand that. Could you please clarify?',
          confidence: llmResponse.confidence || 0.8
        };
      }
      
    } catch (error: any) {
      console.error('Error in structured booking flow:', error);
      return {
        success: false,
        responseSent: false,
        error: error.message || 'Failed to handle structured booking flow'
      };
    }
  }

  /**
   * Handle check_availability function call
   */
  private async handleCheckAvailability(sms: IncomingSMS, client: any, args: any): Promise<SMSAutoRespondResult> {
    try {
      console.log('🔍 Checking availability with args:', args);
      
      const availabilityResult = await this.appointmentBookingService.checkAvailability({
        service: args.service,
        date: args.date,
        time: args.time,
        clientPhone: sms.from,
        clientName: client?.firstName || undefined
      });

      if (availabilityResult.available) {
        // If available, proceed with booking
        const bookingResult = await this.appointmentBookingService.bookAppointmentStructured({
          service: args.service,
          date: args.date,
          time: args.time,
          clientPhone: sms.from,
          clientName: client?.firstName || undefined
        });

        if (bookingResult.success) {
          // Clear conversation state after successful booking
          this.clearConversationState(sms.from);
          
          await this.sendSMSResponse(sms, bookingResult.message, 1.0, client);
          
          return {
            success: true,
            responseSent: true,
            response: bookingResult.message,
            confidence: 1.0
          };
        } else {
          await this.sendSMSResponse(sms, bookingResult.message, 0.8, client);
          
          return {
            success: true,
            responseSent: true,
            response: bookingResult.message,
            confidence: 0.8
          };
        }
      } else {
        // If not available, suggest alternatives
        await this.sendSMSResponse(sms, availabilityResult.message, 0.9, client);
        
        return {
          success: true,
          responseSent: true,
          response: availabilityResult.message,
          confidence: 0.9
        };
      }

    } catch (error: any) {
      console.error('Error handling availability check:', error);
      const errorMessage = 'I encountered an issue checking availability. Please call us directly.';
      await this.sendSMSResponse(sms, errorMessage, 0.8, client);
      
      return {
        success: true,
        responseSent: true,
        response: errorMessage,
        confidence: 0.8
      };
    }
  }

  /**
   * Handle book_appointment function call
   */
  private async handleBookAppointment(sms: IncomingSMS, client: any, args: any): Promise<SMSAutoRespondResult> {
    try {
      console.log('📞 Booking appointment with args:', args);
      
      const bookingResult = await this.appointmentBookingService.bookAppointmentStructured({
        service: args.service,
        date: args.date,
        time: args.time,
        clientPhone: sms.from,
        clientName: client?.firstName || undefined
      });
      
      if (bookingResult.success) {
        // Clear conversation state after successful booking
        this.clearConversationState(sms.from);
        
        await this.sendSMSResponse(sms, bookingResult.message, 1.0, client);
        
        return {
          success: true,
          responseSent: true,
          response: bookingResult.message,
          confidence: 1.0
        };
      } else {
        await this.sendSMSResponse(sms, bookingResult.message, 0.8, client);
        
        return {
          success: true,
          responseSent: true,
          response: bookingResult.message,
          confidence: 0.8
        };
      }

    } catch (error: any) {
      console.error('Error handling booking:', error);
      const errorMessage = 'I encountered an issue booking your appointment. Please call us directly.';
      await this.sendSMSResponse(sms, errorMessage, 0.8, client);
      
      return {
        success: true,
        responseSent: true,
        response: errorMessage,
        confidence: 0.8
      };
    }
  }

  /**
   * Handle cancel_appointment function call
   */
  private async handleCancelAppointment(sms: IncomingSMS, client: any, args: any): Promise<SMSAutoRespondResult> {
    try {
      console.log('📞 Cancelling appointment with args:', args);
      
      const cancelResult = await this.appointmentBookingService.cancelAppointment(
        args.appointment_id,
        args.client_phone
      );
      
      await this.sendSMSResponse(sms, cancelResult.message, cancelResult.success ? 1.0 : 0.8, client);
      
      return {
        success: true,
        responseSent: true,
        response: cancelResult.message,
        confidence: cancelResult.success ? 1.0 : 0.8
      };

    } catch (error: any) {
      console.error('Error handling cancellation:', error);
      const errorMessage = 'I encountered an issue cancelling your appointment. Please call us directly.';
      await this.sendSMSResponse(sms, errorMessage, 0.8, client);
      
      return {
        success: true,
        responseSent: true,
        response: errorMessage,
        confidence: 0.8
      };
    }
  }

  /**
   * Handle reschedule_appointment function call
   */
  private async handleRescheduleAppointment(sms: IncomingSMS, client: any, args: any): Promise<SMSAutoRespondResult> {
    try {
      console.log('📞 Rescheduling appointment with args:', args);
      
      const rescheduleResult = await this.appointmentBookingService.rescheduleAppointment(
        args.appointment_id,
        args.client_phone,
        args.new_date,
        args.new_time
      );
      
      await this.sendSMSResponse(sms, rescheduleResult.message, rescheduleResult.success ? 1.0 : 0.8, client);
      
      return {
        success: true,
        responseSent: true,
        response: rescheduleResult.message,
        confidence: rescheduleResult.success ? 1.0 : 0.8
      };

    } catch (error: any) {
      console.error('Error handling rescheduling:', error);
      const errorMessage = 'I encountered an issue rescheduling your appointment. Please call us directly.';
      await this.sendSMSResponse(sms, errorMessage, 0.8, client);
      
      return {
        success: true,
        responseSent: true,
        response: errorMessage,
        confidence: 0.8
      };
    }
  }

  /**
   * Handle reschedule request
   */
  private async handleRescheduleRequest(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    const response = `I'd be happy to help you reschedule your appointment. Please call us at 9189325396 and we'll get that sorted out for you right away! 📞`;
    await this.sendSMSResponse(sms, response, 0.9, client);
    
    return {
      success: true,
      responseSent: true,
      response: response,
      confidence: 0.9
    };
  }

  /**
   * Handle cancel request
   */
  private async handleCancelRequest(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    const response = `I understand you'd like to cancel your appointment. Please call us at 9189325396 and we'll help you with that. We'd hate to see you go! 📞`;
    await this.sendSMSResponse(sms, response, 0.9, client);
    
    return {
      success: true,
      responseSent: true,
      response: response,
      confidence: 0.9
    };
  }

  /**
   * Handle business question with enhanced RAG
   */
  private async handleBusinessQuestion(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    try {
      console.log('🔍 Handling business question with enhanced RAG');
      
      // Build enhanced RAG context
      const enhancedContext = await this.buildEnhancedContext(client, sms);
      
      // Use LLM service with enhanced context for better responses
      const llmContext = {
        clientName: enhancedContext.client.name,
        clientPhone: enhancedContext.client.phone,
        businessName: enhancedContext.business.name,
        businessType: enhancedContext.business.type,
        availableServices: enhancedContext.services,
        availableStaff: enhancedContext.staff,
        businessKnowledge: enhancedContext.businessKnowledge.all,
        clientPreferences: enhancedContext.client.preferences,
        availability: enhancedContext.availability,
        appointments: enhancedContext.appointments
      };
      
      // Generate response using LLM with enhanced context
      const llmResponse = await this.llmService.generateResponse(sms.body, llmContext, 'sms');
      
      if (llmResponse.success && llmResponse.message) {
        await this.sendSMSResponse(sms, llmResponse.message, llmResponse.confidence || 0.9, client);
        
        return {
          success: true,
          responseSent: true,
          response: llmResponse.message,
          confidence: llmResponse.confidence || 0.9
        };
      }
      
      // Fallback to hardcoded responses if LLM fails
      return await this.handleBusinessQuestionFallback(sms, client, enhancedContext);
      
    } catch (error) {
      console.error('Error in enhanced business question handler:', error);
      // Fallback to original method
      return await this.handleBusinessQuestionFallback(sms, client);
    }
  }
  
  /**
   * Improved fallback business question handler with better responses
   */
  private async handleBusinessQuestionFallback(sms: IncomingSMS, client: any, context?: any): Promise<SMSAutoRespondResult> {
    const text = sms.body.toLowerCase().trim();
    const customerName = client.firstName || 'there';
    
    // Always fetch current services from database to ensure we don't offer deleted services
    let services;
    try {
      const currentServices = await this.storage.getAllServices();
      services = currentServices.map((service: any) => ({
        name: service.name,
        price: service.price,
        duration: service.duration
      }));
    } catch (error) {
      console.error('Error fetching services for business question:', error);
      // Fallback to context if database fails
      services = context?.services || [];
    }
    
    // Handle service questions
    if (text.includes('services') || text.includes('what do you offer') || text.includes('do you offer')) {
      const serviceList = services.map((s: any) => `• ${s.name} - $${s.price} (${s.duration} minutes)`).join('\n');
      
      const response = `Hi ${customerName}! We offer a variety of services:\n\n${serviceList}\n\nLet me know if you'd like to book an appointment or have any other questions! 😊`;
      await this.sendSMSResponse(sms, response, 0.95, client);
      
      return {
        success: true,
        responseSent: true,
        response: response,
        confidence: 0.95
      };
    }
    
    // Handle pricing questions
    if (text.includes('how much') || text.includes('cost') || text.includes('price') || text.includes('pricing')) {
      const serviceList = services.map((s: any) => `• ${s.name} - $${s.price} (${s.duration} minutes)`).join('\n');
      
      const response = `Hi ${customerName}! Here are our current prices:\n\n${serviceList}\n\nLet me know if you'd like to book an appointment or have any other questions! 😊`;
      await this.sendSMSResponse(sms, response, 0.95, client);
      
      return {
        success: true,
        responseSent: true,
        response: response,
        confidence: 0.95
      };
    }
    
    // Handle haircut-specific questions
    if (text.includes('haircut') || text.includes('hair cut') || text.includes('hair styling')) {
      const haircutServices = services.filter((s: any) => s.name.toLowerCase().includes('haircut'));
      const serviceList = haircutServices.map((s: any) => `• ${s.name} - $${s.price} (${s.duration} minutes)`).join('\n');
      
      const response = `Hi ${customerName}! Yes, we do offer haircuts!\n\n${serviceList}\n\nWould you like to book an appointment? 💇‍♀️✨`;
      await this.sendSMSResponse(sms, response, 0.95, client);
      
      return {
        success: true,
        responseSent: true,
        response: response,
        confidence: 0.95
      };
    }
    
    // Handle hours questions
    if (text.includes('hours') || text.includes('open') || text.includes('when') || text.includes('what time')) {
      const response = `Hi ${customerName}! We're open Wednesday-Saturday from 10 AM to 8 PM. We'd love to see you! What service would you like to book? 📅`;
      await this.sendSMSResponse(sms, response, 0.95, client);
      
      return {
        success: true,
        responseSent: true,
        response: response,
        confidence: 0.95
      };
    }
    
    // Handle location questions
    if (text.includes('where') || text.includes('location') || text.includes('address')) {
      const response = `Hi ${customerName}! We're located at 123 Main Street, Tulsa, OK 74103. We'd love to see you! What service would you like to book? 📍`;
      await this.sendSMSResponse(sms, response, 0.95, client);
      
      return {
        success: true,
        responseSent: true,
        response: response,
        confidence: 0.95
      };
    }
    
    // Default business question response
    const response = `Hi ${customerName}! Thanks for your question. I'd be happy to help you with information about our services, pricing, hours, or location. What would you like to know? 💆‍♀️✨`;
    await this.sendSMSResponse(sms, response, 0.8, client);
    
    return {
      success: true,
      responseSent: true,
      response: response,
      confidence: 0.8
    };
  }

  /**
   * Improved general message handler with better responses
   */
  private async handleGeneralMessage(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    const text = sms.body.toLowerCase().trim();
    const customerName = client.firstName || 'there';
    
    // Handle simple greetings
    if (this.isSimpleGreeting(sms.body)) {
      const response = `Hi ${customerName}! 👋 How can I help you today?`;
      await this.sendSMSResponse(sms, response, 0.9, client);
      
      return {
        success: true,
        responseSent: true,
        response: response,
        confidence: 0.9
      };
    }
    
    // Handle thank you messages
    if (text.includes('thank') || text.includes('thanks')) {
      const response = `You're very welcome, ${customerName}! We're here to help. If you need anything else, just let us know! 😊`;
      await this.sendSMSResponse(sms, response, 0.9, client);
      
      return {
        success: true,
        responseSent: true,
        response: response,
        confidence: 0.9
      };
    }
    
    // Handle confusion/uncertainty
    const confusionKeywords = [
      "don't know", "not sure", "confused", "what do you mean", "i don't understand",
      "you don't know", "what service", "which service", "clarify", "explain",
      "help me", "i need help", "what should i do", "i'm lost"
    ];
    
    if (confusionKeywords.some(keyword => text.includes(keyword))) {
      // Always fetch current services from database to ensure we don't offer deleted services
      let serviceList = '';
      try {
        const currentServices = await this.storage.getAllServices();
        serviceList = currentServices.map((service: any) => 
          `• ${service.name} - $${service.price} (${service.duration} minutes)`
        ).join('\n');
      } catch (error) {
        console.error('Error fetching services for confusion response:', error);
        serviceList = '• Signature Head Spa - $99 (60 minutes)'; // Minimal fallback
      }
      
      const response = `No worries, ${customerName}! Let me help you. We offer:\n\n` +
                       `${serviceList}\n\n` +
                       `Just let me know which service you'd like to book! 💆‍♀️✨`;
      await this.sendSMSResponse(sms, response, 0.9, client);
      
      return {
        success: true,
        responseSent: true,
        response: response,
        confidence: 0.9
      };
    }
    
    // Handle help requests
    if (text.includes('help') || text.includes('assist')) {
      const response = `Hi ${customerName}! I'm here to help! I can help you:\n\n` +
                       `• Book an appointment\n` +
                       `• Check our services and prices\n` +
                       `• Find our hours and location\n` +
                       `• Answer any questions\n\n` +
                       `What would you like to know? 💆‍♀️✨`;
      await this.sendSMSResponse(sms, response, 0.9, client);
      
      return {
        success: true,
        responseSent: true,
        response: response,
        confidence: 0.9
      };
    }
    
    // Handle general questions or unclear messages
    if (text.includes('what') || text.includes('how') || text.includes('when') || text.includes('where') || text.includes('why')) {
      const response = `Hi ${customerName}! I'd be happy to help you with information about our services, pricing, hours, or booking an appointment. What would you like to know? 😊`;
      await this.sendSMSResponse(sms, response, 0.8, client);
      
      return {
        success: true,
        responseSent: true,
        response: response,
        confidence: 0.8
      };
    }
    
    // Default general response for anything else
    const response = `Hi ${customerName}! 👋 How can I help you today?`;
    await this.sendSMSResponse(sms, response, 0.8, client);
    
    return {
      success: true,
      responseSent: true,
      response: response,
      confidence: 0.8
    };
  }

  /**
   * Send SMS response
   */
  private async sendSMSResponse(sms: IncomingSMS, response: string, confidence: number, client: any): Promise<void> {
    try {
      const targetPhone = sms.from;
      
      // Always send real SMS, even in development mode
      const smsResult = await sendSMS(targetPhone, response);
      
      if (smsResult.success) {
        console.log('SMS response sent successfully');
        await this.logAutoResponse(sms, response, confidence, client);
      } else {
        console.error('Failed to send SMS response:', smsResult.error);
      }
    } catch (error) {
      console.error('Error sending SMS response:', error);
    }
  }
}