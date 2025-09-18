import { Router, Request, Response } from 'express';
import { VoiceConversationFlowService } from '../services/voice-conversation-flow-service.js';
import { requireAuth } from '../middleware/error-handler.js';
import { z } from 'zod';

const router = Router();

// Schema for creating/updating flows
const flowSchema = z.object({
  name: z.string(),
  nodeType: z.enum(['greeting', 'question', 'response', 'end']),
  message: z.string(),
  parentId: z.number().optional(),
  expectedInputs: z.array(z.string()).optional(),
  nextNodeId: z.number().optional(),
  branches: z.array(z.object({
    keywords: z.array(z.string()),
    response: z.string().optional(),
    nextNodeId: z.number().optional()
  })).optional(),
  isActive: z.boolean().optional(),
  isRoot: z.boolean().optional(),
  timeout: z.number().optional(),
  speechTimeout: z.number().optional(),
  orderIndex: z.number().optional()
});

// Get all flows
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const flows = await VoiceConversationFlowService.getAllFlows();
    res.json(flows);
  } catch (error) {
    console.error('Error fetching voice conversation flows:', error);
    res.status(500).json({ error: 'Failed to fetch conversation flows' });
  }
});

// Create a new flow
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = flowSchema.parse(req.body);
    const flow = await VoiceConversationFlowService.createFlow(data);
    res.json(flow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error creating voice conversation flow:', error);
    res.status(500).json({ error: 'Failed to create conversation flow' });
  }
});

// Update a flow
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid flow ID' });
    }

    const data = flowSchema.partial().parse(req.body);
    const flow = await VoiceConversationFlowService.updateFlow(id, data);
    
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    
    res.json(flow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error updating voice conversation flow:', error);
    res.status(500).json({ error: 'Failed to update conversation flow' });
  }
});

// Delete a flow
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid flow ID' });
    }

    await VoiceConversationFlowService.deleteFlow(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting voice conversation flow:', error);
    res.status(500).json({ error: 'Failed to delete conversation flow' });
  }
});

// Test a flow with input
router.post('/test', requireAuth, async (req: Request, res: Response) => {
  try {
    const { input, nodeId } = req.body;
    
    if (!input || nodeId === undefined) {
      return res.status(400).json({ error: 'Input and nodeId are required' });
    }

    const result = await VoiceConversationFlowService.testFlow(nodeId, input);
    res.json(result);
  } catch (error) {
    console.error('Error testing voice conversation flow:', error);
    res.status(500).json({ error: 'Failed to test conversation flow' });
  }
});

export default router;
