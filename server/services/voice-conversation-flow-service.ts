import { db } from "../db.js";
import { 
  voiceConversationFlows, 
  voiceConversationSessions,
  type VoiceConversationFlow, 
  type InsertVoiceConversationFlow, 
  type UpdateVoiceConversationFlow,
  type VoiceConversationSession,
  type InsertVoiceConversationSession 
} from "../../shared/schema.js";
import { eq, and, sql } from "drizzle-orm";

interface FlowBranch {
  keywords: string[];
  response?: string;
  nextNodeId?: number;
}

interface ProcessResult {
  message: string;
  nextNodeId: number | null;
  shouldEnd: boolean;
  timeout?: number;
  speechTimeout?: number;
}

export class VoiceConversationFlowService {
  // Initialize default flows if none exist
  static async initializeDefaultFlows(): Promise<void> {
    try {
      // Check if flows already exist
      const existing = await db
        .select()
        .from(voiceConversationFlows)
        .limit(1);
      
      if (existing.length > 0) {
        console.log('✅ Voice conversation flows already initialized');
        return;
      }

      console.log('📝 Creating default voice conversation flows...');

      // Create default greeting flow
      const [greeting] = await db.insert(voiceConversationFlows).values({
        name: 'Main Greeting',
        nodeType: 'greeting',
        message: 'Hello! Thank you for calling Glo Head Spa. I\'m your AI assistant and I\'m here to help you today.',
        isRoot: true,
        isActive: true,
        timeout: 10,
        speechTimeout: 3,
        orderIndex: 0,
        branches: [
          {
            keywords: ['appointment', 'book', 'schedule', 'booking'],
            response: 'Great! I can help you book an appointment. Our signature head spa treatment is ninety nine dollars and includes a relaxing scalp massage and hair treatment. Would you like to schedule one?',
            nextNodeId: 2
          },
          {
            keywords: ['services', 'treatment', 'what do you offer', 'menu'],
            response: 'We offer several amazing treatments. Our signature head spa is ninety nine dollars. Our premium package with aromatherapy is one twenty nine. And our express treatment is seventy nine dollars. Which one interests you?',
            nextNodeId: 3
          },
          {
            keywords: ['price', 'cost', 'how much'],
            response: 'Our signature head spa treatment is ninety nine dollars. The premium package with aromatherapy is one twenty nine dollars. And we have an express treatment for seventy nine dollars. Would you like to book any of these?',
            nextNodeId: 2
          }
        ] as FlowBranch[]
      }).returning();

      // Create appointment booking node
      const [booking] = await db.insert(voiceConversationFlows).values({
        name: 'Appointment Booking',
        nodeType: 'question',
        message: 'Would you like to book our signature head spa treatment for ninety nine dollars?',
        parentId: greeting.id,
        isActive: true,
        timeout: 10,
        speechTimeout: 3,
        orderIndex: 1,
        branches: [
          {
            keywords: ['yes', 'yeah', 'sure', 'ok', 'book', 'schedule'],
            response: 'Excellent! I\'ll help you schedule that. What day works best for you?',
            nextNodeId: 4
          },
          {
            keywords: ['no', 'not', 'different', 'other'],
            response: 'No problem! Would you like to hear about our other treatments?',
            nextNodeId: 3
          }
        ] as FlowBranch[]
      }).returning();

      // Create service info node
      const [services] = await db.insert(voiceConversationFlows).values({
        name: 'Service Information',
        nodeType: 'response',
        message: 'We have three wonderful treatments available.',
        parentId: greeting.id,
        isActive: true,
        timeout: 10,
        speechTimeout: 3,
        orderIndex: 2,
        branches: [
          {
            keywords: ['signature', 'regular', 'ninety nine'],
            response: 'Great choice! Our signature treatment is ninety nine dollars. Would you like to book it?',
            nextNodeId: 2
          },
          {
            keywords: ['premium', 'aromatherapy', 'one twenty nine'],
            response: 'Excellent choice! The premium aromatherapy treatment is one twenty nine dollars. Should I book that for you?',
            nextNodeId: 2
          },
          {
            keywords: ['express', 'quick', 'seventy nine'],
            response: 'Perfect! The express treatment is seventy nine dollars. Would you like me to schedule that?',
            nextNodeId: 2
          }
        ] as FlowBranch[]
      }).returning();

      console.log('✅ Default voice conversation flows created');
    } catch (error) {
      console.error('❌ Failed to initialize voice conversation flows:', error);
    }
  }

  // Get the root node
  static async getRootNode(): Promise<VoiceConversationFlow | null> {
    try {
      const [root] = await db
        .select()
        .from(voiceConversationFlows)
        .where(and(
          eq(voiceConversationFlows.isRoot, true),
          eq(voiceConversationFlows.isActive, true)
        ))
        .limit(1);
      
      return root || null;
    } catch (error) {
      console.error('Error getting root node:', error);
      return null;
    }
  }

  // Get or create session
  static async getOrCreateSession(callSid: string, phoneNumber?: string): Promise<VoiceConversationSession> {
    try {
      // Try to get existing session
      const [existing] = await db
        .select()
        .from(voiceConversationSessions)
        .where(eq(voiceConversationSessions.callSid, callSid))
        .limit(1);
      
      if (existing) {
        return existing;
      }

      // Get root node
      const rootNode = await this.getRootNode();
      if (!rootNode) {
        throw new Error('No root node found');
      }

      // Create new session
      const [session] = await db
        .insert(voiceConversationSessions)
        .values({
          callSid,
          phoneNumber,
          currentNodeId: rootNode.id,
          conversationData: {}
        })
        .returning();
      
      return session;
    } catch (error) {
      console.error('Error managing session:', error);
      throw error;
    }
  }

  // Process user input
  static async processInput(currentNodeId: number | null, input: string, callSid: string): Promise<ProcessResult> {
    try {
      // Default response if no node
      if (!currentNodeId) {
        return {
          message: "I'm sorry, I'm having trouble understanding. Could you please repeat that?",
          nextNodeId: null,
          shouldEnd: false,
          timeout: 10,
          speechTimeout: 3
        };
      }

      // Get current node
      const [currentNode] = await db
        .select()
        .from(voiceConversationFlows)
        .where(eq(voiceConversationFlows.id, currentNodeId))
        .limit(1);
      
      if (!currentNode) {
        return {
          message: "I apologize for the confusion. How can I help you today?",
          nextNodeId: null,
          shouldEnd: false,
          timeout: 10,
          speechTimeout: 3
        };
      }

      // Check for goodbye keywords
      const normalizedInput = input.toLowerCase();
      if (normalizedInput.includes('goodbye') || 
          normalizedInput.includes('bye') || 
          normalizedInput.includes('thank') ||
          normalizedInput.includes('that\'s all') || 
          (normalizedInput.includes('no') && normalizedInput.includes('thanks'))) {
        return {
          message: "Thank you for calling Glo Head Spa! Have a wonderful day!",
          nextNodeId: null,
          shouldEnd: true
        };
      }

      // Process branches
      const branches = (currentNode.branches || []) as FlowBranch[];
      
      for (const branch of branches) {
        const matchesKeyword = branch.keywords.some(keyword => 
          normalizedInput.includes(keyword.toLowerCase())
        );
        
        if (matchesKeyword) {
          // Update session
          if (branch.nextNodeId) {
            await db
              .update(voiceConversationSessions)
              .set({ currentNodeId: branch.nextNodeId })
              .where(eq(voiceConversationSessions.callSid, callSid));
          }
          
          return {
            message: branch.response || currentNode.message,
            nextNodeId: branch.nextNodeId || null,
            shouldEnd: false,
            timeout: currentNode.timeout || 10,
            speechTimeout: currentNode.speechTimeout || 3
          };
        }
      }

      // Default response if no branches match
      return {
        message: "I understand. Let me help you with that. Would you like to book an appointment or hear about our services?",
        nextNodeId: currentNode.id,
        shouldEnd: false,
        timeout: currentNode.timeout || 10,
        speechTimeout: currentNode.speechTimeout || 3
      };
    } catch (error) {
      console.error('Error processing input:', error);
      return {
        message: "I apologize, but I'm having some technical difficulties. Please try again later or call back to speak with our staff.",
        nextNodeId: null,
        shouldEnd: true
      };
    }
  }

  // Get all flows
  static async getAllFlows(): Promise<VoiceConversationFlow[]> {
    return db
      .select()
      .from(voiceConversationFlows)
      .orderBy(voiceConversationFlows.orderIndex, voiceConversationFlows.id);
  }

  static async createFlow(flow: InsertVoiceConversationFlow): Promise<VoiceConversationFlow> {
    const [created] = await db
      .insert(voiceConversationFlows)
      .values(flow)
      .returning();
    
    return created;
  }

  static async updateFlow(id: number, updates: UpdateVoiceConversationFlow): Promise<VoiceConversationFlow | null> {
    const [updated] = await db
      .update(voiceConversationFlows)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(voiceConversationFlows.id, id))
      .returning();
    
    return updated || null;
  }

  static async deleteFlow(id: number): Promise<boolean> {
    await db
      .delete(voiceConversationFlows)
      .where(eq(voiceConversationFlows.id, id));
    
    return true;
  }

  // Ensure database tables exist
  static async ensureSchema(): Promise<void> {
    try {
      // Create voice_conversation_flows table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS voice_conversation_flows (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          node_type TEXT NOT NULL DEFAULT 'response',
          message TEXT NOT NULL,
          parent_id INTEGER,
          expected_inputs JSONB,
          next_node_id INTEGER,
          branches JSONB,
          is_active BOOLEAN DEFAULT true,
          is_root BOOLEAN DEFAULT false,
          timeout INTEGER DEFAULT 10,
          speech_timeout INTEGER DEFAULT 3,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create voice_conversation_sessions table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS voice_conversation_sessions (
          id SERIAL PRIMARY KEY,
          call_sid TEXT NOT NULL UNIQUE,
          current_node_id INTEGER,
          phone_number TEXT,
          client_id INTEGER,
          conversation_data JSONB,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ended_at TIMESTAMP
        )
      `);

      console.log('✅ Voice conversation flow database schema ensured');
    } catch (error) {
      console.error('❌ Failed to ensure voice conversation flow schema:', error);
    }
  }

  // Test a flow with given input
  static async testFlow(nodeId: number, input: string): Promise<ProcessResult> {
    return this.processInput(nodeId, input, 'test-call-sid');
  }
}
