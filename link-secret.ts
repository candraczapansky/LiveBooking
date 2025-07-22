import { DatabaseStorage } from './server/storage.js';
import { DatabaseConfig } from './server/config.js';

async function linkOpenAISecret() {
  try {
    console.log('🔧 Linking OpenAI API key from app secrets...');
    
    // Check if OPENAI_API_KEY is in environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      console.log('💡 Make sure the API key is set in your app secrets/environment');
      process.exit(1);
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format. Should start with "sk-"');
      process.exit(1);
    }
    
    console.log('✅ Found OpenAI API key in environment variables');
    
    // Initialize storage
    const storage = new DatabaseStorage();
    
    // Initialize database config
    const dbConfig = new DatabaseConfig(storage);
    
    // Check if API key is already configured
    const existingKey = await dbConfig.getOpenAIKey();
    if (existingKey) {
      console.log('⚠️  OpenAI API key is already configured in database');
      console.log('🔄 Updating with the key from app secrets...');
    }
    
    // Set the API key from environment to database
    await dbConfig.setOpenAIKey(apiKey);
    console.log('✅ OpenAI API key has been linked from app secrets to database!');
    
    // Verify the configuration
    const configuredKey = await dbConfig.getOpenAIKey();
    if (configuredKey) {
      console.log('✅ Configuration verified - API key is now stored in database');
      console.log('🔒 The API key is hidden from the frontend and stored securely');
      console.log('');
      console.log('🎉 Link complete! The auto-responder will now use AI-powered responses.');
      console.log('💡 The API key is now managed through your app secrets and stored in the database');
    } else {
      console.error('❌ Configuration verification failed');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error linking OpenAI API key:', error);
    process.exit(1);
  }
}

// Run the link
linkOpenAISecret(); 