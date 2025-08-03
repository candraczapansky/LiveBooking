import { IStorage } from "./storage";
import { config, DatabaseConfig } from "./config";

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
      const userPrompt = this.buildUserPrompt(clientMessage, context, 'sms');

      // Define the book_appointment function schema
      const functions = [
        {
          name: 'book_appointment',
          description: 'Book an appointment when all required parameters (service, date, time) are collected',
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
        }
      ];

      const response = await this.callOpenAI(systemPrompt, userPrompt, functions);
      
      if (!response.success) {
        return response;
      }

      // If function call is detected, return it directly
      if (response.functionCall && response.functionCall.name === 'book_appointment') {
        return {
          success: true,
          message: 'Function call detected - booking appointment',
          functionCall: response.functionCall,
          confidence: 1.0
        };
      }

      // Parse the response for structured booking
      const parsedResponse = this.parseStructuredBookingResponse(response.message || '');
      
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
3. Once ALL THREE are collected, you MUST call the book_appointment function
4. Do NOT continue asking questions once all parameters are collected
5. Be friendly and enthusiastic throughout the process

Current Conversation State:
- Service: ${conversationState?.selectedService || 'Not selected'}
- Date: ${conversationState?.selectedDate || 'Not selected'}
- Time: ${conversationState?.selectedTime || 'Not selected'}

Available Services:
- Signature Head Spa ($99)
- Deluxe Head Spa ($160)
- Platinum Head Spa ($220)

Booking Flow Steps:
1. If no service selected: Ask "What service would you like? We offer Signature Head Spa ($99), Deluxe Head Spa ($160), or Platinum Head Spa ($220)."
2. If service selected but no date: Ask "Great! What date would you like to come in? You can say 'tomorrow', 'Monday', or a specific date."
3. If service and date selected but no time: Ask "Perfect! What time works for you? We have availability at 9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, and 5:00 PM."
4. If ALL THREE are collected: Call the book_appointment function with the collected information

IMPORTANT FUNCTION CALLING RULES:
- When ALL THREE parameters (service, date, time) are collected, you MUST call the book_appointment function
- The function requires: service (string), date (YYYY-MM-DD format), time (HH:MM AM/PM format)
- Do NOT ask for more information once all three are collected
- Call the function immediately when all parameters are available
- The function will handle the actual booking process

Example function call when all parameters are collected:
- Service: "Signature Head Spa"
- Date: "2024-08-01" (tomorrow)
- Time: "10:30 AM"
- Result: Call book_appointment function with these exact parameters

Do NOT continue the conversation after calling the function. The function will handle the booking confirmation.`;

    return prompt;
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
      'when', 'what', 'how much', 'available', 'time', 'date', 'reservation'
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
    try {
      // Get API key from database first, then fallback to environment variable
      const apiKey = await this.ensureApiKey();
      
      if (!apiKey) {
        console.error('LLM Service: OpenAI API key not configured');
        return {
          success: false,
          error: 'OpenAI API key not configured'
        };
      }
      
      console.log('LLM Service: API key found, proceeding with OpenAI call...');

      console.log('LLM Service: Making OpenAI API call...');
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

      // Add functions if provided
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

      console.log('LLM Service: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('LLM Service: OpenAI API error:', errorData);
        return {
          success: false,
          error: `OpenAI API error: ${errorData.error?.message || response.statusText}`
        };
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content;
      const functionCall = data.choices?.[0]?.message?.function_call;

      if (!message && !functionCall) {
        console.error('LLM Service: No response generated from OpenAI');
        return {
          success: false,
          error: 'No response generated from OpenAI'
        };
      }

      console.log('LLM Service: Successfully generated response');
      if (message) {
        console.log('LLM Service: Response preview:', message.substring(0, 100) + '...');
      }
      if (functionCall) {
        console.log('LLM Service: Function call detected:', functionCall.name);
      }

      return {
        success: true,
        message,
        functionCall: functionCall ? {
          name: functionCall.name,
          arguments: JSON.parse(functionCall.arguments)
        } : undefined
      };

    } catch (error: any) {
      console.error('LLM Service: OpenAI API call failed:', error);
      return {
        success: false,
        error: `OpenAI API call failed: ${error.message}`
      };
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