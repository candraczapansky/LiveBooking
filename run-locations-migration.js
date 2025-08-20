import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function runLocationsMigration() {
  console.log('🔧 Running locations migration...');
  
  const sql = postgres(DATABASE_URL);
  
  try {
    // Create locations table
    console.log('Creating locations table...');
    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip_code TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        timezone TEXT DEFAULT 'America/New_York',
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        description TEXT,
        business_hours TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Add location_id columns
    console.log('Adding location_id columns...');
    await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id)`;
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id)`;
    await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id)`;
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id)`;
    
    // Insert default location if none exists
    console.log('Inserting default location...');
    const existingLocations = await sql`SELECT COUNT(*) as count FROM locations`;
    if (existingLocations[0].count === 0) {
      await sql`
        INSERT INTO locations (
          name, address, city, state, zip_code, phone, email, timezone, 
          is_active, is_default, description, created_at, updated_at
        ) VALUES (
          'Main Location', '123 Main St', 'New York', 'NY', '10001',
          '555-123-4567', 'info@example.com', 'America/New_York',
          true, true, 'Primary business location', NOW(), NOW()
        )
      `;
    }
    
    // Update existing records
    console.log('Updating existing records...');
    await sql`
      UPDATE services 
      SET location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1) 
      WHERE location_id IS NULL
    `;
    
    await sql`
      UPDATE staff 
      SET location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1) 
      WHERE location_id IS NULL
    `;
    
    await sql`
      UPDATE rooms 
      SET location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1) 
      WHERE location_id IS NULL
    `;
    
    await sql`
      UPDATE appointments 
      SET location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1) 
      WHERE location_id IS NULL
    `;
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    
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
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runLocationsMigration();