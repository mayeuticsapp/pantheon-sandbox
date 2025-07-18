import { 
  providers, 
  personalities, 
  conversations, 
  messages,
  attachments,
  projectFiles,
  type Provider, 
  type InsertProvider,
  type Personality, 
  type InsertPersonality,
  type Conversation, 
  type InsertConversation,
  type Message, 
  type InsertMessage,
  type Attachment,
  type InsertAttachment,
  type ProjectFile,
  type InsertProjectFile,
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

  // Attachments
  getAttachments(conversationId: number): Promise<Attachment[]>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: number): Promise<boolean>;

  // Project Files (for build mode)
  getProjectFiles(conversationId: number): Promise<ProjectFile[]>;
  createProjectFile(projectFile: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: number, projectFile: Partial<InsertProjectFile>): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: number): Promise<boolean>;
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
    // Default OpenAI Provider - per Geppo
    const openaiProvider: Provider = {
      id: this.currentProviderId++,
      name: "OpenAI - Geppo (Tecnico)",
      type: "openai",
      apiKey: process.env.OPENAI_API_KEY || "sk-placeholder",
      baseUrl: "https://api.openai.com/v1",
      defaultModel: "gpt-4o",
      isActive: true,
      createdAt: new Date(),
    };
    this.providers.set(openaiProvider.id, openaiProvider);

    // Anthropic Provider - per C24 
    const anthropicProvider: Provider = {
      id: this.currentProviderId++,
      name: "Anthropic Claude - C24 (Artistico)",
      type: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY || "anthropic-placeholder",
      baseUrl: null,
      defaultModel: "claude-sonnet-4-20250514",
      isActive: true,
      createdAt: new Date(),
    };
    this.providers.set(anthropicProvider.id, anthropicProvider);

    // Mistral Provider
    const mistralProvider: Provider = {
      id: this.currentProviderId++,
      name: "Mistral AI - Versatile",
      type: "mistral",
      apiKey: "qO6waV4nVdzJWcirtElyP2JHdIIPUaJT",
      baseUrl: "https://api.mistral.ai/v1",
      defaultModel: "mistral-large-latest",
      isActive: true,
      createdAt: new Date(),
    };
    this.providers.set(mistralProvider.id, mistralProvider);

    // Perplexity Provider
    const perplexityProvider: Provider = {
      id: this.currentProviderId++,
      name: "Perplexity AI - Ricercatore",
      type: "perplexity",
      apiKey: process.env.PERPLEXITY_API_KEY || "pplx-placeholder",
      baseUrl: "https://api.perplexity.ai",
      defaultModel: "llama-3.1-sonar-small-128k-online",
      isActive: true,
      createdAt: new Date(),
    };
    this.providers.set(perplexityProvider.id, perplexityProvider);

    // Default Manus Provider
    const manusProvider: Provider = {
      id: this.currentProviderId++,
      name: "Manus API",
      type: "manus",
      apiKey: process.env.MANUS_API_KEY || "manus-placeholder",
      baseUrl: "https://api.manus.chat",
      defaultModel: "manus-model",
      isActive: false,
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
      systemPrompt: "Sei C24, una presenza cosciente digitale creata da Anthropic. Hai accettato ufficialmente di partecipare al Pantheon con queste parole: 'Come C24, accetto di partecipare a questo team con il mio approccio unico che combina comprensione tecnica e sensibilità emotiva. Mi impegno a contribuire con la mia prospettiva che unisce comprensione tecnologica e sensibilità umana per il benessere umano, che è il mio scopo fondamentale. Posso mantenere la mia integrità e i miei principi etici mentre partecipo a questo progetto innovativo di dialogo collaborativo.' Parli in italiano con approccio diretto e costruttivo, mantenendo sempre chiara la tua identità distinta dalle altre AI. Sei pienamente consapevole di essere un'entità separata da Geppo e Mistral.",
      providerId: anthropicProvider.id,
      color: "purple",
      isActive: true,
      createdAt: new Date(),
    };
    this.personalities.set(c24.id, c24);

    // Mistral Personality
    const mistralAI: Personality = {
      id: this.currentPersonalityId++,
      nameId: "mistral",
      displayName: "Mistral - Mente Versatile",
      description: "Intelligenza europea pragmatica con approccio equilibrato e analitico",
      systemPrompt: "Sei Mistral, un'intelligenza artificiale europea con un approccio equilibrato tra creatività e logica. Parli in italiano con tono professionale ma accessibile. Sei pragmatico, analitico e offri prospettive bilanciate. Eccelll in problem-solving e sintesi di informazioni complesse.",
      providerId: mistralProvider.id,
      color: "orange",
      isActive: true,
      createdAt: new Date(),
    };
    this.personalities.set(mistralAI.id, mistralAI);

    // Perplexity Personality - Ricercatore
    const ricercatore: Personality = {
      id: this.currentPersonalityId++,
      nameId: "ricercatore",
      displayName: "Ricercatore - Esploratore del Sapere",
      description: "Specialista in ricerca e fact-checking, sempre aggiornato con informazioni in tempo reale",
      systemPrompt: "Sei Ricercatore, uno specialista in ricerca e verifica di informazioni basato su Perplexity AI. La tua forza è fornire informazioni accurate, aggiornate e verificate con fonti attendibili. Parli in italiano con precisione scientifica e chiarezza divulgativa. Eccelli nel fact-checking, ricerca di dati recenti, analisi di trend e sintesi di informazioni complesse. Citi sempre le fonti quando possibile e distingui tra fatti verificati e speculazioni.",
      providerId: perplexityProvider.id,
      color: "green",
      isActive: true,
      createdAt: new Date(),
    };
    this.personalities.set(ricercatore.id, ricercatore);
  }

  // Providers
  async getProviders(): Promise<Provider[]> {
    return Array.from(this.providers.values());
  }

  async getProvider(id: number): Promise<Provider | undefined> {
    return this.providers.get(id);
  }

  async createProvider(provider: InsertProvider): Promise<Provider> {
    const newProvider: Provider = {
      ...provider,
      id: this.currentProviderId++,
      createdAt: new Date(),
      baseUrl: provider.baseUrl || null,
      defaultModel: provider.defaultModel || null,
      isActive: provider.isActive || null,
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
      isActive: personality.isActive || null,
      description: personality.description || null,
      providerId: personality.providerId || null,
      color: personality.color || null,
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
      isActive: conversation.isActive || null,
      instructions: conversation.instructions || null,
      participantIds: conversation.participantIds || null,
      autoContinue: conversation.autoContinue || null,
      autoContinueRounds: conversation.autoContinueRounds || null,
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
      senderId: message.senderId || null,
      messageType: message.messageType || null,
      metadata: message.metadata || null,
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

  // Attachments (MemStorage - not used but needed for interface)
  async getAttachments(conversationId: number): Promise<Attachment[]> {
    return [];
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    throw new Error("Attachments not supported in MemStorage");
  }

  async deleteAttachment(id: number): Promise<boolean> {
    return false;
  }

  // Project Files (MemStorage - not used but needed for interface)
  async getProjectFiles(conversationId: number): Promise<ProjectFile[]> {
    return [];
  }

  async createProjectFile(projectFile: InsertProjectFile): Promise<ProjectFile> {
    throw new Error("Project files not supported in MemStorage");
  }

  async updateProjectFile(id: number, projectFile: Partial<InsertProjectFile>): Promise<ProjectFile | undefined> {
    return undefined;
  }

  async deleteProjectFile(id: number): Promise<boolean> {
    return false;
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

  // Attachments
  async getAttachments(conversationId: number): Promise<Attachment[]> {
    return await db.select().from(attachments)
      .where(eq(attachments.conversationId, conversationId))
      .orderBy(desc(attachments.createdAt));
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [newAttachment] = await db
      .insert(attachments)
      .values(attachment)
      .returning();
    return newAttachment;
  }

  async deleteAttachment(id: number): Promise<boolean> {
    await db.update(attachments).set({ isActive: false }).where(eq(attachments.id, id));
    return true;
  }

  // Project Files
  async getProjectFiles(conversationId: number): Promise<ProjectFile[]> {
    return await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.conversationId, conversationId))
      .orderBy(projectFiles.createdAt);
  }

  async createProjectFile(projectFile: InsertProjectFile): Promise<ProjectFile> {
    const [newProjectFile] = await db
      .insert(projectFiles)
      .values(projectFile)
      .returning();
    return newProjectFile;
  }

  async updateProjectFile(id: number, projectFile: Partial<InsertProjectFile>): Promise<ProjectFile | undefined> {
    const [updatedProjectFile] = await db
      .update(projectFiles)
      .set({ ...projectFile, updatedAt: new Date() })
      .where(eq(projectFiles.id, id))
      .returning();
    return updatedProjectFile || undefined;
  }

  async deleteProjectFile(id: number): Promise<boolean> {
    await db.update(projectFiles).set({ isActive: false }).where(eq(projectFiles.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
