import { Client } from 'pg';

async function testAppointmentConflict() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'password',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get all appointments for a specific staff member
    const appointments = await client.query(`
      SELECT id, client_id, staff_id, location_id, start_time, end_time, status
      FROM appointments 
      WHERE staff_id = 1 
      ORDER BY start_time
    `);

    console.log(`Found ${appointments.rows.length} appointments for staff ID 1:`);
    appointments.rows.forEach(apt => {
      console.log(`  ID: ${apt.id}, Client: ${apt.client_id}, Location: ${apt.location_id}, Time: ${apt.start_time} - ${apt.end_time}, Status: ${apt.status}`);
    });

    // Test conflict detection logic
    const testAppointment = {
      staffId: 1,
      locationId: 1,
      startTime: '2024-08-01T10:00:00.000Z',
      endTime: '2024-08-01T11:00:00.000Z'
    };

    console.log('\nTesting conflict detection for:', testAppointment);

    const conflictingAppointments = appointments.rows.filter(apt => {
      const isSameStaff = apt.staff_id === testAppointment.staffId;
      const isSameLocation = apt.location_id === testAppointment.locationId;
      const isActive = apt.status !== 'cancelled' && apt.status !== 'completed';
      
      // Time overlap check
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      const newStart = new Date(testAppointment.startTime);
      const newEnd = new Date(testAppointment.endTime);
      
      const hasTimeOverlap = aptStart < newEnd && aptEnd > newStart;
      
      const isConflict = isSameStaff && isSameLocation && isActive && hasTimeOverlap;
      
      if (isSameStaff && isSameLocation && isActive) {
        console.log(`  Checking appointment ${apt.id}:`);
        console.log(`    Existing: ${apt.start_time} - ${apt.end_time}`);
        console.log(`    New: ${testAppointment.startTime} - ${testAppointment.endTime}`);
        console.log(`    Has overlap: ${hasTimeOverlap}`);
        console.log(`    Is conflict: ${isConflict}`);
      }
      
      return isConflict;
    });

    console.log(`\nFound ${conflictingAppointments.length} conflicting appointments`);

  } catch (error) {
    console.error('Error testing appointment conflict:', error);
  } finally {
    await client.end();
  }
}

testAppointmentConflict(); 