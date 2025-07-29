import { IStorage } from './storage';
import { LLMService } from './llm-service';
import { SMSAppointmentBookingService } from './sms-appointment-booking';
import { SMSAppointmentManagementService } from './sms-appointment-management';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

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
  reason?: string;
}

interface ConversationState {
  phoneNumber: string;
  currentState: ConversationStateType;
  context: {
    selectedService?: string;
    selectedDate?: string;
    selectedTime?: string;
    lastIntent?: string;
    messageCount: number;
  };
  lastUpdated: Date;
}

type ConversationStateType = 
  | 'idle'
  | 'greeting'
  | 'service_selection'
  | 'date_selection'
  | 'time_selection'
  | 'booking_confirmation'
  | 'business_question'
  | 'reschedule'
  | 'cancel';

interface IntentResult {
  intent: 'booking' | 'reschedule' | 'cancel' | 'business_question' | 'greeting' | 'general';
  confidence: number;
  extractedData?: {
    service?: string;
    date?: string;
    time?: string;
    question?: string;
  };
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class SMSAutoRespondServiceImproved {
  private storage: IStorage;
  private llmService: LLMService;
  private appointmentBookingService: SMSAppointmentBookingService;
  private appointmentManagementService: SMSAppointmentManagementService;
  
  // State management
  private conversationStates: Map<string, ConversationState> = new Map();
  
  // Configuration
  private config = {
    enabled: true,
    confidenceThreshold: 0.7,
    maxResponseLength: 500,
    businessHoursOnly: false,
    businessHours: {
      start: "09:00",
      end: "17:00",
      timezone: "America/Chicago"
    }
  };

  constructor(storage: IStorage) {
    this.storage = storage;
    this.llmService = new LLMService(storage);
    this.appointmentBookingService = new SMSAppointmentBookingService(storage);
    this.appointmentManagementService = new SMSAppointmentManagementService(storage);
  }

  // ============================================================================
  // MAIN PROCESSING METHOD
  // ============================================================================

  async processIncomingSMS(sms: IncomingSMS): Promise<SMSAutoRespondResult> {
    try {
      console.log('🔄 Processing SMS:', {
        from: sms.from,
        body: sms.body.substring(0, 50) + '...',
        timestamp: sms.timestamp
      });

      // Basic validation
      if (!this.config.enabled) {
        return { success: true, responseSent: false, reason: "Service disabled" };
      }

      // Find or create client
      const client = await this.findOrCreateClient(sms.from);
      if (!client) {
        return { success: false, responseSent: false, error: "Could not find or create client" };
      }

      // Get current conversation state
      const currentState = this.getConversationState(sms.from);
      
      // Analyze intent
      const intentResult = this.analyzeIntent(sms.body, currentState);
      console.log('🎯 Intent analysis:', intentResult);

      // Process based on intent and current state
      const result = await this.processByIntent(sms, client, intentResult, currentState);
      
      // Update conversation state
      this.updateConversationState(sms.from, {
        context: {
          lastIntent: intentResult.intent,
          messageCount: (currentState?.context.messageCount || 0) + 1
        }
      });

      return result;

    } catch (error: any) {
      console.error('❌ Error processing SMS:', error);
      return {
        success: false,
        responseSent: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  // ============================================================================
  // INTENT ANALYSIS
  // ============================================================================

  private analyzeIntent(message: string, currentState?: ConversationState): IntentResult {
    const text = message.toLowerCase().trim();
    
    // Check for explicit intents first
    if (this.isRescheduleRequest(text)) {
      return { intent: 'reschedule', confidence: 0.95 };
    }
    
    if (this.isCancelRequest(text)) {
      return { intent: 'cancel', confidence: 0.95 };
    }
    
    if (this.isBusinessQuestion(text)) {
      return { intent: 'business_question', confidence: 0.9 };
    }
    
    if (this.isSimpleGreeting(text)) {
      return { intent: 'greeting', confidence: 0.8 };
    }
    
    if (this.isBookingRequest(text, currentState)) {
      const extractedData = this.extractBookingData(text);
      return { 
        intent: 'booking', 
        confidence: 0.85,
        extractedData 
      };
    }
    
    // Default to general
    return { intent: 'general', confidence: 0.5 };
  }

  private isRescheduleRequest(text: string): boolean {
    const keywords = ['reschedule', 'change appointment', 'move appointment', 'different time'];
    return keywords.some(keyword => text.includes(keyword));
  }

  private isCancelRequest(text: string): boolean {
    const keywords = ['cancel', 'cancellation', 'can\'t make it', 'need to cancel'];
    return keywords.some(keyword => text.includes(keyword));
  }

  private isBusinessQuestion(text: string): boolean {
    const questionKeywords = [
      'how much', 'cost', 'price', 'pricing',
      'what services', 'services do you offer',
      'when are you open', 'what are your hours',
      'where are you', 'what\'s your address',
      'do you offer', 'what do you have'
    ];
    return questionKeywords.some(keyword => text.includes(keyword));
  }

  private isSimpleGreeting(text: string): boolean {
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => text === greeting);
  }

  private isBookingRequest(text: string, currentState?: ConversationState): boolean {
    // If already in booking conversation, treat as booking
    if (currentState && ['service_selection', 'date_selection', 'time_selection'].includes(currentState.currentState)) {
      return true;
    }

    const bookingKeywords = [
      'book', 'booking', 'appointment', 'schedule', 'reserve',
      'want to book', 'need an appointment', 'looking to book'
    ];
    
    const timeKeywords = [
      'today', 'tomorrow', 'monday', 'tuesday', 'wednesday',
      'thursday', 'friday', 'saturday', 'sunday'
    ];

    const timePatterns = [
      /(\d{1,2}):?(\d{2})?\s*(am|pm)/i,  // 3pm, 3:00pm, 3:30pm
      /(\d{1,2})\s*(am|pm)/i,             // 3 pm, 3 am
      /(\d{1,2}):(\d{2})/i,               // 15:30, 3:30
      /(\d{1,2})/                          // 3 (assume PM if no AM/PM specified)
    ];

    const hasBookingIntent = bookingKeywords.some(keyword => text.includes(keyword));
    const hasTimeIntent = timeKeywords.some(keyword => text.includes(keyword));
    const hasTimePattern = timePatterns.some(pattern => pattern.test(text));
    
    return hasBookingIntent || hasTimeIntent || hasTimePattern;
  }

  private extractBookingData(text: string): any {
    const data: any = {};
    
    // Extract service
    const services = ['signature head spa', 'deluxe head spa', 'platinum head spa'];
    for (const service of services) {
      if (text.includes(service)) {
        data.service = service;
        break;
      }
    }
    
    // Extract date
    const dateKeywords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const date of dateKeywords) {
      if (text.includes(date)) {
        data.date = date;
        break;
      }
    }
    
    // Extract time using the improved time extraction method
    const time = this.extractTimeFromMessage(text);
    if (time) {
      data.time = time;
    }
    
    console.log('🔍 extractBookingData:', { input: text, extracted: data });
    
    return data;
  }

  // ============================================================================
  // STATE MACHINE PROCESSING
  // ============================================================================

  private async processByIntent(
    sms: IncomingSMS, 
    client: any, 
    intentResult: IntentResult, 
    currentState?: ConversationState
  ): Promise<SMSAutoRespondResult> {
    
    const { intent, confidence, extractedData } = intentResult;
    
    // Handle special intents that don't follow the state machine
    if (intent === 'reschedule') {
      return await this.handleReschedule(sms, client);
    }
    
    if (intent === 'cancel') {
      return await this.handleCancel(sms, client);
    }
    
    if (intent === 'business_question') {
      return await this.handleBusinessQuestion(sms, client);
    }
    
    // Handle booking flow through state machine
    if (intent === 'booking') {
      return await this.handleBookingFlow(sms, client, currentState, extractedData);
    }
    
    // Handle greetings and general messages
    if (intent === 'greeting') {
      return await this.handleGreeting(sms, client);
    }
    
    // Default to general message
    return await this.handleGeneralMessage(sms, client);
  }

  private async handleBookingFlow(
    sms: IncomingSMS, 
    client: any, 
    currentState?: ConversationState, 
    extractedData?: any
  ): Promise<SMSAutoRespondResult> {
    
    console.log('🔄 handleBookingFlow called with:', {
      message: sms.body,
      currentState: currentState?.currentState,
      extractedData
    });
    
    // Determine next state
    let nextState: ConversationStateType = 'idle';
    let response = '';
    
    if (!currentState || currentState.currentState === 'idle') {
      // Start booking flow
      nextState = 'service_selection';
      response = 'Great! I\'d love to help you book an appointment. What service would you like?\n\nOur services include:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nJust let me know which service you\'d like to book! 💆‍♀️✨';
      
    } else if (currentState.currentState === 'service_selection') {
      // User is selecting a service
      const service = extractedData?.service || this.extractServiceFromMessage(sms.body);
      console.log('🔍 Service extraction:', { input: sms.body, extracted: service });
      
      if (service) {
        nextState = 'date_selection';
        response = 'Perfect! What date would you like to come in? You can say "tomorrow", "Friday", or any day that works for you. 📅';
      } else {
        nextState = 'service_selection';
        response = 'I didn\'t catch that. Could you please choose from our services:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)';
      }
      
    } else if (currentState.currentState === 'date_selection') {
      // User is selecting a date
      const date = extractedData?.date || this.extractDateFromMessage(sms.body);
      console.log('🔍 Date extraction:', { input: sms.body, extracted: date });
      
      if (date) {
        nextState = 'time_selection';
        response = `Great! Here are the available times for ${date}:\n\n• 9:00 AM\n• 11:00 AM\n• 1:00 PM\n• 3:00 PM\n• 5:00 PM\n\nWhich time works best for you? ⏰`;
      } else {
        nextState = 'date_selection';
        response = 'I didn\'t catch that. Could you please tell me what day you\'d like to come in? You can say "tomorrow", "Friday", or any specific day. 📅';
      }
      
    } else if (currentState.currentState === 'time_selection') {
      // User is selecting a time
      const time = extractedData?.time || this.extractTimeFromMessage(sms.body);
      console.log('🔍 Time extraction:', { input: sms.body, extracted: time });
      
      if (time) {
        nextState = 'booking_confirmation';
        response = `Perfect! I've booked your appointment for ${currentState.context.selectedDate} at ${time}. You'll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨`;
      } else {
        nextState = 'time_selection';
        response = 'I didn\'t catch that. Could you please choose from the available times:\n• 9:00 AM\n• 11:00 AM\n• 1:00 PM\n• 3:00 PM\n• 5:00 PM';
      }
    } else {
      // Handle unexpected state - fallback to service selection
      console.log('⚠️ Unexpected state:', currentState.currentState);
      nextState = 'service_selection';
      response = 'Great! I\'d love to help you book an appointment. What service would you like?\n\nOur services include:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nJust let me know which service you\'d like to book! 💆‍♀️✨';
    }
    
    console.log('📊 State transition:', {
      from: currentState?.currentState || 'idle',
      to: nextState,
      response: response.substring(0, 100) + '...'
    });
    
    // Update conversation state
    this.updateConversationState(sms.from, {
      currentState: nextState,
      context: {
        ...currentState?.context,
        selectedService: extractedData?.service || currentState?.context.selectedService,
        selectedDate: extractedData?.date || currentState?.context.selectedDate,
        selectedTime: extractedData?.time || currentState?.context.selectedTime,
        messageCount: (currentState?.context.messageCount || 0) + 1
      }
    });
    
    // Send response
    await this.sendSMSResponse(sms, response, 0.9, client);
    
    return {
      success: true,
      responseSent: true,
      response,
      confidence: 0.9
    };
  }

  private extractServiceFromMessage(message: string): string | undefined {
    const services = ['signature head spa', 'deluxe head spa', 'platinum head spa'];
    const text = message.toLowerCase();
    
    for (const service of services) {
      if (text.includes(service)) {
        return service;
      }
    }
    return undefined;
  }

  private extractDateFromMessage(message: string): string | undefined {
    const dateKeywords = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const text = message.toLowerCase();
    
    for (const date of dateKeywords) {
      if (text.includes(date)) {
        return date;
      }
    }
    return undefined;
  }

  private extractTimeFromMessage(message: string): string | undefined {
    const text = message.toLowerCase().trim();
    
    // Handle various time formats
    const timePatterns = [
      /(\d{1,2}):?(\d{2})?\s*(am|pm)/i,  // 3pm, 3:00pm, 3:30pm
      /(\d{1,2})\s*(am|pm)/i,             // 3 pm, 3 am
      /(\d{1,2}):(\d{2})/i,               // 15:30, 3:30
      /(\d{1,2})/                          // 3 (assume PM if no AM/PM specified)
    ];
    
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        let time = match[0];
        
        // If it's just a number (like "3"), assume PM
        if (/^\d{1,2}$/.test(time)) {
          time = time + 'pm';
        }
        
        // Normalize the format
        time = time.replace(/\s+/g, '').toLowerCase();
        
        // Convert to standard format
        if (time.includes('pm') || time.includes('am')) {
          return time;
        } else {
          // If no AM/PM specified, assume PM for single digits, AM for double digits
          const hour = parseInt(time.split(':')[0]);
          if (hour <= 12) {
            return time + 'pm';
          } else {
            return time + 'am';
          }
        }
      }
    }
    
    return undefined;
  }

  // ============================================================================
  // SPECIALIZED HANDLERS
  // ============================================================================

  private async handleReschedule(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    const response = 'I\'d be happy to help you reschedule your appointment. Please call us at 9189325396 and we\'ll get that sorted out for you right away! 📞';
    await this.sendSMSResponse(sms, response, 0.9, client);
    
    return {
      success: true,
      responseSent: true,
      response,
      confidence: 0.9
    };
  }

  private async handleCancel(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    const response = 'I\'d be happy to help you cancel your appointment. Please call us at 9189325396 and we\'ll take care of that for you right away! 📞';
    await this.sendSMSResponse(sms, response, 0.9, client);
    
    return {
      success: true,
      responseSent: true,
      response,
      confidence: 0.9
    };
  }

  private async handleBusinessQuestion(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    try {
      // Build context for LLM
      const context = await this.buildContext(client, sms);
      
      // Generate AI response
      const llmResponse = await this.llmService.generateResponse(sms.body, context, 'sms');
      
      if (llmResponse.success && llmResponse.message) {
        await this.sendSMSResponse(sms, llmResponse.message, llmResponse.confidence || 0.9, client);
        
        return {
          success: true,
          responseSent: true,
          response: llmResponse.message,
          confidence: llmResponse.confidence || 0.9
        };
      }
      
      // Fallback response
      const fallbackResponse = this.getBusinessQuestionFallback(sms.body);
      await this.sendSMSResponse(sms, fallbackResponse, 0.7, client);
      
      return {
        success: true,
        responseSent: true,
        response: fallbackResponse,
        confidence: 0.7
      };
      
    } catch (error) {
      console.error('Error handling business question:', error);
      return {
        success: false,
        responseSent: false,
        error: 'Failed to handle business question'
      };
    }
  }

  private async handleGreeting(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    const response = 'Hey there! Welcome to Glo Head Spa! How can I help you today? 💆‍♀️✨';
    await this.sendSMSResponse(sms, response, 0.9, client);
    
    return {
      success: true,
      responseSent: true,
      response,
      confidence: 0.9
    };
  }

  private async handleGeneralMessage(sms: IncomingSMS, client: any): Promise<SMSAutoRespondResult> {
    try {
      // Build context for LLM
      const context = await this.buildContext(client, sms);
      
      // Generate AI response
      const llmResponse = await this.llmService.generateResponse(sms.body, context, 'sms');
      
      if (llmResponse.success && llmResponse.message) {
        await this.sendSMSResponse(sms, llmResponse.message, llmResponse.confidence || 0.8, client);
        
        return {
          success: true,
          responseSent: true,
          response: llmResponse.message,
          confidence: llmResponse.confidence || 0.8
        };
      }
      
      // Fallback response
      const fallbackResponse = 'Thank you for your message! How can I help you today? 💆‍♀️✨';
      await this.sendSMSResponse(sms, fallbackResponse, 0.6, client);
      
      return {
        success: true,
        responseSent: true,
        response: fallbackResponse,
        confidence: 0.6
      };
      
    } catch (error) {
      console.error('Error handling general message:', error);
      return {
        success: false,
        responseSent: false,
        error: 'Failed to handle general message'
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getConversationState(phoneNumber: string): ConversationState | undefined {
    return this.conversationStates.get(phoneNumber);
  }

  private updateConversationState(phoneNumber: string, updates: Partial<ConversationState>): void {
    const currentState = this.conversationStates.get(phoneNumber);
    
    const newState: ConversationState = {
      phoneNumber,
      currentState: updates.currentState || currentState?.currentState || 'idle',
      context: {
        ...currentState?.context,
        ...updates.context,
        messageCount: (currentState?.context.messageCount || 0) + 1
      },
      lastUpdated: new Date()
    };
    
    this.conversationStates.set(phoneNumber, newState);
  }

  private clearConversationState(phoneNumber: string): void {
    this.conversationStates.delete(phoneNumber);
  }

  private async findOrCreateClient(phoneNumber: string): Promise<any> {
    try {
      // Try to find existing client
      const existingClient = await this.storage.getUserByPhone(phoneNumber);
      if (existingClient) {
        return existingClient;
      }
      
      // Create new client
      const newClient = await this.storage.createUser({
        phone: phoneNumber,
        firstName: 'SMS Client',
        lastName: '',
        email: '',
        username: `sms_${phoneNumber.replace(/\D/g, '')}`,
        password: '',
        role: 'client'
      });
      
      return newClient;
    } catch (error) {
      console.error('Error finding or creating client:', error);
      return null;
    }
  }

  private async buildContext(client: any, sms: IncomingSMS): Promise<any> {
    const businessSettings = await this.storage.getBusinessSettings();
    const services = await this.storage.getAllServices();
    const businessKnowledge = await this.storage.getBusinessKnowledge();
    
    return {
      clientName: client.firstName || 'there',
      clientPhone: client.phone,
      businessName: businessSettings?.businessName || 'Glo Head Spa',
      businessType: 'salon and spa',
      availableServices: services.map((s: any) => ({
        name: s.name,
        description: s.description,
        price: s.price,
        duration: s.duration
      })),
      businessKnowledge
    };
  }

  private getBusinessQuestionFallback(message: string): string {
    const text = message.toLowerCase();
    
    if (text.includes('how much') || text.includes('cost') || text.includes('price')) {
      return 'Here are our current prices:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nWould you like to book an appointment? 💆‍♀️✨';
    }
    
    if (text.includes('services') || text.includes('what do you offer')) {
      return 'We offer these amazing services:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nWhich service interests you? 💆‍♀️✨';
    }
    
    if (text.includes('hours') || text.includes('when are you open')) {
      return 'We\'re open Monday through Saturday, 9:00 AM to 6:00 PM. Sundays we\'re closed. What day works best for you? 📅';
    }
    
    return 'Thank you for your question! I\'d be happy to help you. Could you please provide more specific details about what you\'re looking for? 💆‍♀️✨';
  }

  private async sendSMSResponse(sms: IncomingSMS, response: string, confidence: number, client: any): Promise<void> {
    // Log the response
    console.log('📤 Sending SMS response:', {
      to: sms.from,
      response: response.substring(0, 100) + '...',
      confidence
    });
    
    // In a real implementation, you would send the SMS here
    // For now, we just log it
    console.log('📱 SMS Response:', response);
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  async updateConfig(newConfig: Partial<typeof this.config>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // Check storage connection
      await this.storage.getAllServices();
    } catch (error) {
      issues.push('Storage connection failed');
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'unhealthy',
      issues
    };
  }

  getStats(): any {
    return {
      activeConversations: this.conversationStates.size,
      totalStates: this.conversationStates.size,
      config: this.config
    };
  }
} 