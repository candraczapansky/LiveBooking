import axios from 'axios';

console.log('🔍 Simple Environment Variable Test');
console.log('HELCIM_API_TOKEN:', process.env.HELCIM_API_TOKEN ? 'SET' : 'NOT SET');
console.log('HELCIM_API_URL:', process.env.HELCIM_API_URL ? 'SET' : 'NOT SET');

if (process.env.HELCIM_API_TOKEN) {
  console.log('✅ Environment variables are available');
} else {
  console.log('❌ Environment variables are NOT available');
} 