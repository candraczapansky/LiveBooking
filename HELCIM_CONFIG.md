# Helcim Payment Configuration

To enable real Helcim payment processing (instead of mock mode), you need to configure your Helcim API credentials.

## Required Environment Variables

Add the following to your `.env` file:

```bash
# Helcim Payment Configuration
HELCIM_API_TOKEN=your_helcim_api_token_here
HELCIM_API_URL=https://api.helcim.com/v2
HELCIM_TERMINAL_DEVICE_CODE=your_terminal_device_code_here
```

## Getting Your Helcim Credentials

1. **API Token**: Log in to your Helcim account and navigate to Settings > API Tokens
2. **Terminal Device Code**: This is provided when you set up a terminal device in Helcim

## Mock Mode

If these environment variables are not set or if `HELCIM_API_TOKEN` is empty or set to "test", the application will automatically use mock mode for development and testing. In mock mode:

- Cards are saved with mock IDs
- No real charges are made
- Test data is generated for card details

## Testing

After configuring your credentials:

1. Restart the server: `npm run dev`
2. Test the booking flow with card saving
3. Verify saved cards appear in checkout

## Notes

- The database has been updated to work with Helcim instead of Square
- The `square_card_id` field is now optional for backward compatibility
- All new cards are saved with `helcim_card_id`
