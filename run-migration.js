// Run the terminal_devices table migration
import { db } from './server/db.js';

const migrations = [
  // Create table
  `CREATE TABLE IF NOT EXISTS terminal_devices (
    id SERIAL PRIMARY KEY,
    device_code TEXT NOT NULL UNIQUE,
    device_name TEXT NOT NULL,
    location_id INTEGER REFERENCES locations(id),
    status TEXT DEFAULT 'active' NOT NULL,
    device_type TEXT DEFAULT 'smart_terminal' NOT NULL,
    last_seen TIMESTAMP,
    is_default BOOLEAN DEFAULT FALSE,
    api_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  
  // Create indexes
  'CREATE INDEX IF NOT EXISTS idx_terminal_devices_device_code ON terminal_devices(device_code)',
  'CREATE INDEX IF NOT EXISTS idx_terminal_devices_location_id ON terminal_devices(location_id)',
  'CREATE INDEX IF NOT EXISTS idx_terminal_devices_status ON terminal_devices(status)',
  'CREATE INDEX IF NOT EXISTS idx_terminal_devices_is_default ON terminal_devices(is_default)'
];

console.log('🚀 Running terminal_devices table migration...');

try {
  // Execute each migration statement separately
  for (let i = 0; i < migrations.length; i++) {
    console.log(`📝 Executing migration ${i + 1}/${migrations.length}...`);
    await db.execute(migrations[i]);
    console.log(`✅ Migration ${i + 1} completed`);
  }
  
  console.log('✅ All migrations completed successfully!');
  console.log('✅ terminal_devices table created with all indexes');
  
  // Verify the table was created
  const result = await db.execute('SELECT COUNT(*) as count FROM terminal_devices');
  console.log('✅ Table verification:', result.rows[0]);
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  if (error.message.includes('already exists')) {
    console.log('ℹ️  Table already exists, this is fine');
  }
}

console.log('🏁 Migration script completed');
process.exit(0);
