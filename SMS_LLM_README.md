# SMS LLM Integration for Salon

This document explains the enhanced SMS LLM integration system that allows your salon's SMS system to provide personalized, context-aware responses to clients.

## Key Features Added

1. **Business Knowledge Database**
   - Stores your salon's services, prices, FAQs, promotions, and staff info
   - Makes this information available to the LLM for accurate responses
   - Can be updated through admin interface

2. **Enhanced LLM Integration**
   - Improved system prompt with personality and context
   - Business-specific knowledge incorporated into responses
   - Better context handling for multi-turn conversations

3. **Conversation Memory**
   - Stores conversation history for each client
   - Allows the LLM to reference past messages
   - Provides continuity across multiple interactions

4. **Admin Interface**
   - Web-based interface to manage business knowledge
   - Update services, prices, FAQs, and promotions
   - Preview how the LLM will use the information

## How to Use

### Starting the Service

1. Make sure you have the required environment variables set:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `TWILIO_ACCOUNT_SID` - Your Twilio account SID
   - `TWILIO_AUTH_TOKEN` - Your Twilio auth token
   - `TWILIO_PHONE_NUMBER` - Your Twilio phone number

2. Run the start script:
   ```bash
   ./start_sms_responder.sh
   ```

3. The service will start on port 8000 (http://localhost:8000)

### Accessing the Admin Interface

1. Open a web browser and navigate to http://localhost:8000/admin
2. Enter the admin token (default is "admin123")
3. Use the interface to update your salon's information

### Managing Business Knowledge

The admin interface allows you to manage:

1. **Business Information**
   - Update salon name, address, contact info
   - Set business hours
   - Add a business description

2. **Services**
   - Add services by category (hair, skin, nails, etc.)
   - Include prices, duration, and descriptions

3. **FAQs**
   - Add frequently asked questions and answers
   - These will be used to answer client questions

4. **Promotions**
   - Add special offers and promotions
   - Include expiration dates and promo codes

### Testing the LLM

You can test the LLM responses by running:
```bash
cd python_sms_responder && python -m test_sms_llm
```

This will send various test messages and display the AI responses.

## Troubleshooting

If the LLM is giving generic responses, check:

1. **OpenAI API Key**
   - Make sure your API key is valid and has sufficient credits

2. **Business Knowledge**
   - Use the admin interface to ensure you've added your salon's specific information

3. **System Logs**
   - Check the console output for any errors
   - Look for messages starting with "LLM service error"

## Customizing the LLM Behavior

To further customize how the LLM responds:

1. Update the system prompt in `llm_service.py` in the `_get_system_prompt()` function
2. Adjust temperature and max_tokens settings to control creativity and response length
3. Add more specific examples to your FAQs to guide the LLM's behavior

## Future Enhancements

Potential next steps for further improvement:

1. Add appointment booking integration with your salon software
2. Implement automated follow-up messages
3. Track conversation analytics and common questions
4. Create a client-facing web chat interface with the same LLM backend
5. Add image recognition for services (client sends photo of desired style)
