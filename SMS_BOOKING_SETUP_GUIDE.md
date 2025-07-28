# SMS Booking Setup Guide

## Overview

The SMS auto-responder has been successfully configured to handle appointment booking requests. This guide explains how the system works and how to use it.

## How It Works

### 1. SMS Auto-Responder Flow

When a client sends an SMS to your configured phone number, the system:

1. **Detects Booking Intent**: Analyzes the message for booking-related keywords
2. **Parses Service Requests**: Identifies which service the client wants
3. **Finds Available Slots**: Checks staff schedules and existing appointments
4. **Provides Available Times**: Sends back available appointment times
5. **Handles Booking**: Books the appointment when client confirms

### 2. Conversation Flow

```
Client: "Hi, I would like to book an appointment"
System: "Great! I'd love to help you book an appointment. We offer: Signature Head Spa ($99), Deluxe Head Spa ($160), Platinum Head Spa ($220), Korean Glass Skin Facial ($130), Buccal Massage Facial ($190). Which service would you like to book? 💆‍♀️✨"

Client: "Signature Head Spa"
System: "Great choice! Here are some available times for Signature Head Spa: 9:00 AM, 10:00 AM, 2:00 PM, 3:00 PM. Which time works best for you? 💆‍♀️✨"

Client: "2:00 PM"
System: "Perfect! I've booked your Signature Head Spa appointment for [date] at 2:00 PM. You'll receive a confirmation shortly. See you soon! 💆‍♀️✨"
```

## Current Configuration

### ✅ What's Set Up

1. **Services**: 11 services configured including:
   - Signature Head Spa ($99, 60min)
   - Deluxe Head Spa ($160, 90min)
   - Platinum Head Spa ($220, 120min)
   - Korean Glass Skin Facial ($130, 60min)
   - Buccal Massage Facial ($190, 90min)

2. **Staff**: Emma Martinez configured as Senior Hair Stylist

3. **Schedules**: Staff schedules set up for:
   - Monday-Friday: 9:00 AM - 5:00 PM
   - Saturday: 10:00 AM - 4:00 PM

4. **SMS Configuration**: Auto-respond phone number configured as `+19187277348`

### 🔧 Technical Setup

The system includes:

- **SMS Auto-Responder Service**: Handles incoming SMS messages
- **Appointment Booking Service**: Manages the booking logic
- **Conversation State Management**: Tracks booking progress
- **Staff Schedule Integration**: Checks availability
- **Service Assignment**: Links services to staff members

## Testing the System

### 1. Test Scripts

Run these scripts to test the SMS booking functionality:

```bash
# Test basic SMS booking flow
node test-sms-booking-simple.js

# Test full booking conversation
node test-sms-working.js

# Diagnose any issues
node diagnose-sms-booking.js
```

### 2. Manual Testing

You can also test manually by sending SMS messages to `+19187277348`:

1. Send: "Hi, I would like to book an appointment"
2. Send: "Signature Head Spa"
3. Send: "2:00 PM"

## Configuration Options

### SMS Auto-Responder Settings

The system can be configured through the API:

```bash
# Update confidence threshold
curl -X PUT http://localhost:5001/api/sms-auto-respond/config \
  -H "Content-Type: application/json" \
  -d '{"confidenceThreshold": 0.7}'

# Update phone numbers
curl -X PUT http://localhost:5001/api/sms-auto-respond/phone-numbers \
  -H "Content-Type: application/json" \
  -d '{"phoneNumbers": ["+19187277348"]}'
```

### Business Hours

Configure business hours to only respond during specific times:

```bash
curl -X PUT http://localhost:5001/api/sms-auto-respond/config \
  -H "Content-Type: application/json" \
  -d '{
    "businessHoursOnly": true,
    "businessHours": {
      "start": "09:00",
      "end": "17:00",
      "timezone": "America/Chicago"
    }
  }'
```

## Troubleshooting

### Common Issues

1. **"No available slots"**: 
   - Check staff schedules are configured
   - Verify services are assigned to staff
   - Check for conflicting appointments

2. **SMS not responding**:
   - Verify phone number is in auto-respond list
   - Check SMS auto-responder is enabled
   - Review server logs for errors

3. **Wrong service detected**:
   - Check service name matching in `parseBookingRequest`
   - Verify service names in database

### Debug Commands

```bash
# Check system health
curl http://localhost:5001/api/sms-auto-respond/health

# View current configuration
curl http://localhost:5001/api/sms-auto-respond/config

# Check statistics
curl http://localhost:5001/api/sms-auto-respond/stats
```

## API Endpoints

### SMS Auto-Responder

- `GET /api/sms-auto-respond/health` - System health check
- `GET /api/sms-auto-respond/config` - Get configuration
- `PUT /api/sms-auto-respond/config` - Update configuration
- `PUT /api/sms-auto-respond/phone-numbers` - Update phone numbers
- `POST /api/sms-auto-respond/test` - Test SMS processing
- `GET /api/sms-auto-respond/stats` - Get usage statistics

### Webhook

- `POST /api/webhook/incoming-sms` - Twilio webhook endpoint

## Next Steps

### 1. Production Deployment

1. Configure Twilio webhook URL to point to your production server
2. Set up proper phone number routing
3. Configure environment variables for production

### 2. Enhanced Features

Consider adding:
- Payment processing integration
- Appointment reminders
- Cancellation handling
- Multi-language support
- Integration with calendar systems

### 3. Monitoring

Set up monitoring for:
- SMS response times
- Booking success rates
- Error rates
- System uptime

## Support

If you encounter issues:

1. Check the server logs for error messages
2. Run the diagnostic script: `node diagnose-sms-booking.js`
3. Verify all configuration is correct
4. Test with the provided test scripts

The SMS booking system is now fully functional and ready to handle client appointment requests automatically! 🎉 