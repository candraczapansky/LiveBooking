import { LLMService } from './llm-service.js';
export class SMSSimpleResponder {
    constructor(storage) {
        this.conversations = new Map();
        this.storage = storage;
        this.llmService = new LLMService(storage);
    }
    async processSMS(sms) {
        try {
            console.log('📱 Processing:', sms.body);
            // Get or create conversation
            const conversation = this.getConversation(sms.from);
            // Determine what to do based on message content
            const response = await this.getResponse(sms.body, conversation);
            // Update conversation
            this.updateConversation(sms.from, conversation);
            console.log('📤 Response:', response.substring(0, 100) + '...');
            return {
                success: true,
                responseSent: true,
                response
            };
        }
        catch (error) {
            console.error('❌ Error:', error);
            return {
                success: false,
                responseSent: false,
                error: error.message
            };
        }
    }
    getConversation(phoneNumber) {
        let conversation = this.conversations.get(phoneNumber);
        if (!conversation) {
            conversation = {
                phoneNumber,
                step: 'start',
                lastMessage: ''
            };
        }
        return conversation;
    }
    updateConversation(phoneNumber, conversation) {
        this.conversations.set(phoneNumber, conversation);
    }
    async getResponse(message, conversation) {
        const text = message.toLowerCase().trim();
        console.log('🔍 Processing message:', { text, currentStep: conversation.step });
        // Handle greetings
        if (this.isGreeting(text)) {
            return 'Hey there! Welcome to Glo Head Spa! How can I help you today? 💆‍♀️✨';
        }
        // Handle business questions
        if (this.isBusinessQuestion(text)) {
            return await this.handleBusinessQuestion(text);
        }
        // Handle reschedule/cancel
        if (this.isReschedule(text)) {
            return 'I\'d be happy to help you reschedule your appointment. Please call us at 9189325396 and we\'ll get that sorted out for you right away! 📞';
        }
        if (this.isCancel(text)) {
            return 'I\'d be happy to help you cancel your appointment. Please call us at 9189325396 and we\'ll take care of that for you right away! 📞';
        }
        // Handle booking flow - ALWAYS go to booking flow if we're not in start step
        if (conversation.step !== 'start') {
            console.log('🔄 Going to booking flow because step is:', conversation.step);
            return this.handleBookingFlow(text, conversation);
        }
        // Handle booking-related messages only if we're in start step
        if (this.isBookingRelated(text)) {
            console.log('🔄 Going to booking flow because message is booking-related');
            return this.handleBookingFlow(text, conversation);
        }
        // Default response
        return 'Thank you for your message! How can I help you today? 💆‍♀️✨';
    }
    isGreeting(text) {
        const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
        return greetings.includes(text);
    }
    isBusinessQuestion(text) {
        const questions = [
            'how much', 'cost', 'price', 'pricing',
            'what services', 'services do you offer',
            'when are you open', 'what are your hours',
            'where are you', 'what\'s your address'
        ];
        return questions.some(q => text.includes(q));
    }
    isBookingRelated(text) {
        const booking = ['book', 'appointment', 'schedule', 'reserve', 'want to book', 'need appointment'];
        const times = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const timePatterns = [/\d{1,2}:\d{2}/, /\d{1,2}\s*(am|pm)/i, /\d{1,2}pm/i, /\d{1,2}am/i];
        return booking.some(b => text.includes(b)) ||
            times.some(t => text.includes(t)) ||
            timePatterns.some(p => p.test(text));
    }
    isReschedule(text) {
        const keywords = ['reschedule', 'change appointment', 'move appointment'];
        return keywords.some(k => text.includes(k));
    }
    isCancel(text) {
        const keywords = ['cancel', 'cancellation', 'can\'t make it'];
        return keywords.some(k => text.includes(k));
    }
    async handleBusinessQuestion(text) {
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
    handleBookingFlow(text, conversation) {
        console.log('🔄 handleBookingFlow:', { text, step: conversation.step, service: conversation.service, date: conversation.date });
        // Step 1: Ask for service
        if (conversation.step === 'start') {
            conversation.step = 'service';
            return 'Great! I\'d love to help you book an appointment. What service would you like?\n\nOur services include:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nJust let me know which service you\'d like to book! 💆‍♀️✨';
        }
        // Step 2: Handle service selection
        if (conversation.step === 'service') {
            const service = this.extractService(text);
            if (service) {
                conversation.service = service;
                conversation.step = 'date';
                return 'Perfect! What date would you like to come in? You can say "tomorrow", "Friday", or any day that works for you. 📅';
            }
            else {
                return 'I didn\'t catch that. Could you please choose from our services:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)';
            }
        }
        // Step 3: Handle date selection
        if (conversation.step === 'date') {
            const date = this.extractDate(text);
            if (date) {
                conversation.date = date;
                conversation.step = 'time';
                return `Great! Here are the available times for ${date}:\n\n• 9:00 AM\n• 11:00 AM\n• 1:00 PM\n• 3:00 PM\n• 5:00 PM\n\nWhich time works best for you? ⏰`;
            }
            else {
                return 'I didn\'t catch that. Could you please tell me what day you\'d like to come in? You can say "tomorrow", "Friday", or any specific day. 📅';
            }
        }
        // Step 4: Handle time selection - FIXED
        if (conversation.step === 'time') {
            console.log('⏰ Time selection step, input:', text);
            // Check for time patterns directly - FIXED LOGIC
            if (text.includes('3pm') || text.includes('3:00pm') || text.includes('3 pm') || text === '3') {
                conversation.time = '3pm';
                conversation.step = 'complete';
                return `Perfect! I've booked your ${conversation.service} appointment for ${conversation.date} at 3pm. You'll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨`;
            }
            else if (text.includes('9am') || text.includes('9:00am') || text.includes('9 am') || text === '9') {
                conversation.time = '9am';
                conversation.step = 'complete';
                return `Perfect! I've booked your ${conversation.service} appointment for ${conversation.date} at 9am. You'll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨`;
            }
            else if (text.includes('11am') || text.includes('11:00am') || text.includes('11 am') || text === '11') {
                conversation.time = '11am';
                conversation.step = 'complete';
                return `Perfect! I've booked your ${conversation.service} appointment for ${conversation.date} at 11am. You'll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨`;
            }
            else if (text.includes('1pm') || text.includes('1:00pm') || text.includes('1 pm') || text === '1') {
                conversation.time = '1pm';
                conversation.step = 'complete';
                return `Perfect! I've booked your ${conversation.service} appointment for ${conversation.date} at 1pm. You'll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨`;
            }
            else if (text.includes('5pm') || text.includes('5:00pm') || text.includes('5 pm') || text === '5') {
                conversation.time = '5pm';
                conversation.step = 'complete';
                return `Perfect! I've booked your ${conversation.service} appointment for ${conversation.date} at 5pm. You'll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨`;
            }
            else {
                return 'I didn\'t catch that. Could you please choose from the available times:\n• 9:00 AM\n• 11:00 AM\n• 1:00 PM\n• 3:00 PM\n• 5:00 PM';
            }
        }
        // If we get here, something went wrong - reset to start
        console.log('⚠️ Unexpected step:', conversation.step);
        conversation.step = 'start';
        return 'Great! I\'d love to help you book an appointment. What service would you like?\n\nOur services include:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nJust let me know which service you\'d like to book! 💆‍♀️✨';
    }
    extractService(text) {
        const services = ['signature head spa', 'deluxe head spa', 'platinum head spa'];
        for (const service of services) {
            if (text.includes(service)) {
                return service;
            }
        }
        return null;
    }
    extractDate(text) {
        const dates = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        for (const date of dates) {
            if (text.includes(date)) {
                return date;
            }
        }
        return null;
    }
    extractTime(text) {
        console.log('🔍 extractTime called with:', text);
        // Handle various time formats
        const timePatterns = [
            /(\d{1,2}):?(\d{2})?\s*(am|pm)/i, // 3pm, 3:00pm, 3:30pm
            /(\d{1,2})\s*(am|pm)/i, // 3 pm, 3 am
            /(\d{1,2}):(\d{2})/i, // 15:30, 3:30
            /(\d{1,2})/ // 3 (assume PM)
        ];
        for (const pattern of timePatterns) {
            const match = text.match(pattern);
            if (match) {
                let time = match[0];
                console.log('⏰ Pattern match:', { pattern: pattern.toString(), match: time });
                // If it's just a number, assume PM
                if (/^\d{1,2}$/.test(time)) {
                    time = time + 'pm';
                    console.log('⏰ Added PM to number:', time);
                }
                // Normalize format
                time = time.replace(/\s+/g, '').toLowerCase();
                console.log('⏰ Normalized time:', time);
                return time;
            }
        }
        console.log('⏰ No time pattern matched');
        return null;
    }
    // Public methods for management
    clearConversation(phoneNumber) {
        this.conversations.delete(phoneNumber);
    }
    getConversationStats() {
        return {
            activeConversations: this.conversations.size,
            conversations: Array.from(this.conversations.entries()).map(([phone, conv]) => ({
                phone,
                step: conv.step,
                service: conv.service,
                date: conv.date,
                time: conv.time
            }))
        };
    }
}
