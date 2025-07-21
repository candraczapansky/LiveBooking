# LLM Messaging Setup Guide

## Overview
The LLM (Large Language Model) messaging feature allows your salon to automatically generate intelligent responses to client messages using AI. This feature integrates with your existing email and SMS infrastructure to provide personalized, context-aware responses.

## Features

### 🤖 AI-Powered Responses
- Generate intelligent responses to client inquiries
- Context-aware messaging based on client history and preferences
- Support for both email and SMS channels
- Confidence scoring for response quality

### 📊 Smart Suggestions
- Suggested actions based on client messages
- Appointment booking recommendations
- Service information requests
- Follow-up scheduling suggestions

### 📈 Analytics & Insights
- Response confidence tracking
- Channel usage analytics
- Conversation history
- Performance metrics

## Setup Instructions

### 1. OpenAI API Configuration

To use the LLM messaging feature, you need an OpenAI API key:

1. **Get an OpenAI API Key:**
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Create an account or sign in
   - Navigate to "API Keys" section
   - Create a new API key

2. **Add to Environment Variables:**
   - In your Replit workspace, go to the "Secrets" tab
   - Add a new secret:
     - **Key**: `OPENAI_API_KEY`
     - **Value**: Your OpenAI API key

### 2. Configure Business Information

The AI uses your business information to provide accurate responses:

1. **Go to Settings → Business**
2. **Update your business information:**
   - Business name
   - Business type/description
   - Contact information
   - Services offered

### 3. Set Up Client Communication Preferences

Ensure client communication preferences are configured:

1. **Go to Clients page**
2. **For each client, verify:**
   - Email preferences (Account Management, Appointment Reminders, Promotions)
   - SMS preferences (Account Management, Appointment Reminders, Promotions)
   - Contact information (email, phone)

## How to Use

### Accessing the AI Messaging Center

1. **Navigate to AI Messaging** in the sidebar
2. **Click "New AI Response"** to start a conversation

### Creating an AI Response

1. **Select a Client:**
   - Choose from your client list
   - The AI will use client history and preferences

2. **Choose Channel:**
   - **Email**: For detailed responses with formatting
   - **SMS**: For concise, direct messages

3. **Enter Client Message:**
   - Type or paste the client's inquiry
   - Be specific about what they're asking

4. **Generate Response:**
   - Click "Generate AI Response"
   - Review the generated response
   - Check confidence score and suggested actions

5. **Send Response:**
   - Review and edit if needed
   - Click "Send" to deliver via email or SMS

### Understanding Confidence Scores

- **90%+ (Green)**: High confidence, ready to send
- **70-89% (Yellow)**: Medium confidence, review recommended
- **<70% (Red)**: Low confidence, manual review required

### Suggested Actions

The AI may suggest actions like:
- **Book Appointment**: Schedule a consultation or service
- **Send Info**: Provide service brochures or pricing
- **Follow Up**: Schedule a call or reminder
- **Escalate**: Transfer to human staff

## Best Practices

### For Best Results:

1. **Provide Context:**
   - Include relevant client history
   - Mention specific services or staff
   - Reference previous conversations

2. **Review Responses:**
   - Always review AI-generated responses
   - Edit for tone and accuracy
   - Ensure business-specific information is correct

3. **Monitor Performance:**
   - Check confidence scores
   - Review analytics regularly
   - Adjust business information as needed

### Common Use Cases:

1. **Appointment Inquiries:**
   - "I'd like to book a haircut"
   - "What's your availability this week?"
   - "Can I reschedule my appointment?"

2. **Service Questions:**
   - "What services do you offer?"
   - "How much does hair coloring cost?"
   - "Do you have any specials?"

3. **General Inquiries:**
   - "What are your hours?"
   - "Do you accept walk-ins?"
   - "Where are you located?"

## Troubleshooting

### Common Issues:

1. **"OpenAI API key not configured"**
   - Ensure `OPENAI_API_KEY` is set in environment variables
   - Check that the API key is valid and has credits

2. **Low confidence scores**
   - Update business information in settings
   - Provide more context in client messages
   - Ensure services and staff information is complete

3. **Responses not sending**
   - Check email/SMS configuration
   - Verify client contact information
   - Ensure communication preferences are enabled

### Getting Help:

- Check the analytics tab for performance insights
- Review conversation history for patterns
- Contact support if issues persist

## Security & Privacy

- All conversations are logged for quality improvement
- Client data is handled according to your privacy policy
- API calls are made securely to OpenAI
- No sensitive information is stored by third parties

## Cost Considerations

- OpenAI API usage incurs costs based on token usage
- Monitor usage in your OpenAI dashboard
- Consider setting usage limits for cost control
- Typical costs are minimal for small to medium businesses

---

**Note:** The AI messaging feature is designed to assist your staff, not replace human interaction. Always review and approve responses before sending to ensure they align with your business standards and client relationships. 