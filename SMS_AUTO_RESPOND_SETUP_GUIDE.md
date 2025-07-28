# SMS Auto-Responder Setup Guide

This guide explains how to set up and configure the SMS auto-responder feature for your business.

## Overview

The SMS auto-responder automatically responds to incoming SMS messages using AI, similar to the email auto-responder but specifically designed for SMS communication.

## Prerequisites

1. **Twilio Account**: You need a Twilio account with:
   - Account SID
   - Auth Token
   - Twilio phone number

2. **Environment Variables**: Set these in your `.env` file:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

## Features

### Core Functionality
- **AI-Powered Responses**: Uses the same LLM service as email auto-responder
- **Confidence Threshold**: Only sends responses when AI confidence is above threshold
- **Business Hours**: Option to only respond during business hours
- **Character Limit**: Respects SMS 160-character limit
- **Keyword Filtering**: Exclude messages containing specific keywords
- **Phone Number Filtering**: Exclude specific phone numbers or only respond to specific numbers

### Configuration Options
- **Enable/Disable**: Toggle the entire system on/off
- **Confidence Threshold**: Set minimum AI confidence (0-100%)
- **Response Length**: Set maximum response length (50-500 characters)
- **Business Hours**: Configure start/end times and timezone
- **Excluded Keywords**: Words that prevent auto-response (e.g., "urgent", "emergency")
- **Excluded Phone Numbers**: Numbers that won't trigger auto-responses
- **Auto-Respond Numbers**: Specific numbers that should receive auto-responses

## Setup Instructions

### 1. Configure Twilio Webhook

1. Log into your Twilio Console
2. Go to Phone Numbers → Manage → Active numbers
3. Click on your Twilio phone number
4. In the "Messaging" section, set the webhook URL to:
   ```
   https://your-domain.com/api/webhook/incoming-sms
   ```
5. Set the HTTP method to POST

### 2. Access the Settings Interface

1. Navigate to the LLM settings in your application
2. Look for the "SMS Auto-Respond Settings" section
3. Configure the settings according to your business needs

### 3. Test the System

1. Use the test interface to send a sample SMS
2. Verify that auto-responses are working correctly
3. Check the statistics to monitor performance

## API Endpoints

### Configuration
- `GET /api/sms-auto-respond/config` - Get current configuration
- `PUT /api/sms-auto-respond/config` - Update configuration

### Statistics
- `GET /api/sms-auto-respond/stats` - Get performance statistics

### Testing
- `POST /api/sms-auto-respond/test` - Test with sample SMS data

### Webhook
- `POST /api/webhook/incoming-sms` - Twilio webhook endpoint

## Default Configuration

The system comes with these default settings:

```json
{
  "enabled": true,
  "confidenceThreshold": 0.7,
  "maxResponseLength": 500,
  "businessHoursOnly": false,
  "businessHours": {
    "start": "09:00",
    "end": "17:00",
    "timezone": "America/Chicago"
  },
  "excludedKeywords": [
    "urgent", "emergency", "complaint", "refund", "cancel", "cancellation",
    "reschedule", "change", "modify", "asap", "immediately", "help", "911"
  ],
  "excludedPhoneNumbers": [],
  "autoRespondPhoneNumbers": []
}
```

## Best Practices

### 1. Start Conservative
- Begin with a high confidence threshold (80-90%)
- Monitor responses before lowering the threshold
- Use business hours restriction initially

### 2. Keyword Management
- Add emergency-related keywords to excluded list
- Include complaint-related terms
- Consider industry-specific terms

### 3. Phone Number Management
- Add known spam numbers to excluded list
- Configure specific numbers for auto-response if needed
- Leave auto-respond numbers empty to respond to all

### 4. Response Length
- Keep responses under 500 characters for optimal SMS delivery
- Consider breaking longer responses into multiple messages if needed
- Test responses on actual phones

### 5. Monitoring
- Regularly check statistics
- Review blocked responses to understand why
- Adjust confidence threshold based on performance

## Troubleshooting

### Common Issues

1. **No Responses Being Sent**
   - Check if system is enabled
   - Verify confidence threshold isn't too high
   - Ensure phone number is in auto-respond list (if configured)

2. **Responses Too Long**
   - Reduce maxResponseLength setting
   - Check AI prompt for length constraints

3. **Wrong Responses**
   - Increase confidence threshold
   - Add problematic keywords to excluded list
   - Review business context in LLM service

4. **Webhook Not Working**
   - Verify Twilio webhook URL is correct
   - Check server logs for errors
   - Ensure webhook endpoint is accessible

### Debug Mode

Enable debug logging by checking the server console for:
- Incoming SMS processing logs
- AI response generation logs
- SMS sending results
- Configuration updates

## Security Considerations

1. **Webhook Security**: Consider implementing webhook signature validation
2. **Rate Limiting**: Implement rate limiting on webhook endpoints
3. **Phone Number Validation**: Validate incoming phone numbers
4. **Response Content**: Monitor AI responses for inappropriate content

## Integration with Existing Systems

The SMS auto-responder integrates with:
- **LLM Service**: Uses same AI model as email auto-responder
- **Storage Service**: Logs responses and statistics
- **Client Management**: Creates client records for new phone numbers
- **Business Settings**: Uses business information for context

## Support

For issues or questions:
1. Check the server logs for error messages
2. Verify Twilio configuration
3. Test with the built-in test interface
4. Review this documentation

## Future Enhancements

Potential improvements:
- Multi-language support
- Template-based responses
- Integration with appointment booking
- Advanced analytics and reporting
- Custom response templates
- A/B testing for responses 