const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq } = require('drizzle-orm');

// Import schema tables
const { locations, services, staff, rooms, appointments } = require('./shared/schema');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres';
const client = postgres(connectionString);
const db = drizzle(client);

async function createSecondLocation() {
  try {
    console.log('Creating second location...');
    
    // Check if second location already exists
    const existingLocations = await db.select().from(locations);
    const secondLocation = existingLocations.find(loc => loc.name === 'Downtown Location');
    
    if (secondLocation) {
      console.log('Second location already exists:', secondLocation);
      return secondLocation;
    }
    
    // Create second location
    const newLocation = await db.insert(locations).values({
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
    
    console.log('Created second location:', newLocation[0]);
    
    // Assign some existing data to the second location for testing
    const allStaff = await db.select().from(staff);
    const allServices = await db.select().from(services);
    const allAppointments = await db.select().from(appointments);
    
    if (allStaff.length > 0) {
      // Assign the first staff member to the second location
      await db.update(staff).set({ locationId: newLocation[0].id }).where(eq(staff.id, allStaff[0].id));
      console.log(`Assigned staff member ${allStaff[0].id} to second location`);
    }
    
    if (allServices.length > 0) {
      // Assign the first service to the second location
      await db.update(services).set({ locationId: newLocation[0].id }).where(eq(services.id, allServices[0].id));
      console.log(`Assigned service ${allServices[0].id} to second location`);
    }
    
    if (allAppointments.length > 0) {
      // Assign the first appointment to the second location
      await db.update(appointments).set({ locationId: newLocation[0].id }).where(eq(appointments.id, allAppointments[0].id));
      console.log(`Assigned appointment ${allAppointments[0].id} to second location`);
    }
    
    console.log('Second location setup completed!');
    return newLocation[0];
    
  } catch (error) {
    console.error('Error creating second location:', error);
  } finally {
    await client.end();
  }
}

createSecondLocation(); 