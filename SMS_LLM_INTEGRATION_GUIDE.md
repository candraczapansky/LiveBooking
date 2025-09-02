# SMS LLM Integration with Real-Time Salon Data

This guide explains how to deploy the enhanced SMS LLM system that includes real-time access to your salon's scheduling, services, and staff data.

## Overview

The enhanced system includes:

1. **Business Knowledge Database** - Static information about your salon
2. **Real-Time Data Connector** - Dynamic access to your salon management system
3. **LLM Integration** - Combines both static and dynamic data for intelligent responses
4. **Conversation Memory** - Remembers client interactions for context-aware responses

## Installation Steps

### 1. Prerequisites

- Python 3.7+ installed
- PostgreSQL database with your salon data
- OpenAI API key
- Twilio account with SMS capability

### 2. Configure Environment Variables

Create a `.env` file in the project root with:

```
# OpenAI Integration
OPENAI_API_KEY=your_openai_key_here

# Twilio Integration
TWILIO_ACCOUNT_SID=your_twilio_sid_here
TWILIO_AUTH_TOKEN=your_twilio_token_here
TWILIO_PHONE_NUMBER=your_twilio_number_here

# Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/salon_db
# Or individual connection parameters:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=salon_db
# DB_USER=username
# DB_PASSWORD=password

# Admin Interface
ADMIN_TOKEN=your_admin_token_here

# Business Knowledge File (for static data)
BUSINESS_KNOWLEDGE_FILE=business_knowledge.json
```

### 3. Install Required Packages

```bash
pip install fastapi uvicorn python-dotenv twilio openai pydantic python-multipart psycopg2-binary
```

### 4. Database Setup

Ensure your database includes tables for:

- `clients` - Client information
- `appointments` - Appointment records
- `services` - Available services with descriptions and prices
- `service_categories` - Categories for services
- `staff` - Staff information
- `staff_schedules` - Staff availability by day/time
- `staff_services` - Services each staff member can provide

Run the included schema script if needed:

```bash
psql -U username -d salon_db -f schema/business_knowledge_tables.sql
```

### 5. Populate Business Knowledge

1. Use the Admin Interface at `http://your-server/admin`
2. Enter the admin token you set in your environment variables
3. Add your salon's information:
   - Business details (hours, contact info)
   - Services with detailed descriptions
   - FAQs
   - Promotions and specials
   - Staff information

### 6. Running the Service

Start the SMS responder service:

```bash
./start_sms_responder.sh
```

This will start the service on port 8000.

## Understanding the Integration

### Real-Time Data Access

The `RealTimeDataConnector` class connects to your salon database to retrieve:

1. **Current Appointment Availability** - Shows open slots for the next several days
2. **Staff Scheduling** - Shows when each staff member is available
3. **Service Details** - Up-to-date service offerings and pricing
4. **Staff-Service Matching** - Which staff members can perform which services

### LLM Prompt Construction

When a client sends an SMS, the system:

1. Retrieves static business knowledge
2. Fetches real-time availability data
3. Gets client history from your database
4. Combines all this with conversation context
5. Sends a comprehensive prompt to the LLM
6. Returns a personalized, accurate response

### Sample Capabilities

With this integration, your SMS assistant can answer questions like:

- "What times are available for a balayage on Thursday?"
- "Is Sarah working this weekend?"
- "How long does a signature facial take?"
- "Who's available for a men's haircut tomorrow afternoon?"
- "What's your cancellation policy?"
- "Do you have any openings for a manicure today?"

## Customization

### Adding New Data Sources

To add new real-time data sources:

1. Add new methods to the `RealTimeDataConnector` class in `real_time_connector.py`
2. Update the `get_knowledge_for_llm` method in `business_knowledge.py` to include the new data
3. Restart the service to apply changes

### Adjusting LLM Behavior

To modify how the LLM responds:

1. Edit the system prompt in the `_get_system_prompt` method in `llm_service.py`
2. Adjust the conversation context in the `_build_prompt` method

## Troubleshooting

### Database Connection Issues

- Check your `DATABASE_URL` or individual DB environment variables
- Ensure the database user has SELECT permissions on all necessary tables
- Verify network connectivity to the database server

### LLM Response Problems

- Check the OpenAI API key is valid
- Look for errors in the logs when responses fail
- Verify the business knowledge is being loaded correctly

### Twilio Integration Issues

- Confirm Twilio credentials are correct
- Make sure your Twilio phone number is SMS-enabled
- Check that webhook URLs are configured properly in Twilio
