# SMS LLM Responder Fix

## Issue
The SMS auto-responder is working but using fallback responses (confidence 0.5) instead of AI-powered responses. The LLM service is failing to generate responses.

## Root Cause Analysis
The SMS auto-responder is falling back to basic responses because:
1. The LLM service is failing to generate AI responses
2. The system is using fallback responses when LLM fails
3. The confidence is set to 0.5 for fallback responses

## Solution

### Step 1: Verify OpenAI API Key
First, ensure your OpenAI API key is properly configured:

```bash
# Check if API key is configured
curl -s http://localhost:5000/api/config/system | grep openai_api_key
```

If the API key is missing or invalid, set it up:

```bash
# Set up API key (replace with your actual key)
node fix-sms-auto-responder.js sk-your-api-key-here
```

### Step 2: Test OpenAI API Directly
Test if the OpenAI API is working:

```bash
# Run the simple test
npx tsx simple-llm-test.js
```

This will test the API key directly with OpenAI.

### Step 3: Check LLM Service Configuration
The LLM service might be failing due to configuration issues. Check:

1. **Model Configuration**: Ensure the model is set correctly
2. **Token Limits**: Check if max_tokens is reasonable
3. **Temperature**: Verify temperature settings

### Step 4: Debug LLM Service
Add debug logging to see what's happening:

1. **Check Server Logs**: Look for LLM service error messages
2. **Test LLM Endpoint**: Try the LLM endpoint directly
3. **Verify Context**: Ensure the context being passed is correct

### Step 5: Fix Configuration Issues

#### If OpenAI API Key is Invalid:
```bash
# Get a new API key from OpenAI
# Visit: https://platform.openai.com/api-keys
# Then run:
node fix-sms-auto-responder.js sk-your-new-api-key
```

#### If LLM Service is Failing:
The issue might be in the LLM service configuration. Check:

1. **Model Name**: Ensure `gpt-3.5-turbo` is available
2. **Token Limits**: Reduce max_tokens if needed
3. **API Rate Limits**: Check if you've hit rate limits

#### If Context is Wrong:
The LLM service might be failing due to incorrect context. Ensure:

1. **Business Knowledge**: Load proper FAQ data
2. **Service Information**: Include available services
3. **Client Information**: Pass correct client details

### Step 6: Test the Fix

1. **Restart Server**:
   ```bash
   npm run dev
   ```

2. **Test SMS Auto-Responder**:
   ```bash
   curl -X POST http://localhost:5000/api/sms-auto-respond/test \
     -H "Content-Type: application/json" \
     -d '{"from": "+1234567890", "to": "+19187277348", "body": "What are your hours?"}'
   ```

3. **Check Response**:
   - Look for `confidence` > 0.5 (AI response)
   - Check for proper AI-generated message
   - Verify no fallback response

## Troubleshooting

### If Still Using Fallback Responses:

1. **Check Server Logs**:
   Look for these messages:
   - "LLM failed to generate response, using fallback"
   - "OpenAI API key not configured"
   - "OpenAI API error"

2. **Test LLM Service Directly**:
   ```bash
   npx tsx debug-llm.js
   ```

3. **Check API Key Validity**:
   ```bash
   npx tsx test-openai-key.js
   ```

### Common Issues:

1. **Invalid API Key**:
   - Get a new API key from OpenAI
   - Ensure it starts with `sk-`
   - Check if it has sufficient credits

2. **Rate Limits**:
   - Check OpenAI usage dashboard
   - Wait if rate limited
   - Consider upgrading plan

3. **Model Issues**:
   - Ensure `gpt-3.5-turbo` is available
   - Try different model if needed
   - Check model availability

4. **Context Issues**:
   - Ensure business knowledge is loaded
   - Check service information
   - Verify client data

## Verification

After applying the fix:

1. **Test with Simple Message**:
   - Send: "What are your hours?"
   - Expect: AI-generated response with confidence > 0.7

2. **Check Response Quality**:
   - Response should be professional
   - Should include business information
   - Should be under 160 characters

3. **Monitor Logs**:
   - No "LLM failed" messages
   - Successful API calls to OpenAI
   - Proper confidence scores

## Expected Behavior

When working correctly:

- ✅ SMS auto-responder uses AI responses
- ✅ Confidence scores > 0.7
- ✅ Professional, contextual responses
- ✅ No fallback responses
- ✅ Proper error handling

## Support

If the issue persists:

1. **Run Diagnostic Scripts**:
   ```bash
   npx tsx simple-llm-test.js
   npx tsx debug-llm.js
   npx tsx test-openai-key.js
   ```

2. **Check Server Logs**:
   Look for error messages and debug information

3. **Verify Configuration**:
   Ensure all settings are correct

4. **Test API Key**:
   Verify the OpenAI API key is valid and has credits

The fix ensures that:
- ✅ OpenAI API key is properly configured
- ✅ LLM service is working correctly
- ✅ SMS auto-responder uses AI responses
- ✅ Fallback responses are only used when necessary
- ✅ Proper error handling and logging 