# Structured SMS Assistant Guide

## Overview

The Structured SMS Assistant is an automated SMS booking system that guides users through a step-by-step appointment booking process. It follows a strict conversation workflow and uses function calling to handle availability checks and appointment booking.

## Core Features

### 1. Structured Conversation Flow
The assistant follows an exact 8-step process:

1. **Greeting & Task Identification** - Confirms ability to help with booking
2. **Get Service** - Asks user what service they want to book
3. **Get Date** - Asks for preferred date
4. **Get Available Times** - Calls `get_available_times()` function
5. **Get Chosen Time** - Asks user to select from available times
6. **Get Client Information** - Collects name, email, and phone
7. **Confirm Details** - Summarizes and asks for confirmation
8. **Book Appointment** - Calls `book_appointment()` function

### 2. Function Calling System
The assistant has access to two key functions:

#### `get_available_times(service, date)`
- **Purpose**: Fetches available appointment times for a specific service on a given date
- **Returns**: List of time slots (e.g., ["9:00 AM", "10:30 AM", "2:00 PM"]) or empty list if none available
- **Usage**: Called automatically when service and date are collected

#### `book_appointment(service, date, time, fullName, email, phone)`
- **Purpose**: Books the appointment and creates client profile
- **Returns**: Success or failure message
- **Usage**: Called after all information is collected and confirmed

### 3. Behavioral Rules
- **One Question at a Time**: Never asks for multiple pieces of information simultaneously
- **Invalid Input Handling**: Gently corrects and re-asks questions for invalid input
- **Clarity**: Always explicit about what information is needed next
- **Friendly Tone**: Maintains warm, helpful communication throughout

## Implementation Details

### File Structure
```
server/
├── sms-structured-assistant.ts    # Main assistant implementation
├── routes.ts                      # Webhook route integration
└── sms-appointment-booking.ts    # Existing booking service (used by assistant)
```

### Key Components

#### SMSStructuredAssistant Class
- **Location**: `server/sms-structured-assistant.ts`
- **Purpose**: Main assistant logic and conversation state management
- **Features**:
  - Conversation state tracking per phone number
  - Step-by-step workflow execution
  - Function calling integration
  - SMS response handling

#### Webhook Integration
- **Route**: `POST /api/webhook/structured-sms`
- **Purpose**: Receives incoming SMS from Twilio
- **Response**: Returns TwiML for Twilio compatibility

### Conversation State Management
```typescript
interface ConversationState {
  phoneNumber: string;
  step: 'greeting' | 'get_service' | 'get_date' | 'get_available_times' | 
        'get_chosen_time' | 'get_client_info' | 'confirm_details' | 
        'book_appointment' | 'completed';
  service?: string;
  date?: string;
  availableTimes?: string[];
  chosenTime?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  lastUpdated: Date;
}
```

## Usage Examples

### Complete Booking Flow

**User**: "Hi, I want to book an appointment"
**Assistant**: "Hi! I'm your automated appointment booking assistant. I can help you book an appointment. What service would you like to book?"

**User**: "I want the signature head spa"
**Assistant**: "Great! You'd like to book a signature head spa. What day works best for you?"

**User**: "tomorrow"
**Assistant**: "Perfect! You'd like to come in on tomorrow. Let me check what times are available for you."

*[Function call: get_available_times("signature head spa", "tomorrow")]*

**Assistant**: "Great! Here are the available times for signature head spa on tomorrow: 9:00 AM, 11:00 AM, 2:00 PM. Which time works for you?"

**User**: "9:00 AM"
**Assistant**: "Perfect! You've chosen 9:00 AM. Now I need your contact information to complete the booking. What's your full name?"

**User**: "John Smith"
**Assistant**: "Thanks John Smith! What's your email address?"

**User**: "john.smith@email.com"
**Assistant**: "Great! And what's your phone number?"

**User**: "+1234567890"
**Assistant**: "Great! Just to confirm: you'd like to book a signature head spa on tomorrow at 9:00 AM. And the details I have for you are Name: John Smith, Email: john.smith@email.com, Phone: +1234567890. Is all of that correct?"

**User**: "yes, that's correct"
**Assistant**: "Perfect! I'm booking your appointment now."

*[Function call: book_appointment("signature head spa", "tomorrow", "9:00 AM", "John Smith", "john.smith@email.com", "+1234567890")]*

**Assistant**: "You're all set! Your appointment is confirmed, and we've sent a confirmation to your email. We look forward to seeing you!"

## Configuration

### Twilio Webhook Setup
1. Configure your Twilio phone number webhook URL:
   ```
   https://your-domain.com/api/webhook/structured-sms
   ```

2. Set the webhook method to POST

### Environment Variables
Ensure these are configured in your environment:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

## Testing

### Manual Testing
Use the test script to verify functionality:
```bash
node test-structured-sms-assistant.js
```

### Webhook Testing
Test the webhook endpoint directly:
```bash
curl -X POST https://your-domain.com/api/webhook/structured-sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B1234567890&To=%2B1987654321&Body=Hi%20I%20want%20to%20book%20an%20appointment"
```

## Error Handling

### Invalid Input Scenarios
- **Unknown Service**: "I'm sorry, I don't recognize that service. We offer Signature Head Spa ($99), Deluxe Head Spa ($160), and Platinum Head Spa ($220). Which would you like?"
- **Invalid Date**: "I need a valid date. You can say 'tomorrow', 'Friday', or a specific date like 'August 15th'. What day works for you?"
- **Invalid Time**: "Please choose one of the available times: 9:00 AM, 11:00 AM, 2:00 PM."

### System Errors
- **Availability Check Failed**: "I encountered an error checking availability. Please try again or call us directly."
- **Booking Failed**: "I'm sorry, there was an error booking your appointment. Please try again or call us at our main number."

## Integration with Existing System

### Leverages Existing Services
- **SMSAppointmentBookingService**: Uses existing booking logic and availability checking
- **Storage Interface**: Integrates with existing database operations
- **SMS Service**: Uses existing SMS sending functionality

### Maintains Compatibility
- Works alongside existing SMS auto-responder
- Uses same database schema and business logic
- Compatible with existing appointment management system

## Security Considerations

### Input Validation
- All user input is validated before processing
- Date and time parsing includes error handling
- Service names are validated against allowed list

### Data Protection
- Client information is handled securely
- Phone numbers are validated before storage
- Email addresses are validated for format

## Monitoring and Logging

### Log Messages
The system logs key events:
- `📱 Processing SMS from [phone]: "[message]"`
- `📊 Current conversation state: [step]`
- `🔍 Getting available times for [service] on [date]`
- `📞 Booking appointment: [details]`
- `📤 Sent SMS to [phone]: "[message]"`

### Health Monitoring
Monitor the webhook endpoint for:
- Response times
- Error rates
- Success rates
- Conversation completion rates

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Messages**
   - Verify Twilio webhook URL configuration
   - Check server logs for incoming requests
   - Test webhook endpoint directly

2. **Function Calls Failing**
   - Check database connectivity
   - Verify service and staff data exists
   - Review appointment booking service logs

3. **Conversation State Issues**
   - Check for memory leaks in conversation state
   - Verify phone number formatting
   - Review conversation state cleanup

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG_SMS_ASSISTANT=true
```

## Future Enhancements

### Planned Features
- **Multi-language Support**: Add support for Spanish and other languages
- **Advanced Date Parsing**: Better handling of relative dates and natural language
- **Integration with Calendar**: Direct calendar integration for availability
- **Payment Integration**: Accept payment information via SMS
- **Appointment Management**: Allow rescheduling and cancellation via SMS

### Scalability Considerations
- **Redis Integration**: Move conversation state to Redis for multi-server deployment
- **Queue System**: Implement message queuing for high-volume scenarios
- **Analytics**: Add detailed conversation analytics and reporting

## Support

For technical support or questions about the Structured SMS Assistant:
1. Check the server logs for error messages
2. Review the conversation state for stuck conversations
3. Test the webhook endpoint directly
4. Verify Twilio configuration and webhook URLs

The Structured SMS Assistant provides a robust, user-friendly way to automate appointment booking through SMS, following the exact workflow specifications while maintaining compatibility with your existing salon management system. 