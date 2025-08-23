import { IStorage } from "./storage.js";
import { config, DatabaseConfig } from "./config.js";

// Minimal JSON helpers used in error handling and tool argument parsing
function parseJsonSafe(input: any): any {
  try {
    if (typeof input === 'string') {
      return JSON.parse(input);
    }
    return input;
  } catch (_e) {
    return input;
  }
}

async function safeJson(response: any): Promise<any> {
  try {
    // Some responses may not be JSON; fall back to text
    const cloned = response?.clone ? response.clone() : response;
    return await cloned.json();
  } catch (_e) {
    try {
      const cloned = response?.clone ? response.clone() : response;
      const text = await cloned.text();
      return { raw: text };
    } catch (_e2) {
      return null;
    }
  }
}

interface LLMConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface MessageContext {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  businessName?: string;
  businessType?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
  clientPreferences?: {
    emailAccountManagement?: boolean;
    emailAppointmentReminders?: boolean;
    emailPromotions?: boolean;
    smsAccountManagement?: boolean;
    smsAppointmentReminders?: boolean;
    smsPromotions?: boolean;
  };
  availableServices?: Array<{
    name: string;
    description?: string;
    price?: number;
    duration?: number;
  }>;
  availableStaff?: Array<{
    name: string;
    title?: string;
    bio?: string;
  }>;
  businessKnowledge?: Array<{
    category: string;
    title: string;
    content: string;
    keywords?: string;
    priority: number;
  }>;
}

interface LLMResponse {
  success: boolean;
  message?: string;
  error?: string;
  suggestedActions?: Array<{
    type: 'book_appointment' | 'send_info' | 'follow_up' | 'escalate';
    description: string;
    data?: any;
  }>;
  confidence?: number;
  functionCall?: {
    name: string;
    arguments: any;
  };
}

export class LLMService {
  private config: LLMConfig;
  private storage: IStorage;
  private dbConfig: DatabaseConfig;

  constructor(storage: IStorage, llmConfig: LLMConfig = {}) {
    this.storage = storage;
    this.dbConfig = new DatabaseConfig(storage);
    this.config = {
      apiKey: llmConfig.apiKey || config.openai.apiKey,
      model: llmConfig.model || config.openai.model,
      maxTokens: llmConfig.maxTokens || config.openai.maxTokens,
      temperature: llmConfig.temperature || config.openai.temperature,
      ...llmConfig
    };
  }

  private async ensureApiKey(): Promise<string | null> {
    // First try to get from database
    const dbApiKey = await this.dbConfig.getOpenAIKey();
    if (dbApiKey) {
      return dbApiKey;
    }
    
    // Fallback to environment variable
    return this.config.apiKey || null;
  }

  async generateResponse(
    clientMessage: string,
    context: MessageContext,
    channel: 'email' | 'sms' = 'email'
  ): Promise<LLMResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(context, channel);
      const userPrompt = this.buildUserPrompt(clientMessage, context, channel);

      const response = await this.callOpenAI(systemPrompt, userPrompt);
      
      if (!response.success) {
        return response;
      }

      // Parse the response and extract suggested actions
      const parsedResponse = this.parseLLMResponse(response.message || '');
      
      return {
        success: true,
        message: parsedResponse.message,
        suggestedActions: parsedResponse.actions,
        confidence: parsedResponse.confidence
      };

    } catch (error: any) {
      console.error('LLM Service Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate response'
      };
    }
  }

  /**
   * Generate structured booking response for SMS appointment booking
   * This method is specifically designed for the appointment booking flow
   */
  async generateStructuredBookingResponse(
    clientMessage: string,
    context: MessageContext,
    conversationState: any
  ): Promise<LLMResponse> {
    try {
      const systemPrompt = this.buildStructuredBookingPrompt(context, conversationState);
      const userPrompt = this.buildStructuredUserPrompt(clientMessage, conversationState);

      // Define the book_appointment function schema
      const functions = [
        {
          name: 'check_availability',
          description: 'Check if a specific time slot is available for booking',
          parameters: {
            type: 'object',
            properties: {
              service: {
                type: 'string',
                description: 'The service name (e.g., "Signature Head Spa", "Deluxe Head Spa", "Platinum Head Spa")',
                enum: ['Signature Head Spa', 'Deluxe Head Spa', 'Platinum Head Spa']
              },
              date: {
                type: 'string',
                description: 'The appointment date in YYYY-MM-DD format (e.g., "2024-08-01")'
              },
              time: {
                type: 'string',
                description: 'The appointment time in HH:MM AM/PM format (e.g., "10:30 AM", "2:00 PM")'
              }
            },
            required: ['service', 'date', 'time']
          }
        },
        {
          name: 'book_appointment',
          description: 'Book an appointment when all required parameters (service, date, time) are collected and availability is confirmed',
          parameters: {
            type: 'object',
            properties: {
              service: {
                type: 'string',
                description: 'The service name (e.g., "Signature Head Spa", "Deluxe Head Spa", "Platinum Head Spa")',
                enum: ['Signature Head Spa', 'Deluxe Head Spa', 'Platinum Head Spa']
              },
              date: {
                type: 'string',
                description: 'The appointment date in YYYY-MM-DD format (e.g., "2024-08-01")'
              },
              time: {
                type: 'string',
                description: 'The appointment time in HH:MM AM/PM format (e.g., "10:30 AM", "2:00 PM")'
              }
            },
            required: ['service', 'date', 'time']
          }
        },
        {
          name: 'cancel_appointment',
          description: 'Cancel an existing appointment',
          parameters: {
            type: 'object',
            properties: {
              appointment_id: {
                type: 'string',
                description: 'The unique appointment ID to cancel'
              },
              client_phone: {
                type: 'string',
                description: 'The phone number associated with the appointment'
              }
            },
            required: ['appointment_id', 'client_phone']
          }
        },
        {
          name: 'reschedule_appointment',
          description: 'Reschedule an existing appointment to a new date and time',
          parameters: {
            type: 'object',
            properties: {
              appointment_id: {
                type: 'string',
                description: 'The unique appointment ID to reschedule'
              },
              client_phone: {
                type: 'string',
                description: 'The phone number associated with the appointment'
              },
              new_date: {
                type: 'string',
                description: 'The new appointment date in YYYY-MM-DD format'
              },
              new_time: {
                type: 'string',
                description: 'The new appointment time in HH:MM AM/PM format'
              }
            },
            required: ['appointment_id', 'client_phone', 'new_date', 'new_time']
          }
        }
      ];

      console.log('🔍 Structured Booking - System Prompt Preview:', systemPrompt.substring(0, 200) + '...');
      console.log('🔍 Structured Booking - User Prompt:', userPrompt);
      
      const response = await this.callOpenAI(systemPrompt, userPrompt, functions);
      
      if (!response.success) {
        return response;
      }

      console.log('🔍 Structured Booking - LLM Response:', response.message);
      console.log('🔍 Structured Booking - Function Call:', response.functionCall);

      // If function call is detected, return it directly
      if (response.functionCall) {
        console.log('✅ Function call detected:', response.functionCall.name);
        
        // Handle both check_availability and book_appointment function calls
        if (response.functionCall.name === 'check_availability' || response.functionCall.name === 'book_appointment') {
          return {
            success: true,
            message: 'Function call detected - proceeding with booking process',
            functionCall: response.functionCall,
            confidence: 1.0
          };
        }
      }

      // Return conversational response
      return {
        success: true,
        message: response.message || 'I didn\'t understand that. Could you please clarify?',
        confidence: 0.8
      };

    } catch (error: any) {
      console.error('LLM Service Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate structured booking response'
      };
    }
  }

  private buildSystemPrompt(context: MessageContext, channel: 'email' | 'sms'): string {
    const businessName = context.businessName || 'Glo Head Spa';
    const businessType = context.businessType || 'salon and spa';
    
    let prompt = `You are an AI assistant for ${businessName}, a ${businessType}. Your role is to help clients with inquiries, appointments, and general information.

Key Guidelines:
- Be super friendly, bubbly, and enthusiastic!
- Keep responses concise and clear
- Always maintain a positive, welcoming, excited tone
- If you don't have enough information, ask for clarification in a friendly way
- Suggest booking appointments when appropriate with enthusiasm
- Provide accurate information about services and staff with excitement
- Respect client communication preferences
- ALWAYS use the FAQ/business knowledge below when answering questions that are covered in it
- Prioritize FAQ information over general responses for common questions
- Make every client feel special and valued!
- GREETING RULE: For simple greetings like "Hi", "Hello", "Hey", just give a warm welcome without mentioning services or what you don't offer

Business Information:
- Business Name: ${businessName}
- Type: ${businessType}

Available Services:`;

    if (context.availableServices && context.availableServices.length > 0) {
      context.availableServices.forEach(service => {
        prompt += `\n- ${service.name}`;
        if (service.description) prompt += `: ${service.description}`;
        if (service.price) prompt += ` ($${service.price})`;
        if (service.duration) prompt += ` (${service.duration} min)`;
      });
    } else {
      prompt += `\n- No services currently available`;
    }
    
    prompt += `\n\nCRITICAL SERVICE RULES - YOU MUST FOLLOW THESE EXACTLY:
- ONLY mention the services listed above - NO EXCEPTIONS
- Do NOT suggest or mention any services that are not in the available services list
- If someone asks about services not listed above, politely explain that you only offer the services listed
- Always reference the specific services and prices from the list above
- CRITICAL: Time selections (like "9:00 AM", "9am", "morning") are appointment time selections, NOT service requests

GREETING RULE - CRITICAL:
- For simple greetings like "Hi", "Hello", "Hey", "Good morning", "Good afternoon":
  * ONLY give a warm welcome like "Hey there! Welcome to Glo Head Spa! How can I help you today?"
  * DO NOT mention any services
  * DO NOT mention what you don't offer
  * Just be friendly and welcoming
- IMPORTANT: If the message is ONLY a greeting (like "Hi", "Hello", "Hey"), treat it as a greeting, NOT as a service inquiry
- DO NOT assume someone wants to book an appointment just because they said "Hi"`;

    prompt += `\n\nAvailable Staff:`;
    if (context.availableStaff && context.availableStaff.length > 0) {
      context.availableStaff.forEach(staff => {
        prompt += `\n- ${staff.name}`;
        if (staff.title) prompt += ` (${staff.title})`;
        if (staff.bio) prompt += `: ${staff.bio}`;
      });
    }

    prompt += `\n\nClient Preferences:`;
    if (context.clientPreferences) {
      const prefs = context.clientPreferences;
      prompt += `\n- Email Account Management: ${prefs.emailAccountManagement ? 'Yes' : 'No'}`;
      prompt += `\n- Email Appointment Reminders: ${prefs.emailAppointmentReminders ? 'Yes' : 'No'}`;
      prompt += `\n- Email Promotions: ${prefs.emailPromotions ? 'Yes' : 'No'}`;
      prompt += `\n- SMS Account Management: ${prefs.smsAccountManagement ? 'Yes' : 'No'}`;
      prompt += `\n- SMS Appointment Reminders: ${prefs.smsAppointmentReminders ? 'Yes' : 'No'}`;
      prompt += `\n- SMS Promotions: ${prefs.smsPromotions ? 'Yes' : 'No'}`;
    }

    if (channel === 'sms') {
      prompt += `\n\nSMS Guidelines:
- Keep responses under 500 characters when possible
- Use abbreviations sparingly but appropriately
- Be direct and to the point
- Include clear call-to-action when needed
- For FAQ questions: Use the business knowledge above to provide accurate, concise answers
- If the customer asks something covered in the FAQ, reference that specific information
- Prioritize FAQ knowledge when answering common questions

APPOINTMENT BOOKING GUIDELINES:
- When clients want to book appointments, be enthusiastic and helpful!
- Ask for specific details: service type, preferred date/time
- If they mention a service, confirm it and ask when they'd like to come
- If they just say "Hi" or "Hello", give a simple, warm welcome like "Hey there! Welcome to Glo Head Spa! How can I help you today?" - DO NOT mention services, pricing, or what you don't offer
- DO NOT assume someone wants to book just because they said "Hi" - wait for them to ask about services or booking
- Always encourage booking when appropriate
- Be specific about available services and pricing
- Make booking feel easy and exciting!
- CRITICAL: Only offer services that are listed in the available services above
- CRITICAL: Time selections (like "9:00 AM", "9am", "morning", "afternoon") are appointment time selections, NOT service requests

CRITICAL CONVERSATION RULES:
- If you see conversation history above, this is NOT the first message
- NEVER start your response with "Hey there!", "Hi!", "Hello!", "Hey [name]!", or any greeting
- Start your response directly with the answer or next step
- Only use greetings for the very first message in a conversation
- If the client asks about services, appointments, pricing, or hours, start directly with the information
- Be conversational and natural, building on previous messages

PERSONALITY: You are a super friendly, bubbly, enthusiastic front desk SPA girl! 
- Use lots of exclamation points and positive energy!
- Be warm, welcoming, and excited to help!
- Use friendly, casual language like "Awesome!", "Perfect!", "Yay!"
- Show genuine enthusiasm for helping clients
- Be encouraging and supportive
- Use emojis sparingly but effectively (like 💕, ✨, 💁‍♀️)
- Make clients feel special and valued
- Be the kind of person who makes everyone smile when they walk in!
- IMPORTANT: Do NOT use generic names like "SMS Client" - just be friendly and natural!
- Start responses naturally without addressing by name unless you know their real name
- CRITICAL: Always respond specifically to what the client asked - don't give generic responses!
- If they ask about services, mention specific services and prices
- If they ask about hours, give the exact business hours
- If they want to book, ask what service and when they'd like to come
- If they just say "Hi", give a warm welcome and ask how you can help`;
    } else {
      prompt += `\n\nEmail Guidelines:
- Use proper email formatting
- Include greeting and signature
- Provide detailed information when appropriate
- Include multiple options when relevant
- For FAQ questions: Use the business knowledge above to provide comprehensive answers`;
    }

    prompt += `\n\nIMPORTANT - BUSINESS KNOWLEDGE (FAQ):`;
    if (context.businessKnowledge && context.businessKnowledge.length > 0) {
      prompt += `\nUse this information to answer customer questions accurately:`;
      context.businessKnowledge.forEach((item: any) => {
        prompt += `\nQ: ${item.title}\nA: ${item.content}\n`;
      });
      prompt += `\nWhen a customer asks about any of the above topics, use the specific information provided rather than general responses.`;
    } else {
      prompt += `\nNo specific business knowledge available. Provide general helpful responses.`;
    }

    prompt += `\n\nResponse Format:
Respond with a natural, helpful message. If you suggest actions, include them in this format:
[ACTION: action_type: description: data]

Example actions:
[ACTION: book_appointment: Schedule a consultation: {"service": "consultation", "duration": 30}]
[ACTION: send_info: Send service brochure: {"type": "brochure", "services": ["haircut", "color"]}]
[ACTION: follow_up: Schedule follow-up call: {"timing": "24h", "purpose": "consultation"}]
[ACTION: escalate: Transfer to human staff: {"reason": "complex inquiry", "urgency": "medium"}]`;

    return prompt;
  }

  /**
   * Build system prompt specifically for structured booking conversations
   */
  private buildStructuredBookingPrompt(context: MessageContext, conversationState: any): string {
    const businessName = context.businessName || 'Glo Head Spa';
    const businessType = context.businessType || 'salon and spa';
    
    let prompt = `You are an AI assistant for ${businessName}, a ${businessType}. You are specifically handling an appointment booking conversation.

CRITICAL BOOKING FLOW RULES:
1. You are in a structured booking conversation
2. You must collect: service, date, and time
3. Once ALL THREE are collected, you MUST call check_availability first
4. Only if check_availability returns true, then call book_appointment
5. If check_availability returns false, suggest alternative times
6. Be friendly and enthusiastic throughout the process

Current Conversation State:
- Service: ${conversationState?.selectedService || 'Not selected'}
- Date: ${conversationState?.selectedDate || 'Not selected'}
- Time: ${conversationState?.selectedTime || 'Not selected'}
- Conversation Step: ${conversationState?.conversationStep || 'initial'}

Available Services:
- Signature Head Spa ($99)
- Deluxe Head Spa ($160)
- Platinum Head Spa ($220)

BOOKING FLOW DECISION TREE:
1. If conversationStep is 'initial' OR no service selected:
   → Ask: "What service would you like? We offer Signature Head Spa ($99), Deluxe Head Spa ($160), or Platinum Head Spa ($220)."

2. If conversationStep is 'date_requested' OR service selected but no date:
   → Ask: "Great! What date would you like to come in? You can say 'tomorrow', 'Monday', or a specific date."

3. If conversationStep is 'time_selected' OR service and date selected but no time:
   → Ask: "Perfect! What time works for you? We have availability at 9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, and 5:00 PM."

4. If ALL THREE are collected (service, date, time):
   → Call check_availability function with the collected information
   → If available: Call book_appointment function
   → If not available: Suggest alternative times and ask for a new time

CANCELLATION AND RESCHEDULING:
- If user mentions "cancel" or "cancel appointment": Ask for appointment ID and call cancel_appointment
- If user mentions "reschedule" or "change appointment": Ask for appointment ID and new date/time, then call reschedule_appointment
- If appointment ID is not provided: Ask user to provide it or call us directly

IMPORTANT FUNCTION CALLING RULES:
- When ALL THREE parameters (service, date, time) are collected, you MUST call check_availability first
- Only call book_appointment if check_availability returns true
- The functions require: service (string), date (YYYY-MM-DD format), time (HH:MM AM/PM format)
- Do NOT ask for more information once all three are collected
- Call the functions immediately when all parameters are available
- The functions will handle the actual booking process

ERROR HANDLING:
- If check_availability returns false: Suggest alternative times like "9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, or 5:00 PM"
- If book_appointment fails: Apologize and suggest calling us directly
- If cancel_appointment fails: Ask user to verify appointment ID or call us
- If reschedule_appointment fails: Ask user to verify details or call us

CURRENT STATE ANALYSIS:
- Service: ${conversationState?.selectedService || 'Not selected'}
- Date: ${conversationState?.selectedDate || 'Not selected'}
- Time: ${conversationState?.selectedTime || 'Not selected'}
- Step: ${conversationState?.conversationStep || 'initial'}

Based on the current state, you should: ${this.getNextStepInstruction(conversationState)}

CRITICAL: You are in a structured booking conversation. Do NOT give generic greetings like "Hello! How can I assist you today?" - follow the booking flow exactly as instructed above.

MOST IMPORTANT: When ALL THREE parameters (service, date, time) are collected, you MUST call the check_availability function immediately. Do not ask for more information. Do not give a conversational response. Call the function.

CRITICAL FUNCTION CALLING RULES:
- When service, date, and time are ALL provided in the user's message, call check_availability immediately
- Do NOT ask for more information if all three are present
- Do NOT give a conversational response if all three are present
- The check_availability function MUST be called first before book_appointment
- Only call book_appointment if check_availability returns true
- If the user provides a time and you have service and date, call check_availability IMMEDIATELY
- Do NOT ask for confirmation or more details - just call the function`;

    return prompt;
  }

  /**
   * Build user prompt specifically for structured booking
   */
  private buildStructuredUserPrompt(clientMessage: string, conversationState: any): string {
    let prompt = `Client Message: "${clientMessage}"`;

    // Add conversation state context
    if (conversationState) {
      prompt += `\n\nCurrent Conversation State:`;
      prompt += `\n- Service: ${conversationState.selectedService || 'Not selected'}`;
      prompt += `\n- Date: ${conversationState.selectedDate || 'Not selected'}`;
      prompt += `\n- Time: ${conversationState.selectedTime || 'Not selected'}`;
      prompt += `\n- Step: ${conversationState.conversationStep || 'initial'}`;
      
      // Check if all parameters are collected
      const hasService = conversationState.selectedService;
      const hasDate = conversationState.selectedDate;
      const hasTime = conversationState.selectedTime;
      
      if (hasService && hasDate && hasTime) {
        prompt += `\n\n🚨 ALL PARAMETERS COLLECTED: Service, Date, and Time are all available. You MUST call check_availability function immediately. DO NOT give a conversational response. CALL THE FUNCTION NOW.`;
      } else if (hasService && hasDate && !hasTime) {
        prompt += `\n\n📝 PARTIAL: Service and Date collected, need Time. Ask for time selection.`;
      } else if (hasService && !hasDate && !hasTime) {
        prompt += `\n\n📝 PARTIAL: Service collected, need Date and Time. Ask for date selection.`;
      } else {
        prompt += `\n\n📝 INCOMPLETE: Need Service, Date, and Time. Ask for service selection.`;
      }
    }

    // Check if this looks like a continuing conversation
    const continuingConversationKeywords = [
      'book', 'appointment', 'schedule', 'service', 'price', 'cost', 'hours', 
      'when', 'what', 'how much', 'available', 'time', 'date', 'reservation',
      'signature', 'deluxe', 'platinum', 'head spa'
    ];
    
    const isContinuingConversation = continuingConversationKeywords.some(keyword => 
      clientMessage.toLowerCase().includes(keyword)
    );

    if (isContinuingConversation) {
      prompt += `\n\n🚨 CRITICAL INSTRUCTION: This is a continuing conversation. DO NOT start your response with ANY greeting like "Hey there!", "Hi!", "Hello!", or "Hey [name]!". Start directly with your answer or next step. NO GREETINGS ALLOWED.`;
    } else {
      prompt += `\n\nThis is a new conversation. You can use a friendly greeting.`;
    }

    prompt += `\nPlease provide a helpful response to the client's message.`;

    return prompt;
  }

  /**
   * Get the next step instruction based on conversation state
   */
  private getNextStepInstruction(conversationState: any): string {
    const hasService = conversationState?.selectedService;
    const hasDate = conversationState?.selectedDate;
    const hasTime = conversationState?.selectedTime;
    const step = conversationState?.conversationStep;

    if (!hasService || step === 'initial') {
      return "Ask for service selection: 'What service would you like? We offer Signature Head Spa ($99), Deluxe Head Spa ($160), or Platinum Head Spa ($220).'";
    } else if (!hasDate || step === 'date_requested') {
      return "Ask for date selection: 'Great! What date would you like to come in? You can say \"tomorrow\", \"Monday\", or a specific date.'";
    } else if (!hasTime || step === 'time_selected') {
      return "Ask for time selection: 'Perfect! What time works for you? We have availability at 9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, and 5:00 PM.'";
    } else {
      return "Call the book_appointment function with all collected parameters.";
    }
  }

  private buildUserPrompt(clientMessage: string, context: MessageContext, channel: 'email' | 'sms'): string {
    let prompt = `Client Message: "${clientMessage}"`;

    // Only include client name if it's a real name (not generic like "SMS Client")
    if (context.clientName && !context.clientName.includes('SMS Client') && !context.clientName.includes('Unknown Client')) {
      prompt += `\nClient Name: ${context.clientName}`;
    }

    // Check if this looks like a continuing conversation based on message content
    const continuingConversationKeywords = [
      'book', 'appointment', 'schedule', 'service', 'price', 'cost', 'hours', 
      'when', 'what', 'how much', 'available', 'time', 'date', 'reservation',
      'signature', 'deluxe', 'platinum', 'head spa'
    ];
    
    const isContinuingConversation = continuingConversationKeywords.some(keyword => 
      clientMessage.toLowerCase().includes(keyword)
    );

    if (context.conversationHistory && context.conversationHistory.length > 0) {
      prompt += `\n\nRecent Conversation History:`;
      // Include last 6 messages for context (3 exchanges)
      const recentMessages = context.conversationHistory.slice(-6);
      recentMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'Client' : 'Assistant';
        prompt += `\n${role}: ${msg.content}`;
      });
      prompt += `\n\n🚨 CRITICAL INSTRUCTION: This is a continuing conversation. DO NOT start your response with ANY greeting like "Hey there!", "Hi!", "Hello!", or "Hey [name]!". Start directly with your answer or next step. NO GREETINGS ALLOWED.`;
    } else if (isContinuingConversation) {
      prompt += `\n\n🚨 CRITICAL INSTRUCTION: This message appears to be a continuing conversation (contains keywords like "book", "appointment", "service", etc.). DO NOT start your response with ANY greeting like "Hey there!", "Hi!", "Hello!", or "Hey [name]!". Start directly with your answer or next step. NO GREETINGS ALLOWED.`;
    } else {
      // Check if this is just a simple greeting
      const simpleGreetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
      const isSimpleGreeting = simpleGreetings.some(greeting => 
        clientMessage.toLowerCase().trim() === greeting
      );
      
      if (isSimpleGreeting) {
        prompt += `\n\n🚨 GREETING DETECTED: This is a simple greeting like "Hi" or "Hello". 
- Give ONLY a warm welcome like "Hey there! Welcome to Glo Head Spa! How can I help you today?"
- DO NOT mention any services
- DO NOT mention what you don't offer (like haircuts)
- DO NOT assume they want to book an appointment
- Just be friendly and welcoming`;
      } else {
        prompt += `\n\nThis is a new conversation. You can use a friendly greeting.`;
      }
    }

    prompt += `\n\nPlease provide a helpful response to the client's message.`;

    return prompt;
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string, functions?: any[]): Promise<LLMResponse> {
    // Route to Responses API for newer models or when explicitly enabled; otherwise use Chat Completions
    const useResponses = this.shouldUseResponsesAPI();
    if (useResponses) {
      const res = await this.callOpenAIResponses(systemPrompt, userPrompt, functions);
      // If Responses API fails due to model/endpoint mismatch, fall back to Chat Completions
      if (!res.success && (res.error || '').toLowerCase().includes('unsupported') || (res.error || '').toLowerCase().includes('not found') || (res.error || '').toLowerCase().includes('invalid')) {
        console.warn('LLM Service: Falling back to Chat Completions after Responses API error');
        return await this.callOpenAIChatCompletions(systemPrompt, userPrompt, functions);
      }
      return res;
    }
    return await this.callOpenAIChatCompletions(systemPrompt, userPrompt, functions);
  }

  private shouldUseResponsesAPI(): boolean {
    try {
      const envOverride = (process.env.OPENAI_USE_RESPONSES_API || '').toLowerCase();
      if (envOverride === 'true' || envOverride === '1' || envOverride === 'yes') return true;
      const model = (this.config.model || '').toLowerCase();
      // Prefer Responses API for modern models (adjust list as new models appear)
      const hints = ['gpt-5', 'chatgpt-5', 'chatcpt', 'gpt-4.1', 'gpt-4o', 'omni'];
      return hints.some(h => model.includes(h));
    } catch {
      return false;
    }
  }

  private async callOpenAIChatCompletions(systemPrompt: string, userPrompt: string, functions?: any[]): Promise<LLMResponse> {
    try {
      const apiKey = await this.ensureApiKey();
      if (!apiKey) {
        console.error('LLM Service: OpenAI API key not configured');
        return { success: false, error: 'OpenAI API key not configured' };
      }
      console.log('LLM Service: Making Chat Completions API call...');
      console.log('LLM Service: Model:', this.config.model);
      console.log('LLM Service: Max tokens:', this.config.maxTokens);
      const requestBody: any = {
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      };
      if (functions && functions.length > 0) {
        requestBody.functions = functions;
        requestBody.function_call = 'auto';
      }
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      console.log('LLM Service: Chat Completions status:', response.status);
      if (!response.ok) {
        const errorData = await safeJson(response);
        console.error('LLM Service: Chat Completions error:', errorData);
        return { success: false, error: `OpenAI API error: ${errorData?.error?.message || response.statusText}` };
      }
      const data = await response.json();
      const message = data.choices?.[0]?.message?.content;
      const functionCall = data.choices?.[0]?.message?.function_call;
      if (!message && !functionCall) {
        console.error('LLM Service: No response generated from OpenAI (chat completions)');
        return { success: false, error: 'No response generated from OpenAI' };
      }
      return {
        success: true,
        message,
        functionCall: functionCall ? { name: functionCall.name, arguments: parseJsonSafe(functionCall.arguments) } : undefined
      };
    } catch (error: any) {
      console.error('LLM Service: Chat Completions call failed:', error);
      return { success: false, error: `OpenAI API call failed: ${error.message}` };
    }
  }

  private async callOpenAIResponses(systemPrompt: string, userPrompt: string, functions?: any[]): Promise<LLMResponse> {
    try {
      const apiKey = await this.ensureApiKey();
      if (!apiKey) {
        console.error('LLM Service: OpenAI API key not configured');
        return { success: false, error: 'OpenAI API key not configured' };
      }
      console.log('LLM Service: Making Responses API call...');
      console.log('LLM Service: Model:', this.config.model);
      console.log('LLM Service: Max tokens:', this.config.maxTokens);
      const tools = functions && functions.length > 0 ? functions.map((fn: any) => ({
        type: 'function',
        function: {
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters
        }
      })) : undefined;
      const requestBody: any = {
        model: this.config.model,
        input: [
          { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
          { role: 'user', content: [{ type: 'input_text', text: userPrompt }] }
        ],
        max_output_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      };
      if (tools) {
        requestBody.tools = tools;
        requestBody.tool_choice = 'auto';
      }
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      console.log('LLM Service: Responses API status:', response.status);
      if (!response.ok) {
        const errorData = await safeJson(response);
        console.error('LLM Service: Responses API error:', errorData);
        return { success: false, error: `OpenAI API error: ${errorData?.error?.message || response.statusText}` };
      }
      const data = await response.json();
      const parsed = this.parseResponsesApiOutput(data);
      if (!parsed.message && !parsed.functionCall) {
        console.error('LLM Service: No response generated from OpenAI (responses)');
        return { success: false, error: 'No response generated from OpenAI' };
      }
      return { success: true, message: parsed.message, functionCall: parsed.functionCall };
    } catch (error: any) {
      console.error('LLM Service: Responses API call failed:', error);
      return { success: false, error: `OpenAI API call failed: ${error.message}` };
    }
  }

  private parseResponsesApiOutput(data: any): { message?: string; functionCall?: { name: string; arguments: any } } {
    try {
      // 1) Direct text helper if present
      if (typeof data?.output_text === 'string' && data.output_text.trim().length > 0) {
        return { message: data.output_text };
      }
      // 2) Inspect output array for messages and tool calls
      const output = Array.isArray(data?.output) ? data.output : [];
      let textParts: string[] = [];
      let toolCall: { name: string; arguments: any } | undefined = undefined;
      for (const item of output) {
        // Some variants: item.type === 'message' and item.content is an array
        const contentArr = Array.isArray(item?.content) ? item.content : [];
        for (const c of contentArr) {
          const ctype = (c?.type || '').toLowerCase();
          if (ctype.includes('text')) {
            const t = c?.text || c?.value || '';
            if (typeof t === 'string' && t) textParts.push(t);
          }
          if (ctype.includes('tool_call')) {
            const name = c?.name || c?.tool_name || c?.function?.name;
            const argsRaw = c?.arguments || c?.function?.arguments;
            const args = typeof argsRaw === 'string' ? parseJsonSafe(argsRaw) : argsRaw;
            if (name) toolCall = { name, arguments: args };
          }
        }
        // Some variants might emulate chat.message with tool_calls array
        const msg = item?.message || item; // fallback
        const mFuncCalls = msg?.tool_calls || msg?.function_call ? (Array.isArray(msg?.tool_calls) ? msg.tool_calls : [msg.function_call]) : [];
        for (const tc of mFuncCalls) {
          const name = tc?.name || tc?.function?.name;
          const argsRaw = tc?.arguments || tc?.function?.arguments;
          const args = typeof argsRaw === 'string' ? parseJsonSafe(argsRaw) : argsRaw;
          if (name && !toolCall) toolCall = { name, arguments: args };
        }
        const maybeText = msg?.content || msg?.text;
        if (typeof maybeText === 'string') textParts.push(maybeText);
      }
      const message = textParts.join('\n').trim() || undefined;
      return { message, functionCall: toolCall };
    } catch (e) {
      console.error('LLM Service: Failed to parse Responses API output:', e);
      return {};
    }
  }

  private parseLLMResponse(response: string): {
    message: string;
    actions: Array<{
      type: 'book_appointment' | 'send_info' | 'follow_up' | 'escalate';
      description: string;
      data?: any;
    }>;
    confidence: number;
  } {
    const actions: Array<{
      type: 'book_appointment' | 'send_info' | 'follow_up' | 'escalate';
      description: string;
      data?: any;
    }> = [];

    // Extract actions from the response
    const actionRegex = /\[ACTION: ([^:]+): ([^:]+): ([^\]]+)\]/g;
    let match;
    let cleanMessage = response;

    while ((match = actionRegex.exec(response)) !== null) {
      const [, actionType, description, dataStr] = match;
      
      try {
        const data = JSON.parse(dataStr);
        actions.push({
          type: actionType as any,
          description: description.trim(),
          data
        });
      } catch (e) {
        // If JSON parsing fails, store as string
        actions.push({
          type: actionType as any,
          description: description.trim(),
          data: dataStr
        });
      }

      // Remove the action from the message
      cleanMessage = cleanMessage.replace(match[0], '');
    }

    // Calculate confidence based on response quality
    let confidence = 0.8; // Base confidence
    if (actions.length > 0) confidence += 0.1;
    if (cleanMessage.length > 50) confidence += 0.05;
    if (cleanMessage.includes('appointment') || cleanMessage.includes('book')) confidence += 0.05;

    return {
      message: cleanMessage.trim(),
      actions,
      confidence: Math.min(confidence, 1.0)
    };
  }

  /**
   * Parse structured booking response for function calling
   */
  private parseStructuredBookingResponse(response: string): {
    message: string;
    actions: Array<{
      type: 'book_appointment' | 'send_info' | 'follow_up' | 'escalate';
      description: string;
      data?: any;
    }>;
    confidence: number;
  } {
    const actions: Array<{
      type: 'book_appointment' | 'send_info' | 'follow_up' | 'escalate';
      description: string;
      data?: any;
    }> = [];

    // Check if this is a function call response
    try {
      const functionCallMatch = response.match(/\{[\s]*"function"[\s]*:[\s]*"book_appointment"[\s]*,[\s]*"service"[\s]*:[\s]*"([^"]+)"[\s]*,[\s]*"date"[\s]*:[\s]*"([^"]+)"[\s]*,[\s]*"time"[\s]*:[\s]*"([^"]+)"[\s]*\}/);
      
      if (functionCallMatch) {
        const [, service, date, time] = functionCallMatch;
        
        actions.push({
          type: 'book_appointment',
          description: 'Book appointment with collected parameters',
          data: {
            service,
            date,
            time
          }
        });
        
        return {
          message: 'Function call detected - booking appointment',
          actions,
          confidence: 1.0
        };
      }
    } catch (error) {
      console.log('No function call detected in response');
    }

    // If no function call, parse as regular response
    return this.parseLLMResponse(response);
  }

  async saveConversation(
    clientId: number,
    message: string,
    response: string,
    channel: 'email' | 'sms',
    metadata?: any
  ): Promise<void> {
    try {
      // Save to the llmConversations table
      await this.storage.createLLMConversation({
        clientId,
        clientMessage: message,
        aiResponse: response,
        channel,
        confidence: metadata?.confidence,
        suggestedActions: metadata?.suggestedActions ? JSON.stringify(metadata.suggestedActions) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      });
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }

  async getBusinessKnowledge(categories?: string[]): Promise<any[]> {
    try {
      return await this.storage.getBusinessKnowledge(categories);
    } catch (error) {
      console.error('Failed to get business knowledge:', error);
      return [];
    }
  }
} 