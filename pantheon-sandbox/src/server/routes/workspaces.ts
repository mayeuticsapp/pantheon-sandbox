import express from 'express';
import { z } from 'zod';
import { WorkspaceEngine } from '../services/workspace-engine';
import { authMiddleware } from '../middleware/auth';
import { securityLogger } from '../security/logger';

const router = express.Router();
const workspaceEngine = new WorkspaceEngine();

// All workspace routes require authentication
router.use(authMiddleware);

// Create workspace schema
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional()
});

// Start conversation schema
const startConversationSchema = z.object({
  title: z.string().min(1).max(255),
  participants: z.array(z.string()).min(1).max(10)
});

// Create new workspace
router.post('/', async (req, res) => {
  try {
    const validatedData = createWorkspaceSchema.parse(req.body);
    const userId = req.user!.userId;
    const ipAddress = req.ip || 'unknown';

    const workspace = await workspaceEngine.createWorkspace(
      validatedData.name,
      validatedData.description || '',
      userId,
      ipAddress
    );

    await securityLogger.logWorkspaceAccess(userId, workspace.id, 'create', ipAddress);

    res.status(201).json({
      workspace,
      message: 'Workspace created successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }

    await securityLogger.logEvent({
      eventType: 'workspace_creation_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { error: error.message },
      severity: 'medium'
    });

    res.status(500).json({ error: error.message || 'Failed to create workspace' });
  }
});

// Get all user workspaces
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const workspaces = await workspaceEngine.getUserWorkspaces(userId);

    res.json({ workspaces });

  } catch (error) {
    await securityLogger.logEvent({
      eventType: 'workspace_list_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { error: error.message },
      severity: 'low'
    });

    res.status(500).json({ error: 'Failed to get workspaces' });
  }
});

// Get specific workspace with full data
router.get('/:id', async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const userId = req.user!.userId;

    const workspace = await workspaceEngine.getWorkspace(workspaceId, userId);
    
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or access denied' });
    }

    await securityLogger.logWorkspaceAccess(userId, workspaceId, 'view', req.ip || 'unknown');

    res.json({ workspace });

  } catch (error) {
    await securityLogger.logEvent({
      eventType: 'workspace_access_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { workspaceId: req.params.id, error: error.message },
      severity: 'medium'
    });

    res.status(500).json({ error: error.message || 'Failed to get workspace' });
  }
});

// Start new conversation in workspace
router.post('/:id/conversations', async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const validatedData = startConversationSchema.parse(req.body);
    const userId = req.user!.userId;
    const ipAddress = req.ip || 'unknown';

    const conversationId = await workspaceEngine.startConversation(
      workspaceId,
      validatedData.title,
      validatedData.participants,
      userId,
      ipAddress
    );

    res.status(201).json({
      conversationId,
      message: 'Conversation started successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }

    await securityLogger.logEvent({
      eventType: 'conversation_start_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { workspaceId: req.params.id, error: error.message },
      severity: 'medium'
    });

    res.status(500).json({ error: error.message || 'Failed to start conversation' });
  }
});

// Get conversation history
router.get('/:workspaceId/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.userId;

    const history = await workspaceEngine.getConversationHistory(conversationId, userId);

    res.json({ 
      conversationId,
      messages: history 
    });

  } catch (error) {
    await securityLogger.logEvent({
      eventType: 'conversation_history_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { conversationId: req.params.conversationId, error: error.message },
      severity: 'low'
    });

    res.status(500).json({ error: error.message || 'Failed to get conversation history' });
  }
});

export default router;