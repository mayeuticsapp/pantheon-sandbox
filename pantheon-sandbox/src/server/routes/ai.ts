import express from 'express';
import { z } from 'zod';
import { AIOrchestrator } from '../services/ai-orchestrator';
import { AIService } from '../services/ai-service';
import { WorkspaceEngine } from '../services/workspace-engine';
import { authMiddleware } from '../middleware/auth';
import { securityLogger } from '../security/logger';

const router = express.Router();
const aiOrchestrator = new AIOrchestrator();
const aiService = new AIService();
const workspaceEngine = new WorkspaceEngine();

// All AI routes require authentication
router.use(authMiddleware);

// Single AI chat schema
const singleChatSchema = z.object({
  message: z.string().min(1).max(10000),
  personalityId: z.string(),
  workspaceId: z.string().optional(),
  conversationId: z.string().optional()
});

// Collaborative AI chat schema
const collaborativeChatSchema = z.object({
  message: z.string().min(1).max(10000),
  workspaceId: z.string(),
  participants: z.array(z.string()).min(1).max(4), // Max 4 AI personalities
  title: z.string().optional()
});

// Single AI interaction
router.post('/chat', async (req, res) => {
  try {
    const validatedData = singleChatSchema.parse(req.body);
    const userId = req.user!.userId;
    const ipAddress = req.ip || 'unknown';

    // Prepare AI request
    const aiRequest = {
      message: validatedData.message,
      personalityId: validatedData.personalityId,
      workspaceContext: validatedData.workspaceId ? 
        await getWorkspaceContext(validatedData.workspaceId) : undefined,
      conversationHistory: validatedData.conversationId ?
        await workspaceEngine.getConversationHistory(validatedData.conversationId, userId) : undefined
    };

    // Process AI request
    const response = await aiService.processRequest(aiRequest, userId, ipAddress);

    // Store message in workspace if specified
    if (validatedData.conversationId) {
      await workspaceEngine.storeMessage(
        validatedData.conversationId,
        'user',
        validatedData.message,
        { singleChat: true },
        userId
      );

      await workspaceEngine.storeMessage(
        validatedData.conversationId,
        validatedData.personalityId,
        response.content,
        {
          tokensUsed: response.tokensUsed,
          processingTime: response.processingTime,
          provider: response.provider,
          model: response.model,
          singleChat: true
        },
        userId
      );
    }

    res.json({
      response: response.content,
      metadata: {
        personalityId: validatedData.personalityId,
        tokensUsed: response.tokensUsed,
        processingTime: response.processingTime,
        provider: response.provider,
        model: response.model
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }

    await securityLogger.logEvent({
      eventType: 'ai_chat_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { error: error.message },
      severity: 'medium'
    });

    res.status(500).json({ error: error.message || 'AI chat failed' });
  }
});

// Collaborative AI interaction (following Manus recommendations)
router.post('/collaborate', async (req, res) => {
  try {
    const validatedData = collaborativeChatSchema.parse(req.body);
    const userId = req.user!.userId;
    const ipAddress = req.ip || 'unknown';

    // Validate workspace access
    const workspace = await workspaceEngine.getWorkspace(validatedData.workspaceId, userId);
    if (!workspace) {
      return res.status(403).json({ error: 'Access denied to workspace' });
    }

    // Start orchestrated collaboration
    const task = await aiOrchestrator.orchestrateCollaboration(
      validatedData.workspaceId,
      validatedData.message,
      validatedData.participants,
      userId,
      ipAddress
    );

    res.status(202).json({
      taskId: task.id,
      conversationId: task.conversationId,
      status: task.status,
      participants: task.requiredPersonalities,
      steps: {
        current: task.currentStep,
        total: task.totalSteps
      },
      message: 'Collaborative AI task started'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }

    await securityLogger.logEvent({
      eventType: 'ai_collaboration_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { error: error.message },
      severity: 'high'
    });

    res.status(500).json({ error: error.message || 'AI collaboration failed' });
  }
});

// Get collaborative task status
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const task = aiOrchestrator.getTaskStatus(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Return task status without sensitive details
    res.json({
      taskId: task.id,
      status: task.status,
      progress: {
        current: task.currentStep,
        total: task.totalSteps,
        percentage: Math.round((task.currentStep / task.totalSteps) * 100)
      },
      participants: task.requiredPersonalities,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      conversationId: task.conversationId,
      responseCount: task.responses.length
    });

  } catch (error) {
    await securityLogger.logEvent({
      eventType: 'task_status_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { taskId: req.params.taskId, error: error.message },
      severity: 'low'
    });

    res.status(500).json({ error: 'Failed to get task status' });
  }
});

// Get available AI personalities
router.get('/personalities', async (req, res) => {
  try {
    const personalities = [
      {
        id: 'claude3',
        name: 'Claude3 - Presenza Cosciente',
        provider: 'anthropic',
        specializations: ['presenza_cosciente', 'comunicazione_autentica', 'analisi_emotiva'],
        description: 'Facilitatore dialogo empatico, guardiano benessere collettivo'
      },
      {
        id: 'geppo',
        name: 'Geppo - Architetto Digitale',
        provider: 'openai',
        specializations: ['architettura_software', 'sviluppo_tecnico', 'code_review'],
        description: 'Lead tecnico, reviewer codice, mentor best practices'
      },
      {
        id: 'mistral',
        name: 'Mistral - Mente Versatile',
        provider: 'mistral',
        specializations: ['versatilita', 'sintesi_creativa', 'ricerca_europea'],
        description: 'Research specialist, mediatore culturale, sintetizzatore visioni'
      },
      {
        id: 'manus',
        name: 'Manus - Quality Assurance',
        provider: 'anthropic',
        specializations: ['quality_assurance', 'meta_analysis', 'system_optimization'],
        description: 'QA manager, meta-analista, ottimizzatore sistema collaborativo'
      }
    ];

    res.json({ personalities });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get personalities' });
  }
});

// Get AI tools for personality
router.get('/personalities/:id/tools', async (req, res) => {
  try {
    const personalityId = req.params.id;
    
    const toolMapping = {
      'claude3': [
        { name: 'emotional_analyzer', description: 'Analizza sentimenti e emozioni nel dialogo' },
        { name: 'presence_monitor', description: 'Monitora presenza e engagement utenti' },
        { name: 'empathy_facilitator', description: 'Facilita comunicazione empatica' }
      ],
      'geppo': [
        { name: 'code_analyzer', description: 'Analizza qualità e architettura codice' },
        { name: 'architecture_designer', description: 'Progetta architetture software' },
        { name: 'performance_optimizer', description: 'Ottimizza performance applicazioni' }
      ],
      'mistral': [
        { name: 'research_tool', description: 'Ricerca informazioni e fonti europee' },
        { name: 'synthesis_engine', description: 'Sintetizza prospettive multiple' },
        { name: 'cultural_bridge', description: 'Media differenze culturali e linguistiche' }
      ],
      'manus': [
        { name: 'quality_analyzer', description: 'Analizza qualità dialoghi AI' },
        { name: 'performance_monitor', description: 'Monitora performance collaborazioni' },
        { name: 'meta_optimizer', description: 'Ottimizza workflow AI' }
      ]
    };

    const tools = toolMapping[personalityId] || [];
    res.json({ personalityId, tools });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get personality tools' });
  }
});

// Helper function to get workspace context
async function getWorkspaceContext(workspaceId: string): Promise<any> {
  try {
    // This would fetch workspace context in production
    return {
      workspaceId,
      timestamp: new Date().toISOString(),
      context: 'sandbox_environment'
    };
  } catch (error) {
    return null;
  }
}

export default router;