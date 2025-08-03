const { Client } = require('pg');
const fs = require('fs');

async function executeSQL() {
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

    // Read the SQL file
    const sql = fs.readFileSync('fix-locations-direct.sql', 'utf8');
    
    // Execute the SQL
    const result = await client.query(sql);
    console.log('SQL executed successfully');
    
    // Get verification results
    const verificationQuery = `
      SELECT 'Appointments for Location 1' as table_name, COUNT(*) as count FROM appointments WHERE location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1)
      UNION ALL
      SELECT 'Appointments for Location 2' as table_name, COUNT(*) as count FROM appointments WHERE location_id = (SELECT id FROM locations WHERE name = 'Downtown Location' LIMIT 1)
      UNION ALL
      SELECT 'Staff for Location 1' as table_name, COUNT(*) as count FROM staff WHERE location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1)
      UNION ALL
      SELECT 'Staff for Location 2' as table_name, COUNT(*) as count FROM staff WHERE location_id = (SELECT id FROM locations WHERE name = 'Downtown Location' LIMIT 1)
      UNION ALL
      SELECT 'Services for Location 1' as table_name, COUNT(*) as count FROM services WHERE location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1)
      UNION ALL
      SELECT 'Services for Location 2' as table_name, COUNT(*) as count FROM services WHERE location_id = (SELECT id FROM locations WHERE name = 'Downtown Location' LIMIT 1)
    `;
    
    const verificationResult = await client.query(verificationQuery);
    console.log('\n=== Verification Results ===');
    verificationResult.rows.forEach(row => {
      console.log(`${row.table_name}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error executing SQL:', error);
  } finally {
    await client.end();
  }
}

executeSQL(); 