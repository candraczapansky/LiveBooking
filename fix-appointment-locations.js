import { Client } from 'pg';

async function fixAppointmentLocations() {
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

    // Check for appointments without locationId
    const appointmentsWithoutLocation = await client.query(`
      SELECT id, client_id, service_id, staff_id, start_time, end_time 
      FROM appointments 
      WHERE location_id IS NULL
    `);

    console.log(`Found ${appointmentsWithoutLocation.rows.length} appointments without locationId`);

    if (appointmentsWithoutLocation.rows.length > 0) {
      // Get the default location
      const defaultLocation = await client.query(`
        SELECT id, name FROM locations WHERE is_default = true LIMIT 1
      `);

      if (defaultLocation.rows.length === 0) {
        console.log('No default location found. Creating one...');
        
        // Create a default location
        const newLocation = await client.query(`
          INSERT INTO locations (name, address, city, state, zip_code, phone, email, timezone, is_active, is_default, description)
          VALUES ('Main Location', '123 Main St', 'New York', 'NY', '10001', '555-123-4567', 'info@example.com', 'America/New_York', true, true, 'Primary business location')
          RETURNING id, name
        `);
        
        console.log(`Created default location: ${newLocation.rows[0].name} (ID: ${newLocation.rows[0].id})`);
        
        // Update appointments to use the new default location
        await client.query(`
          UPDATE appointments 
          SET location_id = $1 
          WHERE location_id IS NULL
        `, [newLocation.rows[0].id]);
        
        console.log(`Updated ${appointmentsWithoutLocation.rows.length} appointments to use the default location`);
      } else {
        console.log(`Using existing default location: ${defaultLocation.rows[0].name} (ID: ${defaultLocation.rows[0].id})`);
        
        // Update appointments to use the existing default location
        await client.query(`
          UPDATE appointments 
          SET location_id = $1 
          WHERE location_id IS NULL
        `, [defaultLocation.rows[0].id]);
        
        console.log(`Updated ${appointmentsWithoutLocation.rows.length} appointments to use the default location`);
      }
    }

    // Verify the fix
    const remainingAppointmentsWithoutLocation = await client.query(`
      SELECT COUNT(*) as count FROM appointments WHERE location_id IS NULL
    `);

    console.log(`Remaining appointments without locationId: ${remainingAppointmentsWithoutLocation.rows[0].count}`);

    // Show location distribution
    const locationDistribution = await client.query(`
      SELECT l.name, COUNT(a.id) as appointment_count
      FROM locations l
      LEFT JOIN appointments a ON l.id = a.location_id
      GROUP BY l.id, l.name
      ORDER BY appointment_count DESC
    `);

    console.log('\nAppointment distribution by location:');
    locationDistribution.rows.forEach(row => {
      console.log(`  ${row.name}: ${row.appointment_count} appointments`);
    });

  } catch (error) {
    console.error('Error fixing appointment locations:', error);
  } finally {
    await client.end();
  }
}

fixAppointmentLocations(); 