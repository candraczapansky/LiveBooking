import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client if credentials are available
let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken) {
  try {
    // Validate Account SID format
    if (!accountSid.startsWith('AC')) {
      console.error('Invalid Twilio Account SID format. Account SID must start with "AC". You may have provided an API Key instead.');
    } else {
      twilioClient = twilio(accountSid, authToken);
      console.log('Twilio client initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error);
  }
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function isValidPhoneNumber(phone: string): boolean {
  // Check for placeholder patterns (common test numbers)
  if (phone.includes('X') || phone.includes('x') || 
      phone.includes('555-555-') || phone.includes('5555') ||
      phone.match(/\d{3}-?\d{3}-?[Xx]{4}/)) {
    return false;
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a valid US phone number (10 digits) or international (7-15 digits)
  if (digits.length === 10) {
    // US phone number validation - shouldn't start with 0 or 1, avoid test numbers
    const isValidStart = !digits.startsWith('0') && !digits.startsWith('1');
    const isNotTestNumber = !digits.startsWith('555');
    return isValidStart && isNotTestNumber;
  }
  
  // International number validation (7-15 digits)
  return digits.length >= 7 && digits.length <= 15;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  if (!twilioClient || !twilioPhoneNumber) {
    return {
      success: false,
      error: 'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.'
    };
  }

  // Validate phone number before attempting to send
  if (!isValidPhoneNumber(to)) {
    return {
      success: false,
      error: `Invalid phone number format: ${to}. Please provide a valid phone number.`
    };
  }

  try {
    // Ensure phone number has country code
    const formattedTo = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '')}`;
    
    const messageResponse = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedTo,
    });

    return {
      success: true,
      messageId: messageResponse.sid
    };
  } catch (error: any) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
}

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && twilioPhoneNumber);
}