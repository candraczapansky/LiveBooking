import { DatabaseStorage } from './dist/storage.js';
import { DatabaseConfig } from './dist/config.js';

async function setupOpenAIKey() {
  try {
    console.log('🔧 Setting up OpenAI API key...');
    
    // Initialize storage
    const storage = new DatabaseStorage();
    
    // Initialize database config
    const dbConfig = new DatabaseConfig(storage);
    
    // Check if API key is already configured
    const existingKey = await dbConfig.getOpenAIKey();
    if (existingKey) {
      console.log('⚠️  OpenAI API key is already configured');
      console.log('✅ Configuration verified - API key is stored in database');
      console.log('🎉 The auto-responder should now work with AI-powered responses!');
      process.exit(0);
    }
    
    // Since you mentioned the key is already configured in the app, 
    // let's check if it's in the environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log('❌ OPENAI_API_KEY not found in environment variables');
      console.log('');
      console.log('💡 To set up your API key:');
      console.log('1. Add your OpenAI API key to your app secrets/environment variables');
      console.log('2. Restart your application');
      console.log('3. Run this script again');
      console.log('');
      console.log('🔗 Or you can manually set it in the database using the API endpoint:');
      console.log('   POST /api/config/openai with {"apiKey": "your-key-here"}');
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
      console.log('🔒 The API key is now hidden from the frontend and stored securely');
      console.log('');
      console.log('🎉 Setup complete! The auto-responder will now use AI-powered responses.');
    } else {
      console.error('❌ Configuration verification failed');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up OpenAI API key:', error);
    process.exit(1);
  }
}

setupOpenAIKey(); 