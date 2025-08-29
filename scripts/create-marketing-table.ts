import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function createMarketingTable() {
  try {
    console.log('🔄 Creating marketing_campaigns table...');
    
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Create marketing_campaigns table
    await sql`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        schedule_type TEXT DEFAULT 'one_time',
        scheduled_date TIMESTAMP,
        recurrence_pattern TEXT,
        target_audience TEXT[],
        content TEXT NOT NULL,
        subject TEXT,
        photo_url TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Created marketing_campaigns table');

    console.log('🎉 Table creation completed successfully!');
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createMarketingTable();
