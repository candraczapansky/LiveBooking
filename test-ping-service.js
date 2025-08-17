// Test the terminal service ping method directly
import { helcimTerminalService } from './server/helcim-terminal-service.ts';

console.log('🧪 Testing Terminal Service Ping Method Directly...\n');

async function testPingMethod() {
  try {
    // Test 1: Ping XOG5 device
    console.log('✅ Test 1: Pinging XOG5 device');
    const result1 = await helcimTerminalService.pingDevice('XOG5');
    console.log('📊 Result:', JSON.stringify(result1, null, 2));
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Ping HF1N device
    console.log('✅ Test 2: Pinging HF1N device');
    const result2 = await helcimTerminalService.pingDevice('HF1N');
    console.log('📊 Result:', JSON.stringify(result2, null, 2));
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Test with invalid device
    console.log('✅ Test 3: Testing with invalid device code');
    const result3 = await helcimTerminalService.pingDevice('INVALID123');
    console.log('📊 Result:', JSON.stringify(result3, null, 2));
    
    console.log('\n🏁 Ping method tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testPingMethod();





