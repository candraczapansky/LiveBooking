import 'dotenv/config';
import postgres from 'postgres';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function runLocationsMigration() {
  console.log('🔧 Running locations migration...');
  
  const sql = postgres(DATABASE_URL);
  
  try {
    // Check if locations table exists and has default location
    const defaultLocation = await sql`
      SELECT * FROM locations WHERE is_default = true
    `;
    console.log('Default location:', defaultLocation[0] || 'None');
    
    // Check if services table has location_id column
    const serviceColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'services' 
      AND column_name = 'location_id'
    `;
    console.log('Services table location_id column exists:', serviceColumns.length > 0);
    
    // If no default location exists, create one
    if (defaultLocation.length === 0) {
      console.log('Creating default location...');
      await sql`
        INSERT INTO locations (
          name, address, city, state, zip_code, phone, email,
          is_active, is_default
        ) VALUES (
          'Main Location', '123 Main St', 'New York', 'NY', '10001',
          '555-123-4567', 'info@example.com',
          true, true
        )
      `;
      
      // Get the newly created default location
      const newDefaultLocation = await sql`
        SELECT * FROM locations WHERE is_default = true
      `;
      console.log('Created default location:', newDefaultLocation[0]);
      
      // Update existing records to use the default location
      if (newDefaultLocation.length > 0) {
        const defaultLocationId = newDefaultLocation[0].id;
        
        console.log('Updating existing records...');
        await sql`
          UPDATE services 
          SET location_id = ${defaultLocationId} 
          WHERE location_id IS NULL
        `;
        
        await sql`
          UPDATE staff 
          SET location_id = ${defaultLocationId} 
          WHERE location_id IS NULL
        `;
        
        await sql`
          UPDATE rooms 
          SET location_id = ${defaultLocationId} 
          WHERE location_id IS NULL
        `;
        
        await sql`
          UPDATE appointments 
          SET location_id = ${defaultLocationId} 
          WHERE location_id IS NULL
        `;
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runLocationsMigration();