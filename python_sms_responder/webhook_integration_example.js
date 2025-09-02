/**
 * Example of how to integrate the LLM module into your existing webhook handler.
 * This shows how to modify your existing Node.js webhook handler to use the Python LLM integration.
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Your existing SMS processing functions
const { 
  processSMSAutomation,
  sendConfirmation, 
  sendCancellation,
  updateUserSmsFlagsByPhone,
  isStopKeyword,
  isStartKeyword,
  setSmsOptOut,
  clearSmsOptOut,
  escapeForXml
} = require('../your-existing-sms-module');

/**
 * Helper function to call the Python LLM integration
 * @param {object} webhookData - The Twilio webhook data
 * @returns {Promise<object>} - Result of LLM processing
 */
async function callLLMIntegration(webhookData) {
  return new Promise((resolve, reject) => {
    // Path to the Python script that will call the LLM integration
    const pythonScriptPath = path.join(__dirname, 'call_llm_integration.py');
    
    // Spawn Python process
    const pythonProcess = spawn('python', [pythonScriptPath]);
    
    let resultData = '';
    let errorData = '';

    // Send webhook data to Python script
    pythonProcess.stdin.write(JSON.stringify(webhookData));
    pythonProcess.stdin.end();

    // Collect output
    pythonProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Error: ${errorData}`);
        reject(new Error(`Python process failed: ${errorData}`));
        return;
      }

      try {
        const result = JSON.parse(resultData);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${err.message}`));
      }
    });
  });
}

/**
 * Your existing webhook handler, modified to include LLM processing
 */
router.post('/api/terminal/webhook', async (req, res) => {
  try {
    const from = (req.body.From || req.body.from || '').toString();
    const to = (req.body.To || req.body.to || '').toString();
    const body = (req.body.Body || req.body.body || '').toString();
    const messageId = (req.body.MessageSid || req.body.messageId || `sid_${Date.now()}`).toString();

    if (!from || !to || !body) {
      return res.status(400).send('<Response></Response>');
    }

    console.log('📨 Incoming SMS webhook:', { from, to, bodyPreview: body.slice(0, 80), messageId });

    // Handle STOP/START keywords first (compliance and suppression)
    if (isStopKeyword(body)) {
      await setSmsOptOut(from);
      await updateUserSmsFlagsByPhone(from, false);
      res.set('Content-Type', 'text/xml');
      const msg = escapeForXml('You are unsubscribed. Reply START to re-subscribe.');
      return res.send(`<Response><Message>${msg}</Message></Response>`);
    }
    
    if (isStartKeyword(body)) {
      await clearSmsOptOut(from);
      await updateUserSmsFlagsByPhone(from, true);
      res.set('Content-Type', 'text/xml');
      const msg = escapeForXml('You have been re-subscribed.');
      return res.send(`<Response><Message>${msg}</Message></Response>`);
    }

    // Check if this is an automation message (confirmations, cancellations, etc.)
    const automationResult = await processSMSAutomation(from, body);
    
    // If the message was handled by automation, return the result
    if (automationResult.handled) {
      console.log('✅ Message handled by existing automation');
      res.set('Content-Type', 'text/xml');
      return res.send(automationResult.response);
    }
    
    // Message wasn't handled by automation, try LLM
    console.log('🤖 Message not recognized as automation, trying LLM');
    
    try {
      // Call the Python LLM integration
      const llmResult = await callLLMIntegration(req.body);
      
      if (llmResult.success && llmResult.llm_handled) {
        // LLM handled the message and sent a response
        console.log('✅ Message processed by LLM:', llmResult.response);
        
        // Return empty response since LLM already sent the SMS reply
        res.set('Content-Type', 'text/xml');
        return res.send('<Response></Response>');
      } else if (llmResult.llm_handled) {
        // LLM tried to handle but failed
        console.error('❌ LLM failed to process message:', llmResult.error);
        
        // Fall back to a generic response
        res.set('Content-Type', 'text/xml');
        const msg = escapeForXml("I'm sorry, I'm having trouble understanding your request. Please call us for assistance.");
        return res.send(`<Response><Message>${msg}</Message></Response>`);
      }
    } catch (llmError) {
      console.error('❌ Error calling LLM integration:', llmError);
    }
    
    // If we get here, neither automation nor LLM handled the message
    console.log('⚠️ Message not handled by automation or LLM');
    res.set('Content-Type', 'text/xml');
    const msg = escapeForXml("Thank you for your message. We'll get back to you shortly.");
    return res.send(`<Response><Message>${msg}</Message></Response>`);
    
  } catch (error) {
    console.error('❌ Error in webhook handler:', error);
    res.status(500).send('<Response></Response>');
  }
});

module.exports = router;
