import { LLMService } from './llm-service.js';
import { sendEmail } from './email.js';
export class AutoRespondService {
    constructor(storage) {
        this.storage = storage;
        this.llmService = new LLMService(storage);
        this.config = {
            enabled: true,
            confidenceThreshold: 0.7,
            maxResponseLength: 500,
            businessHoursOnly: false,
            businessHours: {
                start: "09:00",
                end: "17:00",
                timezone: "America/Chicago"
            },
            excludedKeywords: [
                "urgent", "emergency", "complaint", "refund", "cancel", "cancellation",
                "reschedule", "change", "modify", "asap", "immediately"
            ],
            excludedDomains: [
                "noreply", "donotreply", "no-reply", "mailer-daemon", "postmaster"
            ],
            autoRespondEmails: [
                "info@gloheadspa.com",
                "appointments@gloheadspa.com",
                "contact@gloheadspa.com"
            ]
        };
    }
    /**
     * Process an incoming email and determine if auto-response should be sent
     */
    async processIncomingEmail(email) {
        try {
            console.log('Processing incoming email for auto-response:', {
                from: email.from,
                subject: email.subject,
                timestamp: email.timestamp
            });
            // Validate required email fields
            if (!email.from || !email.to || !email.subject || !email.body) {
                return {
                    success: false,
                    responseSent: false,
                    error: "Missing required email fields (from, to, subject, or body)"
                };
            }
            // Check if auto-respond is enabled
            if (!this.config.enabled) {
                return {
                    success: true,
                    responseSent: false,
                    reason: "Auto-respond is disabled"
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
            // Check for excluded keywords
            if (this.containsExcludedKeywords(email.subject + ' ' + email.body)) {
                return {
                    success: true,
                    responseSent: false,
                    reason: "Contains excluded keywords"
                };
            }
            // Check for excluded domains
            if (this.isExcludedDomain(email.from)) {
                return {
                    success: true,
                    responseSent: false,
                    reason: "From excluded domain"
                };
            }
            // Check if email is to an auto-respond address
            if (!this.isAutoRespondEmail(email.to)) {
                return {
                    success: true,
                    responseSent: false,
                    reason: "Not sent to auto-respond email address"
                };
            }
            // Find or create client
            const client = await this.findOrCreateClient(email.from);
            if (!client) {
                return {
                    success: false,
                    responseSent: false,
                    error: "Could not find or create client"
                };
            }
            // Generate AI response
            const context = await this.buildContext(client, email);
            const llmResponse = await this.llmService.generateResponse(email.body, context, 'email');
            if (!llmResponse.success) {
                console.log('LLM response failed:', llmResponse.error);
                // If OpenAI is not configured, provide a basic fallback response
                if (llmResponse.error?.includes('OpenAI API key not configured')) {
                    console.log('Generating fallback response...');
                    const fallbackResponse = this.generateFallbackResponse(email.body, context);
                    console.log('Fallback response generated:', fallbackResponse.substring(0, 100) + '...');
                    return await this.sendFallbackResponse(email, fallbackResponse, client);
                }
                return {
                    success: false,
                    responseSent: false,
                    error: llmResponse.error
                };
            }
            // Check confidence threshold
            if ((llmResponse.confidence || 0) < this.config.confidenceThreshold) {
                return {
                    success: true,
                    responseSent: false,
                    confidence: llmResponse.confidence,
                    reason: "Confidence below threshold"
                };
            }
            // Truncate response if too long
            let response = llmResponse.message || '';
            if (response.length > this.config.maxResponseLength) {
                response = response.substring(0, this.config.maxResponseLength) + '...';
            }
            // Send auto-response
            const emailSent = await sendEmail({
                to: email.from,
                from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
                subject: `Re: ${email.subject}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Response from Glo Head Spa</h2>
            <p><strong>Your message:</strong></p>
            <p style="background-color: #f5f5f5; padding: 10px; border-left: 4px solid #ddd;">${email.body}</p>
            <p><strong>Our response:</strong></p>
            <p style="background-color: #e8f5e8; padding: 10px; border-left: 4px solid #4CAF50;">${response.replace(/\n/g, '<br>')}</p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              This is an automated response from our AI assistant. If you need immediate assistance, please call us directly.
            </p>
          </div>
        `
            });
            if (emailSent) {
                // Save conversation
                await this.llmService.saveConversation(client.id, email.body, response, 'email', {
                    suggestedActions: llmResponse.suggestedActions,
                    confidence: llmResponse.confidence,
                    autoResponded: true,
                    originalMessageId: email.messageId
                });
                console.log('Auto-response sent successfully:', {
                    to: email.from,
                    confidence: llmResponse.confidence,
                    responseLength: response.length
                });
                return {
                    success: true,
                    responseSent: true,
                    response,
                    confidence: llmResponse.confidence
                };
            }
            else {
                return {
                    success: false,
                    responseSent: false,
                    error: "Failed to send email"
                };
            }
        }
        catch (error) {
            console.error('Error processing incoming email for auto-response:', error);
            return {
                success: false,
                responseSent: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Find existing client by email or create new one
     */
    async findOrCreateClient(email) {
        try {
            // Try to find existing client
            const existingClient = await this.storage.getUserByEmail(email);
            if (existingClient && existingClient.role === 'client') {
                return existingClient;
            }
            // Create new client if not found
            const emailParts = email.split('@');
            const username = emailParts[0];
            const newClient = await this.storage.createUser({
                username: `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                email,
                password: Math.random().toString(36).substring(2, 12),
                role: 'client',
                firstName: username.charAt(0).toUpperCase() + username.slice(1),
                lastName: '',
                emailAccountManagement: true,
                emailAppointmentReminders: true,
                emailPromotions: true
            });
            console.log('Created new client from auto-respond:', newClient);
            return newClient;
        }
        catch (error) {
            console.error('Error finding/creating client:', error);
            return null;
        }
    }
    /**
     * Build context for LLM response generation
     */
    async buildContext(client, email) {
        const businessSettings = await this.storage.getBusinessSettings();
        const services = await this.storage.getAllServices();
        const staff = await this.storage.getAllStaff();
        const businessKnowledge = await this.storage.getBusinessKnowledge();
        const staffUsers = await Promise.all(staff.map(async (s) => {
            const user = await this.storage.getUser(s.userId);
            return {
                name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown',
                title: s.title,
                bio: s.bio || undefined
            };
        }));
        return {
            clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.username,
            clientEmail: client.email,
            clientPhone: client.phone || undefined,
            businessName: businessSettings?.businessName || 'Glo Head Spa',
            businessType: 'salon and spa',
            clientPreferences: {
                emailAccountManagement: client.emailAccountManagement || undefined,
                emailAppointmentReminders: client.emailAppointmentReminders || undefined,
                emailPromotions: client.emailPromotions || undefined,
                smsAccountManagement: client.smsAccountManagement || undefined,
                smsAppointmentReminders: client.smsAppointmentReminders || undefined,
                smsPromotions: client.smsPromotions || undefined,
            },
            availableServices: services.map(s => ({
                name: s.name,
                description: s.description || undefined,
                price: s.price,
                duration: s.duration
            })),
            availableStaff: staffUsers,
            businessKnowledge: businessKnowledge,
            originalEmail: {
                subject: email.subject,
                body: email.body,
                timestamp: email.timestamp
            }
        };
    }
    /**
     * Check if current time is within business hours
     */
    isWithinBusinessHours() {
        try {
            const now = new Date();
            const timezone = this.config.businessHours.timezone;
            // Convert current time to business timezone
            const businessTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
            const currentTime = businessTime.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });
            return currentTime >= this.config.businessHours.start &&
                currentTime <= this.config.businessHours.end;
        }
        catch (error) {
            console.error('Error checking business hours:', error);
            return true; // Default to allowing responses if time check fails
        }
    }
    /**
     * Check if email contains excluded keywords
     */
    containsExcludedKeywords(text) {
        const lowerText = text.toLowerCase();
        return this.config.excludedKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    }
    /**
     * Check if email is from excluded domain
     */
    isExcludedDomain(email) {
        if (!email || typeof email !== 'string')
            return false;
        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain)
            return false;
        return this.config.excludedDomains.some(excludedDomain => domain.includes(excludedDomain.toLowerCase()));
    }
    /**
     * Check if email is sent to an auto-respond address
     */
    isAutoRespondEmail(email) {
        if (!email || typeof email !== 'string')
            return false;
        const emailLower = email.toLowerCase();
        return this.config.autoRespondEmails.some(autoRespondEmail => autoRespondEmail.toLowerCase() === emailLower);
    }
    /**
     * Update auto-respond configuration
     */
    async updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('Auto-respond configuration updated:', this.config);
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Generate a fallback response when OpenAI is not configured
     */
    generateFallbackResponse(emailBody, context) {
        const lowerBody = emailBody.toLowerCase();
        const businessName = context.businessName || 'Glo Head Spa';
        // Simple keyword-based response generation
        if (lowerBody.includes('appointment') || lowerBody.includes('book') || lowerBody.includes('schedule')) {
            return `Thank you for your appointment inquiry! 

We'd be happy to help you schedule an appointment at ${businessName}. 

Please call us at our main number or visit our website to book your appointment. You can also reply to this email with your preferred date and time, and we'll get back to you as soon as possible.

Best regards,
The ${businessName} Team`;
        }
        if (lowerBody.includes('price') || lowerBody.includes('cost') || lowerBody.includes('how much')) {
            return `Thank you for your pricing inquiry!

Our service prices vary depending on the specific service and stylist. We'd be happy to provide you with a detailed price list.

Please call us or visit our website for current pricing information, or let us know what specific service you're interested in.

Best regards,
The ${businessName} Team`;
        }
        if (lowerBody.includes('hour') || lowerBody.includes('open') || lowerBody.includes('time')) {
            return `Thank you for your inquiry about our hours!

Our current business hours are:
Monday - Friday: 9:00 AM - 7:00 PM
Saturday: 9:00 AM - 6:00 PM
Sunday: 10:00 AM - 4:00 PM

We're closed on major holidays. Please call ahead to confirm availability.

Best regards,
The ${businessName} Team`;
        }
        // Default response
        return `Thank you for contacting ${businessName}!

We've received your message and will get back to you as soon as possible. For immediate assistance, please call us directly.

Best regards,
The ${businessName} Team`;
    }
    /**
     * Send fallback response when OpenAI is not available
     */
    async sendFallbackResponse(email, response, client) {
        try {
            // Send fallback response
            const emailSent = await sendEmail({
                to: email.from,
                from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
                subject: `Re: ${email.subject}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Response from ${client.businessName || 'Glo Head Spa'}</h2>
            <p><strong>Your message:</strong></p>
            <p style="background-color: #f5f5f5; padding: 10px; border-left: 4px solid #ddd;">${email.body}</p>
            <p><strong>Our response:</strong></p>
            <p style="background-color: #e8f5e8; padding: 10px; border-left: 4px solid #4CAF50;">${response.replace(/\n/g, '<br>')}</p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              This is an automated response. For immediate assistance, please call us directly.
            </p>
          </div>
        `
            });
            if (emailSent) {
                // Save conversation
                await this.llmService.saveConversation(client.id, email.body, response, 'email', {
                    suggestedActions: [],
                    confidence: 0.5,
                    autoResponded: true,
                    originalMessageId: email.messageId,
                    fallbackResponse: true
                });
                console.log('Fallback response sent successfully:', {
                    to: email.from,
                    responseLength: response.length
                });
                return {
                    success: true,
                    responseSent: true,
                    response,
                    confidence: 0.5
                };
            }
            else {
                return {
                    success: false,
                    responseSent: false,
                    error: "Failed to send fallback email"
                };
            }
        }
        catch (error) {
            console.error('Error sending fallback response:', error);
            return {
                success: false,
                responseSent: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get auto-respond statistics
     */
    async getStats() {
        try {
            // This would typically query a database table for auto-respond statistics
            // For now, return mock data
            return {
                totalProcessed: 0,
                responsesSent: 0,
                responsesBlocked: 0,
                averageConfidence: 0,
                topReasons: []
            };
        }
        catch (error) {
            console.error('Error getting auto-respond stats:', error);
            return null;
        }
    }
}
