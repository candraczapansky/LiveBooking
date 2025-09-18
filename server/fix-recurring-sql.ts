import { db } from './db.js';
import { sql } from 'drizzle-orm';
import { DatabaseStorage } from './storage.js';

/**
 * Direct SQL migration to link existing recurring appointments
 */

async function fixRecurringWithSQL() {
  const storage = new DatabaseStorage();
  
  try {
    console.log('🔄 Starting recurring appointments fix with direct SQL...\n');
    
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
        continue;
      }
      
      // Sort by start time
      appointments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      // Check if they have recurring pattern in notes
      const hasRecurringNotes = appointments.some(apt => 
        apt.notes && apt.notes.toLowerCase().includes('recurring')
      );
      
      // Calculate time differences
      const timeDiffs: number[] = [];
      for (let i = 1; i < appointments.length; i++) {
        const diff = new Date(appointments[i].startTime).getTime() - new Date(appointments[i-1].startTime).getTime();
        timeDiffs.push(diff);
      }
      
      // Check for regular patterns
      const avgDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      const daysDiff = avgDiff / (1000 * 60 * 60 * 24);
      
      const isWeekly = Math.abs(daysDiff - 7) < 1.5;
      const isBiweekly = Math.abs(daysDiff - 14) < 2;
      const isTriweekly = Math.abs(daysDiff - 21) < 2;
      const isMonthly = Math.abs(daysDiff - 28) < 4 || Math.abs(daysDiff - 30) < 4;
      
      const hasRegularPattern = isWeekly || isBiweekly || isTriweekly || isMonthly;
      
      // Check consistent day/time
      const dayTimeMap = new Map<string, number>();
      for (const apt of appointments) {
        const date = new Date(apt.startTime);
        const dayTime = `${date.getDay()}-${date.getHours()}:${date.getMinutes()}`;
        dayTimeMap.set(dayTime, (dayTimeMap.get(dayTime) || 0) + 1);
      }
      
      const maxDayTimeCount = Math.max(...dayTimeMap.values());
      const hasConsistentDayTime = maxDayTimeCount >= appointments.length * 0.6;
      
      // Link if they meet criteria
      if (hasRecurringNotes || (hasRegularPattern && hasConsistentDayTime && appointments.length >= 4)) {
        const recurringGroupId = `recurring_fixed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const [clientId, serviceId, staffId] = groupKey.split('-');
        const appointmentIds = appointments.map(a => a.id);
        
        console.log(`🔗 Linking recurring series:`);
        console.log(`   Client: ${clientId}, Service: ${serviceId}, Staff: ${staffId}`);
        console.log(`   Count: ${appointments.length} appointments`);
        console.log(`   Pattern: ${isWeekly ? 'Weekly' : isBiweekly ? 'Biweekly' : isTriweekly ? 'Triweekly' : isMonthly ? 'Monthly' : 'Custom'}`);
        console.log(`   Group ID: ${recurringGroupId}`);
        
        try {
          // Use raw SQL to update the appointments
          const updateQuery = sql`
            UPDATE appointments 
            SET recurring_group_id = ${recurringGroupId}
            WHERE id IN ${sql.raw(`(${appointmentIds.join(',')})`)}
          `;
          
          await db.execute(updateQuery);
          
          linkedCount += appointments.length;
          groupsLinked++;
          console.log(`   ✅ Successfully linked ${appointments.length} appointments\n`);
        } catch (e) {
          console.log(`   ⚠️ Failed to update appointments:`, e);
          console.log('');
        }
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✨ Migration complete!`);
    console.log(`📊 Linked ${linkedCount} appointments`);
    console.log(`📁 Created ${groupsLinked} recurring groups`);
    
    // Verify the updates
    console.log('\n📋 Verifying updates...');
    const checkResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM appointments WHERE recurring_group_id IS NOT NULL
    `);
    console.log(`✅ Appointments with recurringGroupId: ${(checkResult.rows as any)[0]?.count || 0}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
fixRecurringWithSQL();


