const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { eq } = require('drizzle-orm');

// Import schema tables
const { locations, services, staff, rooms, appointments } = require('./shared/schema');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres';
const client = postgres(connectionString);
const db = drizzle(client);

async function testLocationFiltering() {
  try {
    console.log('Testing location filtering...');
    
    // Check current locations
    const allLocations = await db.select().from(locations);
    console.log('Current locations:', allLocations);
    
    // Check appointments and their location assignments
    const allAppointments = await db.select().from(appointments);
    console.log('All appointments:', allAppointments.length);
    console.log('Appointments with locationId:', allAppointments.filter(apt => apt.locationId).length);
    console.log('Appointments without locationId:', allAppointments.filter(apt => !apt.locationId).length);
    
    // Check staff and their location assignments
    const allStaff = await db.select().from(staff);
    console.log('All staff:', allStaff.length);
    console.log('Staff with locationId:', allStaff.filter(s => s.locationId).length);
    console.log('Staff without locationId:', allStaff.filter(s => !s.locationId).length);
    
    // Check services and their location assignments
    const allServices = await db.select().from(services);
    console.log('All services:', allServices.length);
    console.log('Services with locationId:', allServices.filter(s => s.locationId).length);
    console.log('Services without locationId:', allServices.filter(s => !s.locationId).length);
    
    // If we have locations, test filtering
    if (allLocations.length > 0) {
      const firstLocation = allLocations[0];
      console.log(`\nTesting filtering for location: ${firstLocation.name} (ID: ${firstLocation.id})`);
      
      // Test appointments filtering
      const appointmentsForLocation = await db.select().from(appointments).where(eq(appointments.locationId, firstLocation.id));
      console.log(`Appointments for location ${firstLocation.id}:`, appointmentsForLocation.length);
      
      // Test staff filtering
      const staffForLocation = await db.select().from(staff).where(eq(staff.locationId, firstLocation.id));
      console.log(`Staff for location ${firstLocation.id}:`, staffForLocation.length);
      
      // Test services filtering
      const servicesForLocation = await db.select().from(services).where(eq(services.locationId, firstLocation.id));
      console.log(`Services for location ${firstLocation.id}:`, servicesForLocation.length);
    }
    
  } catch (error) {
    console.error('Error testing location filtering:', error);
  } finally {
    await client.end();
  }
}

testLocationFiltering(); 