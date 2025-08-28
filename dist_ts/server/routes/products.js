import { insertProductSchema } from "../../shared/schema.js";
import { asyncHandler, NotFoundError } from "../utils/errors.js";
import { validateRequest } from "../middleware/error-handler.js";
export function registerProductRoutes(app, storage) {
    // Get all products
    app.get("/api/products", asyncHandler(async (_req, res) => {
        const products = await storage.getAllProducts();
        res.json(products);
    }));
    // Get product by ID
    app.get("/api/products/:id", asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id);
        const product = await storage.getProduct(id);
        if (!product) {
            throw new NotFoundError("Product");
        }
        res.json(product);
    }));
    // Create product
    app.post("/api/products", validateRequest(insertProductSchema), asyncHandler(async (req, res) => {
        const productData = req.body;
        try {
            const product = await storage.createProduct(productData);
            res.status(201).json(product);
        }
        catch (error) {
            // Handle duplicate SKU gracefully with a clear 409 response
            if (error?.code === '23505' ||
                (typeof error?.message === 'string' && error.message.includes('products_sku_unique'))) {
                return res.status(409).json({
                    error: 'ConflictError',
                    message: 'SKU already exists',
                    timestamp: new Date().toISOString(),
                    path: req.path,
                    method: req.method,
                });
            }
            throw error;
        }
    }));
    // Update product (partial)
    app.put("/api/products/:id", validateRequest(insertProductSchema.partial()), asyncHandler(async (req, res) => {
        const id = parseInt(req.params.id);
        const existing = await storage.getProduct(id);
        if (!existing) {
            throw new NotFoundError("Product");
        }
        const updated = await storage.updateProduct(id, req.body);
        res.json(updated);
    }));
    // Delete product
    app.delete("/api/products/:id", asyncHandler(async (req, res) => {
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
    }));
}
