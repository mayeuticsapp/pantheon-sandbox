import express from 'express';
import { z } from 'zod';
import { CollaborativeBuilder } from '../services/collaborative-builder';
import { authMiddleware } from '../middleware/auth';
import { securityLogger } from '../security/logger';
import archiver from 'archiver';
import path from 'path';

const router = express.Router();
const collaborativeBuilder = new CollaborativeBuilder();

// All builder routes require authentication
router.use(authMiddleware);

// Start app build schema
const startBuildSchema = z.object({
  workspaceId: z.string(),
  projectName: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  requirements: z.array(z.string()).min(1).max(20)
});

// Start collaborative app building
router.post('/build', async (req, res) => {
  try {
    const validatedData = startBuildSchema.parse(req.body);
    const userId = req.user!.userId;
    const ipAddress = req.ip || 'unknown';

    const task = await collaborativeBuilder.startAppBuild(
      validatedData.workspaceId,
      validatedData.projectName,
      validatedData.description,
      validatedData.requirements,
      userId,
      ipAddress
    );

    await securityLogger.logEvent({
      eventType: 'collaborative_build_started',
      userId,
      ipAddress,
      details: { 
        taskId: task.id, 
        projectName: validatedData.projectName,
        requirements: validatedData.requirements
      },
      severity: 'low'
    });

    res.status(201).json({
      taskId: task.id,
      projectName: task.projectName,
      status: task.status,
      currentStep: task.currentStep,
      assignedAI: task.assignedAI,
      startedAt: task.startedAt,
      message: 'Collaborative build started - AI team is working on your app!'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }

    await securityLogger.logEvent({
      eventType: 'build_start_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { error: error.message },
      severity: 'medium'
    });

    res.status(500).json({ error: error.message || 'Failed to start collaborative build' });
  }
});

// Get build task status
router.get('/tasks/:taskId', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const task = collaborativeBuilder.getTaskStatus(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Build task not found' });
    }

    res.json({
      taskId: task.id,
      projectName: task.projectName,
      status: task.status,
      currentStep: task.currentStep,
      progress: {
        filesCreated: task.files.length,
        assignedAI: task.assignedAI,
        logEntries: task.buildLog.length
      },
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      recentLog: task.buildLog.slice(-5) // Last 5 log entries
    });

  } catch (error) {
    await securityLogger.logEvent({
      eventType: 'build_status_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { taskId: req.params.taskId, error: error.message },
      severity: 'low'
    });

    res.status(500).json({ error: 'Failed to get build status' });
  }
});

// Get build log for task
router.get('/tasks/:taskId/log', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const task = collaborativeBuilder.getTaskStatus(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Build task not found' });
    }

    res.json({
      taskId: task.id,
      projectName: task.projectName,
      buildLog: task.buildLog,
      summary: {
        totalActions: task.buildLog.length,
        successfulActions: task.buildLog.filter(log => log.success).length,
        failedActions: task.buildLog.filter(log => !log.success).length,
        aiContributions: task.assignedAI.map(ai => ({
          ai,
          actions: task.buildLog.filter(log => log.aiId === ai).length
        }))
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get build log' });
  }
});

// Get project files
router.get('/tasks/:taskId/files', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const task = collaborativeBuilder.getTaskStatus(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Build task not found' });
    }

    const files = await collaborativeBuilder.getProjectFiles(taskId);

    res.json({
      taskId: task.id,
      projectName: task.projectName,
      totalFiles: files.length,
      files: files.map(file => ({
        path: file.path,
        language: file.language,
        size: file.content.length,
        createdBy: file.createdBy,
        lastModifiedBy: file.lastModifiedBy,
        lastModified: file.lastModified,
        version: file.version
      }))
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get project files' });
  }
});

// Get specific file content
router.get('/tasks/:taskId/files/*', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const filePath = req.params[0]; // Everything after /files/
    
    const task = collaborativeBuilder.getTaskStatus(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Build task not found' });
    }

    const file = task.files.find(f => f.path === filePath);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      path: file.path,
      content: file.content,
      language: file.language,
      createdBy: file.createdBy,
      lastModifiedBy: file.lastModifiedBy,
      lastModified: file.lastModified,
      version: file.version,
      size: file.content.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get file content' });
  }
});

// Download project as ZIP
router.get('/tasks/:taskId/download', async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const task = collaborativeBuilder.getTaskStatus(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Build task not found' });
    }

    if (task.status !== 'completed') {
      return res.status(400).json({ error: 'Project not completed yet' });
    }

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${task.projectName}.zip"`);

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    // Add each file to the archive
    for (const file of task.files) {
      archive.append(file.content, { name: file.path });
    }

    // Add build log as text file
    const buildLogContent = task.buildLog.map(log => 
      `[${log.timestamp.toISOString()}] ${log.aiId}: ${log.action} - ${log.details} ${log.success ? '✓' : '✗'}`
    ).join('\n');
    
    archive.append(buildLogContent, { name: 'build.log' });

    // Add project info
    const projectInfo = {
      name: task.projectName,
      description: task.description,
      requirements: task.requirements,
      createdBy: task.assignedAI,
      buildTime: task.completedAt!.getTime() - task.startedAt.getTime(),
      totalFiles: task.files.length,
      generatedAt: new Date().toISOString()
    };
    
    archive.append(JSON.stringify(projectInfo, null, 2), { name: 'project-info.json' });

    await archive.finalize();

    await securityLogger.logEvent({
      eventType: 'project_downloaded',
      userId: req.user!.userId,
      ipAddress: req.ip || 'unknown',
      details: { taskId, projectName: task.projectName },
      severity: 'low'
    });

  } catch (error) {
    await securityLogger.logEvent({
      eventType: 'project_download_failed',
      userId: req.user?.userId,
      ipAddress: req.ip || 'unknown',
      details: { taskId: req.params.taskId, error: error.message },
      severity: 'medium'
    });

    res.status(500).json({ error: 'Failed to download project' });
  }
});

// List all build tasks for user workspaces
router.get('/tasks', async (req, res) => {
  try {
    // This would normally filter by user workspaces in production
    // For now, return empty array as this is a demo endpoint
    res.json({
      tasks: [],
      message: 'Build tasks endpoint ready - implement user workspace filtering'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get build tasks' });
  }
});

// Get AI specializations for building
router.get('/ai-capabilities', async (req, res) => {
  try {
    const capabilities = {
      'geppo': {
        name: 'Geppo - Architetto Digitale',
        specializations: ['Project Architecture', 'Build Configuration', 'Infrastructure Code'],
        handles: ['package.json', 'tsconfig.json', 'webpack configs', 'Docker files'],
        strength: 'Creates solid, scalable architecture foundations'
      },
      'claude3': {
        name: 'Claude3 - Presenza Cosciente',
        specializations: ['User Experience', 'UI Components', 'Integration Testing'],
        handles: ['React components', 'CSS/styling', 'User interfaces', 'UX flows'],
        strength: 'Ensures intuitive and accessible user experiences'
      },
      'mistral': {
        name: 'Mistral - Mente Versatile',
        specializations: ['Business Logic', 'API Integration', 'Data Processing'],
        handles: ['Services', 'API endpoints', 'Business logic', 'Data flows'],
        strength: 'Bridges different technologies and creates integrations'
      },
      'manus': {
        name: 'Manus - Quality Assurance',
        specializations: ['Code Review', 'Testing', 'Quality Control'],
        handles: ['Test files', 'Quality checks', 'Documentation', 'Final review'],
        strength: 'Ensures code quality and project completeness'
      }
    };

    res.json({ capabilities });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get AI capabilities' });
  }
});

export default router;