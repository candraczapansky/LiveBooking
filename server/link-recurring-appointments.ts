import { DatabaseStorage } from './storage.js';
import { db } from './db.js';
import { appointments } from './schema.js';
import { eq } from 'drizzle-orm';

/**
 * Migration script to link existing recurring appointments with recurringGroupId
 * Identifies appointments that were created as part of a recurring series and assigns them a group ID
 */

async function linkRecurringAppointments() {
  const storage = new DatabaseStorage();
  
  try {
    console.log('Starting recurring appointments linking migration...');
    
    // Get all appointments
    const allAppointments = await storage.getAllAppointments();
    console.log(`Found ${allAppointments.length} total appointments`);
    
    // Group appointments by potential recurring series
    // Look for appointments with similar notes pattern (Recurring X/Y)
    const recurringPattern = /\(Recurring (\d+)\/(\d+)\)/;
    const potentialGroups = new Map<string, any[]>();
    
    for (const appointment of allAppointments) {
      const apt = appointment as any;
      
      // Skip if already has a recurringGroupId
      if (apt.recurringGroupId) {
        console.log(`Appointment ${apt.id} already has recurringGroupId: ${apt.recurringGroupId}`);
        continue;
      }
      
      // Check if notes contain recurring pattern
      const match = apt.notes?.match(recurringPattern);
      if (match) {
        const totalCount = match[2];
        // Create a key based on clientId, serviceId, staffId, and total count
        // Appointments in the same series should have the same client, service, staff
        const groupKey = `${apt.clientId}-${apt.serviceId}-${apt.staffId}-${totalCount}`;
        
        if (!potentialGroups.has(groupKey)) {
          potentialGroups.set(groupKey, []);
        }
        potentialGroups.get(groupKey)!.push(apt);
      }
    }
    
    console.log(`Found ${potentialGroups.size} potential recurring groups`);
    
    let linkedCount = 0;
    
    // Process each potential group
    for (const [groupKey, appointments] of potentialGroups) {
      if (appointments.length < 2) {
        // Not a valid recurring group if only 1 appointment
        continue;
      }
      
      // Sort by start time to ensure they're in order
      appointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      // Check if appointments follow a pattern (weekly, biweekly, monthly)
      const timeDiffs: number[] = [];
      for (let i = 1; i < appointments.length; i++) {
        const diff = new Date(appointments[i].startTime).getTime() - new Date(appointments[i-1].startTime).getTime();
        timeDiffs.push(diff);
      }
      
      // Check if time differences are consistent (allow 10% variance)
      const avgDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      const isConsistent = timeDiffs.every(diff => Math.abs(diff - avgDiff) / avgDiff < 0.1);
      
      if (isConsistent) {
        // This is likely a recurring series - assign a group ID
        const recurringGroupId = `recurring_linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`\nLinking ${appointments.length} appointments with group ID: ${recurringGroupId}`);
        console.log(`  Client: ${appointments[0].clientId}`);
        console.log(`  Service: ${appointments[0].serviceId}`);
        console.log(`  Staff: ${appointments[0].staffId}`);
        console.log(`  Date range: ${new Date(appointments[0].startTime).toLocaleDateString()} to ${new Date(appointments[appointments.length-1].startTime).toLocaleDateString()}`);
        
        // Update each appointment with the recurringGroupId
        for (const apt of appointments) {
          await db.update(appointments as any)
            .set({ recurringGroupId } as any)
            .where(eq((appointments as any).id, apt.id));
          linkedCount++;
        }
        
        console.log(`  ✓ Successfully linked ${appointments.length} appointments`);
      }
    }
    
    console.log(`\n✅ Migration complete! Linked ${linkedCount} appointments in ${potentialGroups.size} recurring groups`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
linkRecurringAppointments();


