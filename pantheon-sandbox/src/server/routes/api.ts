// API Routes principali per PantheonSandbox
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { conversations, messages, insertConversationSchema, insertMessageSchema } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { requireAuth, requireWorkspaceAccess, logDataAccess } from '../middleware/auth';
import { SecurityLogger } from '../security/logger';
import { dataIsolationManager } from '../security/encryption';

const router = Router();

// Validation schemas
const createConversationSchema = insertConversationSchema.extend({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  participantIds: z.array(z.string()).min(1),
});

const sendMessageSchema = insertMessageSchema.extend({
  content: z.string().min(1),
  senderType: z.enum(['user', 'ai']).default('user'),
});

// Get conversations per workspace
router.get('/workspaces/:workspaceId/conversations', requireAuth, requireWorkspaceAccess('conversation:read'), async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.securityContext.authentication.userId;

    const conversations = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.workspaceId, workspaceId),
        eq(conversations.isActive, true)
      ))
      .orderBy(desc(conversations.updatedAt));

    SecurityLogger.logDataAccess('conversations_listed', {
      userId,
      workspaceId,
      count: conversations.length,
    });

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante il recupero delle conversazioni' });
  }
});

// Create conversation
router.post('/workspaces/:workspaceId/conversations', requireAuth, requireWorkspaceAccess('conversation:create'), async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.securityContext.authentication.userId;
    const conversationData = createConversationSchema.parse(req.body);

    const [newConversation] = await db
      .insert(conversations)
      .values({
        workspaceId,
        title: conversationData.title,
        description: conversationData.description,
        participantIds: conversationData.participantIds,
        metadata: {
          createdBy: userId,
          participantCount: conversationData.participantIds.length,
        },
        securityContext: {
          dataClassification: 'internal',
          accessLevel: 'workspace',
        },
      })
      .returning();

    SecurityLogger.logDataAccess('conversation_created', {
      userId,
      workspaceId,
      conversationId: newConversation.id,
      participantCount: conversationData.participantIds.length,
    });

    res.status(201).json({ conversation: newConversation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Dati di input non validi',
        details: error.errors,
      });
    } else {
      res.status(500).json({ error: 'Errore durante la creazione della conversazione' });
    }
  }
});

// Get conversation details
router.get('/conversations/:conversationId', requireAuth, logDataAccess('conversation_accessed'), async (req: any, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.securityContext.authentication.userId;

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.isActive, true)
      ));

    if (!conversation) {
      return res.status(404).json({ error: 'Conversazione non trovata' });
    }

    // Verify workspace access
    // TODO: Implement proper workspace access check

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante il recupero della conversazione' });
  }
});

// Get conversation messages con decryption
router.get('/conversations/:conversationId/messages', requireAuth, logDataAccess('messages_accessed'), async (req: any, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.securityContext.authentication.userId;

    // Get conversation per workspace context
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) {
      return res.status(404).json({ error: 'Conversazione non trovata' });
    }

    // Get messages
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Decrypt messages per user
    const decryptedMessages = [];
    for (const message of conversationMessages) {
      if (message.rawContent) {
        // Use raw content se disponibile (per performance)
        decryptedMessages.push({
          ...message,
          content: message.rawContent,
          rawContent: undefined, // Non esporre rawContent
        });
      } else {
        // Decrypt se necessario
        try {
          const decrypted = await dataIsolationManager.decryptWorkspaceContent(
            conversation.workspaceId,
            message.content
          );
          
          if (decrypted.verified) {
            decryptedMessages.push({
              ...message,
              content: decrypted.content,
            });
          } else {
            // Handle decryption failure
            decryptedMessages.push({
              ...message,
              content: '[Contenuto crittografato non accessibile]',
              securityFlags: [...(message.securityFlags || []), 'decryption_failed'],
            });
          }
        } catch (decryptError) {
          SecurityLogger.logSecurityViolation('message_decryption_failed', {
            messageId: message.id,
            conversationId,
            userId,
            error: decryptError.message,
          });
          
          decryptedMessages.push({
            ...message,
            content: '[Errore di decrittografia]',
            securityFlags: [...(message.securityFlags || []), 'decryption_error'],
          });
        }
      }
    }

    SecurityLogger.logDataAccess('messages_decrypted', {
      userId,
      conversationId,
      messageCount: decryptedMessages.length,
    });

    res.json({ 
      messages: decryptedMessages.reverse(), // Reverse per ordine cronologico
      hasMore: conversationMessages.length === parseInt(limit as string),
    });

  } catch (error) {
    res.status(500).json({ error: 'Errore durante il recupero dei messaggi' });
  }
});

// Send message con encryption
router.post('/conversations/:conversationId/messages', requireAuth, logDataAccess('message_sent'), async (req: any, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.securityContext.authentication.userId;
    const messageData = sendMessageSchema.parse(req.body);

    // Get conversation per workspace context
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));

    if (!conversation) {
      return res.status(404).json({ error: 'Conversazione non trovata' });
    }

    // Encrypt message content
    const { encryptedContent, contentHash } = await dataIsolationManager.encryptWorkspaceContent(
      conversation.workspaceId,
      messageData.content
    );

    // Store message
    const [newMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: messageData.senderType === 'user' ? userId : messageData.senderId,
        senderType: messageData.senderType,
        content: encryptedContent,
        contentHash,
        rawContent: messageData.content, // Store for immediate access
        metadata: {
          clientInfo: {
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString(),
          },
        },
        processingStatus: 'completed',
      })
      .returning();

    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    SecurityLogger.logDataAccess('message_created', {
      userId,
      conversationId,
      messageId: newMessage.id,
      messageLength: messageData.content.length,
      encrypted: true,
    });

    // Return message con content decrypted
    res.status(201).json({
      message: {
        ...newMessage,
        content: messageData.content,
        rawContent: undefined,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Dati di input non validi',
        details: error.errors,
      });
    } else {
      SecurityLogger.logSecurityViolation('message_send_error', {
        error: error.message,
        conversationId: req.params.conversationId,
        userId: req.securityContext?.authentication?.userId,
      });
      
      res.status(500).json({ error: 'Errore durante l\'invio del messaggio' });
    }
  }
});

// Update conversation
router.patch('/conversations/:conversationId', requireAuth, async (req: any, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.securityContext.authentication.userId;
    const { title, description, participantIds } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (participantIds) updateData.participantIds = participantIds;

    const [updatedConversation] = await db
      .update(conversations)
      .set(updateData)
      .where(eq(conversations.id, conversationId))
      .returning();

    if (!updatedConversation) {
      return res.status(404).json({ error: 'Conversazione non trovata' });
    }

    SecurityLogger.logDataAccess('conversation_updated', {
      userId,
      conversationId,
      changes: Object.keys(updateData),
    });

    res.json({ conversation: updatedConversation });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante l\'aggiornamento della conversazione' });
  }
});

// Delete conversation (soft delete)
router.delete('/conversations/:conversationId', requireAuth, async (req: any, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.securityContext.authentication.userId;

    await db
      .update(conversations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    SecurityLogger.logDataAccess('conversation_deleted', {
      userId,
      conversationId,
    });

    res.json({ success: true, message: 'Conversazione eliminata con successo' });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante l\'eliminazione della conversazione' });
  }
});

export { router as apiRoutes };