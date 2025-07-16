import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "openai", "anthropic", "manus", "custom"
  apiKey: text("api_key").notNull(),
  baseUrl: text("base_url"),
  defaultModel: text("default_model"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const personalities = pgTable("personalities", {
  id: serial("id").primaryKey(),
  nameId: text("name_id").notNull().unique(), // "geppo", "c24", etc.
  displayName: text("display_name").notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(),
  providerId: integer("provider_id").references(() => providers.id),
  color: text("color").default("blue"), // "blue", "purple", "orange", etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  instructions: text("instructions").default(""),
  participantIds: text("participant_ids").array(), // Array of personality nameIds
  isActive: boolean("is_active").default(true),
  autoContinue: boolean("auto_continue").default(false),
  autoContinueRounds: integer("auto_continue_rounds").default(3),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  senderId: text("sender_id"), // personality nameId or "user"
  content: text("content").notNull(),
  messageType: text("message_type").default("text"), // "text", "system", "error"
  metadata: jsonb("metadata"), // Additional data like model used, tokens, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // in bytes
  content: text("content"), // base64 or file content for text files
  filePath: text("file_path"), // path for large binary files
  uploadedBy: text("uploaded_by").default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
  createdAt: true,
});

export const insertPersonalitySchema = createInsertSchema(personalities).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providers.$inferSelect;

export type InsertPersonality = z.infer<typeof insertPersonalitySchema>;
export type Personality = typeof personalities.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Extended types for API responses
export type ConversationWithParticipants = Conversation & {
  participants: Personality[];
  messageCount: number;
  lastMessage?: Message;
};

export type MessageWithSender = Message & {
  sender?: Personality;
};

// Attachment types
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;

export type ConversationWithFiles = ConversationWithParticipants & {
  attachments: Attachment[];
};
