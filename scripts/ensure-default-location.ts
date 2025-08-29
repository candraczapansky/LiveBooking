import 'dotenv/config';
import { db } from '../server/db.js';
import { locations } from '../shared/schema.js';
import { desc, sql } from 'drizzle-orm';

async function main() {
  try {
    // Ensure locations table exists (safe, idempotent)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        phone TEXT,
        email TEXT,
        timezone TEXT DEFAULT 'America/New_York',
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        description TEXT,
        business_hours TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Check existing locations
    let list = await db.select().from(locations).orderBy(desc(locations.id));
    console.log(`Existing locations: ${list.length}`);

    if (list.length === 0) {
      console.log('No locations found. Creating default "Main Location"...');
      const inserted = await db
        .insert(locations)
        .values({
          name: 'Main Location',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          phone: '555-123-4567',
          email: 'info@example.com',
          timezone: 'America/New_York',
          isActive: true,
          isDefault: true,
          description: 'Primary business location',
        })
        .returning();
      list = inserted;
      console.log('Created location:', inserted[0]);
    } else {
      console.log('Locations already exist. No changes made.');
    }

    // Output first location summary
    const first = list[0];
    console.log('Sample location:', {
      id: first?.id,
      name: first?.name,
      isDefault: first?.isDefault,
      isActive: first?.isActive,
    });
  } catch (e) {
    console.error('Failed to ensure default location:', e);
    process.exitCode = 1;
  }
}

main();


