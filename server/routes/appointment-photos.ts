import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { z } from "zod";
import { insertAppointmentPhotoSchema } from "../../shared/schema.js";
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  asyncHandler 
} from "../utils/errors.js";
import LoggerService, { getLogContext } from "../utils/logger.js";
import { validateRequest, requireAuth } from "../middleware/error-handler.js";

// Schema for photo upload
const uploadPhotoSchema = z.object({
  photoData: z.string(), // Base64 encoded image
  photoType: z.enum(["before", "during", "after", "progress"]),
  description: z.string().optional(),
  uploadedBy: z.number().optional(),
  uploadedByRole: z.enum(["admin", "staff", "client"]).optional(),
});

export function registerAppointmentPhotoRoutes(app: Express, storage: IStorage) {
  // Get all photos for an appointment
  app.get("/api/appointments/:appointmentId/photos", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const appointmentId = parseInt(req.params.appointmentId);

    LoggerService.debug("Fetching appointment photos", { ...context, appointmentId });

    const photos = await storage.getAppointmentPhotos(appointmentId);

    LoggerService.info("Appointment photos fetched", { ...context, appointmentId, count: photos.length });
    res.json(photos);
  }));

  // Upload a new photo for an appointment
  app.post("/api/appointments/:appointmentId/photos", validateRequest(uploadPhotoSchema), asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const appointmentId = parseInt(req.params.appointmentId);
    const photoData = req.body;

    LoggerService.info("Uploading appointment photo", { ...context, appointmentId, photoType: photoData.photoType });

    // Validate that the appointment exists
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      throw new NotFoundError("Appointment not found");
    }

    // Create the photo record
    const newPhoto = await storage.createAppointmentPhoto({
      appointmentId,
      photoData: photoData.photoData,
      photoType: photoData.photoType,
      description: photoData.description,
      uploadedBy: photoData.uploadedBy,
      uploadedByRole: photoData.uploadedByRole || "staff",
    });

    LoggerService.info("Appointment photo uploaded", { ...context, appointmentId, photoId: newPhoto.id });
    res.status(201).json(newPhoto);
  }));

  // Get a specific photo
  app.get("/api/appointment-photos/:photoId", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const photoId = parseInt(req.params.photoId);

    LoggerService.debug("Fetching appointment photo", { ...context, photoId });

    const photo = await storage.getAppointmentPhoto(photoId);
    if (!photo) {
      throw new NotFoundError("Photo not found");
    }

    LoggerService.info("Appointment photo fetched", { ...context, photoId });
    res.json(photo);
  }));

  // Delete a photo
  app.delete("/api/appointment-photos/:photoId", asyncHandler(async (req: Request, res: Response) => {
    const context = getLogContext(req);
    const photoId = parseInt(req.params.photoId);

    LoggerService.info("Deleting appointment photo", { ...context, photoId });

    const deleted = await storage.deleteAppointmentPhoto(photoId);
    if (!deleted) {
      throw new NotFoundError("Photo not found");
    }

    LoggerService.info("Appointment photo deleted", { ...context, photoId });
    res.status(204).send();
  }));
} 