import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { memoryService } from "./memory-service";
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

      // CONTROLLO TRIGGER @Andrea - Solo Andrea può essere chiamato direttamente
      if (personalityId === 'andrea') {
        // Verifica che il messaggio contenga trigger esplicito
        const hasAndreaTrigger = message.includes('@Andrea') || 
                                message.includes('@andrea') || 
                                message.includes('chiamo Andrea') || 
                                message.includes('chiamo andrea');
        
        if (!hasAndreaTrigger) {
          return res.status(400).json({ 
            message: "Andrea è un osservatore silente. Usare '@Andrea' per attivarlo." 
          });
        }
        
        console.log(`🎯 Andrea attivato con trigger esplicito!`);
      }

      // Le istruzioni sono già incluse nel messaggio dal frontend
      // Non c'è bisogno di cercarle nella conversazione
      
      // Genera la risposta AI usando il nuovo servizio
      const aiResponse = await generateAIResponse(personality, conversationHistory, message, undefined, conversationId);

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

  // Build/Project endpoints
  app.post("/api/conversations/:id/build", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { projectName, description, requirements } = req.body;
      
      if (!projectName || !description || !requirements) {
        return res.status(400).json({ message: "Missing required fields: projectName, description, requirements" });
      }

      // Import builder here to avoid circular dependencies
      const { aiBuilder } = await import("./ai-builder");
      
      const result = await aiBuilder.buildProject({
        conversationId,
        projectName,
        description,
        requirements
      });

      if (result.success) {
        res.json({
          message: "Build completed successfully",
          filesGenerated: result.files.length,
          files: result.files.map(f => ({
            id: f.id,
            filename: f.filename,
            language: f.language,
            purpose: f.purpose,
            generatedBy: f.generatedBy,
            size: f.content.length
          }))
        });
      } else {
        res.status(500).json({
          message: "Build failed",
          error: result.error
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Build request failed", error: error.message });
    }
  });

  app.get("/api/conversations/:id/files", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const files = await storage.getProjectFiles(conversationId);
      
      res.json({
        files: files.map(f => ({
          id: f.id,
          filename: f.filename,
          filePath: f.filePath,
          language: f.language,
          purpose: f.purpose,
          generatedBy: f.generatedBy,
          version: f.version,
          size: f.content.length,
          createdAt: f.createdAt
        }))
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project files", error: error.message });
    }
  });

  app.get("/api/conversations/:id/files/:fileId", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const fileId = parseInt(req.params.fileId);
      
      const files = await storage.getProjectFiles(conversationId);
      const file = files.find(f => f.id === fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(file);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch file", error: error.message });
    }
  });

  app.get("/api/conversations/:id/download", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const files = await storage.getProjectFiles(conversationId);
      
      if (files.length === 0) {
        return res.status(404).json({ message: "No files found for this project" });
      }

      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Import archiver dynamically
      const archiver = await import('archiver');
      const archive = archiver.default('zip', { zlib: { level: 9 } });

      res.attachment(`${conversation.projectName || 'project'}.zip`);
      archive.pipe(res);

      // Add each file to the zip
      files.forEach(file => {
        archive.append(file.content, { name: file.filename });
      });

      // Add a README with build info
      const readme = `# ${conversation.projectName || 'Generated Project'}

${conversation.projectDescription || 'No description provided'}

## Files Generated
${files.map(f => `- **${f.filename}** (${f.language}) - ${f.purpose} (by ${f.generatedBy})`).join('\n')}

## Build Information
- Generated: ${new Date().toISOString()}
- Files: ${files.length}
- AI Team: ${[...new Set(files.map(f => f.generatedBy))].join(', ')}

---
Generated by PantheonSandbox AI Collaborative Builder
`;
      
      archive.append(readme, { name: 'README.md' });
      
      await archive.finalize();
      
    } catch (error) {
      res.status(500).json({ message: "Failed to create download", error: error.message });
    }
  });

  // Memory endpoints
  app.get("/api/memory/stats", async (req, res) => {
    try {
      const stats = await memoryService.getMemoryStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch memory stats" });
    }
  });

  app.get("/api/memory/search", async (req, res) => {
    try {
      const { q, personality } = req.query;
      if (!q) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      const memories = await memoryService.searchMemories(
        q as string,
        personality as string | undefined,
        20
      );
      res.json(memories);
    } catch (error) {
      res.status(500).json({ message: "Failed to search memories" });
    }
  });

  app.get("/api/memory/:personalityId", async (req, res) => {
    try {
      const personalityId = req.params.personalityId;
      const memories = await memoryService.getRecentMemories(personalityId, 50);
      res.json(memories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch personality memories" });
    }
  });

  // Routes per controllo memoria durante esperimenti
  app.post('/api/memory/pause', async (req, res) => {
    try {
      memoryService.pauseMemory();
      res.json({ success: true, message: 'Memoria collettiva messa in pausa per esperimenti' });
    } catch (error) {
      console.error('Errore pausa memoria:', error);
      res.status(500).json({ error: 'Errore nella pausa della memoria' });
    }
  });

  app.post('/api/memory/resume', async (req, res) => {
    try {
      memoryService.resumeMemory();
      res.json({ success: true, message: 'Memoria collettiva riattivata' });
    } catch (error) {
      console.error('Errore riattivazione memoria:', error);
      res.status(500).json({ error: 'Errore nella riattivazione della memoria' });
    }
  });

  app.get('/api/memory/status', async (req, res) => {
    try {
      const isPaused = memoryService.isPausedMemory();
      res.json({ isPaused, status: isPaused ? 'paused' : 'active' });
    } catch (error) {
      console.error('Errore status memoria:', error);
      res.status(500).json({ error: 'Errore nel controllo status memoria' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
