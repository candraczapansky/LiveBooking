const { DatabaseStorage } = require('./server/storage');
const { DatabaseConfig } = require('./server/config');

async function setupOpenAIKey() {
  try {
    console.log('🔧 Setting up OpenAI API key...');
    
    // Initialize storage
    const storage = new DatabaseStorage();
    
    // Initialize database config
    const dbConfig = new DatabaseConfig(storage);
    
    // Your OpenAI API key - replace this with your actual key
    const apiKey = 'sk-your-openai-api-key-here';
    
    if (apiKey === 'sk-your-openai-api-key-here') {
      console.error('❌ Please replace the API key in this script with your actual OpenAI API key');
      console.log('📝 Edit the setup-openai.js file and replace the apiKey value');
      process.exit(1);
    }
    
    await dbConfig.setOpenAIKey(apiKey);
    console.log('✅ OpenAI API key has been configured successfully!');
    
    // Verify the configuration
    const configuredKey = await dbConfig.getOpenAIKey();
    if (configuredKey) {
      console.log('✅ Configuration verified - API key is stored in database');
      console.log('🔒 The API key is now hidden from the frontend and stored securely');
    } else {
      console.error('❌ Configuration verification failed');
      process.exit(1);
    }
    
    console.log('🎉 Setup complete! The auto-responder will now use AI-powered responses.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up OpenAI API key:', error);
    process.exit(1);
  }
}

// Run the setup
setupOpenAIKey(); 