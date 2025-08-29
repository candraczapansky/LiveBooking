import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

export async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');
    
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Read migration files
    const migrationsDir = join(__dirname, '..', 'migrations');
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensure migrations run in order

    // Run each migration
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migration = await fs.readFile(join(migrationsDir, file), 'utf8');
      
      try {
        // Split migration into individual statements
        const statements = migration
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        // Execute each statement
        for (const statement of statements) {
          // Execute raw SQL statement
          await sql(statement);
        }
        
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Some objects in ${file} already exist, continuing...`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations();
}