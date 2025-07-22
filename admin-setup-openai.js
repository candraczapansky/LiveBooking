const readline = require('readline');
const { DatabaseStorage } = require('./server/storage');
const { DatabaseConfig } = require('./server/config');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupOpenAIKey() {
  try {
    console.log('🔧 OpenAI API Key Setup');
    console.log('========================');
    console.log('');
    
    // Initialize storage
    const storage = new DatabaseStorage();
    
    // Initialize database config
    const dbConfig = new DatabaseConfig(storage);
    
    // Check if API key is already configured
    const existingKey = await dbConfig.getOpenAIKey();
    if (existingKey) {
      console.log('⚠️  OpenAI API key is already configured');
      const answer = await question('Do you want to update it? (y/N): ');
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Setup cancelled.');
        process.exit(0);
      }
    }
    
    // Get API key from user
    const apiKey = await question('Enter your OpenAI API key: ');
    
    if (!apiKey || apiKey.trim() === '') {
      console.error('❌ API key cannot be empty');
      process.exit(1);
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format. Should start with "sk-"');
      process.exit(1);
    }
    
    console.log('⏳ Setting up API key...');
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
  } finally {
    rl.close();
  }
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Run the setup
setupOpenAIKey(); 