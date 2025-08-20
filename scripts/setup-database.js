import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { runMigrations } from './run-migrations.js';
import { restoreEssentialData } from './restore-essential-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  try {
    console.log('🔄 Starting database setup...');

    // Run migrations
    console.log('📦 Running database migrations...');
    await runMigrations();
    console.log('✅ Migrations completed');

    // Run data restoration
    console.log('🌱 Restoring essential data...');
    await restoreEssentialData();
    console.log('✅ Data restoration completed');

    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Error during database setup:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupDatabase();
}