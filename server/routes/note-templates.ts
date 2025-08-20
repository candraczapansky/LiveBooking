import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { insertNoteTemplateSchema, updateNoteTemplateSchema } from "../../shared/schema.js";
import { validateRequest } from "../middleware/error-handler.js";
import { asyncHandler } from "../utils/errors.js";
import LoggerService, { getLogContext } from "../utils/logger.js";

export function registerNoteTemplateRoutes(app: Express, storage: IStorage) {
  // Get all note templates
  app.get("/api/note-templates", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const { category, active } = req.query;

    LoggerService.debug("Fetching note templates", { ...context, category, active });

    let templates;
    if (category) {
      templates = await storage.getNoteTemplatesByCategory(category as string);
    } else if (active === "true") {
      templates = await storage.getActiveNoteTemplates();
    } else {
      templates = await storage.getAllNoteTemplates();
    }

    LoggerService.info("Note templates fetched", { ...context, count: templates.length });
    res.json(templates);
  }));

  // Get note template by ID
  app.get("/api/note-templates/:id", asyncHandler(async (req: Request, res: Response) => {
    const templateId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.debug("Fetching note template", { ...context, templateId });

    const template = await storage.getNoteTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: "Note template not found" });
    }

    res.json(template);
  }));

  // Create new note template
  app.post("/api/note-templates", validateRequest(insertNoteTemplateSchema), asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const templateData = req.body;

    LoggerService.info("Creating note template", { ...context, name: templateData.name });

    const newTemplate = await storage.createNoteTemplate(templateData);

    LoggerService.info("Note template created", { ...context, templateId: newTemplate.id });
    res.status(201).json(newTemplate);
  }));

  // Update note template
  app.put("/api/note-templates/:id", validateRequest(updateNoteTemplateSchema), asyncHandler(async (req: Request, res: Response) => {
    const templateId = parseInt(req.params.id);
    const context = getLogContext(req);
    const templateData = req.body;

    LoggerService.info("Updating note template", { ...context, templateId });

    const existingTemplate = await storage.getNoteTemplate(templateId);
    if (!existingTemplate) {
      return res.status(404).json({ error: "Note template not found" });
    }

    const updatedTemplate = await storage.updateNoteTemplate(templateId, templateData);

    LoggerService.info("Note template updated", { ...context, templateId });
    res.json(updatedTemplate);
  }));

  // Delete note template
  app.delete("/api/note-templates/:id", asyncHandler(async (req: Request, res: Response) => {
    const templateId = parseInt(req.params.id);
    const context = getLogContext(req);

    LoggerService.info("Deleting note template", { ...context, templateId });

    const existingTemplate = await storage.getNoteTemplate(templateId);
    if (!existingTemplate) {
      return res.status(404).json({ error: "Note template not found" });
    }

    const deleted = await storage.deleteNoteTemplate(templateId);
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete note template" });
    }

    LoggerService.info("Note template deleted", { ...context, templateId });
    res.json({ message: "Note template deleted successfully" });
  }));
} 