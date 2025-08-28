import { asyncHandler } from "../utils/errors.js";
export function registerNotificationRoutes(app, storage) {
    // Get notifications with optional limit
    app.get("/api/notifications", asyncHandler(async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
            // Use available storage APIs
            const notifications = limit
                ? await storage.getRecentNotifications(limit)
                : await storage.getRecentNotifications();
            res.json(notifications || []);
        }
        catch (error) {
            console.error("Error getting notifications:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get notifications"
            });
        }
    }));
}
