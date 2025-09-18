import { DatabaseStorage } from './storage.js';
import { db } from './db.js';
import { appointments } from './schema.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Migration script to link existing recurring appointments with recurringGroupId
 * This identifies and groups appointments that are part of recurring series
 */

async function fixRecurringGroups() {
  const storage = new DatabaseStorage();
  
  try {
    console.log('🔄 Starting recurring appointments fix...\n');
    
    // First ensure the column exists
    try {
      await db.execute(sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_group_id TEXT`);
      console.log('✅ Ensured recurring_group_id column exists');
    } catch (e) {
      console.log('Column already exists or error adding it:', e);
    }
    
    // Get all appointments
    const allAppointments = await storage.getAllAppointments();
    console.log(`📊 Found ${allAppointments.length} total appointments\n`);
    
    // Group appointments by client, service, staff to find potential recurring series
    const potentialGroups = new Map<string, any[]>();
    
    for (const appointment of allAppointments) {
      const apt = appointment as any;
      
      // Skip if already has a recurringGroupId
      if (apt.recurringGroupId) {
        continue;
      }
      
      // Create a key based on clientId, serviceId, staffId
      const groupKey = `${apt.clientId}-${apt.serviceId}-${apt.staffId}`;
      
      if (!potentialGroups.has(groupKey)) {
        potentialGroups.set(groupKey, []);
      }
      potentialGroups.get(groupKey)!.push(apt);
    }
    
    let linkedCount = 0;
    let groupsLinked = 0;
    
    // Process each potential group
    for (const [groupKey, appointments] of potentialGroups) {
      if (appointments.length < 3) {
        // Not enough appointments to be a recurring series
        continue;
      }
      
      // Sort by start time
      appointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      // Check if they have recurring pattern in notes OR follow a regular time pattern
      const hasRecurringNotes = appointments.some(apt => 
        apt.notes && apt.notes.toLowerCase().includes('recurring')
      );
      
      // Calculate time differences between appointments
      const timeDiffs: number[] = [];
      for (let i = 1; i < appointments.length; i++) {
        const diff = new Date(appointments[i].startTime).getTime() - new Date(appointments[i-1].startTime).getTime();
        timeDiffs.push(diff);
      }
      
      // Check for weekly (7 days), biweekly (14 days), triweekly (21 days), or monthly patterns
      const avgDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      const daysDiff = avgDiff / (1000 * 60 * 60 * 24);
      
      // Check if it follows a pattern (weekly: ~7 days, biweekly: ~14 days, etc.)
      const isWeekly = Math.abs(daysDiff - 7) < 1.5;
      const isBiweekly = Math.abs(daysDiff - 14) < 2;
      const isTriweekly = Math.abs(daysDiff - 21) < 2;
      const isMonthly = Math.abs(daysDiff - 28) < 4 || Math.abs(daysDiff - 30) < 4;
      
      const hasRegularPattern = isWeekly || isBiweekly || isTriweekly || isMonthly;
      
      // Also check if appointments are on the same day of week and time
      const dayTimeMap = new Map<string, number>();
      for (const apt of appointments) {
        const date = new Date(apt.startTime);
        const dayTime = `${date.getDay()}-${date.getHours()}:${date.getMinutes()}`;
        dayTimeMap.set(dayTime, (dayTimeMap.get(dayTime) || 0) + 1);
      }
      
      // Find the most common day/time combination
      const maxDayTimeCount = Math.max(...dayTimeMap.values());
      const hasConsistentDayTime = maxDayTimeCount >= appointments.length * 0.6; // 60% or more on same day/time
      
      // Link if they have recurring notes OR follow a regular pattern with consistent day/time
      if (hasRecurringNotes || (hasRegularPattern && hasConsistentDayTime && appointments.length >= 4)) {
        const recurringGroupId = `recurring_fixed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const [clientId, serviceId, staffId] = groupKey.split('-');
        
        console.log(`🔗 Linking recurring series:`);
        console.log(`   Client: ${clientId}, Service: ${serviceId}, Staff: ${staffId}`);
        console.log(`   Count: ${appointments.length} appointments`);
        console.log(`   Pattern: ${isWeekly ? 'Weekly' : isBiweekly ? 'Biweekly' : isTriweekly ? 'Triweekly' : isMonthly ? 'Monthly' : 'Custom'}`);
        console.log(`   Has "Recurring" notes: ${hasRecurringNotes}`);
        console.log(`   Group ID: ${recurringGroupId}`);
        
        // Update each appointment with the recurringGroupId
        for (const apt of appointments) {
          try {
            await db.update(appointments as any)
              .set({ recurringGroupId } as any)
              .where(eq((appointments as any).id, apt.id));
            linkedCount++;
          } catch (e) {
            console.log(`   ⚠️ Failed to update appointment ${apt.id}:`, e);
          }
        }
        
        groupsLinked++;
        console.log(`   ✅ Successfully linked ${appointments.length} appointments\n`);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✨ Migration complete!`);
    console.log(`📊 Linked ${linkedCount} appointments`);
    console.log(`📁 Created ${groupsLinked} recurring groups`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
fixRecurringGroups();


