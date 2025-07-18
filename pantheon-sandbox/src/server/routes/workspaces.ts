// Workspace Routes con Data Isolation
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { workspaces, workspaceMembers, conversations, insertWorkspaceSchema } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { SecurityLogger } from '../security/logger';
import { dataIsolationManager } from '../security/encryption';
import { requireAuth, requireWorkspaceAccess } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Validation schemas
const createWorkspaceSchema = insertWorkspaceSchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  accessLevel: z.enum(['private', 'shared', 'public']).default('private'),
  dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  settings: z.record(z.any()).optional(),
});

const inviteMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'user', 'viewer']).default('user'),
});

// Get user workspaces
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.securityContext.authentication.userId;

    // Get workspaces where user is owner or member
    const userWorkspaces = await db
      .select({
        workspace: workspaces,
        memberRole: workspaceMembers.role,
      })
      .from(workspaces)
      .leftJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(
        eq(workspaces.isActive, true),
        // User is owner OR user is member
        // Note: In real implementation, you'd use OR condition properly
        eq(workspaceMembers.userId, userId)
      ));

    SecurityLogger.logWorkspaceAccess('list_workspaces', {
      userId,
      count: userWorkspaces.length,
    });

    res.json({ workspaces: userWorkspaces });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante il recupero dei workspace' });
  }
});

// Create workspace con Data Isolation
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.securityContext.authentication.userId;
    const workspaceData = createWorkspaceSchema.parse(req.body);

    // Generate encryption key per workspace
    const workspaceId = crypto.randomUUID();
    const encryptionKey = await dataIsolationManager.getWorkspaceKey(workspaceId);

    const [newWorkspace] = await db
      .insert(workspaces)
      .values({
        id: workspaceId,
        name: workspaceData.name,
        description: workspaceData.description,
        ownerId: userId,
        encryptionKey,
        accessLevel: workspaceData.accessLevel,
        dataClassification: workspaceData.dataClassification,
        settings: workspaceData.settings || {},
        retentionPolicy: {
          retentionDays: 90,
          autoDelete: false,
          backupRequired: workspaceData.dataClassification !== 'public',
        },
      })
      .returning();

    // Add owner as workspace member
    await db.insert(workspaceMembers).values({
      workspaceId: newWorkspace.id,
      userId,
      role: 'owner',
      permissions: ['workspace:read', 'workspace:update', 'workspace:delete', 'workspace:invite'],
      joinedAt: new Date(),
    });

    SecurityLogger.logWorkspaceAccess('workspace_created', {
      workspaceId: newWorkspace.id,
      userId,
      name: newWorkspace.name,
      dataClassification: newWorkspace.dataClassification,
    });

    res.status(201).json({ workspace: newWorkspace });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Dati di input non validi',
        details: error.errors,
      });
    } else {
      res.status(500).json({ error: 'Errore durante la creazione del workspace' });
    }
  }
});

// Get specific workspace
router.get('/:workspaceId', requireAuth, requireWorkspaceAccess('workspace:read'), async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.securityContext.authentication.userId;

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(and(
        eq(workspaces.id, workspaceId),
        eq(workspaces.isActive, true)
      ));

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace non trovato' });
    }

    // Get workspace members
    const members = await db
      .select({
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        permissions: workspaceMembers.permissions,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.isActive, true)
      ));

    SecurityLogger.logWorkspaceAccess('workspace_accessed', {
      workspaceId,
      userId,
    });

    res.json({
      workspace: {
        ...workspace,
        // Non esporre encryption key
        encryptionKey: undefined,
      },
      members,
    });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante il recupero del workspace' });
  }
});

// Update workspace
router.patch('/:workspaceId', requireAuth, requireWorkspaceAccess('workspace:update'), async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.securityContext.authentication.userId;
    const updateData = updateWorkspaceSchema.parse(req.body);

    const [updatedWorkspace] = await db
      .update(workspaces)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    SecurityLogger.logWorkspaceAccess('workspace_updated', {
      workspaceId,
      userId,
      changes: Object.keys(updateData),
    });

    res.json({ workspace: updatedWorkspace });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Dati di input non validi',
        details: error.errors,
      });
    } else {
      res.status(500).json({ error: 'Errore durante l\'aggiornamento del workspace' });
    }
  }
});

// Invite member to workspace
router.post('/:workspaceId/members', requireAuth, requireWorkspaceAccess('workspace:invite'), async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.securityContext.authentication.userId;
    const { userId: inviteUserId, role } = inviteMemberSchema.parse(req.body);

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, inviteUserId)
      ));

    if (existingMember) {
      return res.status(400).json({ error: 'Utente già membro del workspace' });
    }

    // Add member
    const [newMember] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId,
        userId: inviteUserId,
        role,
        permissions: [], // Calcolate dinamicamente in base al ruolo
        invitedBy: userId,
        joinedAt: new Date(),
      })
      .returning();

    SecurityLogger.logWorkspaceAccess('member_invited', {
      workspaceId,
      invitedBy: userId,
      invitedUser: inviteUserId,
      role,
    });

    res.status(201).json({ member: newMember });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Dati di input non validi',
        details: error.errors,
      });
    } else {
      res.status(500).json({ error: 'Errore durante l\'invito del membro' });
    }
  }
});

// Get workspace conversations
router.get('/:workspaceId/conversations', requireAuth, requireWorkspaceAccess('workspace:read'), async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.securityContext.authentication.userId;

    const workspaceConversations = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.workspaceId, workspaceId),
        eq(conversations.isActive, true)
      ))
      .orderBy(conversations.createdAt);

    SecurityLogger.logDataAccess('conversations_accessed', {
      workspaceId,
      userId,
      count: workspaceConversations.length,
    });

    res.json({ conversations: workspaceConversations });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante il recupero delle conversazioni' });
  }
});

// Delete workspace (soft delete)
router.delete('/:workspaceId', requireAuth, requireWorkspaceAccess('workspace:delete'), async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.securityContext.authentication.userId;

    await db
      .update(workspaces)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));

    // Clear encryption key from memory
    dataIsolationManager.clearWorkspaceKey(workspaceId);

    SecurityLogger.logWorkspaceAccess('workspace_deleted', {
      workspaceId,
      userId,
    });

    res.json({ success: true, message: 'Workspace eliminato con successo' });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante l\'eliminazione del workspace' });
  }
});

export { router as workspaceRoutes };