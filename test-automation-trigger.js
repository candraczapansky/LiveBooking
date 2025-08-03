import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/beautybook'
});

console.log('🎯 Testing automation trigger directly...');

async function testAutomationTrigger() {
  try {
    console.log('\n🔧 Testing automation trigger directly...');
    
    // Import the automation trigger
    const { triggerBookingConfirmation } = await import('./server/automation-triggers.js');
    
    // Create a mock appointment
    const mockAppointment = {
      id: 999,
      clientId: 28995,
      serviceId: 1,
      staffId: 1,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: "confirmed"
    };
    
    console.log('Mock appointment:', mockAppointment);
    
    // Import storage
    const { DatabaseStorage } = await import('./server/storage.js');
    const storage = new DatabaseStorage();
    
    console.log('About to trigger automation...');
    
    // Trigger the automation
    await triggerBookingConfirmation(mockAppointment, storage);
    
    console.log('✅ Automation trigger completed');
    
    // Check if automation rules were triggered
    const rulesResponse = await fetch('http://localhost:5000/api/automation-rules');
    if (rulesResponse.ok) {
      const rules = await rulesResponse.json();
      console.log('\n📊 Automation results:');
      rules.forEach(rule => {
        console.log(`  - ${rule.name}: sent ${rule.sentCount} times, last run: ${rule.lastRun}`);
      });
      
      const triggeredRules = rules.filter(rule => rule.sentCount > 0);
      if (triggeredRules.length > 0) {
        console.log('\n🎉 SUCCESS: Automation rules were triggered!');
        console.log(`📧 ${triggeredRules.filter(r => r.type === 'email').length} email rules triggered`);
        console.log(`📱 ${triggeredRules.filter(r => r.type === 'sms').length} SMS rules triggered`);
      } else {
        console.log('\n⚠️ No automation rules were triggered by direct trigger test');
      }
    }
    
  } catch (error) {
    console.log('❌ Error testing automation trigger:', error);
    console.log('Error details:', error.message);
    console.log('Error stack:', error.stack);
  }
}

// Run the test
testAutomationTrigger().catch(console.error); 