const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq } = require('drizzle-orm');

// Import schema tables
const { locations, services, staff, rooms, appointments } = require('./shared/schema');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres';
const client = postgres(connectionString);
const db = drizzle(client);

async function setupTestLocations() {
  try {
    console.log('=== Setting up test locations ===');
    
    // Get current locations
    const existingLocations = await db.select().from(locations);
    console.log('Existing locations:', existingLocations);
    
    let location1, location2;
    
    // Create or get first location
    if (existingLocations.length === 0) {
      location1 = await db.insert(locations).values({
        name: 'Main Location',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        phone: '555-123-4567',
        email: 'main@example.com',
        timezone: 'America/New_York',
        isActive: true,
        isDefault: true,
        description: 'Primary business location'
      }).returning();
      location1 = location1[0];
      console.log('Created location 1:', location1);
    } else {
      location1 = existingLocations[0];
      console.log('Using existing location 1:', location1);
    }
    
    // Create second location
    const secondLocation = existingLocations.find(loc => loc.name === 'Downtown Location');
    if (!secondLocation) {
      location2 = await db.insert(locations).values({
        name: 'Downtown Location',
        address: '456 Downtown Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        phone: '555-987-6543',
        email: 'downtown@example.com',
        timezone: 'America/New_York',
        isActive: true,
        isDefault: false,
        description: 'Downtown business location'
      }).returning();
      location2 = location2[0];
      console.log('Created location 2:', location2);
    } else {
      location2 = secondLocation;
      console.log('Using existing location 2:', location2);
    }
    
    // Get all current data
    const allAppointments = await db.select().from(appointments);
    const allStaff = await db.select().from(staff);
    const allServices = await db.select().from(services);
    
    console.log(`\nCurrent data: ${allAppointments.length} appointments, ${allStaff.length} staff, ${allServices.length} services`);
    
    // Assign data to locations
    if (allAppointments.length > 0) {
      // Assign first half of appointments to location 1, second half to location 2
      const midPoint = Math.ceil(allAppointments.length / 2);
      
      const appointmentsForLocation1 = allAppointments.slice(0, midPoint);
      const appointmentsForLocation2 = allAppointments.slice(midPoint);
      
      for (const apt of appointmentsForLocation1) {
        await db.update(appointments).set({ locationId: location1.id }).where(eq(appointments.id, apt.id));
      }
      
      for (const apt of appointmentsForLocation2) {
        await db.update(appointments).set({ locationId: location2.id }).where(eq(appointments.id, apt.id));
      }
      
      console.log(`Assigned ${appointmentsForLocation1.length} appointments to location 1`);
      console.log(`Assigned ${appointmentsForLocation2.length} appointments to location 2`);
    }
    
    if (allStaff.length > 0) {
      // Assign first staff to location 1, second to location 2
      if (allStaff.length >= 1) {
        await db.update(staff).set({ locationId: location1.id }).where(eq(staff.id, allStaff[0].id));
        console.log(`Assigned staff ${allStaff[0].id} to location 1`);
      }
      
      if (allStaff.length >= 2) {
        await db.update(staff).set({ locationId: location2.id }).where(eq(staff.id, allStaff[1].id));
        console.log(`Assigned staff ${allStaff[1].id} to location 2`);
      }
    }
    
    if (allServices.length > 0) {
      // Assign first service to location 1, second to location 2
      if (allServices.length >= 1) {
        await db.update(services).set({ locationId: location1.id }).where(eq(services.id, allServices[0].id));
        console.log(`Assigned service ${allServices[0].id} to location 1`);
      }
      
      if (allServices.length >= 2) {
        await db.update(services).set({ locationId: location2.id }).where(eq(services.id, allServices[1].id));
        console.log(`Assigned service ${allServices[1].id} to location 2`);
      }
    }
    
    // Verify the setup
    console.log('\n=== Verification ===');
    const appointmentsForLocation1 = await db.select().from(appointments).where(eq(appointments.locationId, location1.id));
    const appointmentsForLocation2 = await db.select().from(appointments).where(eq(appointments.locationId, location2.id));
    
    const staffForLocation1 = await db.select().from(staff).where(eq(staff.locationId, location1.id));
    const staffForLocation2 = await db.select().from(staff).where(eq(staff.locationId, location2.id));
    
    const servicesForLocation1 = await db.select().from(services).where(eq(services.locationId, location1.id));
    const servicesForLocation2 = await db.select().from(services).where(eq(services.locationId, location2.id));
    
    console.log(`Location 1 (${location1.name}):`);
    console.log(`- Appointments: ${appointmentsForLocation1.length}`);
    console.log(`- Staff: ${staffForLocation1.length}`);
    console.log(`- Services: ${servicesForLocation1.length}`);
    
    console.log(`Location 2 (${location2.name}):`);
    console.log(`- Appointments: ${appointmentsForLocation2.length}`);
    console.log(`- Staff: ${staffForLocation2.length}`);
    console.log(`- Services: ${servicesForLocation2.length}`);
    
    console.log('\n=== Test setup complete ===');
    console.log('Now you can test switching between locations in the app!');
    
  } catch (error) {
    console.error('Error setting up test locations:', error);
  } finally {
    await client.end();
  }
}

setupTestLocations(); 