import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProviderSchema, insertPersonalitySchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { generateAIResponse } from "./ai-service";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Providers endpoints
  app.get("/api/providers", async (req, res) => {
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });

  app.get("/api/providers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const provider = await storage.getProvider(id);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      res.json(provider);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch provider" });
    }
  });

  app.post("/api/providers", async (req, res) => {
    try {
      const providerData = insertProviderSchema.parse(req.body);
      const provider = await storage.createProvider(providerData);
      res.status(201).json(provider);
    } catch (error) {
      res.status(400).json({ message: "Invalid provider data", error });
    }
  });

  app.patch("/api/providers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const providerData = insertProviderSchema.partial().parse(req.body);
      const provider = await storage.updateProvider(id, providerData);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      res.json(provider);
    } catch (error) {
      res.status(400).json({ message: "Invalid provider data", error });
    }
  });

  app.delete("/api/providers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProvider(id);
      if (!success) {
        return res.status(404).json({ message: "Provider not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete provider" });
    }
  });

  // Personalities endpoints
  app.get("/api/personalities", async (req, res) => {
    try {
      const personalities = await storage.getPersonalities();
      res.json(personalities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch personalities" });
    }
  });

  app.get("/api/personalities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const personality = await storage.getPersonality(id);
      if (!personality) {
        return res.status(404).json({ message: "Personality not found" });
      }
      res.json(personality);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch personality" });
    }
  });

  app.post("/api/personalities", async (req, res) => {
    try {
      const personalityData = insertPersonalitySchema.parse(req.body);
      const personality = await storage.createPersonality(personalityData);
      res.status(201).json(personality);
    } catch (error) {
      res.status(400).json({ message: "Invalid personality data", error });
    }
  });

  app.patch("/api/personalities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const personalityData = insertPersonalitySchema.partial().parse(req.body);
      const personality = await storage.updatePersonality(id, personalityData);
      if (!personality) {
        return res.status(404).json({ message: "Personality not found" });
      }
      res.json(personality);
    } catch (error) {
      res.status(400).json({ message: "Invalid personality data", error });
    }
  });

  app.delete("/api/personalities/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePersonality(id);
      if (!success) {
        return res.status(404).json({ message: "Personality not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete personality" });
    }
  });

  // Conversations endpoints
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(400).json({ message: "Invalid conversation data", error });
    }
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversationData = insertConversationSchema.partial().parse(req.body);
      const conversation = await storage.updateConversation(id, conversationData);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ message: "Invalid conversation data", error });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteConversation(id);
      if (!success) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Messages endpoints
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
      });
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data", error });
    }
  });

  // AI Chat endpoint - Integrazione C24 per ChatGPT
  app.post("/api/chat", async (req, res) => {
    try {
      const { personalityId, message, conversationHistory = [], conversationId } = req.body;
      
      console.log(`🎭 Richiesta chat per ${personalityId}: "${message.substring(0, 50)}..."`);
      
      const personality = await storage.getPersonalityByNameId(personalityId);
      if (!personality) {
        return res.status(404).json({ message: "Personality not found" });
      }

      // Ottieni le istruzioni della conversazione se disponibili
      let instructions: string | undefined;
      if (conversationId) {
        const conversation = await storage.getConversation(conversationId);
        instructions = conversation?.instructions || undefined;
      }

      // Genera la risposta AI usando il nuovo servizio
      const aiResponse = await generateAIResponse(personality, conversationHistory, message, instructions, conversationId);

      res.json({
        response: aiResponse,
        metadata: {
          personality: personality.displayName,
          model: "gpt-4o", // the newest OpenAI model
          provider: "OpenAI",
          timestamp: new Date().toISOString(),
        }
      });

    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ message: "Failed to generate AI response", error: error.message });
    }
  });

  // Test provider connection
  app.post("/api/providers/test", async (req, res) => {
    try {
      const { type, apiKey, baseUrl, defaultModel } = req.body;

      if (type === "openai") {
        const response = await fetch(`${baseUrl}/models`, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Connection failed: ${response.statusText}`);
        }

        res.json({ success: true, message: "Connection successful" });

      } else if (type === "manus") {
        const response = await fetch(`${baseUrl}/health`, {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Connection failed: ${response.statusText}`);
        }

        res.json({ success: true, message: "Connection successful" });

      } else {
        res.status(400).json({ success: false, message: "Unsupported provider type" });
      }

    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // Attachments endpoints
  app.get("/api/conversations/:id/attachments", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const attachments = await storage.getAttachments(conversationId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  app.post("/api/conversations/:id/attachments", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { filename, originalName, mimeType, size, content, uploadedBy } = req.body;
      
      const attachment = await storage.createAttachment({
        conversationId,
        filename,
        originalName,
        mimeType,
        size,
        content,
        uploadedBy: uploadedBy || "user"
      });
      
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error creating attachment:", error);
      res.status(500).json({ error: "Failed to create attachment" });
    }
  });

  app.delete("/api/attachments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAttachment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  // Add personality to conversation
  app.post("/api/conversations/:id/participants", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { personalityId } = req.body;

      if (!personalityId) {
        return res.status(400).json({ error: "personalityId richiesto" });
      }

      // Verifica che la conversazione esista
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversazione non trovata" });
      }

      // Verifica che la personalità esista
      const personality = await storage.getPersonality(personalityId);
      if (!personality) {
        return res.status(404).json({ error: "Personalità non trovata" });
      }

      // Controlla se la personalità è già presente
      const isAlreadyParticipant = conversation.participants.some(p => p.id === personalityId);
      if (isAlreadyParticipant) {
        return res.status(409).json({ error: "Personalità già presente nella conversazione" });
      }

      // Aggiungi la personalità alla conversazione
      const updatedParticipants = [...conversation.participants.map(p => p.id), personalityId];
      const updatedConversation = await storage.updateConversation(conversationId, {
        participantIds: updatedParticipants
      });

      res.json(updatedConversation);
    } catch (error) {
      console.error("Errore aggiunta personalità:", error);
      res.status(500).json({ error: "Errore durante l'aggiunta della personalità" });
    }
  });

  // Remove personality from conversation
  app.delete("/api/conversations/:id/participants/:personalityId", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const personalityId = parseInt(req.params.personalityId);

      // Verifica che la conversazione esista
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversazione non trovata" });
      }

      // Rimuovi la personalità dalla conversazione
      const updatedParticipants = conversation.participants
        .filter(p => p.id !== personalityId)
        .map(p => p.id);
      
      const updatedConversation = await storage.updateConversation(conversationId, {
        participantIds: updatedParticipants
      });

      res.json(updatedConversation);
    } catch (error) {
      console.error("Errore rimozione personalità:", error);
      res.status(500).json({ error: "Errore durante la rimozione della personalità" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
