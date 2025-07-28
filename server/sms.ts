import twilio from 'twilio';
import { DatabaseStorage } from './storage.js';
import { DatabaseConfig } from './config.js';

// Initialize storage and config for database credentials
let storage: DatabaseStorage | null = null;
let dbConfig: DatabaseConfig | null = null;

// Try to initialize database connection
try {
  storage = new DatabaseStorage();
  dbConfig = new DatabaseConfig(storage);
} catch (error) {
  console.log('SMS Service: Database not available, using environment variables only');
}

// Get credentials from environment variables (fallback)
const envAccountSid = process.env.TWILIO_ACCOUNT_SID;
const envAuthToken = process.env.TWILIO_AUTH_TOKEN;
const envTwilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER?.replace(/^\+\+/, '+') || process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
let twilioClient: twilio.Twilio | null = null;

async function initializeTwilioClient() {
  try {
    // First try to get credentials from database
    let accountSid = envAccountSid;
    let authToken = envAuthToken;
    let twilioPhoneNumber = envTwilioPhoneNumber;

    if (dbConfig) {
      const dbAccountSid = await dbConfig.getConfig('twilio_account_sid');
      const dbAuthToken = await dbConfig.getConfig('twilio_auth_token');
      const dbPhoneNumber = await dbConfig.getConfig('twilio_phone_number');

      if (dbAccountSid && dbAuthToken) {
        accountSid = dbAccountSid;
        authToken = dbAuthToken;
        console.log('SMS Service: Using Twilio credentials from database');
      }
      
      if (dbPhoneNumber) {
        twilioPhoneNumber = dbPhoneNumber;
      }
    }

    if (accountSid && authToken) {
      // Validate Account SID format
      if (!accountSid.startsWith('AC')) {
        console.error('Invalid Twilio Account SID format. Account SID must start with "AC". You may have provided an API Key instead.');
        return;
      }
      
      twilioClient = twilio(accountSid, authToken);
      console.log('Twilio client initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error);
  }
}

// Initialize on module load
initializeTwilioClient();

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function isValidPhoneNumber(phone: string): boolean {
  // In development mode, be very permissive with test numbers
  if (process.env.NODE_ENV === 'development') {
    // Allow any test pattern in development
    if (phone.includes('1234567890') || phone.includes('555-555-') || phone.includes('5555') || phone.includes('XXXX') || phone.includes('1234567')) {
      return true;
    }
    // In development, allow any phone number that looks like a test number
    if (phone.includes('test') || phone.includes('demo') || phone.includes('example')) {
      return true;
    }
    // Allow common test patterns
    if (phone.match(/\+1\d{10}/) || phone.match(/\+1\d{3}\d{3}\d{4}/)) {
      return true;
    }
  }
  
  // Check for placeholder patterns (common test numbers)
  if (phone.includes('555-555-') || phone.includes('5555') ||
      phone.match(/\d{3}-?\d{3}-?[Xx]{4}/)) {
    return false;
  }
  
  // Allow masked phone numbers (containing XXXX) in development mode
  if (process.env.NODE_ENV === 'development' && (phone.includes('XXXX') || phone.includes('123456XXXX'))) {
    return true;
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a valid US phone number (10 digits) or international (7-15 digits)
  if (digits.length === 10) {
    // US phone number validation - allow numbers starting with 1 (area codes)
    const isNotTestNumber = !digits.startsWith('555');
    return isNotTestNumber;
  }
  
  // International number validation (7-15 digits)
  return digits.length >= 7 && digits.length <= 15;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  // In development mode, simulate SMS sending for test numbers only
  if (process.env.NODE_ENV === 'development') {
    const isTestNumber = to.includes('1234567890') || 
                        to.includes('test') || 
                        to.includes('demo') || 
                        to.includes('555-555-') || 
                        to.includes('5555') || 
                        to.includes('+15551234567') ||
                        to.includes('5551234567') ||
                        to.includes('15551234567');
    if (isTestNumber) {
      console.log('DEVELOPMENT MODE: Simulating SMS send to:', to);
      console.log('DEVELOPMENT MODE: Message:', message);
      return {
        success: true,
        messageId: `dev_${Date.now()}`
      };
    } else {
      console.log('DEVELOPMENT MODE: Sending REAL SMS to:', to);
      console.log('DEVELOPMENT MODE: Message:', message);
    }
  }

  // Get current Twilio phone number from database or environment
  let currentTwilioPhoneNumber = envTwilioPhoneNumber;
  if (dbConfig) {
    const dbPhoneNumber = await dbConfig.getConfig('twilio_phone_number');
    if (dbPhoneNumber) {
      currentTwilioPhoneNumber = dbPhoneNumber;
    }
  }

  if (!twilioClient || !currentTwilioPhoneNumber) {
    return {
      success: false,
      error: 'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables or configure them in the database.'
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
      from: currentTwilioPhoneNumber,
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

export async function isTwilioConfigured(): Promise<boolean> {
  // Check if we have a Twilio client initialized
  if (twilioClient) {
    return true;
  }
  
  // Check environment variables
  if (envAccountSid && envAuthToken && envTwilioPhoneNumber) {
    return true;
  }
  
  // Check database configuration
  if (dbConfig) {
    try {
      const dbAccountSid = await dbConfig.getConfig('twilio_account_sid');
      const dbAuthToken = await dbConfig.getConfig('twilio_auth_token');
      const dbPhoneNumber = await dbConfig.getConfig('twilio_phone_number');
      
      return !!(dbAccountSid && dbAuthToken && dbPhoneNumber);
    } catch (error) {
      console.error('Error checking database Twilio configuration:', error);
      return false;
    }
  }
  
  return false;
}