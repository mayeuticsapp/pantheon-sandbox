import { generateAIResponse } from "./ai-service";
import { storage } from "./storage";
import type { Conversation, InsertProjectFile, ProjectFile } from "@shared/schema";

export interface BuildRequest {
  conversationId: number;
  projectName: string;
  description: string;
  requirements: string[];
}

export interface BuildResult {
  success: boolean;
  files: ProjectFile[];
  error?: string;
}

export class AICollaborativeBuilder {
  private async generateWithAI(personalityId: string, prompt: string): Promise<string> {
    try {
      // Get the personality
      const personality = await storage.getPersonalityByNameId(personalityId);
      if (!personality) {
        throw new Error(`Personality ${personalityId} not found`);
      }
      
      // Create a minimal conversation context for the AI
      const messages = [
        {
          id: 999,
          conversationId: 0,
          senderId: "user",
          content: prompt,
          createdAt: new Date()
        }
      ];
      
      return await generateAIResponse(personality, messages, prompt);
    } catch (error) {
      console.error(`Error generating with ${personalityId}:`, error);
      throw new Error(`Failed to generate content with ${personalityId}: ${error.message}`);
    }
  }

  private async saveProjectFile(
    conversationId: number, 
    messageId: number | null,
    filename: string, 
    content: string, 
    language: string, 
    purpose: string, 
    generatedBy: string
  ): Promise<ProjectFile> {
    const projectFile: InsertProjectFile = {
      conversationId,
      messageId,
      filename,
      filePath: filename, // Simple path for now
      content,
      language,
      purpose,
      generatedBy,
      version: 1
    };
    
    return await storage.createProjectFile(projectFile);
  }

  async buildProject(request: BuildRequest): Promise<BuildResult> {
    try {
      console.log(`🚀 Starting collaborative build: ${request.projectName}`);
      
      // Update conversation status
      await storage.updateConversation(request.conversationId, {
        buildStatus: "building",
        projectName: request.projectName,
        projectDescription: request.description
      });

      const files: ProjectFile[] = [];
      
      // STEP 1: Geppo creates project architecture
      console.log("📐 Geppo: Planning project architecture...");
      const architecturePrompt = `You are Geppo, an expert software architect. Create a project structure for: "${request.projectName}"

Description: ${request.description}

Requirements:
${request.requirements.map(req => `- ${req}`).join('\n')}

Respond with a JSON object containing the project structure:
{
  "projectStructure": [
    {"filename": "index.html", "language": "html", "purpose": "main homepage"},
    {"filename": "style.css", "language": "css", "purpose": "main stylesheet"},
    {"filename": "script.js", "language": "javascript", "purpose": "main interactions"}
  ],
  "architectureNotes": "Brief explanation of the structure decisions"
}

Only respond with valid JSON, no other text.`;

      const architectureResponse = await this.generateWithAI("geppo", architecturePrompt);
      
      // Clean the response to extract JSON
      let cleanedResponse = architectureResponse.trim();
      
      // More robust JSON extraction
      if (cleanedResponse.includes('```json')) {
        const jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[1].trim();
        }
      } else if (cleanedResponse.includes('```')) {
        const codeMatch = cleanedResponse.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          cleanedResponse = codeMatch[1].trim();
        }
      }
      
      // Find JSON object by looking for { and }
      const jsonStart = cleanedResponse.indexOf('{');
      const jsonEnd = cleanedResponse.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      console.log("🔍 Architecture response (first 200 chars):", cleanedResponse.substring(0, 200));
      
      let architecture;
      try {
        architecture = JSON.parse(cleanedResponse);
      } catch (error) {
        console.error("❌ JSON parse error:", error.message);
        console.error("🔍 Full response:", architectureResponse);
        throw new Error(`Failed to parse architecture response: ${error.message}`);
      }
      
      // Add architecture message
      const archMessage = await storage.createMessage({
        conversationId: request.conversationId,
        senderId: "geppo",
        content: `📐 **Project Architecture Created**\n\n${architecture.architectureNotes}\n\nFiles planned: ${architecture.projectStructure.length}`,
        messageType: "text"
      });

      // STEP 2: Generate each file with appropriate AI
      for (const fileSpec of architecture.projectStructure) {
        const assignedAI = this.getAIForFile(fileSpec.language);
        console.log(`📝 ${assignedAI}: Generating ${fileSpec.filename}...`);

        const filePrompt = this.createFilePrompt(assignedAI, fileSpec, request);
        const fileContent = await this.generateWithAI(assignedAI, filePrompt);
        
        // Save file to database
        const savedFile = await this.saveProjectFile(
          request.conversationId,
          archMessage.id,
          fileSpec.filename,
          fileContent,
          fileSpec.language,
          fileSpec.purpose,
          assignedAI
        );
        
        files.push(savedFile);
        
        // Add AI message about file creation
        await storage.createMessage({
          conversationId: request.conversationId,
          senderId: assignedAI,
          content: `✅ **${fileSpec.filename} created** (${fileContent.length} characters)\n\nPurpose: ${fileSpec.purpose}`,
          messageType: "text"
        });
      }

      // STEP 3: Final integration review (Claude3)
      console.log("🔍 Claude3: Final integration review...");
      const reviewPrompt = `You are Claude3, reviewing the completed project. The team has created ${files.length} files for "${request.projectName}".

Files created:
${files.map(f => `- ${f.filename} (${f.language}) by ${f.generatedBy}`).join('\n')}

Provide a brief project completion summary highlighting:
1. What was successfully implemented
2. Key features included
3. Any recommendations for deployment

Keep it concise and professional.`;

      const reviewResponse = await this.generateWithAI("claude3", reviewPrompt);
      
      await storage.createMessage({
        conversationId: request.conversationId,
        senderId: "claude3",
        content: `🎉 **Project Completed Successfully!**\n\n${reviewResponse}`,
        messageType: "text"
      });

      // Update conversation to completed
      await storage.updateConversation(request.conversationId, {
        buildStatus: "completed"
      });

      console.log(`✅ Build completed: ${files.length} files generated`);
      
      return {
        success: true,
        files
      };

    } catch (error) {
      console.error("❌ Build failed:", error);
      
      // Update conversation to failed
      await storage.updateConversation(request.conversationId, {
        buildStatus: "failed"
      });
      
      // Add error message
      await storage.createMessage({
        conversationId: request.conversationId,
        senderId: "system",
        content: `❌ **Build Failed**\n\nError: ${error.message}`,
        messageType: "error"
      });

      return {
        success: false,
        files: [],
        error: error.message
      };
    }
  }

  private getAIForFile(language: string): string {
    // Assign AI based on their specialties
    switch (language.toLowerCase()) {
      case 'html':
      case 'xml':
        return 'geppo'; // Architecture and structure
      case 'css':
      case 'scss':
      case 'less':
        return 'claude3'; // Design and aesthetics
      case 'javascript':
      case 'js':
      case 'ts':
      case 'typescript':
      case 'json':
      case 'md':
      case 'markdown':
        return 'mistral'; // Logic and business
      default:
        return 'geppo'; // Default to Geppo for other files
    }
  }

  private createFilePrompt(aiId: string, fileSpec: any, request: BuildRequest): string {
    const baseContext = `Project: ${request.projectName}
Description: ${request.description}
File: ${fileSpec.filename} (${fileSpec.language})
Purpose: ${fileSpec.purpose}

Requirements:
${request.requirements.map(req => `- ${req}`).join('\n')}`;

    switch (aiId) {
      case 'geppo':
        return `${baseContext}

You are Geppo, expert in software architecture and HTML structure. Create clean, semantic, well-structured ${fileSpec.language} code.
Focus on: proper structure, accessibility, SEO optimization, clean markup.

Generate the complete file content. Only return the code, no explanations.`;

      case 'claude3':
        return `${baseContext}

You are Claude3, expert in UI/UX design and CSS styling. Create beautiful, modern, responsive design.
Focus on: aesthetic appeal, user experience, mobile-first design, accessibility.

Generate the complete file content. Only return the code, no explanations.`;

      case 'mistral':
        return `${baseContext}

You are Mistral, expert in JavaScript and business logic. Create efficient, clean, functional code.
Focus on: performance, functionality, user interactions, business requirements.

Generate the complete file content. Only return the code, no explanations.`;

      default:
        return `${baseContext}

Generate the complete ${fileSpec.language} file content for ${fileSpec.filename}.
Only return the code, no explanations.`;
    }
  }
}

export const aiBuilder = new AICollaborativeBuilder();