import { pgTable, text, integer, timestamp, boolean, json, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table with security features
export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  mfaEnabled: boolean('mfa_enabled').default(false),
  mfaSecret: text('mfa_secret'),
  failedAttempts: integer('failed_attempts').default(0),
  lastFailedAttempt: timestamp('last_failed_attempt'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Sessions table for device tracking
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  deviceFingerprint: text('device_fingerprint').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Workspaces for collaborative environment
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  encryptionKeyId: varchar('encryption_key_id', { length: 32 }).notNull(),
  dataClassification: varchar('data_classification', { length: 20 }).default('internal'),
  settings: json('settings').default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// AI Personalities with enhanced capabilities
export const personalities = pgTable('personalities', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'anthropic', 'openai', 'mistral'
  model: varchar('model', { length: 100 }).notNull(),
  systemPrompt: text('system_prompt').notNull(),
  specializations: json('specializations').default([]),
  toolsEnabled: json('tools_enabled').default([]),
  temperature: integer('temperature').default(7), // 0-10 scale
  maxTokens: integer('max_tokens').default(2000),
  presencePenalty: integer('presence_penalty').default(0), // -10 to 10 scale
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Conversations with workspace context
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  participants: json('participants').notNull(), // Array of personality IDs
  metadata: json('metadata').default({}),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Messages with encryption support
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  senderId: varchar('sender_id', { length: 50 }), // personality ID or 'user'
  content: text('content').notNull(),
  encryptedContent: text('encrypted_content'),
  contentHash: varchar('content_hash', { length: 64 }),
  metadata: json('metadata').default({}),
  tokensUsed: integer('tokens_used').default(0),
  processingTime: integer('processing_time').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Semantic Memory for AI learning
export const semanticMemory = pgTable('semantic_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
  personalityId: varchar('personality_id', { length: 50 }).references(() => personalities.id),
  content: text('content').notNull(),
  embedding: json('embedding'), // Vector embedding for similarity search
  tags: json('tags').default([]),
  importance: integer('importance').default(5), // 1-10 scale
  accessCount: integer('access_count').default(0),
  lastAccessed: timestamp('last_accessed'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at')
});

// Security Events for audit trail
export const securityEvents = pgTable('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  userId: integer('user_id').references(() => users.id),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  details: text('details'), // JSON string
  severity: varchar('severity', { length: 20 }).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Workspace Members for access control
export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 50 }).default('member'), // 'owner', 'admin', 'member', 'viewer'
  permissions: json('permissions').default([]),
  joinedAt: timestamp('joined_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  ownedWorkspaces: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
  securityEvents: many(securityEvents)
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  conversations: many(conversations),
  semanticMemory: many(semanticMemory)
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [conversations.workspaceId], references: [workspaces.id] }),
  messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(personalities, { fields: [messages.senderId], references: [personalities.id] })
}));

export const semanticMemoryRelations = relations(semanticMemory, ({ one }) => ({
  workspace: one(workspaces, { fields: [semanticMemory.workspaceId], references: [workspaces.id] }),
  personality: one(personalities, { fields: [semanticMemory.personalityId], references: [personalities.id] })
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  failedAttempts: true,
  lastFailedAttempt: true
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  encryptionKeyId: true
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  encryptedContent: true,
  contentHash: true
});

export const insertSemanticMemorySchema = createInsertSchema(semanticMemory).omit({
  id: true,
  createdAt: true,
  accessCount: true,
  lastAccessed: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Personality = typeof personalities.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type SemanticMemory = typeof semanticMemory.$inferSelect;
export type InsertSemanticMemory = z.infer<typeof insertSemanticMemorySchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;