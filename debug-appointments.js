import { Client } from 'pg';

async function debugAppointments() {
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

    // Get all appointments
    const appointments = await client.query(`
      SELECT id, client_id, staff_id, location_id, start_time, end_time, status, service_id
      FROM appointments 
      ORDER BY start_time DESC
      LIMIT 10
    `);

    console.log(`Found ${appointments.rows.length} recent appointments:`);
    appointments.rows.forEach(apt => {
      console.log(`  ID: ${apt.id}, Client: ${apt.client_id}, Staff: ${apt.staff_id}, Location: ${apt.location_id}, Time: ${apt.start_time} - ${apt.end_time}, Status: ${apt.status}, Service: ${apt.service_id}`);
    });

    // Get staff members
    const staff = await client.query(`
      SELECT id, user_id, title, location_id
      FROM staff 
      LIMIT 5
    `);

    console.log(`\nStaff members:`);
    staff.rows.forEach(s => {
      console.log(`  ID: ${s.id}, User: ${s.user_id}, Title: ${s.title}, Location: ${s.location_id}`);
    });

    // Get locations
    const locations = await client.query(`
      SELECT id, name, is_default
      FROM locations
    `);

    console.log(`\nLocations:`);
    locations.rows.forEach(l => {
      console.log(`  ID: ${l.id}, Name: ${l.name}, Default: ${l.is_default}`);
    });

    // Test a specific conflict scenario
    console.log('\n=== Testing Conflict Detection ===');
    
    // Simulate a new appointment
    const testAppointment = {
      staffId: 1,
      locationId: 1,
      startTime: '2024-08-01T10:00:00.000Z',
      endTime: '2024-08-01T11:00:00.000Z'
    };

    console.log('Testing appointment:', testAppointment);

    const conflictingAppointments = appointments.rows.filter(apt => {
      const isSameStaff = apt.staff_id === testAppointment.staffId;
      const isSameLocation = testAppointment.locationId === null || apt.location_id === testAppointment.locationId;
      const isActive = apt.status !== 'cancelled' && apt.status !== 'completed';
      
      // Time overlap check
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      const newStart = new Date(testAppointment.startTime);
      const newEnd = new Date(testAppointment.endTime);
      
      const hasTimeOverlap = aptStart < newEnd && aptEnd > newStart;
      
      const isConflict = isSameStaff && isSameLocation && isActive && hasTimeOverlap;
      
      if (isSameStaff && isActive) {
        console.log(`  Checking appointment ${apt.id}:`);
        console.log(`    Existing: ${apt.start_time} - ${apt.end_time} (Location: ${apt.location_id})`);
        console.log(`    New: ${testAppointment.startTime} - ${testAppointment.endTime} (Location: ${testAppointment.locationId})`);
        console.log(`    Same staff: ${isSameStaff}, Same location: ${isSameLocation}, Active: ${isActive}, Overlap: ${hasTimeOverlap}`);
        console.log(`    Is conflict: ${isConflict}`);
      }
      
      return isConflict;
    });

    console.log(`\nFound ${conflictingAppointments.length} conflicting appointments`);

  } catch (error) {
    console.error('Error debugging appointments:', error);
  } finally {
    await client.end();
  }
}

debugAppointments(); 