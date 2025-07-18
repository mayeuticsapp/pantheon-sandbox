// AI Routes per PantheonSandbox con Security Framework
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { aiPersonalities, semanticMemory, messages, conversations } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, requireWorkspaceAccess, logDataAccess } from '../middleware/auth';
import { SecurityLogger } from '../security/logger';
import { dataIsolationManager } from '../security/encryption';
import { AIService } from '../services/ai-service';

const router = Router();

// Validation schemas
const aiRequestSchema = z.object({
  message: z.string().min(1),
  aiPersonalityId: z.string().uuid(),
  conversationId: z.string().uuid(),
  contextWindow: z.number().min(1).max(50).default(10),
  useSemanticMemory: z.boolean().default(true),
});

const createMemorySchema = z.object({
  memoryType: z.enum(['context', 'learning', 'preference', 'fact']),
  content: z.string().min(1),
  relevanceScore: z.number().min(0).max(100).default(50),
  accessLevel: z.enum(['personal', 'workspace', 'global']).default('workspace'),
  expiresAt: z.string().datetime().optional(),
});

// Get available AI personalities
router.get('/personalities', requireAuth, async (req: any, res) => {
  try {
    const personalities = await db
      .select()
      .from(aiPersonalities)
      .where(eq(aiPersonalities.isActive, true))
      .orderBy(aiPersonalities.displayName);

    SecurityLogger.logAIInteraction('system', 'list_personalities', {
      userId: req.securityContext.authentication.userId,
      count: personalities.length,
    });

    res.json({ personalities });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante il recupero delle personalità AI' });
  }
});

// Get AI personality details
router.get('/personalities/:personalityId', requireAuth, async (req: any, res) => {
  try {
    const { personalityId } = req.params;

    const [personality] = await db
      .select()
      .from(aiPersonalities)
      .where(and(
        eq(aiPersonalities.id, personalityId),
        eq(aiPersonalities.isActive, true)
      ));

    if (!personality) {
      return res.status(404).json({ error: 'Personalità AI non trovata' });
    }

    SecurityLogger.logAIInteraction(personality.nameId, 'get_details', {
      userId: req.securityContext.authentication.userId,
      personalityId,
    });

    res.json({ personality });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante il recupero dei dettagli della personalità' });
  }
});

// Send message to AI con Semantic Memory
router.post('/chat', requireAuth, logDataAccess('ai_chat'), async (req: any, res) => {
  try {
    const userId = req.securityContext.authentication.userId;
    const requestData = aiRequestSchema.parse(req.body);

    // Get AI personality
    const [personality] = await db
      .select()
      .from(aiPersonalities)
      .where(and(
        eq(aiPersonalities.id, requestData.aiPersonalityId),
        eq(aiPersonalities.isActive, true)
      ));

    if (!personality) {
      return res.status(404).json({ error: 'Personalità AI non trovata' });
    }

    // Get conversation to verify workspace access
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, requestData.conversationId));

    if (!conversation) {
      return res.status(404).json({ error: 'Conversazione non trovata' });
    }

    // Get conversation context (recent messages)
    const contextMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, requestData.conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(requestData.contextWindow);

    // Decrypt messages se necessario
    const decryptedMessages = [];
    for (const msg of contextMessages.reverse()) {
      if (msg.rawContent) {
        decryptedMessages.push({
          ...msg,
          content: msg.rawContent, // Use raw content for AI processing
        });
      } else {
        // Decrypt if needed
        const decrypted = await dataIsolationManager.decryptWorkspaceContent(
          conversation.workspaceId,
          msg.content
        );
        decryptedMessages.push({
          ...msg,
          content: decrypted.content,
        });
      }
    }

    // Get relevant semantic memory se richiesto
    let relevantMemory = [];
    if (requestData.useSemanticMemory) {
      relevantMemory = await db
        .select()
        .from(semanticMemory)
        .where(and(
          eq(semanticMemory.workspaceId, conversation.workspaceId),
          eq(semanticMemory.aiPersonalityId, requestData.aiPersonalityId),
          eq(semanticMemory.isActive, true)
        ))
        .orderBy(desc(semanticMemory.relevanceScore))
        .limit(5);
    }

    // Call AI service
    const aiService = new AIService();
    const response = await aiService.generateResponse({
      personality,
      userMessage: requestData.message,
      contextMessages: decryptedMessages,
      relevantMemory,
      securityContext: req.securityContext,
    });

    // Store AI response
    const { encryptedContent, contentHash } = await dataIsolationManager.encryptWorkspaceContent(
      conversation.workspaceId,
      response.content
    );

    const [newMessage] = await db
      .insert(messages)
      .values({
        conversationId: requestData.conversationId,
        senderId: personality.nameId,
        senderType: 'ai',
        content: encryptedContent,
        contentHash,
        rawContent: response.content, // Store for immediate use
        metadata: {
          aiPersonalityId: personality.id,
          model: personality.model,
          temperature: personality.temperature,
          processingTime: response.processingTime,
          tokensUsed: response.tokensUsed,
        },
        processingStatus: 'completed',
      })
      .returning();

    // Store new semantic memory se generata
    if (response.newMemory && response.newMemory.length > 0) {
      for (const memory of response.newMemory) {
        await db.insert(semanticMemory).values({
          workspaceId: conversation.workspaceId,
          aiPersonalityId: personality.id,
          memoryType: memory.type,
          content: memory.content,
          relevanceScore: memory.relevanceScore,
          sourceConversationId: requestData.conversationId,
          sourceMessageId: newMessage.id,
          accessLevel: 'workspace',
        });
      }
    }

    SecurityLogger.logAIInteraction(personality.nameId, 'message_sent', {
      userId,
      conversationId: requestData.conversationId,
      messageId: newMessage.id,
      tokensUsed: response.tokensUsed,
      processingTime: response.processingTime,
    });

    res.json({
      message: newMessage,
      aiResponse: {
        content: response.content,
        processingTime: response.processingTime,
        tokensUsed: response.tokensUsed,
        memoryCreated: response.newMemory?.length || 0,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Dati di input non validi',
        details: error.errors,
      });
    } else {
      SecurityLogger.logSecurityViolation('ai_chat_error', {
        error: error.message,
        userId: req.securityContext?.authentication?.userId,
      });
      
      res.status(500).json({ error: 'Errore durante l\'elaborazione della richiesta AI' });
    }
  }
});

// Get workspace semantic memory
router.get('/workspaces/:workspaceId/memory', requireAuth, requireWorkspaceAccess('memory:read'), async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const { aiPersonalityId, memoryType, limit = 20 } = req.query;

    let query = db
      .select()
      .from(semanticMemory)
      .where(and(
        eq(semanticMemory.workspaceId, workspaceId),
        eq(semanticMemory.isActive, true)
      ));

    if (aiPersonalityId) {
      query = query.where(eq(semanticMemory.aiPersonalityId, aiPersonalityId));
    }

    if (memoryType) {
      query = query.where(eq(semanticMemory.memoryType, memoryType));
    }

    const memories = await query
      .orderBy(desc(semanticMemory.relevanceScore), desc(semanticMemory.createdAt))
      .limit(parseInt(limit as string));

    SecurityLogger.logMemoryAccess('list_memories', {
      userId: req.securityContext.authentication.userId,
      workspaceId,
      count: memories.length,
      filters: { aiPersonalityId, memoryType },
    });

    res.json({ memories });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante il recupero della memoria semantica' });
  }
});

// Create semantic memory
router.post('/workspaces/:workspaceId/memory', requireAuth, requireWorkspaceAccess('memory:write'), async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.securityContext.authentication.userId;
    const memoryData = createMemorySchema.parse(req.body);

    const [newMemory] = await db
      .insert(semanticMemory)
      .values({
        workspaceId,
        aiPersonalityId: req.body.aiPersonalityId,
        memoryType: memoryData.memoryType,
        content: memoryData.content,
        relevanceScore: memoryData.relevanceScore,
        accessLevel: memoryData.accessLevel,
        expiresAt: memoryData.expiresAt ? new Date(memoryData.expiresAt) : null,
      })
      .returning();

    SecurityLogger.logMemoryAccess('memory_created', {
      userId,
      workspaceId,
      memoryId: newMemory.id,
      memoryType: newMemory.memoryType,
    });

    res.status(201).json({ memory: newMemory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Dati di input non validi',
        details: error.errors,
      });
    } else {
      res.status(500).json({ error: 'Errore durante la creazione della memoria' });
    }
  }
});

// Update memory relevance
router.patch('/memory/:memoryId/relevance', requireAuth, async (req: any, res) => {
  try {
    const { memoryId } = req.params;
    const { relevanceScore } = z.object({ relevanceScore: z.number().min(0).max(100) }).parse(req.body);

    const [updatedMemory] = await db
      .update(semanticMemory)
      .set({ 
        relevanceScore,
        updatedAt: new Date(),
      })
      .where(eq(semanticMemory.id, memoryId))
      .returning();

    if (!updatedMemory) {
      return res.status(404).json({ error: 'Memoria non trovata' });
    }

    SecurityLogger.logMemoryAccess('memory_updated', {
      userId: req.securityContext.authentication.userId,
      memoryId,
      newRelevanceScore: relevanceScore,
    });

    res.json({ memory: updatedMemory });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante l\'aggiornamento della memoria' });
  }
});

// Delete memory (soft delete)
router.delete('/memory/:memoryId', requireAuth, async (req: any, res) => {
  try {
    const { memoryId } = req.params;

    await db
      .update(semanticMemory)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(semanticMemory.id, memoryId));

    SecurityLogger.logMemoryAccess('memory_deleted', {
      userId: req.securityContext.authentication.userId,
      memoryId,
    });

    res.json({ success: true, message: 'Memoria eliminata con successo' });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante l\'eliminazione della memoria' });
  }
});

export { router as aiRoutes };