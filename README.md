# Salon SMS Responder

A robust, production-grade SMS automation system for salon appointment management using Python, FastAPI, Twilio, and OpenAI.

## Features

- **AI-Powered Responses**: Uses OpenAI GPT-4 to generate intelligent, context-aware SMS responses
- **Client Database Integration**: Retrieves client information and appointment history
- **Appointment Management**: Handle booking, rescheduling, and cancellation requests
- **Twilio Integration**: Reliable SMS sending and receiving via Twilio
- **Health Monitoring**: Comprehensive health checks for all services
- **Error Handling**: Robust error handling and logging
- **Production Ready**: Designed for high reliability and scalability

## Architecture

The system is built with a modular architecture:

- **FastAPI Application**: Main web server handling webhooks and API endpoints
- **SMS Service**: Handles Twilio integration for sending/receiving SMS
- **LLM Service**: Manages OpenAI integration for AI response generation
- **Database Service**: Handles client and appointment data operations
- **Models**: Pydantic models for request/response validation

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your actual credentials:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/salon_db

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

### 3. Database Setup

Ensure your PostgreSQL database has the required tables:

```sql
-- Clients table
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    preferences JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    date TIMESTAMP,
    service VARCHAR(255),
    duration INTEGER,
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Run the Application

```bash
# Development mode with auto-reload
python -m python_sms_responder.main

# Or using uvicorn directly
uvicorn python_sms_responder.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Health Check
- `GET /` - Basic health check
- `GET /health` - Detailed health status for all services

### SMS Webhook
- `POST /webhook/sms` - Handle incoming SMS from Twilio

## Twilio Webhook Configuration

Configure your Twilio phone number webhook:

1. Go to your Twilio Console
2. Navigate to Phone Numbers > Manage > Active numbers
3. Select your phone number
4. Set the webhook URL to: `https://your-domain.com/webhook/sms`
5. Set HTTP method to POST

## Usage Examples

### Testing the SMS Webhook

```bash
curl -X POST "http://localhost:8000/webhook/sms" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+1234567890&To=+0987654321&Body=Hi, I'd like to book an appointment&MessageSid=test123&AccountSid=test456"
```

### Health Check

```bash
curl http://localhost:8000/health
```

## System Flow

1. **SMS Received**: Twilio sends webhook to `/webhook/sms`
2. **Client Lookup**: System queries database for client information
3. **AI Processing**: OpenAI generates context-aware response
4. **Response Sent**: Twilio sends AI-generated response back to user
5. **Logging**: All interactions are logged for monitoring

## Error Handling

The system includes comprehensive error handling:

- **Database Connection Errors**: Graceful fallbacks and retry logic
- **Twilio API Errors**: Detailed error logging and recovery
- **OpenAI API Errors**: Fallback responses when AI service is unavailable
- **Invalid Requests**: Proper HTTP status codes and error messages

## Monitoring

### Health Checks

The `/health` endpoint provides detailed status for all services:

```json
{
  "status": "healthy",
  "services": {
    "sms_service": {
      "status": "healthy",
      "account_sid": "AC...",
      "from_number": "+1234567890"
    },
    "llm_service": {
      "status": "healthy",
      "model": "gpt-4",
      "api_key_configured": true
    },
    "database_service": {
      "status": "healthy",
      "connection": "successful"
    }
  }
}
```

### Logging

The system logs all interactions for monitoring and debugging:

- SMS received/sent
- AI response generation
- Database operations
- Error conditions

## Production Deployment

### Environment Variables

Ensure all required environment variables are set in production:

```bash
export DATABASE_URL="postgresql://..."
export TWILIO_ACCOUNT_SID="AC..."
export TWILIO_AUTH_TOKEN="..."
export TWILIO_PHONE_NUMBER="+1234567890"
export OPENAI_API_KEY="sk-..."
```

### Process Management

Use a process manager like systemd or supervisor:

```ini
[program:sms-responder]
command=uvicorn python_sms_responder.main:app --host 0.0.0.0 --port 8000
directory=/path/to/your/app
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/sms-responder.err.log
stdout_logfile=/var/log/sms-responder.out.log
```

### SSL/TLS

For production, ensure your webhook endpoint uses HTTPS:

```bash
# Using nginx as reverse proxy
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/
```

### Code Structure

```
python_sms_responder/
├── __init__.py
├── main.py              # FastAPI application
├── models.py            # Pydantic models
├── sms_service.py       # Twilio SMS handling
├── llm_service.py       # OpenAI integration
└── database_service.py  # Database operations
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 