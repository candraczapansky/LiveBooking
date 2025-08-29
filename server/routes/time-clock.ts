import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { requireAuth } from "../middleware/error-handler.js";

function getUserFromReq(req: Request): any {
  return (req as any).user || null;
}

function ensureStaffContext(req: Request): { staffId: number; role: string } | null {
  const user = getUserFromReq(req);
  if (!user) return null;
  if (user.role === "admin") {
    const staffIdParam = (req.query.staffId as string) || (req.body?.staffId as string);
    if (staffIdParam && !Number.isNaN(parseInt(staffIdParam))) {
      return { staffId: parseInt(staffIdParam), role: "admin" };
    }
    // Admin without explicit staffId: fall back to own staffId if present
    if (user.staffId) {
      return { staffId: Number(user.staffId), role: "admin" };
    }
    return { staffId: 0, role: "admin" };
  }
  if (user.role === "staff" && user.staffId) {
    return { staffId: Number(user.staffId), role: "staff" };
  }
  return null;
}

export function registerTimeClockRoutes(app: Express, storage: IStorage) {
  // Get current clock-in status for the requesting staff (or specified staff if admin)
  app.get("/api/time-clock/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const ctx = ensureStaffContext(req);
      if (!ctx || !ctx.staffId) {
        return res.status(403).json({ error: "Not authorized for time clock" });
      }

      const entries = await storage.getTimeClockEntriesByStaffId(ctx.staffId);
      const open = (entries || []).find((e: any) => e.status === "clocked_in" && !e.clockOutTime);
      return res.json({ clockedIn: !!open, entry: open || null });
    } catch (error) {
      console.error("Error getting time clock status:", error);
      return res.status(500).json({ error: "Failed to get time clock status" });
    }
  });

  // List entries (staff: own only; admin: all or by staffId)
  app.get("/api/time-clock/entries", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = getUserFromReq(req);
      const limit = parseInt((req.query.limit as string) || "50");
      if (user?.role === "admin") {
        const staffIdParam = (req.query.staffId as string) || "";
        if (staffIdParam) {
          const entries = await storage.getTimeClockEntriesByStaffId(parseInt(staffIdParam));
          return res.json(entries.slice(0, Number.isFinite(limit) ? limit : 50));
        }
        const entries = await storage.getAllTimeClockEntries();
        return res.json(entries.slice(0, Number.isFinite(limit) ? limit : 50));
      }

      const ctx = ensureStaffContext(req);
      if (!ctx) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const entries = await storage.getTimeClockEntriesByStaffId(ctx.staffId);
      return res.json(entries.slice(0, Number.isFinite(limit) ? limit : 50));
    } catch (error) {
      console.error("Error listing time clock entries:", error);
      return res.status(500).json({ error: "Failed to list time clock entries" });
    }
  });

  // Clock in for the current staff
  app.post("/api/time-clock/clock-in", requireAuth, async (req: Request, res: Response) => {
    try {
      const ctx = ensureStaffContext(req);
      if (!ctx || !ctx.staffId) {
        return res.status(403).json({ error: "Only staff or admin can clock in" });
      }

      // Prevent duplicate clock-in if an open entry exists
      const existing = await storage.getTimeClockEntriesByStaffId(ctx.staffId);
      const open = (existing || []).find((e: any) => e.status === "clocked_in" && !e.clockOutTime);
      if (open) {
        return res.status(409).json({ error: "Already clocked in" });
      }

      const now = new Date();
      const location = (req.body && req.body.location) || undefined;
      const notes = (req.body && req.body.notes) || undefined;
      const created = await storage.createTimeClockEntry({
        staffId: ctx.staffId,
        clockInTime: now,
        clockOutTime: undefined,
        breakTime: 0,
        notes,
        status: "clocked_in",
        location,
        externalId: undefined,
      } as any);

      return res.status(201).json(created);
    } catch (error) {
      console.error("Error clocking in:", error);
      return res.status(500).json({ error: "Failed to clock in" });
    }
  });

  // Clock out for the current staff
  app.post("/api/time-clock/clock-out", requireAuth, async (req: Request, res: Response) => {
    try {
      const ctx = ensureStaffContext(req);
      if (!ctx || !ctx.staffId) {
        return res.status(403).json({ error: "Only staff or admin can clock out" });
      }

      const entries = await storage.getTimeClockEntriesByStaffId(ctx.staffId);
      const open = (entries || []).find((e: any) => e.status === "clocked_in" && !e.clockOutTime);
      if (!open) {
        return res.status(400).json({ error: "No active clock-in found" });
      }

      const now = new Date();
      const breakMinutes = Number((req.body && req.body.breakTime) || open.breakTime || 0);
      const diffMs = now.getTime() - new Date(open.clockInTime).getTime();
      const totalHours = Math.max(0, diffMs / (1000 * 60 * 60) - (Number.isFinite(breakMinutes) ? breakMinutes / 60 : 0));

      const updated = await storage.updateTimeClockEntry(open.id, {
        clockOutTime: now,
        status: "clocked_out",
        // @ts-ignore - totalHours isn't part of Insert schema; allowed at runtime
        totalHours,
      } as any);

      return res.json(updated);
    } catch (error) {
      console.error("Error clocking out:", error);
      return res.status(500).json({ error: "Failed to clock out" });
    }
  });
}

export default registerTimeClockRoutes;


