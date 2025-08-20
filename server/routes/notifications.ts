import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { asyncHandler } from "../utils/errors.js";

export function registerNotificationRoutes(app: Express, storage: IStorage) {
  // Get notifications with optional limit
  app.get("/api/notifications", asyncHandler(async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      // Use available storage APIs
      const notifications = limit
        ? await storage.getRecentNotifications(limit)
        : await storage.getRecentNotifications();
      res.json(notifications || []);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get notifications"
      });
    }
  }));
}
