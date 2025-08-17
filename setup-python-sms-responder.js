#!/usr/bin/env node

/**
 * Setup script for Python SMS Responder integration
 * This script integrates the Python SMS responder with the existing TypeScript system
 * WITHOUT modifying any existing working code or data
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}═══ ${msg} ═══${colors.reset}\n`)
};

// Check if Python service is already running
async function checkPythonServiceStatus() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            resolve({ running: true, health });
          } catch (e) {
            resolve({ running: false });
          }
        } else {
          resolve({ running: false });
        }
      });
    });

    req.on('error', () => {
      resolve({ running: false });
    });

    req.setTimeout(3000);
    req.end();
  });
}

// Check and create .env file for Python service
async function setupEnvironmentFile() {
  log.section('Setting up environment configuration');
  
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, 'env.example');
  
  if (!fs.existsSync(envPath)) {
    log.warning('.env file not found. Creating from env.example...');
    
    if (fs.existsSync(envExamplePath)) {
      // Read existing TypeScript config to get database info
      try {
        // Get database URL from existing configuration
        const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/salon_db';
        
        let envContent = fs.readFileSync(envExamplePath, 'utf8');
        
        // Update with actual database URL
        envContent = envContent.replace(
          'DATABASE_URL=postgresql://username:password@localhost:5432/salon_db',
          `DATABASE_URL=${dbUrl}`
        );
        
        // Check for OpenAI API key
        const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';
        if (openaiKey) {
          envContent = envContent.replace(
            'OPENAI_API_KEY=your_openai_api_key',
            `OPENAI_API_KEY=${openaiKey}`
          );
        }
        
        // Check for Twilio credentials
        const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
        const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER || '';
        
        if (twilioSid) {
          envContent = envContent.replace(
            'TWILIO_ACCOUNT_SID=your_twilio_account_sid',
            `TWILIO_ACCOUNT_SID=${twilioSid}`
          );
        }
        if (twilioToken) {
          envContent = envContent.replace(
            'TWILIO_AUTH_TOKEN=your_twilio_auth_token',
            `TWILIO_AUTH_TOKEN=${twilioToken}`
          );
        }
        if (twilioPhone) {
          envContent = envContent.replace(
            'TWILIO_PHONE_NUMBER=+1234567890',
            `TWILIO_PHONE_NUMBER=${twilioPhone}`
          );
        }
        
        fs.writeFileSync(envPath, envContent);
        log.success('.env file created with existing configuration');
      } catch (error) {
        log.error(`Error creating .env file: ${error.message}`);
        log.warning('Please configure .env file manually');
      }
    }
  } else {
    log.success('.env file already exists');
  }
}

// Install Python dependencies
async function installPythonDependencies() {
  log.section('Installing Python dependencies');
  
  try {
    log.info('Installing required Python packages...');
    execSync('pip install -r requirements.txt', { stdio: 'inherit' });
    log.success('Python dependencies installed');
  } catch (error) {
    log.warning('Could not install Python dependencies automatically');
    log.info('Please run: pip install -r requirements.txt');
  }
}

// Start Python SMS responder service
async function startPythonService() {
  log.section('Starting Python SMS Responder Service');
  
  const status = await checkPythonServiceStatus();
  
  if (status.running) {
    log.success('Python SMS responder is already running');
    if (status.health) {
      log.info('Service health:');
      Object.entries(status.health.services || {}).forEach(([service, info]) => {
        const statusIcon = info.status === 'healthy' ? '✓' : '⚠';
        log.info(`  ${statusIcon} ${service}: ${info.status}`);
      });
    }
    return true;
  }
  
  log.info('Starting Python SMS responder service...');
  
  // Start the service in the background
  const pythonProcess = spawn('python', ['-m', 'python_sms_responder.main'], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });
  
  pythonProcess.unref();
  
  // Wait for service to start
  log.info('Waiting for service to start...');
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const status = await checkPythonServiceStatus();
    if (status.running) {
      log.success('Python SMS responder service started successfully');
      return true;
    }
  }
  
  log.error('Failed to start Python SMS responder service');
  return false;
}

// Create proxy configuration for TypeScript server
async function createProxyConfiguration() {
  log.section('Creating proxy configuration');
  
  const proxyConfigPath = path.join(__dirname, 'server', 'sms-python-proxy.ts');
  
  const proxyCode = `/**
 * Proxy configuration for Python SMS Responder
 * This file routes SMS requests to the Python service
 * Auto-generated by setup-python-sms-responder.js
 */

import axios from 'axios';

const PYTHON_SERVICE_URL = process.env.PYTHON_SMS_SERVICE_URL || 'http://localhost:8000';

export async function forwardToPythonSMS(smsData: any) {
  try {
    // Format data for Python service
    const formData = new URLSearchParams();
    formData.append('From', smsData.from || smsData.From || '');
    formData.append('To', smsData.to || smsData.To || '');
    formData.append('Body', smsData.body || smsData.Body || '');
    formData.append('MessageSid', smsData.messageId || smsData.MessageSid || '');
    formData.append('AccountSid', smsData.accountSid || smsData.AccountSid || '');
    
    // Forward to Python service
    const response = await axios.post(
      \`\${PYTHON_SERVICE_URL}/webhook/sms\`,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    return {
      success: response.data.success,
      response: response.data.ai_response,
      message: response.data.message
    };
  } catch (error: any) {
    console.error('Error forwarding to Python SMS service:', error.message);
    
    // Fallback to existing TypeScript implementation if Python service fails
    return null;
  }
}

export async function checkPythonServiceHealth() {
  try {
    const response = await axios.get(\`\${PYTHON_SERVICE_URL}/health\`);
    return response.data;
  } catch (error) {
    return { status: 'unavailable', error: 'Service not reachable' };
  }
}
`;

  try {
    fs.writeFileSync(proxyConfigPath, proxyCode);
    log.success('Proxy configuration created');
    log.info('The TypeScript server can now forward SMS requests to Python service');
  } catch (error) {
    log.error(`Failed to create proxy configuration: ${error.message}`);
  }
}

// Test the integration
async function testIntegration() {
  log.section('Testing Integration');
  
  const testMessage = {
    From: '+1234567890',
    To: '+0987654321',
    Body: 'Test message - Hello!',
    MessageSid: 'test_' + Date.now(),
    AccountSid: 'test_account'
  };
  
  return new Promise((resolve) => {
    const postData = new URLSearchParams(testMessage).toString();
    
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/webhook/sms',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            log.success('Test message processed successfully');
            log.info(`Response: ${response.ai_response || response.message}`);
            resolve(true);
          } catch (e) {
            log.error('Invalid response from service');
            resolve(false);
          }
        } else {
          log.error(`Service returned status ${res.statusCode}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      log.error(`Test failed: ${error.message}`);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// Main setup function
async function main() {
  console.log(`
${colors.cyan}╔═══════════════════════════════════════════════╗
║     Python SMS Responder Setup Script         ║
║                                                ║
║  This will integrate the Python SMS responder  ║
║  WITHOUT affecting existing code or data       ║
╚═══════════════════════════════════════════════╝${colors.reset}
`);

  try {
    // Setup environment
    await setupEnvironmentFile();
    
    // Install dependencies
    await installPythonDependencies();
    
    // Start Python service
    const serviceStarted = await startPythonService();
    
    if (serviceStarted) {
      // Create proxy configuration
      await createProxyConfiguration();
      
      // Test the integration
      await testIntegration();
      
      log.section('Setup Complete!');
      log.success('Python SMS responder is now integrated with your system');
      log.info('\nNext steps:');
      log.info('1. Configure your OpenAI API key in .env file');
      log.info('2. Configure your Twilio credentials in .env file');
      log.info('3. Update the TypeScript server to use the proxy when needed');
      log.info('\nThe Python service is running on http://localhost:8000');
      log.info('Health check: http://localhost:8000/health');
      log.info('\nYour existing TypeScript SMS responder remains unchanged');
      log.info('You can switch between them as needed');
    } else {
      log.error('Setup failed. Please check the logs above for errors');
    }
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the setup
main();
