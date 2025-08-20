import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { insertNoteHistorySchema, updateNoteHistorySchema } from "@shared/schema.js";
import { validateRequest } from "../middleware/error-handler.js";
import { asyncHandler } from "../utils/errors.js";
import LoggerService, { getLogContext } from "../utils/logger.js";

export function registerNoteHistoryRoutes(app: Express, storage: IStorage) {
  // Get note history for a client
  app.get("/api/note-history/client/:clientId", asyncHandler(async (req: Request, res: Response) => {
    const clientId = parseInt(req.params.clientId);
    const context = getLogContext(req);

    LoggerService.debug("Fetching note history for client", { ...context, clientId });

    const noteHistory = await storage.getNoteHistoryByClient(clientId);

    LoggerService.info("Note history fetched", { ...context, clientId, count: noteHistory.length });
    res.json(noteHistory);
  }));

  // Get note history for an appointment
  app.get("/api/note-history/appointment/:appointmentId", asyncHandler(async (req: Request, res: Response) => {
    const appointmentId = parseInt(req.params.appointmentId);
    const context = getLogContext(req);

    LoggerService.debug("Fetching note history for appointment", { ...context, appointmentId });

    const noteHistory = await storage.getNoteHistoryByAppointment(appointmentId);

    LoggerService.info("Note history fetched", { ...context, appointmentId, count: noteHistory.length });
    res.json(noteHistory);
  }));

  // Get all note history
  app.get("/api/note-history", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);

    LoggerService.debug("Fetching all note history", context);

    const noteHistory = await storage.getAllNoteHistory();

    LoggerService.info("All note history fetched", { ...context, count: noteHistory.length });
    res.json(noteHistory);
  }));

  // Create new note history entry
  app.post("/api/note-history", validateRequest(insertNoteHistorySchema), asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const noteData = req.body;

    LoggerService.info("Creating note history entry", { ...context, clientId: noteData.clientId });

    const newNoteHistory = await storage.createNoteHistory(noteData);

    LoggerService.info("Note history entry created", { ...context, noteId: newNoteHistory.id });
    res.status(201).json(newNoteHistory);
  }));

  // Update note history entry
  app.put("/api/note-history/:id", validateRequest(updateNoteHistorySchema), asyncHandler(async (req: Request, res: Response) => {
    const noteId = parseInt(req.params.id);
    const context = getLogContext(req);
    const noteData = req.body;

    LoggerService.info("Updating note history entry", { ...context, noteId });

    const existingNote = await storage.getAllNoteHistory();
    const note = existingNote.find(n => n.id === noteId);
    if (!note) {
      return res.status(404).json({ error: "Note history entry not found" });
    }

    const updatedNoteHistory = await storage.updateNoteHistory(noteId, noteData);

    LoggerService.info("Note history entry updated", { ...context, noteId });
    res.json(updatedNoteHistory);
  }));

  // Delete note history entry
  app.delete("/api/note-history/:id", asyncHandler(async (req: Request, res: Response) => {
    const noteId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.info("Deleting note history entry", { ...context, noteId });

    const existingNote = await storage.getAllNoteHistory();
    const note = existingNote.find(n => n.id === noteId);
    if (!note) {
      return res.status(404).json({ error: "Note history entry not found" });
    }

    const deleted = await storage.deleteNoteHistory(noteId);
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete note history entry" });
    }

    LoggerService.info("Note history entry deleted", { ...context, noteId });
    res.json({ message: "Note history entry deleted successfully" });
  }));
} 