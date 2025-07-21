import { IStorage } from "./storage";

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
}

export class LLMService {
  private config: LLMConfig;
  private storage: IStorage;

  constructor(storage: IStorage, config: LLMConfig = {}) {
    this.storage = storage;
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-3.5-turbo',
      maxTokens: config.maxTokens || 500,
      temperature: config.temperature || 0.7,
      ...config
    };
  }

  async generateResponse(
    clientMessage: string,
    context: MessageContext,
    channel: 'email' | 'sms' = 'email'
  ): Promise<LLMResponse> {
    try {
      if (!this.config.apiKey) {
        return {
          success: false,
          error: 'OpenAI API key not configured'
        };
      }

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

  private buildSystemPrompt(context: MessageContext, channel: 'email' | 'sms'): string {
    const businessName = context.businessName || 'Glo Head Spa';
    const businessType = context.businessType || 'salon and spa';
    
    let prompt = `You are an AI assistant for ${businessName}, a ${businessType}. Your role is to help clients with inquiries, appointments, and general information.

Key Guidelines:
- Be professional, friendly, and helpful
- Keep responses concise and clear
- Always maintain a positive, welcoming tone
- If you don't have enough information, ask for clarification
- Suggest booking appointments when appropriate
- Provide accurate information about services and staff
- Respect client communication preferences

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
    }

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
- Keep responses under 160 characters when possible
- Use abbreviations sparingly but appropriately
- Be direct and to the point
- Include clear call-to-action when needed`;
    } else {
      prompt += `\n\nEmail Guidelines:
- Use proper email formatting
- Include greeting and signature
- Provide detailed information when appropriate
- Include multiple options when relevant`;
    }

    prompt += `\n\nBusiness Knowledge (FAQ):`;
    if (context.businessKnowledge && context.businessKnowledge.length > 0) {
      context.businessKnowledge.forEach((item: any) => {
        prompt += `\nQ: ${item.title}\nA: ${item.content}\n`;
      });
    } else {
      prompt += `\nNo specific business knowledge available.`;
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

  private buildUserPrompt(clientMessage: string, context: MessageContext, channel: 'email' | 'sms'): string {
    let prompt = `Client Message: "${clientMessage}"`;

    if (context.clientName) {
      prompt += `\nClient Name: ${context.clientName}`;
    }

    if (context.conversationHistory && context.conversationHistory.length > 0) {
      prompt += `\n\nRecent Conversation History:`;
      // Include last 3 messages for context
      const recentMessages = context.conversationHistory.slice(-3);
      recentMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'Client' : 'Assistant';
        prompt += `\n${role}: ${msg.content}`;
      });
    }

    prompt += `\n\nPlease provide a helpful response to the client's message.`;

    return prompt;
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `OpenAI API error: ${errorData.error?.message || response.statusText}`
        };
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content;

      if (!message) {
        return {
          success: false,
          error: 'No response generated from OpenAI'
        };
      }

      return {
        success: true,
        message
      };

    } catch (error: any) {
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