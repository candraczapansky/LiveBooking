import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { promises as fs } from 'fs';
import { join } from 'path';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function runMigration() {
  try {
    console.log('🔄 Running database migration...');
    
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Read migration file
    const migrationPath = join(process.cwd(), 'migrations', '0005_add_marketing_campaigns.sql');
    const migration = await fs.readFile(migrationPath, 'utf8');

    // Split migration into individual statements
    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute the migration as a single statement
    try {
      await sql.execute(migration);
      console.log('✅ Migration executed successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Table already exists, continuing...');
      } else {
        throw error;
      }
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
