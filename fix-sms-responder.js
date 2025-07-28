import { DatabaseStorage } from './dist/storage.js';
import { DatabaseConfig } from './dist/config.js';

async function fixSMSResponder() {
  try {
    console.log('🔧 Fixing SMS Auto-Responder...\n');
    
    // Initialize storage
    const storage = new DatabaseStorage();
    
    // Initialize database config
    const dbConfig = new DatabaseConfig(storage);
    
    // Check if API key is already configured
    const existingKey = await dbConfig.getOpenAIKey();
    if (existingKey) {
      console.log('✅ OpenAI API key is already configured');
      console.log('🎉 The SMS auto-responder should be working!');
      console.log('');
      console.log('💡 If it\'s still not working, try:');
      console.log('1. Refresh your browser page');
      console.log('2. Check the AI Messaging page');
      console.log('3. Test the SMS auto-responder settings');
      process.exit(0);
    }
    
    // Check environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log('❌ OPENAI_API_KEY not found in environment variables');
      console.log('');
      console.log('🔧 To fix the SMS auto-responder, you need to:');
      console.log('');
      console.log('1. Get an OpenAI API key from: https://platform.openai.com/api-keys');
      console.log('2. Add it to your environment variables as OPENAI_API_KEY');
      console.log('3. Restart your application');
      console.log('4. Run this script again');
      console.log('');
      console.log('💡 Or you can set it manually in the database:');
      console.log('   - Go to your app settings');
      console.log('   - Look for AI/LLM configuration');
      console.log('   - Add your OpenAI API key there');
      console.log('');
      process.exit(1);
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.log('❌ Invalid OpenAI API key format');
      console.log('   Should start with "sk-"');
      process.exit(1);
    }
    
    console.log('✅ Found OpenAI API key in environment variables');
    console.log('⏳ Setting up API key...');
    
    // Set the API key from environment to database
    await dbConfig.setOpenAIKey(apiKey);
    console.log('✅ OpenAI API key has been configured successfully!');
    
    // Verify the configuration
    const configuredKey = await dbConfig.getOpenAIKey();
    if (configuredKey) {
      console.log('✅ Configuration verified - API key is stored in database');
      console.log('');
      console.log('🎉 SMS Auto-Responder is now fixed!');
      console.log('');
      console.log('📱 To test it:');
      console.log('1. Go to the AI Messaging page');
      console.log('2. Click on "SMS Auto-Respond" tab');
      console.log('3. Try the test feature');
      console.log('4. The SMS auto-responder should now work with AI responses!');
    } else {
      console.error('❌ Configuration verification failed');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing SMS auto-responder:', error);
    process.exit(1);
  }
}

fixSMSResponder(); 