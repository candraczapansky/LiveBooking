import { DatabaseStorage } from './storage.js';

async function checkAppointments() {
  const storage = new DatabaseStorage();
  
  try {
    console.log('Checking appointment structure...');
    
    // Get all appointments
    const allAppointments = await storage.getAllAppointments();
    console.log(`\nTotal appointments: ${allAppointments.length}`);
    
    // Group appointments by clientId, serviceId, staffId to find potential recurring series
    const groupedAppointments = new Map<string, any[]>();
    
    for (const appointment of allAppointments) {
      const apt = appointment as any;
      const groupKey = `${apt.clientId}-${apt.serviceId}-${apt.staffId}`;
      
      if (!groupedAppointments.has(groupKey)) {
        groupedAppointments.set(groupKey, []);
      }
      groupedAppointments.get(groupKey)!.push(apt);
    }
    
    // Find groups with multiple appointments on the same day of week
    console.log('\nLooking for potential recurring series...');
    let foundRecurring = false;
    
    for (const [groupKey, appointments] of groupedAppointments) {
      if (appointments.length >= 3) {
        // Sort by start time
        appointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        
        // Check for weekly/biweekly patterns
        const dayOfWeek = new Map<number, number>();
        const timeOfDay = new Map<string, number>();
        
        for (const apt of appointments) {
          const date = new Date(apt.startTime);
          const dow = date.getDay();
          const tod = `${date.getHours()}:${date.getMinutes()}`;
          
          dayOfWeek.set(dow, (dayOfWeek.get(dow) || 0) + 1);
          timeOfDay.set(tod, (timeOfDay.get(tod) || 0) + 1);
        }
        
        // Check if most appointments are on the same day of week and time
        const maxDow = Math.max(...dayOfWeek.values());
        const maxTod = Math.max(...timeOfDay.values());
        
        if (maxDow >= 3 && maxTod >= 3) {
          foundRecurring = true;
          console.log(`\nPotential recurring series found:`);
          console.log(`  Client ID: ${appointments[0].clientId}`);
          console.log(`  Service ID: ${appointments[0].serviceId}`);
          console.log(`  Staff ID: ${appointments[0].staffId}`);
          console.log(`  Number of appointments: ${appointments.length}`);
          console.log(`  RecurringGroupId: ${appointments[0].recurringGroupId || 'NONE'}`);
          console.log(`  First 3 appointment details:`);
          
          for (let i = 0; i < Math.min(3, appointments.length); i++) {
            const apt = appointments[i];
            console.log(`    ${i+1}. Date: ${new Date(apt.startTime).toLocaleDateString()}, Time: ${new Date(apt.startTime).toLocaleTimeString()}, Notes: ${apt.notes || 'None'}`);
          }
        }
      }
    }
    
    if (!foundRecurring) {
      console.log('\nNo obvious recurring patterns found in existing appointments.');
      console.log('Checking for appointments with "recurring" in notes...');
      
      const withRecurring = allAppointments.filter((apt: any) => 
        apt.notes && apt.notes.toLowerCase().includes('recurring')
      );
      
      console.log(`Found ${withRecurring.length} appointments with "recurring" in notes`);
      
      if (withRecurring.length > 0) {
        console.log('\nFirst 5 appointments with "recurring" in notes:');
        for (let i = 0; i < Math.min(5, withRecurring.length); i++) {
          const apt = withRecurring[i] as any;
          console.log(`  ${i+1}. ID: ${apt.id}, Notes: ${apt.notes}, RecurringGroupId: ${apt.recurringGroupId || 'NONE'}`);
        }
      }
    }
    
    // Check if any appointments have recurringGroupId set
    const withGroupId = allAppointments.filter((apt: any) => apt.recurringGroupId);
    console.log(`\nAppointments with recurringGroupId set: ${withGroupId.length}`);
    
    if (withGroupId.length > 0) {
      console.log('First 5 appointments with recurringGroupId:');
      for (let i = 0; i < Math.min(5, withGroupId.length); i++) {
        const apt = withGroupId[i] as any;
        console.log(`  ${i+1}. ID: ${apt.id}, GroupId: ${apt.recurringGroupId}, Notes: ${apt.notes || 'None'}`);
      }
    }
    
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkAppointments();


