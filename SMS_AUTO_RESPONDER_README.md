# SMS Auto-Responder Feature

## 🎉 Feature Complete!

The SMS auto-responder is now fully integrated into your salon management system. This feature automatically responds to incoming SMS messages using AI, just like your email auto-responder.

## 📁 Files Created/Modified

### New Files
- `server/sms-auto-respond-service.ts` - Core SMS auto-responder service
- `client/src/components/llm/sms-auto-respond-settings.tsx` - Frontend settings component
- `setup-twilio-sms.js` - Twilio configuration script
- `test-sms-auto-responder.js` - Testing script
- `SMS_AUTO_RESPOND_SETUP_GUIDE.md` - Detailed setup guide
- `SMS_AUTO_RESPONDER_README.md` - This file

### Modified Files
- `server/routes.ts` - Added SMS auto-responder API routes
- `client/src/pages/ai-messaging.tsx` - Added SMS auto-responder tab
- `package.json` - Added setup and test scripts

## 🚀 Quick Start

### 1. Set Up Twilio (One-time setup)

```bash
# Run the setup script
npm run setup-sms
```

This will:
- Prompt for your Twilio credentials
- Update your `.env` file
- Provide instructions for webhook configuration

### 2. Configure Twilio Webhook

1. Log into [Twilio Console](https://console.twilio.com)
2. Go to Phone Numbers → Manage → Active numbers
3. Click your phone number
4. Set webhook URL to: `https://your-domain.com/api/webhook/incoming-sms`
5. Set HTTP method to: POST
6. Save configuration

### 3. Access the Settings

1. Go to your AI Messaging page
2. Click the "SMS Auto-Respond" tab
3. Configure your settings
4. Test the system

### 4. Test the System

```bash
# Test the SMS auto-responder
npm run test-sms
```

## 🎯 Features

### ✅ Core Functionality
- **AI-Powered Responses** - Uses your existing LLM service
- **Confidence Thresholds** - Only responds when AI is confident
- **Business Hours** - Respects your business schedule
- **SMS Character Limits** - Respects 160-character SMS limit
- **Keyword Filtering** - Excludes urgent/emergency messages
- **Phone Number Management** - Filter by specific numbers

### ✅ Configuration Options
- **Enable/Disable** - Toggle the entire system
- **Confidence Threshold** - Set minimum AI confidence (0-100%)
- **Response Length** - Set maximum response length (50-500 characters)
- **Business Hours** - Configure start/end times and timezone
- **Excluded Keywords** - Words that prevent auto-response
- **Excluded Phone Numbers** - Numbers that won't trigger auto-responses
- **Auto-Respond Numbers** - Specific numbers that should receive auto-responses

### ✅ Testing & Monitoring
- **Built-in Test Interface** - Test with sample SMS messages
- **Statistics Dashboard** - Monitor performance metrics
- **Webhook Testing** - Verify Twilio integration
- **Comprehensive Logging** - Debug and troubleshoot issues

## 🔧 API Endpoints

### Configuration
- `GET /api/sms-auto-respond/config` - Get current configuration
- `PUT /api/sms-auto-respond/config` - Update configuration

### Statistics
- `GET /api/sms-auto-respond/stats` - Get performance statistics

### Testing
- `POST /api/sms-auto-respond/test` - Test with sample SMS data

### Webhook
- `POST /api/webhook/incoming-sms` - Twilio webhook endpoint

## 📊 Default Configuration

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

## 🧪 Testing

### Manual Testing
1. Go to AI Messaging → SMS Auto-Respond tab
2. Use the test interface to send sample SMS messages
3. Check that auto-responses are sent correctly
4. Verify statistics are updated

### Automated Testing
```bash
# Test all endpoints and functionality
npm run test-sms

# Test with custom base URL
BASE_URL=https://your-domain.com npm run test-sms

# Test with custom phone number
TEST_PHONE=+1234567890 npm run test-sms
```

### Test Scenarios
The test script covers:
- Configuration endpoint accessibility
- Statistics endpoint functionality
- SMS auto-respond processing
- Webhook endpoint (Twilio simulation)
- Different message types (appointments, pricing, hours, urgent)

## 🔒 Security Considerations

### Webhook Security
- Consider implementing webhook signature validation
- Add rate limiting to webhook endpoints
- Monitor webhook logs for suspicious activity

### Phone Number Validation
- All incoming phone numbers are validated
- Test numbers (555-XXXX) are automatically filtered
- Invalid numbers are rejected

### Response Content
- AI responses are monitored for inappropriate content
- Confidence thresholds prevent low-quality responses
- Business context ensures relevant responses

## 📈 Monitoring & Analytics

### Statistics Dashboard
- Total messages processed
- Responses sent vs blocked
- Average confidence scores
- Top reasons for blocked responses

### Logging
- All SMS processing is logged
- AI response generation is tracked
- Error conditions are recorded
- Performance metrics are collected

## 🛠️ Troubleshooting

### Common Issues

**No Responses Being Sent**
- Check if system is enabled
- Verify confidence threshold isn't too high
- Ensure phone number is in auto-respond list (if configured)

**Responses Too Long**
- Reduce maxResponseLength setting
- Check AI prompt for length constraints

**Wrong Responses**
- Increase confidence threshold
- Add problematic keywords to excluded list
- Review business context in LLM service

**Webhook Not Working**
- Verify Twilio webhook URL is correct
- Check server logs for errors
- Ensure webhook endpoint is accessible

### Debug Mode
Enable debug logging by checking the server console for:
- Incoming SMS processing logs
- AI response generation logs
- SMS sending results
- Configuration updates

## 🔄 Integration with Existing Systems

The SMS auto-responder integrates seamlessly with:
- **LLM Service** - Uses same AI model as email auto-responder
- **Storage Service** - Logs responses and statistics
- **Client Management** - Creates client records for new phone numbers
- **Business Settings** - Uses business information for context
- **Email Auto-Responder** - Shares configuration patterns and UI

## 🚀 Performance Optimization

### Best Practices
1. **Start Conservative** - Begin with high confidence threshold (80-90%)
2. **Monitor Responses** - Review blocked responses to understand why
3. **Adjust Settings** - Fine-tune based on performance data
4. **Keyword Management** - Add emergency-related keywords to excluded list
5. **Phone Number Management** - Add known spam numbers to excluded list

### Optimization Tips
- Keep responses under 160 characters for single SMS
- Consider breaking longer responses into multiple messages
- Test responses on actual phones
- Regularly check statistics and adjust settings

## 📚 Documentation

- `SMS_AUTO_RESPOND_SETUP_GUIDE.md` - Detailed setup instructions
- `AUTO_RESPOND_SETUP_GUIDE.md` - Email auto-responder guide (similar patterns)
- Twilio Documentation - [Webhook Configuration](https://www.twilio.com/docs/messaging/guides/webhook-request)

## 🎯 Next Steps

1. **Configure Twilio** - Run `npm run setup-sms`
2. **Set up Webhook** - Configure in Twilio Console
3. **Test the System** - Run `npm run test-sms`
4. **Monitor Performance** - Check statistics dashboard
5. **Fine-tune Settings** - Adjust based on real usage

## 🆘 Support

For issues or questions:
1. Check the server logs for error messages
2. Verify Twilio configuration
3. Test with the built-in test interface
4. Review this documentation
5. Check the setup guide for detailed instructions

## 🎉 Success!

Your SMS auto-responder is now ready to automatically handle incoming SMS messages with intelligent AI responses. The system will help you provide better customer service while reducing manual workload.

---

**Note**: This feature follows the same patterns as your existing email auto-responder, so it will feel familiar and integrate seamlessly with your current system. All existing working code remains unchanged, and this new functionality is completely separate and optional. 