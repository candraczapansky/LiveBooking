# SMS Auto-Responder Fix

## Issue
The SMS auto-responder is currently failing with the error: "OpenAI API key not configured"

## Root Cause
The system requires an OpenAI API key to generate AI-powered responses, but it's not currently configured.

## Solution

### Option 1: Quick Fix (Recommended)

1. **Get an OpenAI API Key:**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Sign up or log in
   - Create a new API key (it starts with `sk-`)

2. **Run the Fix Script:**
   ```bash
   node fix-sms-auto-responder.js sk-your-api-key-here
   ```

3. **Restart the Server:**
   ```bash
   npm run dev
   ```

### Option 2: Manual Setup

1. **Get an OpenAI API Key** (same as above)

2. **Use the API Endpoint:**
   ```bash
   curl -X POST http://localhost:5000/api/config/openai \
     -H "Content-Type: application/json" \
     -d '{"apiKey": "sk-your-api-key-here"}'
   ```

3. **Restart the Server:**
   ```bash
   npm run dev
   ```

### Option 3: Environment Variable

1. **Add to your environment variables:**
   ```bash
   export OPENAI_API_KEY=sk-your-api-key-here
   ```

2. **Run the setup script:**
   ```bash
   node setup-openai-key.js
   ```

## Verification

After setting up the API key:

1. **Test the SMS Auto-Responder:**
   - Go to AI Messaging → SMS Auto-Respond tab
   - Use the test interface to send a sample SMS
   - Check that AI-powered responses are generated

2. **Check the Logs:**
   - Look for successful LLM responses in the server logs
   - No more "OpenAI API key not configured" errors

## Cost Information

- OpenAI API has a free tier with $5 credit
- Each SMS response costs approximately $0.001-0.002
- You can monitor usage at [OpenAI Usage](https://platform.openai.com/usage)

## Troubleshooting

If you still see errors:

1. **Check API Key Format:**
   - Must start with `sk-`
   - Should be about 51 characters long

2. **Verify Database Connection:**
   - Make sure your database is running
   - Check that the `system_config` table exists

3. **Check Server Logs:**
   - Look for database connection errors
   - Verify the API key is being retrieved correctly

## Support

If you continue to have issues:
1. Check the server logs for detailed error messages
2. Verify your OpenAI API key is valid and has credits
3. Ensure your database is properly configured 