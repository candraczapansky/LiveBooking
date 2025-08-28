import express from 'express';
import { db } from '../db.js';
import { locations, appointments, insertLocationSchema, updateLocationSchema } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/error-handler.js';
const router = express.Router();
// Get all locations
router.get('/', requireAuth, async (req, res) => {
    try {
        const allLocations = await db.select().from(locations).orderBy(desc(locations.id));
        res.json(allLocations);
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error creating location:', error);
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
        }
        else {
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
    }
    catch (error) {
        console.error('Error updating location:', error);
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
        }
        else {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Error toggling location active status:', error);
        res.status(500).json({ error: 'Failed to toggle location active status' });
    }
});
export default router;
export const registerLocationRoutes = (app, storage) => {
    app.use('/api/locations', router);
};
