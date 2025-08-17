// Debug script to see exact ping error
import { helcimTerminalService } from './server/helcim-terminal-service.ts';

console.log('🔍 Debugging Ping Error...\n');

async function debugPing() {
  try {
    console.log('📡 Testing ping with detailed logging...');
    
    // First, let's check what API token we're using
    const apiToken = process.env.HELCIM_API_TOKEN;
    console.log('🔑 API Token (first 10 chars):', apiToken ? apiToken.substring(0, 10) + '...' : 'NOT SET');
    
    // Test the ping method with detailed error handling
    const result = await helcimTerminalService.pingDevice('XOG5');
    
    console.log('📊 Final result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error caught:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugPing();





