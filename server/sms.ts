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
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

async function initializeTwilioClient() {
  if (isInitializing) {
    // If already initializing, wait for the existing promise
    if (initializationPromise) {
      await initializationPromise;
    }
    return;
  }

  if (twilioClient) {
    // Already initialized
    return;
  }

  isInitializing = true;
  initializationPromise = (async () => {
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
    } finally {
      isInitializing = false;
    }
  })();

  await initializationPromise;
}

// Initialize on module load
initializeTwilioClient();

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MMSResult {
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
  if (phone.includes('555-555-') ||
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

// Normalize a phone number into E.164 format where possible
function formatToE164(phone: string): string {
  try {
    const trimmed = (phone || '').toString().trim();
    if (trimmed.startsWith('+')) return trimmed;
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return trimmed;
    // US: 10 digits => +1XXXXXXXXXX
    if (digits.length === 10) return `+1${digits}`;
    // US with leading 1: 11 digits starting with 1 => +1XXXXXXXXXX
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    // Fallback international: prefix '+'
    return `+${digits}`;
  } catch {
    return phone;
  }
}

// Always append compliance text to the end of outbound SMS/MMS
const SMS_COMPLIANCE_TEXT = "Reply STOP to opt out. Reply HELP for help. Msg & data rates may apply.";

function ensureSmsCompliance(message: string): string {
  const base = (message ?? '').toString().trim();
  // Avoid duplicating if an opt-out is already present
  const hasOptOut = /\b(reply|text)\s+stop\b/i.test(base) || /\bstop\b.*\b(unsubscribe|opt\s*out)\b/i.test(base);
  if (hasOptOut) {
    return base;
  }
  return `${base}${base.length ? '\n\n' : ''}${SMS_COMPLIANCE_TEXT}`;
}

// Normalize a phone number to a stable key format for opt-out checks (prefer E.164)
function normalizePhoneForKey(phone: string): string {
  try {
    const trimmed = (phone || '').toString().trim();
    if (trimmed.startsWith('+')) return trimmed;
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length === 10) return `+1${digitsOnly}`; // assume US
    if (digitsOnly.length > 0) return `+${digitsOnly}`; // fallback international
  } catch {}
  return (phone || '').toString();
}

// Check if a phone number is globally opted out via system configuration
async function isPhoneGloballyOptedOut(phone: string): Promise<boolean> {
  try {
    if (!storage) return false; // gracefully skip if DB unavailable
    const key = `sms_opt_out:${normalizePhoneForKey(phone)}`;
    const cfg = await storage.getSystemConfig(key);
    if (!cfg || !cfg.value) return false;
    const raw = (cfg.value || '').toString();
    if (raw === 'true') return true;
    try {
      const parsed = JSON.parse(raw);
      return !!parsed?.optedOut;
    } catch {
      return raw.toLowerCase() === 'yes' || raw.toLowerCase() === 'opted_out';
    }
  } catch {
    return false;
  }
}

// Mark phone as opted-out based on Twilio 21610 or other indicators
async function markPhoneOptedOut(phone: string, reason: string = 'twilio_block_21610'): Promise<void> {
  try {
    if (!storage) return;
    const normalized = normalizePhoneForKey(phone);
    const key = `sms_opt_out:${normalized}`;
    const value = JSON.stringify({ optedOut: true, at: new Date().toISOString(), reason });
    const existing = await storage.getSystemConfig(key);
    if (existing) {
      await storage.updateSystemConfig(key, value, 'Auto SMS opt-out');
    } else {
      await storage.setSystemConfig({ key, value, description: 'Auto SMS opt-out', isEncrypted: false, isActive: true } as any);
    }
    // Update user flags if user can be matched
    try {
      let user = await (storage as any).getUserByPhone?.(normalized);
      if (!user) {
        const last10 = normalized.replace(/\D/g, '').slice(-10);
        const users = await storage.getUsersByRole('client');
        user = (users as any[]).find((u: any) => (u.phone || '').replace(/\D/g, '').slice(-10) === last10);
      }
      if (user?.id) {
        await storage.updateUser(user.id, {
          smsAccountManagement: false,
          smsAppointmentReminders: false,
          smsPromotions: false,
        } as any);
      }
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

export async function sendSMS(to: string, message: string, photoUrl?: string): Promise<SMSResult> {
  // If photo is provided, send as MMS
  if (photoUrl) {
    return sendMMS(to, message, photoUrl);
  }

  // Ensure Twilio client is initialized
  if (!twilioClient) {
    await initializeTwilioClient();
  }

  // Ensure compliance text is appended
  const finalMessage = ensureSmsCompliance(message);

  // Enforce global SMS opt-out suppression
  if (await isPhoneGloballyOptedOut(to)) {
    return {
      success: false,
      error: 'Recipient has opted out of SMS communications.'
    };
  }

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
      console.log('DEVELOPMENT MODE: Message:', finalMessage);
      return {
        success: true,
        messageId: `dev_${Date.now()}`
      };
    } else {
      console.log('DEVELOPMENT MODE: Sending REAL SMS to:', to);
      console.log('DEVELOPMENT MODE: Message:', finalMessage);
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
    // Ensure phone number has country code (robust formatting)
    const formattedTo = formatToE164(to);
    
    const messageResponse = await twilioClient.messages.create({
      body: finalMessage,
      from: currentTwilioPhoneNumber,
      to: formattedTo,
    });

    return {
      success: true,
      messageId: messageResponse.sid
    };
  } catch (error: any) {
    console.error('SMS sending error:', error);
    const code = error?.code || error?.status || error?.moreInfo || '';
    const messageText = (error?.message || '').toString();
    if (String(code) === '21610' || /21610/.test(messageText)) {
      await markPhoneOptedOut(to, 'twilio_block_21610');
    }
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
}

export async function sendMMS(to: string, message: string, photoUrl: string): Promise<MMSResult> {
  // Ensure Twilio client is initialized
  if (!twilioClient) {
    await initializeTwilioClient();
  }

  // Build MMS message and append compliance text at the very end (no bracketed note)
  const finalMmsMessage = ensureSmsCompliance(message);

  // Enforce global SMS opt-out suppression
  if (await isPhoneGloballyOptedOut(to)) {
    return {
      success: false,
      error: 'Recipient has opted out of SMS communications.'
    };
  }

  // In development mode, simulate MMS sending for test numbers only
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
      console.log('DEVELOPMENT MODE: Simulating MMS send to:', to);
      console.log('DEVELOPMENT MODE: Message:', finalMmsMessage);
      console.log('DEVELOPMENT MODE: Photo URL:', photoUrl);
      return {
        success: true,
        messageId: `dev_mms_${Date.now()}`
      };
    } else {
      console.log('DEVELOPMENT MODE: Sending REAL MMS to:', to);
      console.log('DEVELOPMENT MODE: Message:', finalMmsMessage);
      console.log('DEVELOPMENT MODE: Photo URL:', photoUrl);
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
    // Ensure phone number has country code (robust formatting)
    const formattedTo = formatToE164(to);
    
    // For MMS, Twilio requires a publicly accessible media URL
    const isHttpUrl = /^https?:\/\//i.test(photoUrl);
    const urlHost = (() => {
      try { return isHttpUrl ? new URL(photoUrl).hostname : ''; } catch { return ''; }
    })();
    const isLocalHostLike = /^(localhost|127\.|0\.0\.0\.0)$/i.test(urlHost);
    const isPrivateNetwork = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(urlHost);
    const isHttps = (() => { try { return new URL(photoUrl).protocol === 'https:'; } catch { return false; } })();
    const shouldAttachMedia = isHttpUrl && isHttps && !isLocalHostLike && !isPrivateNetwork;
    const mediaUrls = shouldAttachMedia ? [photoUrl] : undefined;
    const messageCreatePayload: any = {
      body: finalMmsMessage,
      from: currentTwilioPhoneNumber,
      to: formattedTo,
    };
    if (mediaUrls) {
      // Twilio v5 SDK uses 'mediaUrl' array for MMS
      messageCreatePayload.mediaUrl = mediaUrls;
    }
    const messageResponse = await twilioClient.messages.create(messageCreatePayload);

    return {
      success: true,
      messageId: messageResponse.sid
    };
  } catch (error: any) {
    console.error('MMS sending error:', error);
    const code = error?.code || error?.status || error?.moreInfo || '';
    const messageText = (error?.message || '').toString();
    if (String(code) === '21610' || /21610/.test(messageText)) {
      await markPhoneOptedOut(to, 'twilio_block_21610');
    }
    return {
      success: false,
      error: error.message || 'Failed to send MMS'
    };
  }
}

export async function isTwilioConfigured(): Promise<boolean> {
  // Ensure Twilio client is initialized (validates Account SID format)
  if (!twilioClient) {
    await initializeTwilioClient();
  }

  // Determine current phone number from env or DB
  let currentTwilioPhoneNumber = envTwilioPhoneNumber;
  if (dbConfig) {
    try {
      const dbPhoneNumber = await dbConfig.getConfig('twilio_phone_number');
      if (dbPhoneNumber) {
        currentTwilioPhoneNumber = dbPhoneNumber;
      }
    } catch (error) {
      console.error('Error checking database Twilio phone number:', error);
    }
  }

  // Configuration is considered valid only when both a client and phone number are available
  return !!(twilioClient && currentTwilioPhoneNumber);
}