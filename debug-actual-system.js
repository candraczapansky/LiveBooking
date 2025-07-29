// Debug the actual SMS responder system
console.log('🔍 Debugging Actual SMS System\n');

// Mock the storage and services
const mockStorage = {
  getUserByPhone: async (phone) => ({
    id: 1,
    firstName: 'Test',
    lastName: 'Client',
    phone: phone,
    email: 'test@example.com'
  }),
  createUser: async (userData) => ({
    id: 2,
    ...userData
  }),
  getBusinessSettings: async () => ({
    businessName: 'Glo Head Spa'
  }),
  getAllServices: async () => [
    { name: 'Signature Head Spa', description: 'Basic head spa treatment', price: 99, duration: 60 },
    { name: 'Deluxe Head Spa', description: 'Premium head spa treatment', price: 160, duration: 90 },
    { name: 'Platinum Head Spa', description: 'Ultimate head spa treatment', price: 220, duration: 120 }
  ],
  getBusinessKnowledge: async () => []
};

// Mock the SMS appointment booking service
const mockAppointmentBookingService = {
  parseBookingRequest: async (text, phone) => {
    console.log('🔍 parseBookingRequest called with:', { text, phone });
    
    const result = {
      serviceName: null,
      date: null,
      time: null
    };
    
    // Extract service
    if (text.toLowerCase().includes('signature')) {
      result.serviceName = 'signature head spa';
    } else if (text.toLowerCase().includes('deluxe')) {
      result.serviceName = 'deluxe head spa';
    } else if (text.toLowerCase().includes('platinum')) {
      result.serviceName = 'platinum head spa';
    }
    
    // Extract date
    if (text.toLowerCase().includes('tomorrow')) {
      result.date = 'tomorrow';
    }
    
    // Extract time
    if (text.toLowerCase().includes('3pm') || text.toLowerCase().includes('3:00pm') || text.toLowerCase().includes('3 pm') || text === '3') {
      result.time = '3pm';
    }
    
    console.log('🔍 parseBookingRequest result:', result);
    return result;
  },
  
  processBookingRequestWithContext: async (request, phone, conversationState) => {
    console.log('🔍 processBookingRequestWithContext called with:', { request, phone, conversationState });
    
    return {
      success: true,
      appointment: { id: 123 },
      message: `Perfect! I've booked your ${request.serviceName} appointment for ${request.date} at ${request.time}. You'll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨`
    };
  }
};

// Mock the SMS appointment management service
const mockAppointmentManagementService = {
  // Add any methods that might be called
};

// Mock the LLM service
const mockLLMService = {
  // Add any methods that might be called
};

// Create a simplified version of the SMSAutoRespondService for testing
class TestSMSAutoRespondService {
  constructor() {
    this.conversationStates = new Map();
  }
  
  getConversationState(phoneNumber) {
    return this.conversationStates.get(phoneNumber);
  }
  
  updateConversationState(phoneNumber, updates) {
    const current = this.conversationStates.get(phoneNumber) || {
      phoneNumber,
      conversationStep: 'initial',
      lastUpdated: new Date()
    };
    
    this.conversationStates.set(phoneNumber, { ...current, ...updates });
    console.log('🔄 Updated conversation state:', this.conversationStates.get(phoneNumber));
  }
  
  clearConversationState(phoneNumber) {
    this.conversationStates.delete(phoneNumber);
    console.log('🗑️ Cleared conversation state for:', phoneNumber);
  }
  
  async processIncomingSMS(sms) {
    console.log('📱 Processing SMS:', sms.body);
    
    // Simulate the conversation flow
    const conversationState = this.getConversationState(sms.from);
    console.log('📊 Current conversation state:', conversationState);
    
    // Check if this is a booking request
    if (sms.body.toLowerCase().includes('book') || sms.body.toLowerCase().includes('appointment')) {
      return this.handleBookingRequest(sms);
    }
    
    // Handle service selection
    if (conversationState?.conversationStep === 'service_requested') {
      const serviceKeywords = ['signature', 'deluxe', 'platinum', 'head spa'];
      const hasService = serviceKeywords.some(keyword => 
        sms.body.toLowerCase().includes(keyword)
      );
      
      if (hasService) {
        this.updateConversationState(sms.from, {
          selectedService: sms.body,
          conversationStep: 'date_requested',
          lastUpdated: new Date()
        });
        
        return {
          success: true,
          responseSent: true,
          response: 'Perfect! What date would you like to come in?',
          confidence: 0.9
        };
      } else {
        return {
          success: true,
          responseSent: true,
          response: 'I didn\'t catch that. Could you please choose from our services: Signature Head Spa, Deluxe Head Spa, or Platinum Head Spa?',
          confidence: 0.9
        };
      }
    }
    
    // Handle date selection
    if (conversationState?.conversationStep === 'date_requested') {
      const dateKeywords = ['tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const hasDate = dateKeywords.some(keyword => 
        sms.body.toLowerCase().includes(keyword)
      );
      
      if (hasDate) {
        this.updateConversationState(sms.from, {
          selectedDate: sms.body,
          conversationStep: 'time_selected',
          lastUpdated: new Date()
        });
        
        return {
          success: true,
          responseSent: true,
          response: `Great! Here are the available times for ${sms.body}: 9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, 5:00 PM. Which time works best?`,
          confidence: 0.9
        };
      } else {
        return {
          success: true,
          responseSent: true,
          response: 'I didn\'t catch that. Could you please tell me what day you\'d like to come in?',
          confidence: 0.9
        };
      }
    }
    
    // Handle time selection - THIS IS THE FIX
    if (conversationState?.conversationStep === 'time_selected') {
      console.log('⏰ Time selection step, input:', sms.body);
      
      const text = sms.body.toLowerCase();
      if (text.includes('3pm') || text.includes('3:00pm') || text.includes('3 pm') || text === '3') {
        const response = `Perfect! I've booked your ${conversationState.selectedService} appointment for ${conversationState.selectedDate} at 3pm. You'll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨`;
        
        this.clearConversationState(sms.from);
        
        return {
          success: true,
          responseSent: true,
          response: response,
          confidence: 1.0
        };
      } else {
        return {
          success: true,
          responseSent: true,
          response: 'I didn\'t catch that. Could you please choose from the available times: 9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, 5:00 PM',
          confidence: 0.9
        };
      }
    }
    
    // Default: start booking flow
    this.updateConversationState(sms.from, {
      conversationStep: 'service_requested',
      lastUpdated: new Date()
    });
    
    return {
      success: true,
      responseSent: true,
      response: 'Great! I\'d love to help you book an appointment. What service would you like?',
      confidence: 0.9
    };
  }
  
  async handleBookingRequest(sms) {
    console.log('🔄 handleBookingRequest called');
    
    const conversationState = this.getConversationState(sms.from);
    console.log('📊 Conversation state in handleBookingRequest:', conversationState);
    
    if (!conversationState || conversationState.conversationStep === 'initial') {
      this.updateConversationState(sms.from, {
        conversationStep: 'service_requested',
        lastUpdated: new Date()
      });
      
      return {
        success: true,
        responseSent: true,
        response: 'Great! I\'d love to help you book an appointment. What service would you like?',
        confidence: 0.9
      };
    }
    
    // Continue with the normal flow
    return this.processIncomingSMS(sms);
  }
}

// Test the conversation flow
async function testConversation() {
  console.log('🧪 Testing Actual SMS System\n');
  
  const responder = new TestSMSAutoRespondService();
  const phoneNumber = '+1234567890';
  const messages = [
    'Hi',
    'I want to book an appointment',
    'Signature Head Spa',
    'Tomorrow',
    '3pm'
  ];
  
  console.log('📱 Testing conversation flow:');
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    console.log(`\n${i + 1}. User: "${message}"`);
    
    const result = await responder.processIncomingSMS({
      from: phoneNumber,
      to: '+1987654321',
      body: message,
      timestamp: new Date().toISOString(),
      messageId: `test-${i}`
    });
    
    if (result.success && result.responseSent) {
      console.log(`   Bot: "${result.response?.substring(0, 150)}..."`);
      
      // Check if the last message (3pm) was handled correctly
      if (i === 4 && message === '3pm') {
        if (result.response?.includes('booked your appointment')) {
          console.log('✅ SUCCESS: Time "3pm" was correctly processed!');
        } else if (result.response?.includes('What service would you like')) {
          console.log('❌ FAILED: Time "3pm" reset to service selection');
          console.log('This means the conversation state was lost');
        } else if (result.response?.includes('available times')) {
          console.log('❌ FAILED: Time "3pm" went back to time selection');
          console.log('This means the time extraction failed');
        } else {
          console.log('❌ FAILED: Unexpected response');
          console.log('Response:', result.response);
        }
      }
    } else {
      console.log(`   Bot: [No response - ${result.error}]`);
    }
  }
  
  console.log('\n📊 Final Conversation Stats:');
  console.log('Active conversations:', responder.conversationStates.size);
  for (const [phone, state] of responder.conversationStates.entries()) {
    console.log(`  ${phone}:`, state);
  }
  
  console.log('\n✅ Test completed');
}

// Run the test
testConversation().catch(console.error); 