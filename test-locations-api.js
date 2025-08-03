import { Client } from 'pg';

async function testLocationsAPI() {
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

    // Check if locations exist
    const locations = await client.query('SELECT * FROM locations ORDER BY id DESC');
    console.log('Locations in database:', locations.rows.length);
    
    if (locations.rows.length > 0) {
      console.log('Sample location:', locations.rows[0]);
    } else {
      console.log('No locations found in database');
    }

    // Test the API endpoint
    const response = await fetch('http://localhost:5003/api/locations', {
      headers: {
        'x-user-id': '1', // Assuming user ID 1 exists
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('API Response:', data);
      console.log('Number of locations from API:', data.length);
    } else {
      console.error('API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testLocationsAPI(); 