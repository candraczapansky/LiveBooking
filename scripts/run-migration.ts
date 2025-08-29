import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { DATABASE_URL } = process.env as Record<string, string>;
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
    const migrationPath = join(__dirname, '..', 'migrations', '0008_add_appointment_fields.sql');
    const migration = await fs.readFile(migrationPath, 'utf8');

    // Split migration into individual statements
    const statements = migration
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
        console.log('✅ Executed statement successfully:', statement.slice(0, 50) + '...');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('⚠️ Object already exists, continuing...');
        } else {
          console.error('❌ Error executing statement:', statement);
          console.error('Error:', error);
          throw error;
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

runMigration();
