import { asyncHandler } from "../utils/errors.js";
export function registerBusinessSettingsRoutes(app, storage) {
    // Get business settings
    app.get("/api/business-settings", asyncHandler(async (req, res) => {
        try {
            const settings = await storage.getBusinessSettings();
            res.json(settings || {});
        }
        catch (error) {
            console.error("Error getting business settings:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get business settings"
            });
        }
    }));
}
