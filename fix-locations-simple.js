const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq } = require('drizzle-orm');

// Import schema tables
const { locations, services, staff, rooms, appointments } = require('./shared/schema');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres';
const client = postgres(connectionString);
const db = drizzle(client);

async function fixLocationAssignments() {
  try {
    console.log('Starting location assignment fix...');
    
    // First, ensure we have at least one location
    const existingLocations = await db.select().from(locations);
    let defaultLocationId;
    
    if (existingLocations.length === 0) {
      console.log('No locations found, creating default location...');
      const newLocation = await db.insert(locations).values({
        name: 'Main Location',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        phone: '555-123-4567',
        email: 'info@example.com',
        timezone: 'America/New_York',
        isActive: true,
        isDefault: true,
        description: 'Primary business location'
      }).returning();
      defaultLocationId = newLocation[0].id;
      console.log('Created default location with ID:', defaultLocationId);
    } else {
      // Find the default location or use the first one
      const defaultLocation = existingLocations.find(loc => loc.isDefault) || existingLocations[0];
      defaultLocationId = defaultLocation.id;
      console.log('Using existing location with ID:', defaultLocationId);
    }
    
    // Update all existing records to use the default location
    console.log('Updating services...');
    await db.update(services).set({ locationId: defaultLocationId }).where(eq(services.locationId, null));
    
    console.log('Updating staff...');
    await db.update(staff).set({ locationId: defaultLocationId }).where(eq(staff.locationId, null));
    
    console.log('Updating rooms...');
    await db.update(rooms).set({ locationId: defaultLocationId }).where(eq(rooms.locationId, null));
    
    console.log('Updating appointments...');
    await db.update(appointments).set({ locationId: defaultLocationId }).where(eq(appointments.locationId, null));
    
    console.log('Location assignment fix completed successfully!');
    
    // Verify the updates
    const servicesWithoutLocation = await db.select().from(services).where(eq(services.locationId, null));
    const staffWithoutLocation = await db.select().from(staff).where(eq(staff.locationId, null));
    const roomsWithoutLocation = await db.select().from(rooms).where(eq(rooms.locationId, null));
    const appointmentsWithoutLocation = await db.select().from(appointments).where(eq(appointments.locationId, null));
    
    console.log('Verification results:');
    console.log('- Services without location:', servicesWithoutLocation.length);
    console.log('- Staff without location:', staffWithoutLocation.length);
    console.log('- Rooms without location:', roomsWithoutLocation.length);
    console.log('- Appointments without location:', appointmentsWithoutLocation.length);
    
  } catch (error) {
    console.error('Error fixing location assignments:', error);
  } finally {
    await client.end();
  }
}

fixLocationAssignments(); 