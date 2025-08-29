import express from 'express';
import { db } from '../db.js';
import { locations, appointments, insertLocationSchema, updateLocationSchema } from '../../shared/schema.js';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/error-handler.js';

const router = express.Router();

async function ensureLocationsSchema() {
  // Ensure locations table exists
  try {
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
  } catch {}

  // Add any missing columns to be compatible with current app schema without dropping data
  try { await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York'`); } catch {}
  try { await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS description TEXT`); } catch {}
  try { await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS business_hours TEXT`); } catch {}
  try { await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`); } catch {}
  try { await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false`); } catch {}
  try { await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`); } catch {}
  try { await db.execute(sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`); } catch {}
}

// Get all locations
router.get('/', requireAuth, async (req, res) => {
  try {
    // Ensure schema compatibility in case of older databases
    await ensureLocationsSchema();

    let allLocations = await db.select().from(locations).orderBy(desc(locations.id));

    // Safety net: if no locations exist, create a sensible default to keep the app functional
    if (allLocations.length === 0) {
      try {
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
        allLocations = inserted;
      } catch (e) {
        // If insert fails for any reason, fall through and return the (empty) list
      }
    }

    res.json(allLocations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get active locations only
router.get('/active', requireAuth, async (req, res) => {
  try {
    const activeLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.isActive, true))
      .orderBy(desc(locations.id));
    res.json(activeLocations);
  } catch (error) {
    console.error('Error fetching active locations:', error);
    res.status(500).json({ error: 'Failed to fetch active locations' });
  }
});

// Get location by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, parseInt(id)))
      .limit(1);

    if (location.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location[0]);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// Create new location
router.post('/', requireAuth, async (req, res) => {
  try {
    const locationData = insertLocationSchema.parse(req.body);
    
    // If this is the first location, make it the default
    const existingLocations = await db.select().from(locations);
    if (existingLocations.length === 0) {
      locationData.isDefault = true;
    }

    const newLocation = await db.insert(locations).values(locationData).returning();
    res.status(201).json(newLocation[0]);
  } catch (error) {
    console.error('Error creating location:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create location' });
    }
  }
});

// Update location
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = updateLocationSchema.parse(req.body);
    
    // If setting this location as default, unset other defaults
    if (updateData.isDefault) {
      await db
        .update(locations)
        .set({ isDefault: false })
        .where(eq(locations.isDefault, true));
    }

    const updatedLocation = await db
      .update(locations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(locations.id, parseInt(id)))
      .returning();

    if (updatedLocation.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(updatedLocation[0]);
  } catch (error) {
    console.error('Error updating location:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update location' });
    }
  }
});

// Delete location
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if location exists
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, parseInt(id)))
      .limit(1);

    if (location.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // First, set location_id to NULL for all appointments that reference this location
    await db
      .update(appointments)
      .set({ locationId: null })
      .where(eq(appointments.locationId, parseInt(id)));

    // Then delete the location
    await db.delete(locations).where(eq(locations.id, parseInt(id)));
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// Set location as default
router.patch('/:id/set-default', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Unset current default
    await db
      .update(locations)
      .set({ isDefault: false })
      .where(eq(locations.isDefault, true));

    // Set new default
    const updatedLocation = await db
      .update(locations)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(locations.id, parseInt(id)))
      .returning();

    if (updatedLocation.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(updatedLocation[0]);
  } catch (error) {
    console.error('Error setting default location:', error);
    res.status(500).json({ error: 'Failed to set default location' });
  }
});

// Toggle location active status
router.patch('/:id/toggle-active', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, parseInt(id)))
      .limit(1);

    if (location.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const newActiveStatus = !location[0].isActive;
    
    // Don't allow deactivating the default location
    if (location[0].isDefault && !newActiveStatus) {
      return res.status(400).json({ error: 'Cannot deactivate the default location' });
    }

    const updatedLocation = await db
      .update(locations)
      .set({ isActive: newActiveStatus, updatedAt: new Date() })
      .where(eq(locations.id, parseInt(id)))
      .returning();

    res.json(updatedLocation[0]);
  } catch (error) {
    console.error('Error toggling location active status:', error);
    res.status(500).json({ error: 'Failed to toggle location active status' });
  }
});

export default router;

export const registerLocationRoutes = (app: express.Application, storage: any) => {
  app.use('/api/locations', router);
}; 