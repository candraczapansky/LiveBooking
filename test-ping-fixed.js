// Test the fixed ping method
import { helcimTerminalService } from './server/helcim-terminal-service.ts';

console.log('🧪 Testing Fixed Ping Method...\n');

async function testFixedPing() {
  try {
    console.log('📡 Testing ping with XOG5 device...');
    const result = await helcimTerminalService.pingDevice('XOG5');
    
    console.log('📊 Ping result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 Ping successful! Device is online.');
    } else {
      console.log('❌ Ping failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFixedPing();





