const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupOpenAIKey() {
  try {
    console.log('🔧 OpenAI API Key Setup');
    console.log('========================');
    console.log('');
    console.log('The SMS auto-responder requires an OpenAI API key to function.');
    console.log('You can get a free API key from: https://platform.openai.com/api-keys');
    console.log('');
    
    const apiKey = await question('Enter your OpenAI API key (starts with sk-): ');
    
    if (!apiKey || apiKey.trim() === '') {
      console.error('❌ API key cannot be empty');
      process.exit(1);
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format. Should start with "sk-"');
      process.exit(1);
    }
    
    console.log('⏳ Setting up API key...');
    
    // Make request to the API endpoint
    const response = await fetch('http://localhost:5000/api/config/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: apiKey.trim() })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ OpenAI API key has been configured successfully!');
      console.log('🎉 The SMS auto-responder should now work with AI-powered responses.');
    } else {
      console.error('❌ Failed to configure API key:', result.error || 'Unknown error');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error setting up OpenAI API key:', error.message);
    console.log('💡 Make sure your server is running on port 5000');
    process.exit(1);
  } finally {
    rl.close();
  }
}

setupOpenAIKey(); 