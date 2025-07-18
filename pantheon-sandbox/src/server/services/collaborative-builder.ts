import { AIService } from './ai-service';
import { WorkspaceEngine } from './workspace-engine';
import { securityLogger } from '../security/logger';
import fs from 'fs/promises';
import path from 'path';

export interface BuildTask {
  id: string;
  workspaceId: string;
  projectName: string;
  description: string;
  requirements: string[];
  assignedAI: string[];
  status: 'planning' | 'building' | 'testing' | 'completed' | 'failed';
  currentStep: string;
  files: ProjectFile[];
  buildLog: BuildLogEntry[];
  startedAt: Date;
  completedAt?: Date;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  createdBy: string;
  lastModifiedBy: string;
  lastModified: Date;
  version: number;
}

export interface BuildLogEntry {
  timestamp: Date;
  aiId: string;
  action: 'file_created' | 'file_modified' | 'code_generated' | 'test_run' | 'error' | 'comment';
  details: string;
  filePath?: string;
  success: boolean;
}

export class CollaborativeBuilder {
  private aiService: AIService;
  private workspaceEngine: WorkspaceEngine;
  private activeTasks: Map<string, BuildTask> = new Map();
  private workspaceBasePath: string;

  constructor() {
    this.aiService = new AIService();
    this.workspaceEngine = new WorkspaceEngine();
    this.workspaceBasePath = process.env.WORKSPACE_PATH || './workspace-files';
  }

  // Start collaborative app building
  async startAppBuild(
    workspaceId: string,
    projectName: string,
    description: string,
    requirements: string[],
    userId: number,
    ipAddress: string
  ): Promise<BuildTask> {
    const taskId = `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Create project directory
      const projectPath = path.join(this.workspaceBasePath, workspaceId, projectName);
      await fs.mkdir(projectPath, { recursive: true });

      // Assign AI based on requirements
      const assignedAI = this.assignAIForProject(requirements);

      // Create build task
      const task: BuildTask = {
        id: taskId,
        workspaceId,
        projectName,
        description,
        requirements,
        assignedAI,
        status: 'planning',
        currentStep: 'Analyzing requirements',
        files: [],
        buildLog: [],
        startedAt: new Date()
      };

      this.activeTasks.set(taskId, task);

      // Start collaborative building process
      await this.executeCollaborativeBuild(task, userId, ipAddress);

      return task;

    } catch (error) {
      await securityLogger.logEvent({
        eventType: 'build_start_failed',
        userId,
        ipAddress,
        details: { taskId, error: error.message },
        severity: 'high'
      });
      throw error;
    }
  }

  // Execute collaborative building process
  private async executeCollaborativeBuild(
    task: BuildTask,
    userId: number,
    ipAddress: string
  ): Promise<void> {
    try {
      task.status = 'planning';
      
      // Step 1: Architecture Planning (Geppo leads)
      await this.planArchitecture(task, userId, ipAddress);
      
      // Step 2: Core Development (All AI collaborate)
      await this.buildCoreFeatures(task, userId, ipAddress);
      
      // Step 3: Integration & Testing (Claude3 leads quality)
      await this.integrateAndTest(task, userId, ipAddress);
      
      // Step 4: Final Review (Mistral synthesizes)
      await this.finalReview(task, userId, ipAddress);

      task.status = 'completed';
      task.completedAt = new Date();

      await this.logBuildAction(task, 'manus', 'comment', 
        `Build completed successfully. Created ${task.files.length} files.`, true);

    } catch (error) {
      task.status = 'failed';
      await this.logBuildAction(task, 'system', 'error', 
        `Build failed: ${error.message}`, false);
      throw error;
    }
  }

  // Step 1: Architecture Planning
  private async planArchitecture(task: BuildTask, userId: number, ipAddress: string): Promise<void> {
    task.currentStep = 'Planning Architecture';
    
    // Geppo creates project structure
    const architecturePlan = await this.requestAIAction(
      'geppo',
      `Crea la struttura di progetto per: ${task.description}
      
      Requisiti: ${task.requirements.join(', ')}
      
      COMPITO: Genera la struttura completa di file e cartelle per questa applicazione.
      Fornisci SOLO la struttura JSON nel formato:
      {
        "files": [
          {"path": "package.json", "language": "json", "purpose": "dependencies"},
          {"path": "src/index.js", "language": "javascript", "purpose": "main entry"}
        ]
      }`,
      task,
      userId,
      ipAddress
    );

    // Parse architecture plan and create files
    await this.parseAndCreateStructure(task, architecturePlan, 'geppo');
  }

  // Step 2: Core Development
  private async buildCoreFeatures(task: BuildTask, userId: number, ipAddress: string): Promise<void> {
    task.currentStep = 'Building Core Features';
    task.status = 'building';

    // Each AI works on different files based on their specializations
    const fileAssignments = this.assignFilesToAI(task.files, task.assignedAI);

    for (const [aiId, files] of Object.entries(fileAssignments)) {
      for (const file of files) {
        await this.buildFileContent(task, file, aiId, userId, ipAddress);
      }
    }
  }

  // Step 3: Integration & Testing
  private async integrateAndTest(task: BuildTask, userId: number, ipAddress: string): Promise<void> {
    task.currentStep = 'Integration & Testing';

    // Claude3 reviews all files for integration
    const integrationReview = await this.requestAIAction(
      'claude3',
      `Revisiona i file del progetto per integrazione e qualità:
      
      File creati: ${task.files.map(f => f.path).join(', ')}
      
      COMPITO: 
      1. Identifica problemi di integrazione
      2. Suggerisci miglioramenti
      3. Crea test se necessari
      4. Fornisci codice per correzioni`,
      task,
      userId,
      ipAddress
    );

    await this.applyIntegrationFixes(task, integrationReview, 'claude3');
  }

  // Step 4: Final Review
  private async finalReview(task: BuildTask, userId: number, ipAddress: string): Promise<void> {
    task.currentStep = 'Final Review';

    // Mistral provides final synthesis and documentation
    const finalReview = await this.requestAIAction(
      'mistral',
      `Fornisci revisione finale e documentazione per il progetto:
      
      File completati: ${task.files.length}
      Descrizione: ${task.description}
      
      COMPITO:
      1. Crea README.md completo
      2. Aggiungi commenti mancanti
      3. Verifica completezza requisiti
      4. Documenta come eseguire l'app`,
      task,
      userId,
      ipAddress
    );

    await this.createDocumentation(task, finalReview, 'mistral');
  }

  // Request AI action with workspace context
  private async requestAIAction(
    aiId: string,
    prompt: string,
    task: BuildTask,
    userId: number,
    ipAddress: string
  ): Promise<string> {
    const aiRequest = {
      message: prompt,
      personalityId: aiId,
      workspaceContext: {
        taskId: task.id,
        projectName: task.projectName,
        currentFiles: task.files.map(f => ({ path: f.path, language: f.language })),
        buildLog: task.buildLog.slice(-5) // Last 5 entries for context
      }
    };

    const response = await this.aiService.processRequest(aiRequest, userId, ipAddress);
    
    await this.logBuildAction(task, aiId, 'code_generated', 
      `Generated response for: ${prompt.substring(0, 50)}...`, true);

    return response.content;
  }

  // Parse architecture and create file structure
  private async parseAndCreateStructure(
    task: BuildTask,
    architectureResponse: string,
    createdBy: string
  ): Promise<void> {
    try {
      // Extract JSON from AI response
      const jsonMatch = architectureResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON structure found in architecture plan');
      }

      const structure = JSON.parse(jsonMatch[0]);
      
      for (const fileSpec of structure.files) {
        const projectFile: ProjectFile = {
          path: fileSpec.path,
          content: '', // Will be filled later
          language: fileSpec.language,
          createdBy,
          lastModifiedBy: createdBy,
          lastModified: new Date(),
          version: 1
        };

        task.files.push(projectFile);
        
        await this.logBuildAction(task, createdBy, 'file_created', 
          `Created file structure: ${fileSpec.path}`, true);
      }

    } catch (error) {
      await this.logBuildAction(task, createdBy, 'error', 
        `Failed to parse architecture: ${error.message}`, false);
      throw error;
    }
  }

  // Build content for specific file
  private async buildFileContent(
    task: BuildTask,
    file: ProjectFile,
    aiId: string,
    userId: number,
    ipAddress: string
  ): Promise<void> {
    const prompt = `Genera il contenuto completo per il file: ${file.path}

Progetto: ${task.description}
Linguaggio: ${file.language}
Requisiti: ${task.requirements.join(', ')}

COMPITO: Scrivi il codice completo per questo file. Assicurati che:
1. Il codice sia funzionante e completo
2. Includa commenti appropriati  
3. Segua le best practices per ${file.language}
4. Si integri con gli altri file del progetto

Fornisci SOLO il codice, senza spiegazioni aggiuntive.`;

    const content = await this.requestAIAction(aiId, prompt, task, userId, ipAddress);
    
    // Update file content
    file.content = content.trim();
    file.lastModifiedBy = aiId;
    file.lastModified = new Date();
    file.version++;

    // Save file to disk
    await this.saveFileToWorkspace(task, file);

    await this.logBuildAction(task, aiId, 'file_modified', 
      `Generated content for ${file.path} (${content.length} chars)`, true);
  }

  // Apply integration fixes
  private async applyIntegrationFixes(
    task: BuildTask,
    integrationReview: string,
    aiId: string
  ): Promise<void> {
    // Look for code blocks in the review
    const codeBlocks = integrationReview.match(/```[\s\S]*?```/g) || [];
    
    for (const block of codeBlocks) {
      const cleanCode = block.replace(/```\w*\n?/, '').replace(/```$/, '').trim();
      
      // Try to identify which file this code belongs to
      const pathMatch = integrationReview.match(/(?:file|path):\s*([^\s\n]+)/i);
      if (pathMatch) {
        const filePath = pathMatch[1];
        const file = task.files.find(f => f.path === filePath);
        
        if (file) {
          file.content = cleanCode;
          file.lastModifiedBy = aiId;
          file.lastModified = new Date();
          file.version++;
          
          await this.saveFileToWorkspace(task, file);
          
          await this.logBuildAction(task, aiId, 'file_modified', 
            `Applied integration fix to ${filePath}`, true);
        }
      }
    }
  }

  // Create project documentation
  private async createDocumentation(
    task: BuildTask,
    documentation: string,
    aiId: string
  ): Promise<void> {
    const readmeFile: ProjectFile = {
      path: 'README.md',
      content: documentation,
      language: 'markdown',
      createdBy: aiId,
      lastModifiedBy: aiId,
      lastModified: new Date(),
      version: 1
    };

    task.files.push(readmeFile);
    await this.saveFileToWorkspace(task, readmeFile);

    await this.logBuildAction(task, aiId, 'file_created', 
      'Created project documentation (README.md)', true);
  }

  // Save file to workspace directory
  private async saveFileToWorkspace(task: BuildTask, file: ProjectFile): Promise<void> {
    const fullPath = path.join(this.workspaceBasePath, task.workspaceId, task.projectName, file.path);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, file.content, 'utf8');
  }

  // Assign AI based on project requirements
  private assignAIForProject(requirements: string[]): string[] {
    const assigned = new Set<string>();
    
    // Always include Geppo for architecture
    assigned.add('geppo');
    
    // Add Claude3 for user experience and integration
    assigned.add('claude3');
    
    // Add Mistral for research and synthesis
    assigned.add('mistral');
    
    // Add Manus for quality assurance if complex project
    if (requirements.length > 3) {
      assigned.add('manus');
    }

    return Array.from(assigned);
  }

  // Assign files to AI based on their specializations
  private assignFilesToAI(files: ProjectFile[], aiList: string[]): Record<string, ProjectFile[]> {
    const assignments: Record<string, ProjectFile[]> = {};
    
    for (const ai of aiList) {
      assignments[ai] = [];
    }

    for (const file of files) {
      const assignedAI = this.getAIForFile(file, aiList);
      assignments[assignedAI].push(file);
    }

    return assignments;
  }

  // Determine which AI should handle a specific file
  private getAIForFile(file: ProjectFile, aiList: string[]): string {
    const ext = path.extname(file.path);
    const filename = path.basename(file.path);

    // Geppo handles infrastructure and build files
    if (['package.json', 'tsconfig.json', 'webpack.config.js'].includes(filename) ||
        ['.config.js', '.config.ts'].some(suffix => filename.endsWith(suffix))) {
      return 'geppo';
    }

    // Claude3 handles UI and user-facing components
    if (['.tsx', '.jsx', '.vue', '.html', '.css'].includes(ext) ||
        filename.includes('component') || filename.includes('ui')) {
      return 'claude3';
    }

    // Mistral handles business logic and integrations
    if (['.js', '.ts', '.py', '.go'].includes(ext) && 
        (filename.includes('service') || filename.includes('api') || filename.includes('logic'))) {
      return 'mistral';
    }

    // Default to Geppo for unknown files
    return 'geppo';
  }

  // Log build action
  private async logBuildAction(
    task: BuildTask,
    aiId: string,
    action: BuildLogEntry['action'],
    details: string,
    success: boolean,
    filePath?: string
  ): Promise<void> {
    const logEntry: BuildLogEntry = {
      timestamp: new Date(),
      aiId,
      action,
      details,
      filePath,
      success
    };

    task.buildLog.push(logEntry);

    // Keep only last 100 log entries
    if (task.buildLog.length > 100) {
      task.buildLog = task.buildLog.slice(-100);
    }
  }

  // Get task status
  getTaskStatus(taskId: string): BuildTask | null {
    return this.activeTasks.get(taskId) || null;
  }

  // Get project files for download
  async getProjectFiles(taskId: string): Promise<ProjectFile[]> {
    const task = this.activeTasks.get(taskId);
    return task ? task.files : [];
  }

  // Get workspace directory for project
  getProjectPath(workspaceId: string, projectName: string): string {
    return path.join(this.workspaceBasePath, workspaceId, projectName);
  }
}