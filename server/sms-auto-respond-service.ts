import { IStorage } from './storage';
import { LLMService } from './llm-service';
import { sendSMS } from './sms';

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

export class SMSAutoRespondService {
  private storage: IStorage;
  private llmService: LLMService;
  private config: SMSAutoRespondConfig;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.llmService = new LLMService(storage);
    this.config = {
      enabled: true,
      confidenceThreshold: 0.7,
      maxResponseLength: 160, // SMS character limit
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
      excludedPhoneNumbers: [
        // Add any phone numbers that should not trigger auto-responses
      ],
      autoRespondPhoneNumbers: [
        // Add phone numbers that should receive auto-responses
        // Format: "+1234567890"
      ]
    };
  }

  /**
   * Process an incoming SMS and determine if auto-response should be sent
   */
  async processIncomingSMS(sms: IncomingSMS): Promise<SMSAutoRespondResult> {
    try {
      console.log('Processing incoming SMS for auto-response:', {
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
      
      // Build context for LLM
      const context = await this.buildContext(client, sms);

      // Generate AI response
      const prompt = `You are a helpful customer service representative for a business. 
      A customer has sent an SMS message. Please provide a helpful, professional, and concise response.
      
      Customer message: "${sms.body}"
      
      Business context: ${JSON.stringify(context, null, 2)}
      
      Please respond in a friendly, professional manner. Keep the response under ${this.config.maxResponseLength} characters.
      If the message requires immediate attention or is urgent, acknowledge it and let them know someone will contact them soon.`;

      const llmResponse = await this.llmService.generateResponse(prompt, context, 'sms');
      
      if (!llmResponse.success || !llmResponse.message) {
        console.log('LLM failed to generate response, using fallback');
        const fallbackResponse = this.generateFallbackResponse(sms.body, context);
        return await this.sendFallbackResponse(sms, fallbackResponse, client);
      }

      const confidence = llmResponse.confidence || 0.5;
      
      // Check confidence threshold
      if (confidence < this.config.confidenceThreshold) {
        return {
          success: true,
          responseSent: false,
          reason: `Confidence too low (${(confidence * 100).toFixed(0)}% < ${(this.config.confidenceThreshold * 100).toFixed(0)}%)`
        };
      }

      // Truncate response if too long
      let response = llmResponse.message;
      if (response.length > this.config.maxResponseLength) {
        response = response.substring(0, this.config.maxResponseLength - 3) + '...';
      }

      // Send SMS response
      const smsResult = await sendSMS(sms.from, response);
      
      if (smsResult.success) {
        console.log('SMS auto-response sent successfully:', {
          to: sms.from,
          messageId: smsResult.messageId,
          confidence: confidence
        });

        // Log the auto-response
        await this.logAutoResponse(sms, response, confidence, client);

        return {
          success: true,
          responseSent: true,
          response: response,
          confidence: confidence
        };
      } else {
        console.error('Failed to send SMS auto-response:', smsResult.error);
        return {
          success: false,
          responseSent: false,
          error: smsResult.error
        };
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
      let client = users.find((u: any) => 
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
          country: null,
          dateOfBirth: null,
          gender: null,
          emergencyContact: null,
          emergencyPhone: null,
          medicalConditions: null,
          allergies: null,
          preferences: null,
          notes: null,
          isActive: true,
          emailVerified: false,
          phoneVerified: false,
          lastLogin: null,
          profilePicture: null,
          squareCustomerId: null,
          resetToken: null,
          resetTokenExpiry: null,
          createdAt: null,
          updatedAt: null
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
      const appointments = await this.storage.getAppointments();
      const clientAppointments = appointments.filter((apt: any) => 
        apt.client_id === client.id
      ).slice(-5); // Last 5 appointments

      // Get business information
      const business = await this.storage.getBusinessInfo();

      return {
        client: {
          name: client.name,
          phone: client.phone,
          email: client.email,
          recent_appointments: clientAppointments
        },
        business: {
          name: business?.name || 'Our Business',
          services: business?.services || [],
          hours: business?.hours || '9 AM - 5 PM'
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
} 