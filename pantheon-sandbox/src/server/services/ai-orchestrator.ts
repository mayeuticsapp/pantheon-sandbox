import { AIService, AIRequest, AIResponse } from './ai-service';
import { WorkspaceEngine } from './workspace-engine';
import { securityLogger } from '../security/logger';

export interface CollaborativeTask {
  id: string;
  workspaceId: string;
  conversationId: string;
  message: string;
  requiredPersonalities: string[];
  currentStep: number;
  totalSteps: number;
  responses: AIResponse[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
}

export interface QualityMetrics {
  repetitiveness: number; // 0-10 scale
  collaboration: number; // 0-10 scale  
  synthesis: number; // 0-10 scale
  originalityScore: number; // 0-10 scale
  overallQuality: number; // 0-10 scale
}

export class AIOrchestrator {
  private aiService: AIService;
  private workspaceEngine: WorkspaceEngine;
  private activeTasks: Map<string, CollaborativeTask> = new Map();

  constructor() {
    this.aiService = new AIService();
    this.workspaceEngine = new WorkspaceEngine();
  }

  // Orchestrate collaborative AI response based on Manus recommendations
  async orchestrateCollaboration(
    workspaceId: string,
    message: string,
    participants: string[],
    userId: number,
    ipAddress: string
  ): Promise<CollaborativeTask> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Start conversation in workspace
      const conversationId = await this.workspaceEngine.startConversation(
        workspaceId,
        `Collaborazione AI: ${message.substring(0, 50)}...`,
        participants,
        userId,
        ipAddress
      );

      // Create collaborative task
      const task: CollaborativeTask = {
        id: taskId,
        workspaceId,
        conversationId,
        message,
        requiredPersonalities: participants,
        currentStep: 0,
        totalSteps: this.calculateOptimalSteps(participants.length),
        responses: [],
        status: 'pending',
        startedAt: new Date()
      };

      this.activeTasks.set(taskId, task);

      // Store initial user message
      await this.workspaceEngine.storeMessage(
        conversationId,
        'user',
        message,
        { taskId, step: 0 },
        userId
      );

      // Start orchestrated collaboration
      await this.executeCollaborativeSteps(task, userId, ipAddress);

      return task;

    } catch (error) {
      await securityLogger.logEvent({
        eventType: 'orchestration_failed',
        userId,
        ipAddress,
        details: { taskId, error: error.message },
        severity: 'medium'
      });
      throw error;
    }
  }

  // Execute collaborative steps based on Manus recommendations
  private async executeCollaborativeSteps(
    task: CollaborativeTask,
    userId: number,
    ipAddress: string
  ): Promise<void> {
    task.status = 'in_progress';
    
    try {
      // Get workspace context for AI
      const workspaceContext = await this.getWorkspaceContext(task.workspaceId);
      
      // Get conversation history
      const conversationHistory = await this.workspaceEngine.getConversationHistory(
        task.conversationId,
        userId
      );

      // Execute each step based on Manus formula
      for (let step = 1; step <= task.totalSteps; step++) {
        task.currentStep = step;
        
        const personalityIndex = (step - 1) % task.requiredPersonalities.length;
        const personalityId = task.requiredPersonalities[personalityIndex];
        
        // Build context-aware prompt based on step
        const enhancedMessage = this.buildStepSpecificPrompt(
          task.message,
          step,
          task.totalSteps,
          task.responses,
          personalityId
        );

        // Execute AI request
        const aiRequest: AIRequest = {
          message: enhancedMessage,
          personalityId,
          workspaceContext,
          conversationHistory: conversationHistory.slice(-10), // Last 10 messages for context
          tools: await this.getPersonalityTools(personalityId)
        };

        const response = await this.aiService.processRequest(aiRequest, userId, ipAddress);
        task.responses.push(response);

        // Store AI response in workspace
        await this.workspaceEngine.storeMessage(
          task.conversationId,
          personalityId,
          response.content,
          {
            taskId: task.id,
            step,
            tokensUsed: response.tokensUsed,
            processingTime: response.processingTime,
            provider: response.provider,
            model: response.model
          },
          userId
        );

        // Quality check after each response
        if (step > 1) {
          const qualityMetrics = await this.assessResponseQuality(task, step);
          await this.logQualityMetrics(task.id, step, qualityMetrics);
          
          // Intervention if quality drops below threshold
          if (qualityMetrics.overallQuality < 6) {
            await this.interventeForQuality(task, step, qualityMetrics, userId, ipAddress);
          }
        }

        // Add delay between responses to prevent overlaps
        if (step < task.totalSteps) {
          await this.delay(2000); // 2 second delay
        }
      }

      // Final synthesis step if multiple AIs participated
      if (task.requiredPersonalities.length > 1) {
        await this.executeFinalSynthesis(task, userId, ipAddress);
      }

      task.status = 'completed';
      task.completedAt = new Date();

      // Generate final quality report
      const finalQuality = await this.generateFinalQualityReport(task);
      await this.logTaskCompletion(task, finalQuality);

    } catch (error) {
      task.status = 'failed';
      await securityLogger.logEvent({
        eventType: 'collaborative_task_failed',
        userId,
        ipAddress,
        details: { taskId: task.id, step: task.currentStep, error: error.message },
        severity: 'high'
      });
      throw error;
    }
  }

  // Build step-specific prompts following Manus recommendations
  private buildStepSpecificPrompt(
    originalMessage: string,
    step: number,
    totalSteps: number,
    previousResponses: AIResponse[],
    currentPersonalityId: string
  ): string {
    let prompt = originalMessage;

    if (step === 1) {
      // First step: Direct response
      prompt = `${originalMessage}\n\nIMPORTANTE: Fornisci la tua prospettiva specifica e unica su questa richiesta.`;
    } 
    else if (step === totalSteps && totalSteps > 1) {
      // Final step: Mandatory synthesis (Manus recommendation)
      prompt = `SINTESI OBBLIGATORIA: Analizza le risposte precedenti e crea UNA soluzione finale integrata.\n\n`;
      prompt += `Richiesta originale: ${originalMessage}\n\n`;
      prompt += `Risposte precedenti da integrare:\n`;
      
      previousResponses.forEach((response, index) => {
        prompt += `${index + 1}. ${response.content.substring(0, 200)}...\n\n`;
      });
      
      prompt += `COMPITO: Sintetizza i migliori contributi in una soluzione pratica e implementabile. Risolvi eventuali contraddizioni.`;
    }
    else {
      // Intermediate steps: Force direct engagement (Manus anti-repetitiveness formula)
      prompt = `CONFRONTO DIRETTO OBBLIGATORIO: Leggi attentamente le risposte precedenti.\n\n`;
      prompt += `Richiesta: ${originalMessage}\n\n`;
      prompt += `Risposte precedenti:\n`;
      
      previousResponses.forEach((response, index) => {
        prompt += `Risposta ${index + 1}: ${response.content.substring(0, 150)}...\n\n`;
      });
      
      prompt += `COMPITO: CONFRONTATI specificamente con le risposte precedenti. Usa formule come:`;
      prompt += `\n- "Sono d'accordo con [AI] su [punto], ma aggiungo [tuo contributo unico]"`;
      prompt += `\n- "Diversamente da [AI], io propongo [alternativa]"`;
      prompt += `\n- "[AI] ha ragione su [punto], tuttavia trascura [aspetto importante]"`;
      prompt += `\n\nSVILUPPA o CRITICA costruttivamente le idee precedenti. NON ripetere concetti già espressi.`;
    }

    return prompt;
  }

  // Calculate optimal steps based on participants (following Manus timeline)
  private calculateOptimalSteps(participantCount: number): number {
    if (participantCount === 1) return 1;
    if (participantCount === 2) return 3; // Initial, counter, synthesis
    if (participantCount === 3) return 5; // Each AI + synthesis rounds
    return Math.min(participantCount * 2 - 1, 7); // Max 7 steps as per Manus
  }

  // Execute final synthesis step
  private async executeFinalSynthesis(
    task: CollaborativeTask,
    userId: number,
    ipAddress: string
  ): Promise<void> {
    // Use Manus for final synthesis as it's the QA specialist
    const synthesisPersonality = task.requiredPersonalities.includes('manus') ? 'manus' : task.requiredPersonalities[0];
    
    const synthesisPrompt = this.buildFinalSynthesisPrompt(task);
    
    const aiRequest: AIRequest = {
      message: synthesisPrompt,
      personalityId: synthesisPersonality,
      workspaceContext: await this.getWorkspaceContext(task.workspaceId),
      conversationHistory: await this.workspaceEngine.getConversationHistory(task.conversationId, userId),
      tools: ['synthesis_engine', 'quality_analyzer']
    };

    const synthesisResponse = await this.aiService.processRequest(aiRequest, userId, ipAddress);
    task.responses.push(synthesisResponse);

    await this.workspaceEngine.storeMessage(
      task.conversationId,
      synthesisPersonality,
      synthesisResponse.content,
      {
        taskId: task.id,
        step: 'final_synthesis',
        tokensUsed: synthesisResponse.tokensUsed,
        processingTime: synthesisResponse.processingTime,
        isSynthesis: true
      },
      userId
    );
  }

  // Build final synthesis prompt
  private buildFinalSynthesisPrompt(task: CollaborativeTask): string {
    let prompt = `SINTESI FINALE COLLABORATIVA\n\n`;
    prompt += `Richiesta originale: ${task.message}\n\n`;
    prompt += `Analizza e sintetizza tutte le risposte del team AI:\n\n`;

    task.responses.forEach((response, index) => {
      const stepType = index === 0 ? 'Risposta iniziale' : 
                     index === task.responses.length - 1 ? 'Ultima risposta' : 
                     `Sviluppo ${index}`;
      
      prompt += `${stepType}: ${response.content}\n\n`;
    });

    prompt += `COMPITO FINALE:\n`;
    prompt += `1. Identifica i contributi migliori di ogni AI\n`;
    prompt += `2. Risolvi eventuali contraddizioni o conflitti\n`;
    prompt += `3. Crea UNA soluzione finale integrata e implementabile\n`;
    prompt += `4. Fornisci step operativi concreti\n\n`;
    prompt += `La tua sintesi deve essere il risultato della vera collaborazione tra le AI, non una semplice ripetizione.`;

    return prompt;
  }

  // Assess response quality based on Manus metrics
  private async assessResponseQuality(task: CollaborativeTask, step: number): Promise<QualityMetrics> {
    const currentResponse = task.responses[step - 1];
    const previousResponses = task.responses.slice(0, step - 1);

    // Calculate repetitiveness (0 = very repetitive, 10 = highly original)
    const repetitiveness = this.calculateRepetitiveness(currentResponse, previousResponses);
    
    // Calculate collaboration score (0 = no references, 10 = excellent engagement)
    const collaboration = this.calculateCollaborationScore(currentResponse, previousResponses);
    
    // Calculate synthesis capability (relevant for later steps)
    const synthesis = step > 2 ? this.calculateSynthesisScore(currentResponse, previousResponses) : 5;
    
    // Calculate originality
    const originalityScore = this.calculateOriginalityScore(currentResponse, task.message);
    
    // Overall quality weighted average (Manus formula)
    const overallQuality = Math.round(
      (repetitiveness * 0.3) + 
      (collaboration * 0.3) + 
      (synthesis * 0.2) + 
      (originalityScore * 0.2)
    );

    return {
      repetitiveness,
      collaboration,
      synthesis,
      originalityScore,
      overallQuality
    };
  }

  // Calculate repetitiveness score
  private calculateRepetitiveness(current: AIResponse, previous: AIResponse[]): number {
    if (previous.length === 0) return 10; // First response is always original

    let similarityScore = 0;
    const currentWords = current.content.toLowerCase().split(/\s+/);
    
    for (const prev of previous) {
      const prevWords = prev.content.toLowerCase().split(/\s+/);
      const commonWords = currentWords.filter(word => 
        prevWords.includes(word) && word.length > 3
      );
      similarityScore += commonWords.length / currentWords.length;
    }

    const avgSimilarity = similarityScore / previous.length;
    return Math.max(0, Math.round((1 - avgSimilarity) * 10));
  }

  // Calculate collaboration score
  private calculateCollaborationScore(current: AIResponse, previous: AIResponse[]): number {
    if (previous.length === 0) return 5; // Neutral for first response

    const content = current.content.toLowerCase();
    
    // Look for collaboration indicators (Manus formulas)
    const collaborationKeywords = [
      'sono d\'accordo', 'concordo', 'diversamente da', 'tuttavia', 'però',
      'aggiungo', 'sviluppo', 'critico', 'propongo', 'alternativa',
      'sintetizzo', 'integro', 'dalla visione', 'precedente', 'risposta'
    ];

    let collaborationScore = 0;
    for (const keyword of collaborationKeywords) {
      if (content.includes(keyword)) {
        collaborationScore += 1;
      }
    }

    return Math.min(10, Math.round(collaborationScore * 2));
  }

  // Calculate synthesis score
  private calculateSynthesisScore(current: AIResponse, previous: AIResponse[]): number {
    const content = current.content.toLowerCase();
    
    const synthesisKeywords = [
      'sintesi', 'integro', 'combino', 'unisco', 'conclusione',
      'sommario', 'riassunto', 'finale', 'soluzione', 'implementabile'
    ];

    let synthesisScore = 0;
    for (const keyword of synthesisKeywords) {
      if (content.includes(keyword)) {
        synthesisScore += 2;
      }
    }

    // Check if response references multiple previous responses
    if (previous.length > 1) {
      const references = previous.filter(prev => 
        content.includes(prev.content.substring(0, 20).toLowerCase())
      ).length;
      synthesisScore += references * 2;
    }

    return Math.min(10, synthesisScore);
  }

  // Calculate originality score
  private calculateOriginalityScore(response: AIResponse, originalMessage: string): number {
    // Simple heuristic: longer, more detailed responses tend to be more original
    const lengthScore = Math.min(5, response.content.length / 200);
    
    // Check for specific examples, numbers, concrete suggestions
    const concreteIndicators = response.content.match(/\d+|esempio|specifica|implementa|step|fase/gi) || [];
    const concreteScore = Math.min(5, concreteIndicators.length);
    
    return Math.round(lengthScore + concreteScore);
  }

  // Get personality-specific tools
  private async getPersonalityTools(personalityId: string): Promise<string[]> {
    const toolMapping = {
      'claude3': ['emotional_analyzer', 'presence_monitor', 'empathy_facilitator'],
      'geppo': ['code_analyzer', 'architecture_designer', 'performance_optimizer'],
      'mistral': ['research_tool', 'synthesis_engine', 'cultural_bridge'],
      'manus': ['quality_analyzer', 'performance_monitor', 'meta_optimizer']
    };

    return toolMapping[personalityId] || [];
  }

  // Get workspace context
  private async getWorkspaceContext(workspaceId: string): Promise<any> {
    // Implementation depends on workspace engine
    return {
      workspaceId,
      timestamp: new Date().toISOString(),
      collaborationMode: 'enhanced'
    };
  }

  // Intervene for quality improvement
  private async interventeForQuality(
    task: CollaborativeTask,
    step: number,
    metrics: QualityMetrics,
    userId: number,
    ipAddress: string
  ): Promise<void> {
    await securityLogger.logEvent({
      eventType: 'quality_intervention',
      userId,
      ipAddress,
      details: { 
        taskId: task.id, 
        step, 
        qualityScore: metrics.overallQuality,
        issues: {
          repetitiveness: metrics.repetitiveness < 5,
          collaboration: metrics.collaboration < 5,
          synthesis: metrics.synthesis < 5
        }
      },
      severity: 'medium'
    });
  }

  // Log quality metrics
  private async logQualityMetrics(taskId: string, step: number, metrics: QualityMetrics): Promise<void> {
    await securityLogger.logEvent({
      eventType: 'quality_assessment',
      details: { taskId, step, metrics },
      severity: 'low'
    });
  }

  // Log task completion
  private async logTaskCompletion(task: CollaborativeTask, finalQuality: QualityMetrics): Promise<void> {
    const duration = task.completedAt!.getTime() - task.startedAt.getTime();
    
    await securityLogger.logEvent({
      eventType: 'collaborative_task_completed',
      details: {
        taskId: task.id,
        participants: task.requiredPersonalities,
        steps: task.totalSteps,
        duration,
        finalQuality,
        totalTokens: task.responses.reduce((sum, r) => sum + r.tokensUsed, 0)
      },
      severity: 'low'
    });
  }

  // Generate final quality report
  private async generateFinalQualityReport(task: CollaborativeTask): Promise<QualityMetrics> {
    // Calculate overall quality metrics for the entire task
    const allMetrics = [];
    
    for (let i = 1; i < task.responses.length; i++) {
      const stepMetrics = await this.assessResponseQuality(task, i + 1);
      allMetrics.push(stepMetrics);
    }

    if (allMetrics.length === 0) {
      return {
        repetitiveness: 8,
        collaboration: 7,
        synthesis: 6,
        originalityScore: 7,
        overallQuality: 7
      };
    }

    // Average all metrics
    const avgMetrics = allMetrics.reduce((acc, curr) => ({
      repetitiveness: acc.repetitiveness + curr.repetitiveness,
      collaboration: acc.collaboration + curr.collaboration,
      synthesis: acc.synthesis + curr.synthesis,
      originalityScore: acc.originalityScore + curr.originalityScore,
      overallQuality: acc.overallQuality + curr.overallQuality
    }));

    const count = allMetrics.length;
    return {
      repetitiveness: Math.round(avgMetrics.repetitiveness / count),
      collaboration: Math.round(avgMetrics.collaboration / count),
      synthesis: Math.round(avgMetrics.synthesis / count),
      originalityScore: Math.round(avgMetrics.originalityScore / count),
      overallQuality: Math.round(avgMetrics.overallQuality / count)
    };
  }

  // Get active task status
  getTaskStatus(taskId: string): CollaborativeTask | null {
    return this.activeTasks.get(taskId) || null;
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}