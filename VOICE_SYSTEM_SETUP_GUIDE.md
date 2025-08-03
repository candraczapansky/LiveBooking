# AI Voice Answering System - Setup Guide

## Overview

This AI voice answering system for your salon integrates FastAPI, Twilio, and OpenAI to create a conversational voice assistant that can handle incoming phone calls, understand speech, generate intelligent responses, and speak back to callers.

## Features

- **Voice Call Handling**: Receives incoming calls via Twilio webhooks
- **Speech Recognition**: Converts caller speech to text using Twilio's speech recognition
- **AI Conversation**: Uses OpenAI GPT to generate contextual responses
- **Text-to-Speech**: Converts AI responses back to speech for the caller
- **Conversation Memory**: Maintains context throughout the call session
- **Salon-Specific Knowledge**: Trained on salon services, pricing, and policies

## System Architecture

```
Phone Call → Twilio → Webhook → FastAPI → OpenAI → Response → Twilio TTS → Caller
```

## Prerequisites

1. **Python 3.8+** installed
2. **Twilio Account** with a phone number
3. **OpenAI API Key** for AI responses
4. **Public HTTPS URL** for webhooks (can use ngrok for testing)

## Installation

### 1. Clone and Setup

```bash
# Navigate to your project directory
cd /path/to/your/salon-system

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in your project root:

```bash
# Copy the example environment file
cp env.example .env
```

Edit `.env` with your credentials:

```env
# Database Configuration (optional for voice system)
DATABASE_URL=postgresql://username:password@localhost:5432/salon_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=salon_db
DB_USER=postgres
DB_PASSWORD=your_password

# Twilio Configuration (REQUIRED)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=your_openai_api_key

# Application Configuration
LOG_LEVEL=INFO
ENVIRONMENT=development
```

### 3. Get Your Credentials

#### Twilio Setup
1. Sign up at [twilio.com](https://twilio.com)
2. Get your Account SID and Auth Token from the console
3. Purchase a phone number
4. Note your phone number for the `TWILIO_PHONE_NUMBER` variable

#### OpenAI Setup
1. Sign up at [openai.com](https://openai.com)
2. Get your API key from the API keys section
3. Add funds to your account (voice calls will use tokens)

## Running the System

### 1. Start the Server

```bash
# Start the FastAPI server
python -m python_sms_responder.main
```

The server will start on `http://localhost:8000`

### 2. Test the System

```bash
# Run the comprehensive test suite
python test_voice_system.py
```

### 3. Expose Your Server (for production)

For testing, use ngrok:

```bash
# Install ngrok
# Download from https://ngrok.com/

# Expose your local server
ngrok http 8000
```

Note the HTTPS URL (e.g., `https://abc123.ngrok.io`)

## Twilio Configuration

### 1. Configure Webhook URLs

In your Twilio console:

1. Go to Phone Numbers → Manage → Active numbers
2. Click on your phone number
3. Configure the following webhooks:

**Voice Configuration:**
- **Webhook URL**: `https://your-domain.com/webhook/voice`
- **HTTP Method**: POST

**Call Status Callback:**
- **Webhook URL**: `https://your-domain.com/webhook/voice/status`
- **HTTP Method**: POST

### 2. Enable Speech Recognition

Make sure your Twilio phone number has:
- Voice capabilities enabled
- Speech recognition enabled
- Enhanced speech recognition enabled

## Testing the System

### 1. Local Testing

```bash
# Start the server
python -m python_sms_responder.main

# In another terminal, run tests
python test_voice_system.py
```

### 2. Real Call Testing

1. Call your Twilio phone number
2. You should hear: "Hello! Welcome to our salon. I'm your AI assistant. How can I help you today?"
3. Speak your request (e.g., "I'd like to book an appointment")
4. The AI will respond with relevant information

## API Endpoints

### Voice Webhooks

- `POST /webhook/voice` - Initial call handling
- `POST /webhook/voice/process` - Speech processing
- `POST /webhook/voice/status` - Call status updates

### Health & Status

- `GET /health` - System health check
- `GET /voice/status/{call_sid}` - Call status information

## System Components

### VoiceService (`voice_service.py`)

Handles the core voice functionality:
- Twilio client management
- OpenAI integration
- Conversation history management
- TwiML response generation

### Models (`models.py`)

Data models for voice requests and responses:
- `VoiceRequest` - Incoming webhook data
- `VoiceResponse` - Webhook responses
- `CallStatus` - Call information

### Main Application (`main.py`)

FastAPI application with voice endpoints:
- Webhook handlers
- Health checks
- Error handling

## Customization

### 1. Salon Context

Edit the `salon_context` in `voice_service.py` to customize:
- Business hours
- Services offered
- Pricing information
- Policies and procedures

### 2. Voice Settings

Modify voice parameters in the TwiML responses:
- Voice type (alice, bob, etc.)
- Language (en-US, en-GB, etc.)
- Speech rate and pitch

### 3. AI Behavior

Adjust OpenAI parameters:
- Model (gpt-3.5-turbo, gpt-4)
- Temperature (creativity vs consistency)
- Max tokens (response length)

## Troubleshooting

### Common Issues

1. **"Twilio credentials not configured"**
   - Check your `.env` file
   - Verify Account SID and Auth Token

2. **"OpenAI API key not configured"**
   - Add your OpenAI API key to `.env`
   - Ensure you have sufficient credits

3. **"Webhook URL not accessible"**
   - Use ngrok for testing
   - Ensure HTTPS for production
   - Check firewall settings

4. **"Speech not recognized"**
   - Speak clearly and slowly
   - Check background noise
   - Verify speech recognition is enabled in Twilio

### Debug Mode

Enable detailed logging:

```python
# In voice_service.py
logging.basicConfig(level=logging.DEBUG)
```

### Health Check

Check system status:

```bash
curl http://localhost:8000/health
```

## Production Deployment

### 1. Server Setup

- Use a production WSGI server (Gunicorn)
- Set up HTTPS with SSL certificates
- Configure environment variables securely

### 2. Database Integration

- Connect to your existing salon database
- Store conversation history persistently
- Track call analytics

### 3. Monitoring

- Set up logging and monitoring
- Track call success rates
- Monitor AI response quality

## Security Considerations

1. **Webhook Validation**: Verify Twilio signatures
2. **API Key Security**: Store credentials securely
3. **Rate Limiting**: Prevent abuse
4. **Data Privacy**: Handle customer data responsibly

## Cost Estimation

### Twilio Costs
- Phone number: ~$1/month
- Voice calls: ~$0.0085/minute
- Speech recognition: included

### OpenAI Costs
- GPT-3.5-turbo: ~$0.002/1K tokens
- Typical call: 50-200 tokens

### Example Monthly Cost
- 100 calls/month, 3 minutes each
- Twilio: ~$2.55
- OpenAI: ~$0.50
- **Total: ~$3.05/month**

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the test output
3. Check server logs
4. Verify webhook configurations

## Next Steps

1. **Test thoroughly** with the provided test suite
2. **Configure Twilio** webhooks
3. **Customize salon context** for your business
4. **Deploy to production** with proper security
5. **Monitor and optimize** based on usage

---

**Happy coding! Your AI voice assistant is ready to help your salon customers. 🎉** 