import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function testDB() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('Database connection successful:', result);
    
    // Check if permission tables exist
    try {
      const tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%permission%'
        ORDER BY table_name
      `);
      console.log('Permission tables found:', tables);
    } catch (error) {
      console.log('Error checking tables:', error.message);
    }
    
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

testDB().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
}); 