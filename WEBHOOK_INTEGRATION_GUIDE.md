# SMS LLM Integration Guide for Existing Webhook

This guide explains how to add LLM capabilities to your existing Twilio SMS webhook without disrupting your current automations for confirmations, cancellations, etc.

## Overview

This solution allows you to:
1. Keep your current webhook URL (https://gloheadspa.app/api/terminal/webhook)
2. Continue using your existing automation functionality
3. Use the LLM for general inquiries and questions

## How It Works

The integration adds an "LLM fallback" to your existing webhook handler:
1. Your webhook first processes automation messages as normal
2. If a message doesn't match automation patterns, it passes to the LLM
3. The LLM generates a personalized response based on your business data
4. The response is sent back to the client via SMS

## Implementation Steps

### 1. Deploy the Python Components

All Python files in the `python_sms_responder` directory need to be accessible from your Node.js application:

1. Copy the `python_sms_responder` directory to your server
2. Install required Python dependencies:
   ```bash
   pip install fastapi uvicorn python-dotenv twilio openai pydantic python-multipart psycopg2-binary
   ```
3. Make sure `call_llm_integration.py` is executable:
   ```bash
   chmod +x python_sms_responder/call_llm_integration.py
   ```

### 2. Configure Environment Variables

Make sure your server has these environment variables set:
```
# OpenAI Integration
OPENAI_API_KEY=your_openai_key_here

# Database Connection
DATABASE_URL=postgresql://username:password@localhost:5432/salon_db

# Business Knowledge File
BUSINESS_KNOWLEDGE_FILE=business_knowledge.json
```

### 3. Update Your Webhook Handler

Modify your existing webhook handler to include the LLM integration:

1. Use the `webhook_integration_example.js` as a reference
2. Add the `callLLMIntegration` function to your code
3. Update your webhook handler to call the LLM when a message isn't handled by automation

Here's the key part to add to your existing webhook handler:

```javascript
// If the message wasn't handled by automation, try LLM
if (!automationResult.handled) {
  console.log('Message not recognized as automation, trying LLM');
  
  try {
    // Call the Python LLM integration
    const llmResult = await callLLMIntegration(req.body);
    
    if (llmResult.success && llmResult.llm_handled) {
      // LLM handled the message and sent a response
      console.log('Message processed by LLM:', llmResult.response);
      
      // Return empty response since LLM already sent the SMS reply
      res.set('Content-Type', 'text/xml');
      return res.send('<Response></Response>');
    }
  } catch (llmError) {
    console.error('Error calling LLM integration:', llmError);
  }
}
```

### 4. Configure Business Knowledge

The LLM needs information about your business to provide accurate responses:

1. Create and populate the business knowledge file:
   ```bash
   # From your project root directory
   cp python_sms_responder/business_knowledge.json.example business_knowledge.json
   nano business_knowledge.json  # Edit with your salon info
   ```

2. Set the file path in your environment variables:
   ```
   BUSINESS_KNOWLEDGE_FILE=/path/to/business_knowledge.json
   ```

### 5. Test the Integration

1. Send a test message that doesn't match any automation patterns
2. Verify that the LLM responds appropriately
3. Check the logs for any errors:
   ```bash
   tail -f llm_bridge.log
   ```

## Troubleshooting

### LLM Not Responding

If the LLM isn't responding to non-automation messages:

1. Check `llm_bridge.log` for errors
2. Verify Python can access your OpenAI API key
3. Make sure the database connection is working properly

### Python Script Not Running

If the Python script isn't executing:

1. Check file permissions (should be executable)
2. Verify Python 3.7+ is installed and in PATH
3. Check that all required packages are installed

### Automation Being Bypassed

If automation messages are going to the LLM:

1. Check the `is_automation_message` function in `llm_integration.py`
2. Add your specific automation triggers to the `automation_keywords` list

## Customization

### Adding More Automation Keywords

Edit `llm_integration.py` and update the `is_automation_message` function:

```python
def is_automation_message(self, message: str) -> bool:
    # Add your specific automation keywords here
    automation_keywords = [
        "confirm", "cancel", "reschedule", 
        # Add your custom keywords
        "book", "appointment", "my account"
    ]
    # Rest of function...
```

### Adjusting LLM Behavior

To change how the LLM responds:

1. Edit `business_knowledge.json` to update your salon information
2. Modify the system prompt in `llm_service.py` to change the assistant's personality

## Support

If you encounter any issues with this integration, please:

1. Check the logs (both Node.js and Python logs)
2. Review any error messages
3. Contact support with specific error details
