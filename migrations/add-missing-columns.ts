import { sql } from 'drizzle-orm';
import { pgTable, serial, text, integer, doublePrecision } from 'drizzle-orm/pg-core';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/salon_db';

const client = neon(DATABASE_URL);
const db = drizzle(client);

async function migrate() {
  try {
    // Add columns one by one
    const alterStatements = [
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT ''`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS description text`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS duration integer NOT NULL DEFAULT 0`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS price double precision NOT NULL DEFAULT 0`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id integer NOT NULL DEFAULT 1`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS location_id integer`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS room_id integer`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_time_before integer DEFAULT 0`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_time_after integer DEFAULT 0`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6'`
    ];

    for (const statement of alterStatements) {
      await db.execute(sql.raw(statement));
      console.log(`✅ Executed: ${statement}`);
    }

    // Add foreign key constraints
    const constraintStatements = [
      `DO $$ 
       BEGIN 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE constraint_name = 'fk_services_location' 
           AND table_name = 'services'
         ) THEN 
           ALTER TABLE services ADD CONSTRAINT fk_services_location 
             FOREIGN KEY (location_id) REFERENCES locations(id);
         END IF;
       END $$`,
      `DO $$ 
       BEGIN 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE constraint_name = 'fk_services_room' 
           AND table_name = 'services'
         ) THEN 
           ALTER TABLE services ADD CONSTRAINT fk_services_room 
             FOREIGN KEY (room_id) REFERENCES rooms(id);
         END IF;
       END $$`
    ];

    for (const statement of constraintStatements) {
      await db.execute(sql.raw(statement));
      console.log(`✅ Added constraint successfully`);
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrate();