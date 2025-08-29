import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { z } from "zod";
import { asyncHandler, NotFoundError, ValidationError } from "../utils/errors.js";
import { insertClassSchema, insertClassEnrollmentSchema } from "../../shared/schema.js";

const updateClassSchema = insertClassSchema.partial();
const updateEnrollmentSchema = insertClassEnrollmentSchema.partial();

export function registerClassRoutes(app: Express, storage: IStorage) {
  // List classes (optionally by location)
  app.get("/api/classes", asyncHandler(async (req: Request, res: Response) => {
    const { locationId } = req.query as Record<string, string | undefined>;
    const classes = locationId
      ? await storage.getClassesByLocation(parseInt(locationId))
      : await storage.getAllClasses();
    res.json(classes);
  }));

  // Get class by id
  app.get("/api/classes/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const cls = await storage.getClass(id);
    if (!cls) throw new NotFoundError("Class");
    res.json(cls);
  }));

  // Create class
  app.post("/api/classes", asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = insertClassSchema.parse(req.body);
      const created = await storage.createClass(data);
      res.status(201).json(created);
    } catch (e: any) {
      if (e.name === 'ZodError') {
        throw new ValidationError('Invalid class data', e.errors);
      }
      throw e;
    }
  }));

  // Update class
  app.put("/api/classes/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    try {
      const partial = updateClassSchema.parse(req.body);
      const updated = await storage.updateClass(id, partial);
      res.json(updated);
    } catch (e: any) {
      if (e.name === 'ZodError') {
        throw new ValidationError('Invalid class update', e.errors);
      }
      throw e;
    }
  }));

  // Delete class
  app.delete("/api/classes/:id", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const ok = await storage.deleteClass(id);
    res.json({ success: ok });
  }));

  // Enrollments
  app.get("/api/classes/:id/enrollments", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const list = await storage.getEnrollmentsByClass(id);
    res.json(list);
  }));

  app.post("/api/classes/:id/enrollments", asyncHandler(async (req: Request, res: Response) => {
    const classId = parseInt(req.params.id);
    try {
      const base = insertClassEnrollmentSchema.parse({ ...req.body, classId });
      const created = await storage.createClassEnrollment(base);
      res.status(201).json(created);
    } catch (e: any) {
      if (e.name === 'ZodError') {
        throw new ValidationError('Invalid enrollment data', e.errors);
      }
      throw e;
    }
  }));

  app.put("/api/class-enrollments/:enrollmentId", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.enrollmentId);
    try {
      const partial = updateEnrollmentSchema.parse(req.body);
      const updated = await storage.updateClassEnrollment(id, partial);
      res.json(updated);
    } catch (e: any) {
      if (e.name === 'ZodError') {
        throw new ValidationError('Invalid enrollment update', e.errors);
      }
      throw e;
    }
  }));

  app.delete("/api/class-enrollments/:enrollmentId", asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.enrollmentId);
    const ok = await storage.deleteClassEnrollment(id);
    res.json({ success: ok });
  }));
}

export default registerClassRoutes;


