const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq } = require('drizzle-orm');

// Import schema tables
const { locations, services, staff, rooms, appointments } = require('./shared/schema');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres';
const client = postgres(connectionString);
const db = drizzle(client);

async function checkAndFixLocations() {
  try {
    console.log('=== Checking Current Location State ===');
    
    // Check current locations
    const allLocations = await db.select().from(locations);
    console.log('Current locations:', allLocations);
    
    if (allLocations.length === 0) {
      console.log('No locations found. Creating default location...');
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
      console.log('Created default location:', newLocation[0]);
      allLocations.push(newLocation[0]);
    }
    
    const defaultLocation = allLocations.find(loc => loc.isDefault) || allLocations[0];
    console.log('Using location:', defaultLocation);
    
    // Check current data assignments
    const allAppointments = await db.select().from(appointments);
    const allStaff = await db.select().from(staff);
    const allServices = await db.select().from(services);
    
    console.log('\n=== Current Data State ===');
    console.log(`Appointments: ${allAppointments.length} total`);
    console.log(`- With locationId: ${allAppointments.filter(apt => apt.locationId).length}`);
    console.log(`- Without locationId: ${allAppointments.filter(apt => !apt.locationId).length}`);
    
    console.log(`Staff: ${allStaff.length} total`);
    console.log(`- With locationId: ${allStaff.filter(s => s.locationId).length}`);
    console.log(`- Without locationId: ${allStaff.filter(s => !s.locationId).length}`);
    
    console.log(`Services: ${allServices.length} total`);
    console.log(`- With locationId: ${allServices.filter(s => s.locationId).length}`);
    console.log(`- Without locationId: ${allServices.filter(s => !s.locationId).length}`);
    
    // Fix assignments if needed
    console.log('\n=== Fixing Location Assignments ===');
    
    if (allAppointments.filter(apt => !apt.locationId).length > 0) {
      console.log('Assigning appointments to default location...');
      await db.update(appointments).set({ locationId: defaultLocation.id }).where(eq(appointments.locationId, null));
    }
    
    if (allStaff.filter(s => !s.locationId).length > 0) {
      console.log('Assigning staff to default location...');
      await db.update(staff).set({ locationId: defaultLocation.id }).where(eq(staff.locationId, null));
    }
    
    if (allServices.filter(s => !s.locationId).length > 0) {
      console.log('Assigning services to default location...');
      await db.update(services).set({ locationId: defaultLocation.id }).where(eq(services.locationId, null));
    }
    
    // Verify fixes
    console.log('\n=== Verification After Fix ===');
    const updatedAppointments = await db.select().from(appointments);
    const updatedStaff = await db.select().from(staff);
    const updatedServices = await db.select().from(services);
    
    console.log(`Appointments: ${updatedAppointments.length} total`);
    console.log(`- With locationId: ${updatedAppointments.filter(apt => apt.locationId).length}`);
    console.log(`- Without locationId: ${updatedAppointments.filter(apt => !apt.locationId).length}`);
    
    console.log(`Staff: ${updatedStaff.length} total`);
    console.log(`- With locationId: ${updatedStaff.filter(s => s.locationId).length}`);
    console.log(`- Without locationId: ${updatedStaff.filter(s => !s.locationId).length}`);
    
    console.log(`Services: ${updatedServices.length} total`);
    console.log(`- With locationId: ${updatedServices.filter(s => s.locationId).length}`);
    console.log(`- Without locationId: ${updatedServices.filter(s => !s.locationId).length}`);
    
    // Test filtering
    console.log('\n=== Testing Location Filtering ===');
    const appointmentsForLocation = await db.select().from(appointments).where(eq(appointments.locationId, defaultLocation.id));
    const staffForLocation = await db.select().from(staff).where(eq(staff.locationId, defaultLocation.id));
    const servicesForLocation = await db.select().from(services).where(eq(services.locationId, defaultLocation.id));
    
    console.log(`Appointments for location ${defaultLocation.id}: ${appointmentsForLocation.length}`);
    console.log(`Staff for location ${defaultLocation.id}: ${staffForLocation.length}`);
    console.log(`Services for location ${defaultLocation.id}: ${servicesForLocation.length}`);
    
    console.log('\n=== Location Fix Complete ===');
    
  } catch (error) {
    console.error('Error checking and fixing locations:', error);
  } finally {
    await client.end();
  }
}

checkAndFixLocations(); 