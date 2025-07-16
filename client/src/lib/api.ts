import { apiRequest } from "./queryClient";
import type { 
  Provider, 
  InsertProvider, 
  Personality, 
  InsertPersonality, 
  Conversation, 
  InsertConversation, 
  ConversationWithParticipants,
  Message,
  InsertMessage,
  MessageWithSender 
} from "@shared/schema";

// Providers API
export const providersApi = {
  getAll: (): Promise<Provider[]> => 
    fetch("/api/providers").then(res => res.json()),
  
  getById: (id: number): Promise<Provider> => 
    fetch(`/api/providers/${id}`).then(res => res.json()),
  
  create: (provider: InsertProvider): Promise<Provider> =>
    apiRequest("POST", "/api/providers", provider).then(res => res.json()),
  
  update: (id: number, provider: Partial<InsertProvider>): Promise<Provider> =>
    apiRequest("PATCH", `/api/providers/${id}`, provider).then(res => res.json()),
  
  delete: (id: number): Promise<void> =>
    apiRequest("DELETE", `/api/providers/${id}`).then(() => {}),
  
  test: (testData: { type: string; apiKey: string; baseUrl: string; defaultModel: string }) =>
    apiRequest("POST", "/api/providers/test", testData).then(res => res.json()),
};

// Personalities API
export const personalitiesApi = {
  getAll: (): Promise<Personality[]> => 
    fetch("/api/personalities").then(res => res.json()),
  
  getById: (id: number): Promise<Personality> => 
    fetch(`/api/personalities/${id}`).then(res => res.json()),
  
  create: (personality: InsertPersonality): Promise<Personality> =>
    apiRequest("POST", "/api/personalities", personality).then(res => res.json()),
  
  update: (id: number, personality: Partial<InsertPersonality>): Promise<Personality> =>
    apiRequest("PATCH", `/api/personalities/${id}`, personality).then(res => res.json()),
  
  delete: (id: number): Promise<void> =>
    apiRequest("DELETE", `/api/personalities/${id}`).then(() => {}),
};

// Conversations API
export const conversationsApi = {
  getAll: (): Promise<ConversationWithParticipants[]> => 
    fetch("/api/conversations").then(res => res.json()),
  
  getById: (id: number): Promise<ConversationWithParticipants> => 
    fetch(`/api/conversations/${id}`).then(res => res.json()),
  
  create: (conversation: InsertConversation): Promise<Conversation> =>
    apiRequest("POST", "/api/conversations", conversation).then(res => res.json()),
  
  update: (id: number, conversation: Partial<InsertConversation>): Promise<Conversation> =>
    apiRequest("PATCH", `/api/conversations/${id}`, conversation).then(res => res.json()),
  
  delete: (id: number): Promise<void> =>
    apiRequest("DELETE", `/api/conversations/${id}`).then(() => {}),
};

// Messages API
export const messagesApi = {
  getByConversation: (conversationId: number): Promise<MessageWithSender[]> => 
    fetch(`/api/conversations/${conversationId}/messages`).then(res => res.json()),
  
  create: (conversationId: number, message: Omit<InsertMessage, 'conversationId'>): Promise<Message> =>
    apiRequest("POST", `/api/conversations/${conversationId}/messages`, message).then(res => res.json()),
};

// Chat API
export const chatApi = {
  sendMessage: (data: {
    personalityId: string;
    message: string;
    conversationHistory: MessageWithSender[];
  }): Promise<{ response: string; metadata: any }> =>
    apiRequest("POST", "/api/chat", data).then(res => res.json()),
};
