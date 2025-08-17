/**
 * Python SMS Responder Integration Module
 * This module provides integration with the Python SMS responder service
 * while maintaining backward compatibility with the existing TypeScript implementation
 */

import axios from 'axios';
import { IncomingSMS, SMSAutoRespondResult } from './sms-auto-respond-service';

// Configuration
const PYTHON_SERVICE_URL = process.env.PYTHON_SMS_SERVICE_URL || 'http://localhost:8000';
const USE_PYTHON_RESPONDER = process.env.USE_PYTHON_SMS_RESPONDER === 'true';

/**
 * Check if Python SMS service is available and healthy
 */
export async function isPythonServiceAvailable(): Promise<boolean> {
  if (!USE_PYTHON_RESPONDER) {
    return false;
  }
  
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, {
      timeout: 2000
    });
    
    return response.data?.status === 'healthy';
  } catch (error) {
    console.log('Python SMS service not available:', error.message);
    return false;
  }
}

/**
 * Forward SMS to Python service for processing
 */
export async function processSMSWithPython(sms: IncomingSMS): Promise<SMSAutoRespondResult | null> {
  try {
    // Check if we should use Python service
    if (!USE_PYTHON_RESPONDER) {
      return null;
    }
    
    // Format data for Python service (Twilio webhook format)
    const formData = new URLSearchParams();
    formData.append('From', sms.from);
    formData.append('To', sms.to);
    formData.append('Body', sms.body);
    formData.append('MessageSid', sms.messageId || `msg_${Date.now()}`);
    formData.append('AccountSid', sms.accountSid || 'default_account');
    formData.append('NumMedia', '0');
    
    console.log('Forwarding SMS to Python service:', {
      from: sms.from,
      body: sms.body.substring(0, 50) + '...'
    });
    
    // Forward to Python service
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/webhook/sms`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    if (response.data.success) {
      console.log('Python service processed SMS successfully');
      
      // The Python service sends the SMS directly via Twilio
      // We just need to confirm it was processed
      return {
        success: true,
        responseSent: true,
        response: response.data.ai_response || response.data.message,
        confidence: 0.9,
        processedBy: 'python'
      };
    }
    
    // If Python service didn't succeed, fall back to TypeScript
    console.log('Python service returned success=false, falling back to TypeScript');
    return null;
    
  } catch (error: any) {
    console.error('Error forwarding to Python SMS service:', error.message);
    
    // Return null to fall back to TypeScript implementation
    return null;
  }
}

/**
 * Get Python service health status
 */
export async function getPythonServiceHealth(): Promise<any> {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, {
      timeout: 5000
    });
    
    return response.data;
  } catch (error: any) {
    return {
      status: 'unavailable',
      error: error.message
    };
  }
}

/**
 * Test Python service with a sample message
 */
export async function testPythonService(testMessage?: string): Promise<any> {
  try {
    const formData = new URLSearchParams();
    formData.append('From', '+1234567890');
    formData.append('To', '+0987654321');
    formData.append('Body', testMessage || 'Test message - Hello!');
    formData.append('MessageSid', `test_${Date.now()}`);
    formData.append('AccountSid', 'test_account');
    formData.append('NumMedia', '0');
    
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/webhook/sms`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    return {
      success: true,
      response: response.data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Configuration helper to enable/disable Python service
 */
export function configurePythonService(enabled: boolean): void {
  process.env.USE_PYTHON_SMS_RESPONDER = enabled ? 'true' : 'false';
  console.log(`Python SMS responder ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Get current configuration status
 */
export function getPythonServiceConfig(): {
  enabled: boolean;
  url: string;
  available: boolean;
} {
  return {
    enabled: USE_PYTHON_RESPONDER,
    url: PYTHON_SERVICE_URL,
    available: false // Will be updated asynchronously
  };
}







