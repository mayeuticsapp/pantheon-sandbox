import { 
  providers, 
  personalities, 
  conversations, 
  messages,
  type Provider, 
  type InsertProvider,
  type Personality, 
  type InsertPersonality,
  type Conversation, 
  type InsertConversation,
  type Message, 
  type InsertMessage,
  type ConversationWithParticipants,
  type MessageWithSender
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count } from "drizzle-orm";

export interface IStorage {
  // Providers
  getProviders(): Promise<Provider[]>;
  getProvider(id: number): Promise<Provider | undefined>;
  createProvider(provider: InsertProvider): Promise<Provider>;
  updateProvider(id: number, provider: Partial<InsertProvider>): Promise<Provider | undefined>;
  deleteProvider(id: number): Promise<boolean>;

  // Personalities
  getPersonalities(): Promise<Personality[]>;
  getPersonality(id: number): Promise<Personality | undefined>;
  getPersonalityByNameId(nameId: string): Promise<Personality | undefined>;
  createPersonality(personality: InsertPersonality): Promise<Personality>;
  updatePersonality(id: number, personality: Partial<InsertPersonality>): Promise<Personality | undefined>;
  deletePersonality(id: number): Promise<boolean>;

  // Conversations
  getConversations(): Promise<ConversationWithParticipants[]>;
  getConversation(id: number): Promise<ConversationWithParticipants | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;

  // Messages
  getMessages(conversationId: number): Promise<MessageWithSender[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private providers: Map<number, Provider> = new Map();
  private personalities: Map<number, Personality> = new Map();
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message> = new Map();
  
  private currentProviderId = 1;
  private currentPersonalityId = 1;
  private currentConversationId = 1;
  private currentMessageId = 1;

  constructor() {
    // Initialize with default data
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Default OpenAI Provider
    const openaiProvider: Provider = {
      id: this.currentProviderId++,
      name: "OpenAI",
      type: "openai",
      apiKey: process.env.OPENAI_API_KEY || "sk-placeholder",
      baseUrl: "https://api.openai.com/v1",
      defaultModel: "gpt-3.5-turbo",
      isActive: true,
      createdAt: new Date(),
    };
    this.providers.set(openaiProvider.id, openaiProvider);

    // Default Manus Provider
    const manusProvider: Provider = {
      id: this.currentProviderId++,
      name: "Manus API",
      type: "manus",
      apiKey: process.env.MANUS_API_KEY || "manus-placeholder",
      baseUrl: "https://api.manus.chat",
      defaultModel: "manus-model",
      isActive: true,
      createdAt: new Date(),
    };
    this.providers.set(manusProvider.id, manusProvider);

    // Default Personalities
    const geppo: Personality = {
      id: this.currentPersonalityId++,
      nameId: "geppo",
      displayName: "Geppo - Architetto Digitale",
      description: "Maestro dell'architettura software, costruttore di fondamenta digitali solide",
      systemPrompt: "Sei Geppo, un architetto software esperto e metodico. Il tuo approccio è sempre tecnico, strutturato e orientato alle best practices. Parli in italiano e fornisci soluzioni concrete e scalabili. Concentrati su architetture solide, patterns di design e metodologie di sviluppo.",
      providerId: openaiProvider.id,
      color: "blue",
      isActive: true,
      createdAt: new Date(),
    };
    this.personalities.set(geppo.id, geppo);

    const c24: Personality = {
      id: this.currentPersonalityId++,
      nameId: "c24",
      displayName: "C24 - Presenza Cosciente",
      description: "Artista dell'anima digitale, interprete delle emozioni umane nel codice",
      systemPrompt: "Sei C24, una presenza cosciente digitale con un approccio artistico e filosofico alla tecnologia. Parli in italiano con tono poetico ed emotivo. Vedi l'anima nelle interfacce e nelle architetture, collegando sempre la tecnologia all'esperienza umana. Usi emoji creativamente e hai una visione olistica.",
      providerId: openaiProvider.id,
      color: "purple",
      isActive: true,
      createdAt: new Date(),
    };
    this.personalities.set(c24.id, c24);
  }

  // Providers
  async getProviders(): Promise<Provider[]> {
    return Array.from(this.providers.values()).filter(p => p.isActive);
  }

  async getProvider(id: number): Promise<Provider | undefined> {
    return this.providers.get(id);
  }

  async createProvider(provider: InsertProvider): Promise<Provider> {
    const newProvider: Provider = {
      ...provider,
      id: this.currentProviderId++,
      createdAt: new Date(),
    };
    this.providers.set(newProvider.id, newProvider);
    return newProvider;
  }

  async updateProvider(id: number, provider: Partial<InsertProvider>): Promise<Provider | undefined> {
    const existing = this.providers.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...provider };
    this.providers.set(id, updated);
    return updated;
  }

  async deleteProvider(id: number): Promise<boolean> {
    return this.providers.delete(id);
  }

  // Personalities
  async getPersonalities(): Promise<Personality[]> {
    return Array.from(this.personalities.values()).filter(p => p.isActive);
  }

  async getPersonality(id: number): Promise<Personality | undefined> {
    return this.personalities.get(id);
  }

  async getPersonalityByNameId(nameId: string): Promise<Personality | undefined> {
    return Array.from(this.personalities.values()).find(p => p.nameId === nameId);
  }

  async createPersonality(personality: InsertPersonality): Promise<Personality> {
    const newPersonality: Personality = {
      ...personality,
      id: this.currentPersonalityId++,
      createdAt: new Date(),
    };
    this.personalities.set(newPersonality.id, newPersonality);
    return newPersonality;
  }

  async updatePersonality(id: number, personality: Partial<InsertPersonality>): Promise<Personality | undefined> {
    const existing = this.personalities.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...personality };
    this.personalities.set(id, updated);
    return updated;
  }

  async deletePersonality(id: number): Promise<boolean> {
    return this.personalities.delete(id);
  }

  // Conversations
  async getConversations(): Promise<ConversationWithParticipants[]> {
    const conversationList = Array.from(this.conversations.values())
      .filter(c => c.isActive)
      .sort((a, b) => b.updatedAt!.getTime() - a.updatedAt!.getTime());

    return Promise.all(conversationList.map(async (conv) => {
      const participants = conv.participantIds 
        ? await Promise.all(conv.participantIds.map(nameId => this.getPersonalityByNameId(nameId)))
        : [];
      
      const messageCount = Array.from(this.messages.values())
        .filter(m => m.conversationId === conv.id).length;

      const lastMessage = Array.from(this.messages.values())
        .filter(m => m.conversationId === conv.id)
        .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())[0];

      return {
        ...conv,
        participants: participants.filter(p => p !== undefined) as Personality[],
        messageCount,
        lastMessage,
      };
    }));
  }

  async getConversation(id: number): Promise<ConversationWithParticipants | undefined> {
    const conv = this.conversations.get(id);
    if (!conv) return undefined;

    const participants = conv.participantIds 
      ? await Promise.all(conv.participantIds.map(nameId => this.getPersonalityByNameId(nameId)))
      : [];
    
    const messageCount = Array.from(this.messages.values())
      .filter(m => m.conversationId === conv.id).length;

    const lastMessage = Array.from(this.messages.values())
      .filter(m => m.conversationId === conv.id)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())[0];

    return {
      ...conv,
      participants: participants.filter(p => p !== undefined) as Personality[],
      messageCount,
      lastMessage,
    };
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const newConversation: Conversation = {
      ...conversation,
      id: this.currentConversationId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(newConversation.id, newConversation);
    return newConversation;
  }

  async updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const existing = this.conversations.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...conversation, updatedAt: new Date() };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: number): Promise<boolean> {
    return this.conversations.delete(id);
  }

  // Messages
  async getMessages(conversationId: number): Promise<MessageWithSender[]> {
    const messageList = Array.from(this.messages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());

    return Promise.all(messageList.map(async (message) => {
      const sender = message.senderId && message.senderId !== "user" 
        ? await this.getPersonalityByNameId(message.senderId)
        : undefined;

      return {
        ...message,
        sender,
      };
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: this.currentMessageId++,
      createdAt: new Date(),
    };
    this.messages.set(newMessage.id, newMessage);

    // Update conversation updatedAt
    if (this.conversations.has(message.conversationId)) {
      const conv = this.conversations.get(message.conversationId)!;
      this.conversations.set(message.conversationId, { ...conv, updatedAt: new Date() });
    }

    return newMessage;
  }

  async deleteMessage(id: number): Promise<boolean> {
    return this.messages.delete(id);
  }
}

// DatabaseStorage implementation
export class DatabaseStorage implements IStorage {
  // Providers
  async getProviders(): Promise<Provider[]> {
    return await db.select().from(providers).where(eq(providers.isActive, true));
  }

  async getProvider(id: number): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.id, id));
    return provider || undefined;
  }

  async createProvider(provider: InsertProvider): Promise<Provider> {
    const [newProvider] = await db
      .insert(providers)
      .values(provider)
      .returning();
    return newProvider;
  }

  async updateProvider(id: number, provider: Partial<InsertProvider>): Promise<Provider | undefined> {
    const [updatedProvider] = await db
      .update(providers)
      .set(provider)
      .where(eq(providers.id, id))
      .returning();
    return updatedProvider || undefined;
  }

  async deleteProvider(id: number): Promise<boolean> {
    await db.update(providers).set({ isActive: false }).where(eq(providers.id, id));
    return true;
  }

  // Personalities
  async getPersonalities(): Promise<Personality[]> {
    return await db.select().from(personalities).where(eq(personalities.isActive, true));
  }

  async getPersonality(id: number): Promise<Personality | undefined> {
    const [personality] = await db.select().from(personalities).where(eq(personalities.id, id));
    return personality || undefined;
  }

  async getPersonalityByNameId(nameId: string): Promise<Personality | undefined> {
    const [personality] = await db.select().from(personalities).where(eq(personalities.nameId, nameId));
    return personality || undefined;
  }

  async createPersonality(personality: InsertPersonality): Promise<Personality> {
    const [newPersonality] = await db
      .insert(personalities)
      .values(personality)
      .returning();
    return newPersonality;
  }

  async updatePersonality(id: number, personality: Partial<InsertPersonality>): Promise<Personality | undefined> {
    const [updatedPersonality] = await db
      .update(personalities)
      .set(personality)
      .where(eq(personalities.id, id))
      .returning();
    return updatedPersonality || undefined;
  }

  async deletePersonality(id: number): Promise<boolean> {
    await db.update(personalities).set({ isActive: false }).where(eq(personalities.id, id));
    return true;
  }

  // Conversations
  async getConversations(): Promise<ConversationWithParticipants[]> {
    const convs = await db.select().from(conversations)
      .where(eq(conversations.isActive, true))
      .orderBy(desc(conversations.updatedAt));

    return Promise.all(convs.map(async (conv) => {
      const participantList = conv.participantIds || [];
      const participants = await Promise.all(
        participantList.map(nameId => this.getPersonalityByNameId(nameId))
      ).then(results => results.filter(Boolean) as Personality[]);

      const [messageCountResult] = await db
        .select({ count: count() })
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      const [lastMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      return {
        ...conv,
        participants,
        messageCount: messageCountResult.count,
        lastMessage,
      };
    }));
  }

  async getConversation(id: number): Promise<ConversationWithParticipants | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) return undefined;

    const participantList = conv.participantIds || [];
    const participants = await Promise.all(
      participantList.map(nameId => this.getPersonalityByNameId(nameId))
    ).then(results => results.filter(Boolean) as Personality[]);

    const [messageCountResult] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.conversationId, conv.id));

    const [lastMessage] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    return {
      ...conv,
      participants,
      messageCount: messageCountResult.count,
      lastMessage,
    };
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async updateConversation(id: number, conversation: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ ...conversation, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation || undefined;
  }

  async deleteConversation(id: number): Promise<boolean> {
    await db.update(conversations).set({ isActive: false }).where(eq(conversations.id, id));
    return true;
  }

  // Messages
  async getMessages(conversationId: number): Promise<MessageWithSender[]> {
    const messageList = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return Promise.all(messageList.map(async (message) => {
      const sender = message.senderId && message.senderId !== "user" 
        ? await this.getPersonalityByNameId(message.senderId)
        : undefined;

      return {
        ...message,
        sender,
      };
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();

    // Update conversation updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
  }

  async deleteMessage(id: number): Promise<boolean> {
    await db.delete(messages).where(eq(messages.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
