import { db } from '../db';
import { workspaces, workspaceMembers, conversations, messages, semanticMemory } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { EncryptionService } from '../security/encryption';
import { securityLogger } from '../security/logger';
import crypto from 'crypto';

export interface WorkspaceData {
  id: string;
  name: string;
  description?: string;
  ownerId: number;
  settings: any;
  isActive: boolean;
  members?: WorkspaceMember[];
  conversations?: ConversationSummary[];
}

export interface WorkspaceMember {
  userId: number;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  joinedAt: Date;
}

export interface ConversationSummary {
  id: string;
  title: string;
  participants: string[];
  messageCount: number;
  lastActivity: Date;
}

export interface CollaborativeDocument {
  id: string;
  name: string;
  content: string;
  type: 'text' | 'code' | 'json' | 'markdown';
  lastModified: Date;
  modifiedBy: string;
  version: number;
}

export class WorkspaceEngine {
  // Create new workspace
  async createWorkspace(
    name: string,
    description: string,
    ownerId: number,
    ipAddress: string
  ): Promise<WorkspaceData> {
    try {
      // Generate encryption key for this workspace
      const encryptionKeyId = crypto.randomBytes(16).toString('hex');
      
      const [workspace] = await db.insert(workspaces).values({
        name,
        description,
        ownerId,
        encryptionKeyId,
        dataClassification: 'internal',
        settings: {
          aiPersonalitiesEnabled: ['claude3', 'geppo', 'mistral', 'manus'],
          collaborationMode: 'real-time',
          retentionDays: 365,
          autoArchive: false
        }
      }).returning();

      // Add owner as workspace member
      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: ownerId,
        role: 'owner',
        permissions: ['read', 'write', 'admin', 'delete', 'invite']
      });

      // Log workspace creation
      await securityLogger.logWorkspaceAccess(
        ownerId,
        workspace.id,
        'create',
        ipAddress
      );

      return {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        ownerId: workspace.ownerId,
        settings: workspace.settings,
        isActive: workspace.isActive
      };

    } catch (error) {
      await securityLogger.logEvent({
        eventType: 'workspace_creation_failed',
        userId: ownerId,
        ipAddress,
        details: { name, error: error.message },
        severity: 'medium'
      });
      throw new Error(`Failed to create workspace: ${error.message}`);
    }
  }

  // Get workspace with full context
  async getWorkspace(workspaceId: string, userId: number): Promise<WorkspaceData | null> {
    try {
      // Check if user has access to this workspace
      const hasAccess = await this.checkWorkspaceAccess(workspaceId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to workspace');
      }

      // Get workspace data
      const [workspace] = await db.select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      if (!workspace) return null;

      // Get workspace members
      const members = await db.select({
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        permissions: workspaceMembers.permissions,
        joinedAt: workspaceMembers.joinedAt
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));

      // Get conversation summaries
      const conversationSummaries = await this.getWorkspaceConversations(workspaceId);

      return {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        ownerId: workspace.ownerId,
        settings: workspace.settings,
        isActive: workspace.isActive,
        members: members as WorkspaceMember[],
        conversations: conversationSummaries
      };

    } catch (error) {
      await securityLogger.logEvent({
        eventType: 'workspace_access_failed',
        userId,
        details: { workspaceId, error: error.message },
        severity: 'medium'
      });
      throw error;
    }
  }

  // Get all workspaces for a user
  async getUserWorkspaces(userId: number): Promise<WorkspaceData[]> {
    try {
      const userWorkspaces = await db.select({
        id: workspaces.id,
        name: workspaces.name,
        description: workspaces.description,
        ownerId: workspaces.ownerId,
        settings: workspaces.settings,
        isActive: workspaces.isActive,
        role: workspaceMembers.role
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));

      return userWorkspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        description: ws.description,
        ownerId: ws.ownerId,
        settings: ws.settings,
        isActive: ws.isActive
      }));

    } catch (error) {
      throw new Error(`Failed to get user workspaces: ${error.message}`);
    }
  }

  // Start new conversation in workspace
  async startConversation(
    workspaceId: string,
    title: string,
    participants: string[],
    userId: number,
    ipAddress: string
  ): Promise<string> {
    try {
      // Check workspace access
      const hasAccess = await this.checkWorkspaceAccess(workspaceId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to workspace');
      }

      // Create conversation
      const [conversation] = await db.insert(conversations).values({
        workspaceId,
        title,
        participants,
        metadata: {
          startedBy: userId,
          aiPersonalities: participants,
          workspaceContext: await this.getWorkspaceContext(workspaceId)
        }
      }).returning();

      // Log conversation start
      await securityLogger.logWorkspaceAccess(
        userId,
        workspaceId,
        'start_conversation',
        ipAddress
      );

      return conversation.id;

    } catch (error) {
      await securityLogger.logEvent({
        eventType: 'conversation_start_failed',
        userId,
        ipAddress,
        details: { workspaceId, error: error.message },
        severity: 'medium'
      });
      throw error;
    }
  }

  // Store message with encryption
  async storeMessage(
    conversationId: string,
    senderId: string,
    content: string,
    metadata: any = {},
    userId: number
  ): Promise<string> {
    try {
      // Get conversation to find workspace
      const [conversation] = await db.select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Encrypt message content for workspace
      const encryptedData = EncryptionService.encrypt(content, conversation.workspaceId);
      const contentHash = EncryptionService.generateContentHash(content);

      // Store encrypted message
      const [message] = await db.insert(messages).values({
        conversationId,
        senderId,
        content, // Store plain text for now (in production: only encrypted)
        encryptedContent: JSON.stringify(encryptedData),
        contentHash,
        metadata,
        tokensUsed: metadata.tokensUsed || 0,
        processingTime: metadata.processingTime || 0
      }).returning();

      // Update semantic memory if this is an AI message
      if (senderId !== 'user') {
        await this.updateSemanticMemory(
          conversation.workspaceId,
          senderId,
          content,
          metadata
        );
      }

      return message.id;

    } catch (error) {
      await securityLogger.logEvent({
        eventType: 'message_store_failed',
        userId,
        details: { conversationId, error: error.message },
        severity: 'medium'
      });
      throw error;
    }
  }

  // Get conversation history
  async getConversationHistory(conversationId: string, userId: number): Promise<any[]> {
    try {
      // Check access through workspace membership
      const conversation = await db.select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (!conversation.length) {
        throw new Error('Conversation not found');
      }

      const hasAccess = await this.checkWorkspaceAccess(conversation[0].workspaceId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to conversation');
      }

      // Get messages
      const messageHistory = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);

      return messageHistory.map(msg => ({
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.createdAt,
        tokensUsed: msg.tokensUsed,
        processingTime: msg.processingTime
      }));

    } catch (error) {
      throw new Error(`Failed to get conversation history: ${error.message}`);
    }
  }

  // Update semantic memory for AI learning
  private async updateSemanticMemory(
    workspaceId: string,
    personalityId: string,
    content: string,
    metadata: any
  ): Promise<void> {
    try {
      // Determine importance based on content length and context
      const importance = this.calculateImportance(content, metadata);
      
      // Store in semantic memory
      await db.insert(semanticMemory).values({
        workspaceId,
        personalityId,
        content,
        embedding: null, // In production: generate vector embedding
        tags: this.extractTags(content),
        importance,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
      });

    } catch (error) {
      // Log but don't fail the main operation
      await securityLogger.logEvent({
        eventType: 'semantic_memory_update_failed',
        details: { workspaceId, personalityId, error: error.message },
        severity: 'low'
      });
    }
  }

  // Check if user has access to workspace
  private async checkWorkspaceAccess(workspaceId: string, userId: number): Promise<boolean> {
    const access = await db.select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    return access.length > 0;
  }

  // Get workspace conversation summaries
  private async getWorkspaceConversations(workspaceId: string): Promise<ConversationSummary[]> {
    const conversationsData = await db.select({
      id: conversations.id,
      title: conversations.title,
      participants: conversations.participants,
      createdAt: conversations.createdAt
    })
    .from(conversations)
    .where(eq(conversations.workspaceId, workspaceId))
    .orderBy(desc(conversations.updatedAt))
    .limit(10);

    // Get message counts for each conversation
    const summaries: ConversationSummary[] = [];
    for (const conv of conversationsData) {
      const messageCount = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      summaries.push({
        id: conv.id,
        title: conv.title,
        participants: conv.participants as string[],
        messageCount: messageCount.length,
        lastActivity: conv.createdAt
      });
    }

    return summaries;
  }

  // Get workspace context for AI
  private async getWorkspaceContext(workspaceId: string): Promise<any> {
    try {
      // Get recent semantic memory
      const recentMemory = await db.select()
        .from(semanticMemory)
        .where(eq(semanticMemory.workspaceId, workspaceId))
        .orderBy(desc(semanticMemory.importance), desc(semanticMemory.createdAt))
        .limit(5);

      return {
        workspaceId,
        recentMemory: recentMemory.map(m => ({
          content: m.content.substring(0, 200), // Truncate for context
          importance: m.importance,
          personalityId: m.personalityId
        }))
      };

    } catch (error) {
      return { workspaceId };
    }
  }

  // Calculate content importance for semantic memory
  private calculateImportance(content: string, metadata: any): number {
    let importance = 5; // Base importance

    // Length factor
    if (content.length > 500) importance += 1;
    if (content.length > 1000) importance += 1;

    // Keyword detection
    const importantKeywords = ['importante', 'critico', 'urgente', 'decisione', 'strategia'];
    const hasImportantKeywords = importantKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
    if (hasImportantKeywords) importance += 2;

    // Processing time factor (complex responses are often more important)
    if (metadata.processingTime > 2000) importance += 1;

    return Math.min(importance, 10); // Cap at 10
  }

  // Extract tags from content
  private extractTags(content: string): string[] {
    const tags = [];
    
    // Simple keyword extraction
    const keywords = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const uniqueKeywords = [...new Set(keywords)];
    
    // Take top 5 most relevant keywords
    return uniqueKeywords.slice(0, 5);
  }
}