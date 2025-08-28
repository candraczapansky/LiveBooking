import { z } from "zod";
export function registerBusinessKnowledgeRoutes(app, storage) {
    app.get('/api/business-knowledge', async (_req, res) => {
        try {
            const entries = await storage.getBusinessKnowledge();
            return res.json(entries);
        }
        catch (err) {
            return res.status(500).json({ error: err.message || 'Failed to load business knowledge' });
        }
    });
    app.get('/api/business-knowledge/categories', async (_req, res) => {
        try {
            const cats = await storage.getBusinessKnowledgeCategories();
            return res.json(cats);
        }
        catch (err) {
            return res.status(500).json({ error: err.message || 'Failed to load categories' });
        }
    });
    app.post('/api/business-knowledge', async (req, res) => {
        try {
            const schema = z.object({
                question: z.string().min(1),
                answer: z.string().min(1),
                category: z.string().min(1),
                priority: z.number().min(1).max(5),
            });
            const { question, answer, category, priority } = schema.parse(req.body);
            const created = await storage.createBusinessKnowledge({
                title: question,
                content: answer,
                category,
                priority,
                active: true,
            });
            return res.status(201).json(created);
        }
        catch (err) {
            return res.status(400).json({ error: err.message || 'Failed to create entry' });
        }
    });
    app.put('/api/business-knowledge/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const schema = z.object({
                question: z.string().min(1),
                answer: z.string().min(1),
                category: z.string().min(1),
                priority: z.number().min(1).max(5),
            });
            const { question, answer, category, priority } = schema.parse(req.body);
            const updated = await storage.updateBusinessKnowledge(id, {
                title: question,
                content: answer,
                category,
                priority,
            });
            return res.json(updated);
        }
        catch (err) {
            return res.status(400).json({ error: err.message || 'Failed to update entry' });
        }
    });
    app.delete('/api/business-knowledge/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await storage.deleteBusinessKnowledge(id);
            return res.json({ success: true });
        }
        catch (err) {
            return res.status(400).json({ error: err.message || 'Failed to delete entry' });
        }
    });
}
