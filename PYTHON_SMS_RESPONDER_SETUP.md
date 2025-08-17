# Python SMS Responder - Setup and Integration Guide

## Overview

The Python SMS responder is a complete, production-ready implementation that can replace or work alongside your existing TypeScript SMS responder. It includes:

- **FastAPI** web framework for handling webhooks
- **OpenAI GPT-4** integration for intelligent responses
- **PostgreSQL** database connectivity for client and appointment management
- **Twilio** integration for SMS sending/receiving
- **Conversation Manager** for handling multi-step booking flows

## Key Features

✅ **Preserves All Existing Data** - Works with your existing database without modifications
✅ **Non-Destructive Integration** - Does not modify any existing TypeScript code
✅ **Graceful Fallback** - Works even without OpenAI API key (uses fallback responses)
✅ **Production Ready** - Includes error handling, logging, and health checks

## Installation Steps

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or install individually:
```bash
pip install fastapi uvicorn twilio openai python-dotenv psycopg2-binary pydantic python-multipart
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration (uses your existing database)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/salon_db

# OpenAI Configuration (required for AI responses)
OPENAI_API_KEY=your_openai_api_key_here

# Twilio Configuration (optional for local testing)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Application Configuration
LOG_LEVEL=INFO
ENVIRONMENT=development
```

### 3. Start the Python Service

#### Option A: Direct Start
```bash
python3 -m python_sms_responder.main
```

#### Option B: Using the Startup Script
```bash
python3 start-python-sms.py
```

The service will run on `http://localhost:8000`

### 4. Verify the Service

Check the health endpoint:
```bash
curl http://localhost:8000/health
```

You should see:
```json
{
  "status": "healthy",
  "services": {
    "sms_service": { "status": "healthy" },
    "llm_service": { "status": "healthy" },
    "database_service": { "status": "healthy" }
  }
}
```

## Integration with Existing System

### Option 1: Direct Webhook (Recommended for Production)

Configure Twilio to send webhooks directly to the Python service:

1. Go to Twilio Console → Phone Numbers
2. Select your phone number
3. Set the webhook URL to: `https://your-domain.com:8000/webhook/sms`
4. Set HTTP method to POST

### Option 2: Proxy Through TypeScript Server

The TypeScript server can forward requests to the Python service:

1. Import the integration module in your routes:
```typescript
import { processSMSWithPython, isPythonServiceAvailable } from './sms-python-integration';
```

2. In your SMS handler, add:
```typescript
// Try Python service first
const pythonResult = await processSMSWithPython(smsData);
if (pythonResult) {
  return pythonResult;
}

// Fall back to TypeScript implementation
// ... existing code ...
```

### Option 3: Gradual Migration

Enable Python service for specific phone numbers:

```typescript
const testNumbers = ['+1234567890', '+0987654321'];

if (testNumbers.includes(smsData.from)) {
  // Use Python service
  const result = await processSMSWithPython(smsData);
  if (result) return result;
}

// Use existing TypeScript service
// ... existing code ...
```

## Testing the Integration

### 1. Test SMS Processing

```bash
curl -X POST "http://localhost:8000/webhook/sms" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+1234567890&To=+0987654321&Body=Hi, I'd like to book an appointment&MessageSid=test123&AccountSid=test456"
```

### 2. Test with Python Script

```python
python3 test-python-sms.py
```

### 3. Test Specific Scenarios

```python
# Test booking flow
curl -X POST "http://localhost:8000/webhook/sms" \
  -d "From=+1234567890&Body=I want to book a haircut"

# Test client lookup
curl -X POST "http://localhost:8000/webhook/sms" \
  -d "From=+existing_client_phone&Body=What are my upcoming appointments?"
```

## Database Compatibility

The Python service uses the same database schema as your TypeScript application:

- **clients** table - Client information
- **appointments** table - Appointment records
- **staff** table - Staff information (read-only)
- **services** table - Service definitions (read-only)

No database migrations or changes are required.

## Conversation Flow

The Python responder handles multi-step conversations:

1. **Greeting** → Identifies booking intent
2. **Service Selection** → Choose from available services
3. **Time Selection** → Pick date and time
4. **Client Info** → Collect name and email
5. **Confirmation** → Confirm and create appointment

## Configuration Options

### LLM Settings

In `llm_service.py`:
```python
self.model = "gpt-4"  # or "gpt-3.5-turbo"
self.max_tokens = 150
self.temperature = 0.7
```

### System Prompt

Customize the AI behavior by modifying the system prompt in `llm_service.py`:
```python
def _get_system_prompt(self) -> str:
    return """Your custom instructions here..."""
```

### Available Services

Update services in `conversation_manager.py`:
```python
self.services = {
    "haircut": {"name": "Haircut", "duration": 60, "price": "$45"},
    # Add more services...
}
```

## Monitoring and Logs

### View Logs
```bash
# If running in foreground
# Logs appear in terminal

# If running with systemd
journalctl -u python-sms-responder -f

# Application logs
tail -f sms_responder.log
```

### Health Monitoring
```bash
# Check service health
curl http://localhost:8000/health

# Test SMS processing
curl http://localhost:8000/webhook/sms -d "From=+1234567890&Body=test"
```

## Troubleshooting

### Service Won't Start

1. Check Python version (3.7+ required):
```bash
python3 --version
```

2. Verify dependencies:
```bash
pip list | grep -E "fastapi|uvicorn|openai|twilio"
```

3. Check port availability:
```bash
lsof -i :8000
```

### Database Connection Issues

1. Verify PostgreSQL is running:
```bash
pg_isready
```

2. Test connection:
```bash
psql $DATABASE_URL -c "SELECT 1"
```

3. Check database exists:
```bash
psql -U postgres -l | grep salon_db
```

### OpenAI API Issues

1. Verify API key:
```bash
echo $OPENAI_API_KEY
```

2. Test API directly:
```python
from openai import OpenAI
client = OpenAI(api_key="your_key")
response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=5
)
print(response)
```

## Production Deployment

### Using systemd

Create `/etc/systemd/system/python-sms-responder.service`:

```ini
[Unit]
Description=Python SMS Responder Service
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/runner/workspace
Environment="PATH=/usr/local/bin:/usr/bin"
ExecStart=/usr/bin/python3 -m python_sms_responder.main
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable python-sms-responder
sudo systemctl start python-sms-responder
```

### Using Docker

Create `Dockerfile`:
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY python_sms_responder/ ./python_sms_responder/
COPY .env .

EXPOSE 8000
CMD ["python", "-m", "python_sms_responder.main"]
```

Build and run:
```bash
docker build -t python-sms-responder .
docker run -p 8000:8000 --env-file .env python-sms-responder
```

## Safety and Data Preservation

✅ **No Data Loss** - The Python service only reads and adds data, never deletes
✅ **No Code Changes** - Your existing TypeScript code remains untouched
✅ **Backward Compatible** - Can be disabled instantly by stopping the service
✅ **Separate Port** - Runs on port 8000, doesn't interfere with existing services
✅ **Graceful Degradation** - Falls back to simple responses if services unavailable

## Support and Maintenance

The Python SMS responder is designed to be:

- **Self-contained** - All code in `python_sms_responder/` directory
- **Modular** - Easy to extend or modify individual components
- **Well-documented** - Comprehensive docstrings and comments
- **Production-ready** - Error handling, logging, and monitoring

## Next Steps

1. **Configure API Keys** - Add OpenAI and Twilio credentials
2. **Test Locally** - Verify the service works with your database
3. **Gradual Rollout** - Test with specific phone numbers first
4. **Monitor Performance** - Check logs and response times
5. **Customize Responses** - Adjust prompts and conversation flow

The Python SMS responder is ready to use and will not affect your existing system until you explicitly route traffic to it.







