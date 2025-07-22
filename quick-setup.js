// Simple script to set up OpenAI API key
// Run this with: node quick-setup.js

console.log('🔧 Quick OpenAI API Key Setup');
console.log('==============================');
console.log('');

// Check if OPENAI_API_KEY is available
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.log('❌ OPENAI_API_KEY not found in environment');
  console.log('');
  console.log('💡 To set up your API key:');
  console.log('1. Add your OpenAI API key to your app secrets/environment variables');
  console.log('2. Restart your application');
  console.log('3. The system will automatically use the key from environment');
  console.log('');
  console.log('🔗 Or you can manually set it in the database using:');
  console.log('   node admin-setup-openai.js');
  console.log('');
  process.exit(1);
}

if (!apiKey.startsWith('sk-')) {
  console.log('❌ Invalid OpenAI API key format');
  console.log('   Should start with "sk-"');
  process.exit(1);
}

console.log('✅ OpenAI API key found in environment!');
console.log('🔑 Key starts with:', apiKey.substring(0, 7) + '...');
console.log('');
console.log('🎉 Your auto-responder should now work with AI-powered responses!');
console.log('');
console.log('💡 The system will automatically use this key from your environment variables.');
console.log('   No additional setup needed.'); 