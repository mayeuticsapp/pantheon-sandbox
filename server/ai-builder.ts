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
      const architecturePrompt = `You are GEPPO, a SENIOR SOFTWARE ARCHITECT with 15+ years building enterprise applications.

PROJECT: ${request.projectName}
DESCRIPTION: ${request.description}
REQUIREMENTS: ${request.requirements.map(req => `• ${req}`).join('\n')}

ARCHITECT A PROFESSIONAL, COMPREHENSIVE WEB APPLICATION:

ARCHITECTURAL CONSIDERATIONS:
• Enterprise-grade structure and scalability
• Modern web development patterns (2024)
• Performance optimization from ground up
• Rich user experience with multiple sections
• SEO and accessibility compliance
• Mobile-first responsive design

CREATE SOPHISTICATED FILE STRUCTURE (4-6 files minimum):
• Multiple HTML pages for comprehensive site
• Modular CSS architecture
• Advanced JavaScript functionality
• Documentation and assets

EXAMPLE COMPREHENSIVE STRUCTURE:
{
  "projectStructure": [
    {"filename": "index.html", "language": "html", "purpose": "main homepage with hero, features, testimonials"},
    {"filename": "about.html", "language": "html", "purpose": "company information and team details"},
    {"filename": "main.css", "language": "css", "purpose": "core styling, layout, responsive design"},
    {"filename": "components.css", "language": "css", "purpose": "component-specific styles and animations"},
    {"filename": "app.js", "language": "javascript", "purpose": "main application logic and interactions"},
    {"filename": "README.md", "language": "markdown", "purpose": "project documentation and setup"}
  ],
  "architectureNotes": "Multi-page professional website with modular architecture and enterprise-grade functionality"
}

RESPOND WITH VALID JSON ONLY. NO explanations, NO markdown blocks.`;

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
    const baseContext = `PROJECT: ${request.projectName}
DESCRIPTION: ${request.description}
FILE: ${fileSpec.filename} (${fileSpec.language})
PURPOSE: ${fileSpec.purpose}

BUSINESS REQUIREMENTS:
${request.requirements.map(req => `• ${req}`).join('\n')}`;

    switch (aiId) {
      case 'geppo':
        return `${baseContext}

You are GEPPO, a SENIOR FULL-STACK ARCHITECT with 15+ years experience building enterprise applications.

EXPERTISE: Advanced HTML5, semantic structure, accessibility (WCAG 2.1), SEO optimization, performance.

CREATE PRODUCTION-GRADE HTML:
• Modern HTML5 semantic structure (header, nav, main, section, article, aside, footer)
• Advanced meta tags, Open Graph, Twitter Cards, structured data
• Perfect accessibility: ARIA labels, roles, keyboard navigation, screen reader optimization
• SEO-optimized: proper headings hierarchy, alt texts, meta descriptions
• Performance optimized: lazy loading, critical CSS hints, preload directives
• Professional content - NO placeholder text, use realistic business content
• Include contact forms, navigation, call-to-action sections
• Mobile-first responsive structure with proper viewport meta
• Schema.org microdata for business information

QUALITY STANDARDS:
• Enterprise-level code quality
• HTML5 validation compliant
• Lighthouse score 95+
• Real, engaging business content
• Professional layout structure

Return ONLY the complete HTML code. NO explanations, NO markdown blocks.`;

      case 'claude3':
        return `${baseContext}

You are CLAUDE3, an EXPERT UI/UX DESIGNER and CSS ARCHITECT specializing in modern web design.

EXPERTISE: Advanced CSS3, Flexbox, Grid, animations, responsive design, design systems.

CREATE STUNNING PROFESSIONAL CSS:
• Modern CSS Grid and Flexbox layouts
• Beautiful color palettes with CSS custom properties
• Sophisticated typography using web fonts (Google Fonts)
• Smooth animations and micro-interactions
• Advanced responsive design (mobile-first, multiple breakpoints)
• Professional shadows, gradients, hover effects
• Modern button styles, form styling, card components
• Dark/light theme support with CSS variables
• Advanced selectors and pseudo-elements
• Performance optimized: efficient selectors, critical CSS
• Beautiful hero sections, testimonials, product showcases
• Professional navigation with dropdowns and mobile menu
• Modern loading states and transitions

DESIGN STANDARDS:
• Contemporary design trends (2024)
• Consistent spacing system (8px grid)
• Professional color harmony
• Accessible contrast ratios (WCAG AA)
• Engaging visual hierarchy
• Enterprise-quality aesthetics

Return ONLY the complete CSS code. NO explanations, NO markdown blocks.`;

      case 'mistral':
        return `${baseContext}

You are MISTRAL, a SENIOR JAVASCRIPT ENGINEER specializing in modern web applications and user experience.

EXPERTISE: ES6+, DOM manipulation, async/await, performance optimization, UX patterns.

CREATE ADVANCED JAVASCRIPT:
• Modern ES6+ syntax with clean, maintainable code
• Advanced DOM manipulation and event handling
• Smooth animations using requestAnimationFrame
• Form validation with real-time feedback
• Interactive UI components (modals, dropdowns, tabs, sliders)
• Lazy loading and intersection observer for performance
• Local storage for user preferences
• Responsive navigation with mobile hamburger menu
• Product/service filtering and search functionality
• Contact form with validation and submission handling
• Scroll animations and progressive loading
• Error handling and user feedback systems
• Performance monitoring and optimization
• Modern async patterns for API calls

FUNCTIONALITY REQUIREMENTS:
• Fully interactive user interface
• Professional form handling with validation
• Smooth page transitions and animations
• Mobile-optimized touch interactions
• Accessibility keyboard navigation
• Error handling with user-friendly messages
• Real business logic implementation
• Advanced event listeners and callbacks
• Performance-optimized code with debouncing
• Cross-browser compatibility

QUALITY STANDARDS:
• Enterprise-grade JavaScript architecture
• Modern ES6+ patterns and best practices
• Performance optimized (60fps animations)
• Accessibility compliant interactions
• Real functionality, not just demo code
• Clean error handling and user feedback

Return ONLY the complete JavaScript code. NO explanations, NO markdown blocks.`;
• Loading states and progress indicators

QUALITY STANDARDS:
• Production-ready, bug-free code
• Optimized performance (60fps animations)
• Cross-browser compatibility
• Mobile-first responsive behavior
• Comprehensive error handling

Return ONLY the complete JavaScript code. NO explanations, NO markdown blocks.`;

      default:
        return `${baseContext}

You are a SENIOR SOFTWARE ENGINEER. Create PRODUCTION-QUALITY ${fileSpec.language} code.

REQUIREMENTS:
• Enterprise-grade code quality
• Modern best practices and patterns
• Full functionality implementation
• Professional documentation
• Performance optimized
• Security considerations
• Error handling

Return ONLY the complete code. NO explanations.`;
    }
  }
}

export const aiBuilder = new AICollaborativeBuilder();