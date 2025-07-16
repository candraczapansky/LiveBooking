# Jotform Integration Setup Guide

## Overview
This guide will help you connect your Jotform account to your Glo Head Spa app. The integration will:
1. Receive form submissions from Jotform
2. Create appointments in your app
3. Delete the submissions from Jotform after processing

## Prerequisites
- A Jotform account
- Your app running on Replit (which you already have)

## Step 1: Get Your Jotform API Key

1. **Log into your Jotform account**
2. **Go to Settings → API**
3. **Generate a new API key** (or use an existing one)
4. **Copy the API key** - you'll need this later

## Step 2: Set Up Environment Variable

Add your Jotform API key to your Replit environment:

1. **In your Replit workspace**, go to the "Secrets" tab
2. **Add a new secret**:
   - **Key**: `JOTFORM_API_KEY`
   - **Value**: Your Jotform API key

## Step 3: Create Your Jotform Form

Create a form in Jotform with these fields (or similar):

### Required Fields:
- **First Name** (Text input)
- **Last Name** (Text input)
- **Email** (Email input)
- **Phone** (Phone input)
- **Service** (Dropdown or text input)
- **Appointment Date** (Date picker)
- **Appointment Time** (Time picker)

### Optional Fields:
- **Notes** (Text area)
- **Staff Member** (Dropdown or text input)

## Step 4: Configure Field Mappings

After creating your form, you need to map the Jotform question IDs to your app's field names:

1. **Get your form's question IDs**:
   - In Jotform, go to your form
   - Click "Edit" on any field
   - Look at the URL - it will show something like `qid=1`, `qid=2`, etc.
   - Note down the question IDs for each field

2. **Update the field mappings** in `server/routes.ts`:
   ```typescript
   const jotformIntegration = new JotformIntegration(storage, {
     // Replace these with your actual question IDs
     '1': 'clientFirstName',      // Your First Name field ID
     '2': 'clientLastName',       // Your Last Name field ID
     '3': 'clientEmail',          // Your Email field ID
     '4': 'clientPhone',          // Your Phone field ID
     '5': 'serviceName',          // Your Service field ID
     '6': 'appointmentDate',      // Your Date field ID
     '7': 'appointmentTime',      // Your Time field ID
     '8': 'appointmentNotes',     // Your Notes field ID
     '9': 'staffName',            // Your Staff field ID
   });
   ```

## Step 5: Set Up Jotform Webhook

1. **In your Jotform form**, go to **Settings → Integrations**
2. **Click "Webhooks"**
3. **Add a new webhook**:
   - **Webhook URL**: `https://your-replit-domain.replit.app/api/jotform/webhook`
   - **Event**: `On Submit`
   - **Method**: `POST`
   - **Format**: `JSON`

## Step 6: Test the Integration

1. **Restart your app** to load the new Jotform integration
2. **Submit a test form** in Jotform
3. **Check your app's logs** to see if the submission was processed
4. **Verify the appointment was created** in your app
5. **Check that the submission was deleted** from Jotform

## Step 7: Monitor and Debug

### Check Webhook Status
```bash
curl "https://your-replit-domain.replit.app/api/jotform/webhook"
```

### View App Logs
Check your Replit console for:
- `Jotform webhook received:` - Shows incoming data
- `Processing Jotform submission:` - Shows processing steps
- `Successfully processed Jotform submission:` - Shows success
- `Successfully deleted Jotform submission` - Shows deletion

## Troubleshooting

### Common Issues:

1. **"JOTFORM_API_KEY not set"**
   - Make sure you added the environment variable in Replit Secrets

2. **"Invalid webhook data"**
   - Check that your Jotform form is sending data in the correct format
   - Verify the webhook URL is correct

3. **"Missing appointment date or time"**
   - Check your field mappings
   - Ensure date and time fields are properly configured

4. **"Failed to create or find client"**
   - Check that required client fields are mapped correctly
   - Verify email format is valid

5. **"No staff members available"**
   - Add at least one staff member to your app
   - Or include staff information in your Jotform

### Debug Steps:

1. **Check field mappings**:
   ```bash
   # Test with a sample submission
   curl -X POST https://your-replit-domain.replit.app/api/jotform/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "formID": "test",
       "submissionID": "test123",
       "created_at": "2025-01-27T10:00:00Z",
       "answers": {
         "1": {"answer": "John"},
         "2": {"answer": "Doe"},
         "3": {"answer": "john@example.com"},
         "4": {"answer": "555-123-4567"},
         "5": {"answer": "Haircut"},
         "6": {"answer": "2025-01-28"},
         "7": {"answer": "10:00"}
       }
     }'
   ```

2. **Check Jotform API**:
   - Verify your API key works by testing with Jotform's API

## Advanced Configuration

### Custom Field Mappings
You can customize how Jotform fields map to your app:

```typescript
// In server/routes.ts
const jotformIntegration = new JotformIntegration(storage, {
  // Your custom mappings here
  'custom_field_id': 'app_field_name',
});
```

### Service Pricing
The integration will use default pricing if not specified. You can:
- Set prices in your Jotform form
- Configure default services in your app
- Use service names that match existing services

### Staff Assignment
- If staff name is provided, it will create/find that staff member
- If no staff is specified, it will use the first available staff member
- You can pre-configure staff members in your app

## Security Notes

- The webhook endpoint is public - consider adding authentication if needed
- Jotform API key should be kept secure
- Form submissions are deleted after processing to avoid duplicates

## Support

If you encounter issues:
1. Check the app logs for error messages
2. Verify your Jotform form configuration
3. Test the webhook endpoint manually
4. Ensure all required fields are properly mapped 