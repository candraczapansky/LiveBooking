import type { Express, Request, Response } from "express";
import type { IStorage } from "../storage.js";
import { insertProductSchema } from "../../shared/schema.js";
import { asyncHandler, NotFoundError } from "../utils/errors.js";
import { validateRequest } from "../middleware/error-handler.js";

export function registerProductRoutes(app: Express, storage: IStorage) {
  // Get all products
  app.get(
    "/api/products",
    asyncHandler(async (_req: Request, res: Response) => {
      const products = await storage.getAllProducts();
      res.json(products);
    })
  );

  // Get product by ID
  app.get(
    "/api/products/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      if (!product) {
        throw new NotFoundError("Product");
      }
      res.json(product);
    })
  );

  // Create product
  app.post(
    "/api/products",
    validateRequest(insertProductSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const productData = req.body;
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    })
  );

  // Update product (partial)
  app.put(
    "/api/products/:id",
    validateRequest(insertProductSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const existing = await storage.getProduct(id);
      if (!existing) {
        throw new NotFoundError("Product");
      }
      const updated = await storage.updateProduct(id, req.body);
      res.json(updated);
    })
  );

  // Delete product
  app.delete(
    "/api/products/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const existing = await storage.getProduct(id);
      if (!existing) {
        throw new NotFoundError("Product");
      }
      const ok = await storage.deleteProduct(id);
      if (!ok) {
        throw new NotFoundError("Product");
      }
      res.json({ success: true });
    })
  );
}


