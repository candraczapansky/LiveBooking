import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { asyncHandler } from "../utils/errors.js";

const CONFIG_KEY = 'booking_design';

export function registerBookingDesignRoutes(app: Express, storage: IStorage) {
  // Get booking design settings
  app.get("/api/booking-design", asyncHandler(async (_req: Request, res: Response) => {
    try {
      const cfg = await (storage as any).getSystemConfig?.(CONFIG_KEY);
      let value: any = cfg?.value || null;
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch {}
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
      return res.json({ ...(defaults as any), ...(value || {}) });
    } catch (error: any) {
      console.error("Error getting booking design settings:", error);
      return res.status(500).json({ error: error?.message || 'Failed to get booking design settings' });
    }
  }));

  // Update booking design settings
  app.put("/api/booking-design", asyncHandler(async (req: Request, res: Response) => {
    try {
      const payload = req.body || {};
      const serialized = JSON.stringify(payload);
      const existing = await (storage as any).getSystemConfig?.(CONFIG_KEY);
      if (existing) {
        await (storage as any).updateSystemConfig?.(CONFIG_KEY, serialized, 'Booking design settings');
      } else {
        await (storage as any).setSystemConfig?.({
          key: CONFIG_KEY,
          value: serialized,
          description: 'Booking design settings',
          category: 'booking',
          isEncrypted: false,
          isActive: true,
        });
      }
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating booking design settings:", error);
      return res.status(500).json({ error: error?.message || 'Failed to update booking design settings' });
    }
  }));
}


