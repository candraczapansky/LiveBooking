import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function fixMarketingSchema() {
  try {
    console.log('🔄 Fixing marketing campaigns schema...');
    
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Create marketing_campaigns table if it doesn't exist
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

    // Add photo_url column if it doesn't exist
    await sql`ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS photo_url TEXT`;
    console.log('✅ Added photo_url column');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_scheduled_date ON marketing_campaigns(scheduled_date)`;
    console.log('✅ Created indexes');

    // Create marketing_campaign_results table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS marketing_campaign_results (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES marketing_campaigns(id),
        recipient_id INTEGER,
        recipient_email TEXT,
        recipient_phone TEXT,
        status TEXT DEFAULT 'pending',
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Created marketing_campaign_results table');

    console.log('🎉 Marketing schema update completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing marketing schema:', error);
    process.exit(1);
  }
}

fixMarketingSchema();
