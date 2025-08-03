console.log('🎯 Testing automation service directly...');

async function testAutomationService() {
  try {
    console.log('\n🔧 Testing automation service directly...');
    
    // Import the automation service
    const { AutomationService } = await import('./server/automation-service.js');
    const { DatabaseStorage } = await import('./server/storage.js');
    
    // Initialize storage and automation service
    const storage = new DatabaseStorage();
    const automationService = new AutomationService(storage);
    
    console.log('✅ Automation service initialized');
    
    // Create a test automation context
    const testContext = {
      appointmentId: 247,
      clientId: 28995,
      serviceId: 1,
      staffId: 1,
      startTime: '2025-09-15T10:00:00.000Z',
      endTime: '2025-09-15T11:00:00.000Z',
      status: 'confirmed'
    };
    
    console.log('📋 Test context:', testContext);
    
    // Test the automation service directly
    console.log('🚀 Triggering booking confirmation automation...');
    await automationService.triggerBookingConfirmation(testContext);
    
    console.log('✅ Automation service test completed');
    
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
        console.log('\n⚠️ No automation rules were triggered by direct service test');
      }
    }
    
  } catch (error) {
    console.log('❌ Error testing automation service:', error);
    console.log('Error details:', error.message);
    console.log('Error stack:', error.stack);
  }
}

// Run the test
testAutomationService().catch(console.error); 