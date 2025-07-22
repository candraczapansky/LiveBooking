# Auto-Respond Setup Guide

## Overview
The Auto-Respond feature allows your salon to automatically generate and send AI-powered responses to incoming client emails. This feature integrates with your existing LLM system and email infrastructure to provide intelligent, context-aware responses without manual intervention.

## Features

### 🤖 Automatic Email Processing
- Automatically processes incoming emails via webhook
- Generates intelligent responses using your business knowledge
- Sends responses back to clients immediately
- Tracks conversation history and performance

### ⚙️ Smart Configuration
- Confidence threshold controls response quality
- Business hours restrictions
- Keyword and domain exclusions
- Customizable response length limits

### 📊 Analytics & Monitoring
- Response success/failure tracking
- Confidence score monitoring
- Blocked response reasons
- Performance statistics

## Setup Instructions

### 1. Enable Auto-Respond in AI Messaging

1. **Navigate to AI Messaging** in your salon management system
2. **Click the "Auto-Respond" tab**
3. **Enable the feature** by toggling "Enable Auto-Respond"
4. **Configure your settings** (see Configuration section below)

### 2. Configure Email Webhook (SendGrid Inbound Parse)

To receive incoming emails automatically, you need to set up SendGrid's Inbound Parse:

#### Step 1: Configure SendGrid Inbound Parse

1. **Log into your SendGrid account**
2. **Go to Settings → Inbound Parse**
3. **Click "Add Host & URL"**
4. **Configure the settings:**
   - **Hostname**: `mail.yourdomain.com` (or your preferred subdomain)
   - **URL**: `https://your-replit-domain.replit.app/api/webhook/incoming-email`
   - **Check "POST the raw, full MIME message"**
   - **Check "Send raw, full MIME message"**
   - **Click "Save"**

#### Step 2: Configure DNS Records

Add these DNS records to your domain:

```
Type: MX
Name: mail (or your preferred subdomain)
Value: mx.sendgrid.net
Priority: 10
TTL: 3600
```

```
Type: CNAME
Name: mail (or your preferred subdomain)
Value: sendgrid.net
TTL: 3600
```

#### Step 3: Test the Webhook

1. **Send a test email** to `test@mail.yourdomain.com`
2. **Check your app logs** for webhook receipt
3. **Verify auto-response** was sent back

### 3. Configuration Options

#### Basic Settings

- **Enable Auto-Respond**: Master toggle for the feature
- **Confidence Threshold**: Minimum AI confidence required (70% recommended)
- **Maximum Response Length**: Character limit for responses (500 recommended)

#### Business Hours

- **Business Hours Only**: Restrict responses to business hours
- **Start Time**: When business hours begin (e.g., 09:00)
- **End Time**: When business hours end (e.g., 17:00)

#### Auto-Respond Email Addresses

- **Auto-Respond Emails**: Only emails sent to these addresses will trigger auto-responses
  - Add your main business email addresses (e.g., `info@yourbusiness.com`)
  - Common addresses: `info@`, `contact@`, `appointments@`, `support@`
  - These must match the addresses configured in SendGrid Inbound Parse

#### Exclusions

- **Excluded Keywords**: Words that prevent auto-response
  - `urgent`, `emergency`, `complaint`, `refund`, `cancel`
  - `reschedule`, `change`, `modify`, `asap`, `immediately`

- **Excluded Domains**: Email domains that prevent auto-response
  - `noreply`, `donotreply`, `no-reply`
  - `mailer-daemon`, `postmaster`

### 4. Testing the System

#### Test with Sample Email

1. **Go to Auto-Respond tab**
2. **Fill in test email details:**
   - From: `test@example.com`
   - Subject: `Appointment Question`
   - Body: `Hi, I'd like to know your prices for haircuts`
3. **Click "Test Auto-Respond"**
4. **Check the result** in the toast notification

#### Monitor Performance

- **View statistics** in the Auto-Respond tab
- **Check response rates** and confidence scores
- **Review blocked responses** and reasons

## How It Works

### Email Processing Flow

1. **Email Received**: Client sends email to your configured address
2. **Webhook Triggered**: SendGrid sends email data to your webhook
3. **Auto-Response Check**: System evaluates if auto-response should be sent
4. **AI Generation**: LLM generates intelligent response using business context
5. **Response Sent**: Email automatically sent back to client
6. **History Saved**: Conversation recorded for future reference

### Decision Logic

The system will **NOT** send auto-responses if:

- Auto-respond is disabled
- Email is not sent to a configured auto-respond address
- Email contains excluded keywords
- Email is from excluded domain
- Outside business hours (if enabled)
- AI confidence is below threshold
- Client doesn't have email preferences enabled

### Response Quality

Auto-responses include:

- **Professional greeting** and signature
- **Context-aware** information about your business
- **Service details** and pricing when relevant
- **Appointment booking** suggestions when appropriate
- **Clear disclaimer** that it's an automated response

## Best Practices

### For Optimal Results:

1. **Set Confidence Threshold**: Use 70-80% for best balance of quality and coverage
2. **Review Excluded Keywords**: Add business-specific terms that require human attention
3. **Monitor Business Hours**: Set realistic hours that match your availability
4. **Test Regularly**: Use the test feature to verify system performance
5. **Review Statistics**: Check performance metrics weekly

### Common Use Cases:

- **Service Inquiries**: "What are your prices for hair coloring?"
- **Appointment Questions**: "Do you have availability next week?"
- **General Information**: "What are your business hours?"
- **Follow-up Requests**: "Can you send me more information about your services?"

### What to Exclude:

- **Urgent Requests**: "I need to cancel immediately"
- **Complaints**: "I'm not happy with my last visit"
- **Complex Issues**: "I have a special situation"
- **Refund Requests**: "I need a refund for my appointment"

## Troubleshooting

### Common Issues:

1. **Webhook Not Receiving Emails**
   - Check DNS configuration
   - Verify SendGrid Inbound Parse settings
   - Check webhook URL is accessible

2. **Auto-Responses Not Sending**
   - Verify auto-respond is enabled
   - Check that email is sent to a configured auto-respond address
   - Check confidence threshold setting
   - Review excluded keywords/domains
   - Confirm business hours (if enabled)

3. **Poor Response Quality**
   - Increase confidence threshold
   - Review business knowledge/FAQ entries
   - Check service and staff information

4. **Email Delivery Issues**
   - Verify SendGrid API key
   - Check from email address configuration
   - Review email templates

### Debug Steps:

1. **Check App Logs**: Look for webhook receipt and processing messages
2. **Test Configuration**: Use the test feature to verify settings
3. **Review Statistics**: Check performance metrics for patterns
4. **Monitor Confidence**: Track AI confidence scores over time

## Security Considerations

- **Webhook Security**: Consider adding authentication to webhook endpoints
- **Email Validation**: System validates email format and sender information
- **Rate Limiting**: Consider implementing rate limits for webhook processing
- **Data Privacy**: Ensure compliance with email privacy regulations

## Support

If you encounter issues with the auto-respond feature:

1. **Check the troubleshooting section** above
2. **Review your configuration** settings
3. **Test with sample emails** to isolate issues
4. **Contact support** with specific error messages and logs

## API Endpoints

### Auto-Respond Endpoints

- `GET /api/auto-respond/config` - Get current configuration
- `PUT /api/auto-respond/config` - Update configuration
- `GET /api/auto-respond/stats` - Get performance statistics
- `POST /api/auto-respond/test` - Test with sample email
- `POST /api/auto-respond/process-email` - Process email manually

### Webhook Endpoints

- `POST /api/webhook/incoming-email` - Receive incoming emails (SendGrid Inbound Parse)

## Future Enhancements

Planned features for future releases:

- **SMS Auto-Respond**: Extend to text messages
- **Advanced Filtering**: More sophisticated email filtering rules
- **Response Templates**: Customizable response templates
- **Escalation Rules**: Automatic escalation to human staff
- **Integration APIs**: Connect with external email services
- **Advanced Analytics**: Detailed performance reporting 