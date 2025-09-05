import express from "express";

const CONFIG_KEY = 'booking_design';

export function registerBookingDesignRoutes(app, storage) {
    // Get booking design settings
    app.get("/api/booking-design", async (req, res) => {
        try {
            const cfg = await (storage?.getSystemConfig?.(CONFIG_KEY));
            let value = (cfg?.value ?? null);
            if (typeof value === 'string') {
                try {
                    value = JSON.parse(value);
                }
                catch { }
            }
            const defaults = {
                backgroundImage: null,
                primaryColor: '#8b5cf6',
                textColor: '#111827',
                aboutContent: '',
                servicesContent: '',
                contactContent: '',
                showTabs: true,
            };
            res.json(Object.assign({}, defaults, (value || {})));
        }
        catch (error) {
            console.error("Error getting booking design settings:", error);
            res.status(500).json({ error: 'Failed to get booking design settings' });
        }
    });
    // Update booking design settings (accept large payloads)
    app.put("/api/booking-design", express.text({ type: '*/*', limit: '50mb' }), async (req, res) => {
        try {
            let payload = {};
            try {
                if (typeof req.body === 'string') {
                    payload = JSON.parse(req.body || '{}');
                }
                else if (req.body && typeof req.body === 'object') {
                    payload = req.body;
                }
            }
            catch {
                return res.status(400).json({ error: 'Invalid design payload' });
            }
            const serialized = JSON.stringify(payload);
            const existing = await (storage?.getSystemConfig?.(CONFIG_KEY));
            if (existing) {
                await (storage?.updateSystemConfig?.(CONFIG_KEY, serialized, 'Booking design settings'));
            }
            else {
                await (storage?.setSystemConfig?.({
                    key: CONFIG_KEY,
                    value: serialized,
                    description: 'Booking design settings',
                    category: 'booking',
                    isEncrypted: false,
                    isActive: true,
                }));
            }
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error updating booking design settings:", error);
            res.status(500).json({ error: 'Failed to update booking design settings' });
        }
    });
}


