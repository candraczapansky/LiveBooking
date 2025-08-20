import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage";
import { asyncHandler } from "../utils/errors";

export function registerBusinessSettingsRoutes(app: Express, storage: IStorage) {
  // Get business settings
  app.get("/api/business-settings", asyncHandler(async (req: Request, res: Response) => {
    try {
      const settings = await storage.getBusinessSettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error getting business settings:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get business settings"
      });
    }
  }));
}
