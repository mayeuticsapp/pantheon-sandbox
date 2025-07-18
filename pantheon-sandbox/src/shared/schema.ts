// PantheonSandbox Database Schema con Security Framework integrato
import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users con Security Enhancement
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  mfaSecret: text('mfa_secret'),
  mfaEnabled: boolean('mfa_enabled').default(false),
  roles: text('roles').array().default(['user']),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  securityProfile: jsonb('security_profile'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Sessions per Zero-Trust Authentication
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  sessionToken: text('session_token').notNull().unique(),
  deviceFingerprint: text('device_fingerprint').notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  isActive: boolean('is_active').default(true),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  lastAccessAt: timestamp('last_access_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  tokenIdx: index('sessions_token_idx').on(table.sessionToken),
}));

// Workspaces con Data Isolation
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  encryptionKey: text('encryption_key').notNull(),
  accessLevel: text('access_level').notNull().default('private'), // private, shared, public
  dataClassification: text('data_classification').notNull().default('internal'), // public, internal, confidential, restricted
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').default(true),
  retentionPolicy: jsonb('retention_policy'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  ownerIdx: index('workspaces_owner_idx').on(table.ownerId),
  accessLevelIdx: index('workspaces_access_level_idx').on(table.accessLevel),
}));

// Workspace Members con RBAC
export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('user'), // owner, admin, user, viewer
  permissions: text('permissions').array().default([]),
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at').defaultNow(),
  joinedAt: timestamp('joined_at'),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  workspaceUserIdx: index('workspace_members_workspace_user_idx').on(table.workspaceId, table.userId),
}));

// AI Personalities con Security Context
export const aiPersonalities = pgTable('ai_personalities', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameId: text('name_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  provider: text('provider').notNull(), // openai, anthropic, mistral, perplexity
  model: text('model').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  specializations: text('specializations').array().default([]),
  securityLevel: text('security_level').notNull().default('standard'), // basic, standard, high, critical
  allowedOperations: text('allowed_operations').array().default([]),
  maxTokens: integer('max_tokens').default(4000),
  temperature: integer('temperature').default(70), // 0-100
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Conversations con Enhanced Security
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  title: text('title').notNull(),
  description: text('description'),
  participantIds: text('participant_ids').array().default([]),
  metadata: jsonb('metadata').default({}),
  securityContext: jsonb('security_context'),
  encryptionKeyId: text('encryption_key_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  workspaceIdx: index('conversations_workspace_idx').on(table.workspaceId),
}));

// Messages con End-to-End Encryption
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id),
  senderId: text('sender_id').notNull(), // user ID or AI nameId
  senderType: text('sender_type').notNull(), // 'user' or 'ai'
  content: text('content').notNull(), // encrypted content
  contentHash: text('content_hash').notNull(), // integrity verification
  rawContent: text('raw_content'), // decrypted content for AI processing
  metadata: jsonb('metadata').default({}),
  parentMessageId: uuid('parent_message_id').references(() => messages.id),
  processingStatus: text('processing_status').default('completed'), // pending, processing, completed, failed
  securityFlags: text('security_flags').array().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  conversationIdx: index('messages_conversation_idx').on(table.conversationId),
  senderIdx: index('messages_sender_idx').on(table.senderId),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
}));

// Semantic Memory con Security
export const semanticMemory = pgTable('semantic_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id),
  aiPersonalityId: uuid('ai_personality_id').references(() => aiPersonalities.id),
  memoryType: text('memory_type').notNull(), // context, learning, preference, fact
  content: text('content').notNull(),
  embeddings: text('embeddings'), // vector embeddings
  relevanceScore: integer('relevance_score').default(50), // 0-100
  sourceConversationId: uuid('source_conversation_id').references(() => conversations.id),
  sourceMessageId: uuid('source_message_id').references(() => messages.id),
  accessLevel: text('access_level').notNull().default('workspace'), // personal, workspace, global
  securityTags: text('security_tags').array().default([]),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  workspaceTypeIdx: index('semantic_memory_workspace_type_idx').on(table.workspaceId, table.memoryType),
  aiPersonalityIdx: index('semantic_memory_ai_personality_idx').on(table.aiPersonalityId),
}));

// Security Events Audit Log
export const securityEvents = pgTable('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: text('event_type').notNull(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: uuid('session_id').references(() => sessions.id),
  workspaceId: uuid('workspace_id').references(() => workspaces.id),
  severity: text('severity').notNull(), // low, medium, high, critical
  details: jsonb('details').default({}),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  actionTaken: text('action_taken'),
  resolved: boolean('resolved').default(false),
  timestamp: timestamp('timestamp').defaultNow(),
}, (table) => ({
  eventTypeIdx: index('security_events_event_type_idx').on(table.eventType),
  timestampIdx: index('security_events_timestamp_idx').on(table.timestamp),
  severityIdx: index('security_events_severity_idx').on(table.severity),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  ownedWorkspaces: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
  securityEvents: many(securityEvents),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  conversations: many(conversations),
  semanticMemory: many(semanticMemory),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [conversations.workspaceId], references: [workspaces.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  parentMessage: one(messages, { fields: [messages.parentMessageId], references: [messages.id] }),
  replies: many(messages),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSemanticMemorySchema = createInsertSchema(semanticMemory).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type AIPersonality = typeof aiPersonalities.$inferSelect;
export type SemanticMemory = typeof semanticMemory.$inferSelect;
export type InsertSemanticMemory = z.infer<typeof insertSemanticMemorySchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;