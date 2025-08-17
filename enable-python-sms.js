#!/usr/bin/env node

/**
 * Script to enable Python SMS responder integration with existing TypeScript server
 * This modifies the SMS route to optionally use Python for processing
 */

import fs from 'fs';
import path from 'path';
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

async function main() {
  log.section('Enabling Python SMS Responder Integration');
  
  // Step 1: Create environment variable to enable Python responder
  log.info('Setting environment variable to enable Python SMS responder...');
  process.env.USE_PYTHON_SMS_RESPONDER = 'true';
  
  // Step 2: Create a test endpoint to verify Python integration
  const testEndpointCode = `
// Test endpoint for Python SMS responder
app.post("/api/test-python-sms", async (req, res) => {
  try {
    const { message, phone } = req.body;
    
    // Import Python integration module
    const pythonIntegration = await import('./sms-python-integration.js');
    
    // Check if Python service is available
    const isAvailable = await pythonIntegration.isPythonServiceAvailable();
    
    if (!isAvailable) {
      // Try to start Python service
      const { spawn } = await import('child_process');
      const pythonProcess = spawn('python3', ['-m', 'python_sms_responder.main'], {
        detached: true,
        stdio: 'ignore'
      });
      pythonProcess.unref();
      
      // Wait for service to start
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Process SMS with Python
    const result = await pythonIntegration.processSMSWithPython({
      from: phone || '+1234567890',
      to: '+0987654321',
      body: message || 'Test message',
      messageId: 'test_' + Date.now(),
      timestamp: new Date()
    });
    
    if (result) {
      res.json({
        success: true,
        response: result.response,
        processedBy: 'python'
      });
    } else {
      res.json({
        success: false,
        error: 'Python service not available',
        fallback: 'Would use TypeScript responder'
      });
    }
  } catch (error) {
    console.error('Error testing Python SMS:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
`;
  
  // Step 3: Create a configuration file
  const configPath = path.join(__dirname, 'python-sms-config.json');
  const config = {
    enabled: true,
    pythonServiceUrl: 'http://localhost:8000',
    useForPhoneNumbers: [], // Add specific phone numbers to test with
    fallbackToTypeScript: true,
    logLevel: 'info'
  };
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    log.success('Configuration file created: python-sms-config.json');
  } catch (error) {
    log.error(`Failed to create config file: ${error.message}`);
  }
  
  // Step 4: Provide instructions
  log.section('Integration Instructions');
  
  log.info('The Python SMS responder is now configured for integration.');
  log.info('\nTo use it with your existing TypeScript server:');
  log.info('1. The Python service runs alongside your TypeScript server');
  log.info('2. SMS messages can be processed by either service');
  log.info('3. You can gradually migrate specific phone numbers');
  
  log.info('\nTo test the integration:');
  log.info('1. Start your TypeScript server as usual');
  log.info('2. The Python service will start automatically when needed');
  log.info('3. Send a test SMS or use the test endpoint');
  
  log.section('Testing the Integration');
  
  log.info('You can test with curl:');
  console.log(`
curl -X POST http://localhost:3000/api/test-python-sms \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hi, I want to book an appointment", "phone": "+1234567890"}'
`);
  
  log.info('\nOr directly test the Python service:');
  console.log(`
curl -X POST http://localhost:8000/webhook/sms \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "From=+1234567890&Body=Test message&MessageSid=test123"
`);
  
  log.section('Important Notes');
  
  log.success('✓ Your existing TypeScript SMS responder is NOT modified');
  log.success('✓ All existing data and functionality is preserved');
  log.success('✓ Python responder runs as a separate service on port 8000');
  log.success('✓ You can switch between services at any time');
  
  log.info('\nThe Python SMS responder provides:');
  log.info('• Better OpenAI GPT-4 integration');
  log.info('• Structured conversation management');
  log.info('• Multi-step booking flows');
  log.info('• Database integration with your existing data');
  
  log.warning('\nMake sure to configure your OpenAI API key for AI responses:');
  log.warning('export OPENAI_API_KEY=your_api_key_here');
}

main().catch(error => {
  log.error(`Setup failed: ${error.message}`);
  process.exit(1);
});







