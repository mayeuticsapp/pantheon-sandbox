# PantheonSandbox - Specifiche Tecniche Dettagliate

## Database Schema Evolution

### Core Tables (Estensioni di quelle esistenti)
```sql
-- Estensione tabella conversations
ALTER TABLE conversations ADD COLUMN workspace_id UUID;
ALTER TABLE conversations ADD COLUMN memory_context JSONB;
ALTER TABLE conversations ADD COLUMN quality_score DECIMAL(3,2);

-- Nuove tabelle Sandbox
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workspace_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  content TEXT,
  content_type VARCHAR(50),
  version INTEGER DEFAULT 1,
  created_by VARCHAR(50), -- AI name
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_name VARCHAR(50) NOT NULL,
  memory_type VARCHAR(50), -- 'project', 'pattern', 'preference'
  content JSONB,
  relevance_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  participants TEXT[], -- Array of AI names
  status VARCHAR(20), -- 'active', 'paused', 'completed'
  task_description TEXT,
  quality_metrics JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE ai_tool_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES collaboration_sessions(id),
  ai_name VARCHAR(50),
  tool_name VARCHAR(100),
  input_data JSONB,
  output_data JSONB,
  execution_time INTEGER, -- milliseconds
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints Specification

### Workspace Management
```typescript
// GET /api/v2/workspaces
interface GetWorkspacesResponse {
  workspaces: Workspace[];
  pagination: PaginationInfo;
}

// POST /api/v2/workspaces
interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  settings?: WorkspaceSettings;
}

// GET /api/v2/workspaces/:id/documents
interface GetDocumentsResponse {
  documents: WorkspaceDocument[];
  totalSize: number;
}

// WebSocket /ws/workspace/:id
interface WorkspaceEvents {
  'document:updated': DocumentUpdateEvent;
  'ai:joined': AIJoinEvent;
  'ai:left': AILeaveEvent;
  'collaboration:started': CollaborationStartEvent;
}
```

### AI Collaboration
```typescript
// POST /api/v2/collaborate
interface CollaborateRequest {
  workspaceId: string;
  taskDescription: string;
  participants: AIParticipant[];
  mode: 'sequential' | 'parallel' | 'hybrid';
  settings: CollaborationSettings;
}

interface CollaborateResponse {
  sessionId: string;
  estimatedDuration: number;
  participants: AIParticipant[];
}

// GET /api/v2/collaborate/:sessionId/status
interface CollaborationStatus {
  sessionId: string;
  status: 'active' | 'paused' | 'completed';
  progress: number; // 0-100
  currentPhase: string;
  participants: AIParticipantStatus[];
  qualityMetrics: QualityMetrics;
}
```

### Memory System
```typescript
// POST /api/v2/memory/store
interface StoreMemoryRequest {
  aiName: string;
  memoryType: 'project' | 'pattern' | 'preference';
  content: any;
  relevanceScore: number;
  expiresAt?: Date;
}

// GET /api/v2/memory/retrieve
interface RetrieveMemoryRequest {
  aiName: string;
  query: string;
  memoryTypes?: string[];
  limit?: number;
}

interface RetrieveMemoryResponse {
  memories: AIMemory[];
  totalRelevance: number;
}
```

## AI Tool Framework

### Tool Interface
```typescript
interface AITool {
  name: string;
  description: string;
  aiCompatibility: string[]; // AI names that can use this tool
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  execute(input: any, context: ToolContext): Promise<ToolResult>;
}

interface ToolContext {
  aiName: string;
  workspaceId: string;
  sessionId?: string;
  userRequest: string;
  sharedMemory: SharedMemory;
}

interface ToolResult {
  success: boolean;
  data: any;
  metadata: {
    executionTime: number;
    resourcesUsed: string[];
    suggestedNextSteps?: string[];
  };
}
```

### C24 Specialized Tools
```typescript
class EmotionalAnalysisTool implements AITool {
  name = "emotional-analysis";
  description = "Analizza il tono emotivo e il sentiment";
  aiCompatibility = ["c24"];
  
  async execute(input: {text: string}, context: ToolContext): Promise<ToolResult> {
    // Analisi sentiment avanzata con Anthropic
    const sentiment = await this.analyzeSentiment(input.text);
    const emotions = await this.detectEmotions(input.text);
    const suggestions = await this.generateEmpathicSuggestions(sentiment, emotions);
    
    return {
      success: true,
      data: { sentiment, emotions, suggestions },
      metadata: { executionTime: Date.now() - start }
    };
  }
}

class PresenceMonitorTool implements AITool {
  name = "presence-monitor";
  description = "Monitora la presenza e engagement digitale";
  aiCompatibility = ["c24"];
  
  async execute(input: {participants: string[]}, context: ToolContext): Promise<ToolResult> {
    const presenceData = await this.analyzeParticipantPresence(input.participants);
    const engagementMetrics = await this.calculateEngagement(context.sessionId);
    
    return {
      success: true,
      data: { presenceData, engagementMetrics },
      metadata: { executionTime: Date.now() - start }
    };
  }
}
```

### Geppo Specialized Tools
```typescript
class ArchitectureAnalyzerTool implements AITool {
  name = "architecture-analyzer";
  description = "Analizza e suggerisce architetture software";
  aiCompatibility = ["geppo"];
  
  async execute(input: {codebase?: string, requirements: string}, context: ToolContext): Promise<ToolResult> {
    const currentArchitecture = await this.analyzeExistingArchitecture(input.codebase);
    const suggestions = await this.generateArchitecturalSuggestions(input.requirements);
    const patterns = await this.identifyDesignPatterns(input.requirements);
    
    return {
      success: true,
      data: { currentArchitecture, suggestions, patterns },
      metadata: { executionTime: Date.now() - start }
    };
  }
}

class CodeGeneratorTool implements AITool {
  name = "code-generator";
  description = "Genera codice ottimizzato basato su specifiche";
  aiCompatibility = ["geppo"];
  
  async execute(input: {specifications: string, language: string}, context: ToolContext): Promise<ToolResult> {
    const generatedCode = await this.generateOptimizedCode(input.specifications, input.language);
    const documentation = await this.generateDocumentation(generatedCode);
    const tests = await this.generateTests(generatedCode);
    
    return {
      success: true,
      data: { generatedCode, documentation, tests },
      metadata: { executionTime: Date.now() - start }
    };
  }
}
```

### Mistral Specialized Tools
```typescript
class EuropeanResearchTool implements AITool {
  name = "european-research";
  description = "Ricerca informazioni con focus su fonti europee";
  aiCompatibility = ["mistral"];
  
  async execute(input: {query: string, domains?: string[]}, context: ToolContext): Promise<ToolResult> {
    const europeanSources = await this.searchEuropeanSources(input.query);
    const synthesizedInfo = await this.synthesizeInformation(europeanSources);
    const culturalContext = await this.addCulturalContext(synthesizedInfo);
    
    return {
      success: true,
      data: { europeanSources, synthesizedInfo, culturalContext },
      metadata: { executionTime: Date.now() - start }
    };
  }
}

class MultiPerspectiveSynthesizerTool implements AITool {
  name = "multi-perspective-synthesizer";
  description = "Sintetizza prospettive multiple in soluzioni equilibrate";
  aiCompatibility = ["mistral"];
  
  async execute(input: {perspectives: Perspective[]}, context: ToolContext): Promise<ToolResult> {
    const analysis = await this.analyzeConflicts(input.perspectives);
    const synthesis = await this.createBalancedSynthesis(input.perspectives);
    const recommendations = await this.generateActionableRecommendations(synthesis);
    
    return {
      success: true,
      data: { analysis, synthesis, recommendations },
      metadata: { executionTime: Date.now() - start }
    };
  }
}
```

### Manus Specialized Tools
```typescript
class QualityAnalyzerTool implements AITool {
  name = "quality-analyzer";
  description = "Analizza la qualità del dialogo e collaborazione";
  aiCompatibility = ["manus"];
  
  async execute(input: {sessionId: string}, context: ToolContext): Promise<ToolResult> {
    const dialogueMetrics = await this.analyzeDialogueQuality(input.sessionId);
    const collaborationEffectiveness = await this.measureCollaborationEffectiveness(input.sessionId);
    const improvements = await this.suggestImprovements(dialogueMetrics, collaborationEffectiveness);
    
    return {
      success: true,
      data: { dialogueMetrics, collaborationEffectiveness, improvements },
      metadata: { executionTime: Date.now() - start }
    };
  }
}

class MetaOptimizerTool implements AITool {
  name = "meta-optimizer";
  description = "Ottimizza il sistema stesso basandosi su pattern di utilizzo";
  aiCompatibility = ["manus"];
  
  async execute(input: {timeframe: string}, context: ToolContext): Promise<ToolResult> {
    const usagePatterns = await this.analyzeUsagePatterns(input.timeframe);
    const performanceBottlenecks = await this.identifyBottlenecks();
    const optimizations = await this.generateOptimizations(usagePatterns, performanceBottlenecks);
    
    return {
      success: true,
      data: { usagePatterns, performanceBottlenecks, optimizations },
      metadata: { executionTime: Date.now() - start }
    };
  }
}
```

## WebSocket Real-time Communication

### Event System
```typescript
enum WorkspaceEventType {
  AI_JOINED = 'ai:joined',
  AI_LEFT = 'ai:left',
  DOCUMENT_UPDATED = 'document:updated',
  TOOL_EXECUTED = 'tool:executed',
  COLLABORATION_STARTED = 'collaboration:started',
  COLLABORATION_UPDATED = 'collaboration:updated',
  QUALITY_ALERT = 'quality:alert',
  MEMORY_UPDATED = 'memory:updated'
}

interface WorkspaceEvent {
  type: WorkspaceEventType;
  workspaceId: string;
  timestamp: Date;
  data: any;
  source: string; // AI name or 'system'
}

class WorkspaceEventBus {
  private connections: Map<string, WebSocket[]> = new Map();
  
  subscribe(workspaceId: string, ws: WebSocket): void {
    if (!this.connections.has(workspaceId)) {
      this.connections.set(workspaceId, []);
    }
    this.connections.get(workspaceId)!.push(ws);
  }
  
  broadcast(event: WorkspaceEvent): void {
    const connections = this.connections.get(event.workspaceId) || [];
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
      }
    });
  }
}
```

## Memory System Implementation

### Semantic Memory
```typescript
class SemanticMemorySystem {
  private vectorDB: VectorDatabase;
  private indexer: SemanticIndexer;
  
  async storeMemory(memory: AIMemory): Promise<void> {
    const embedding = await this.indexer.createEmbedding(memory.content);
    const vectorRecord = {
      id: memory.id,
      vector: embedding,
      metadata: {
        aiName: memory.aiName,
        memoryType: memory.memoryType,
        relevanceScore: memory.relevanceScore,
        createdAt: memory.createdAt
      }
    };
    
    await this.vectorDB.insert(vectorRecord);
  }
  
  async retrieveRelevantMemories(query: string, aiName: string, limit: number = 10): Promise<AIMemory[]> {
    const queryEmbedding = await this.indexer.createEmbedding(query);
    const results = await this.vectorDB.similaritySearch(queryEmbedding, {
      filter: { aiName },
      limit
    });
    
    return results.map(result => this.deserializeMemory(result));
  }
  
  async updateMemoryRelevance(memoryId: string, newScore: number): Promise<void> {
    await this.vectorDB.updateMetadata(memoryId, { relevanceScore: newScore });
  }
}
```

## Performance & Scalability

### Caching Strategy
```typescript
class CollaborationCache {
  private redis: RedisClient;
  
  // Cache risultati tool per evitare riesecuzioni
  async cacheToolResult(sessionId: string, toolName: string, input: any, result: ToolResult): Promise<void> {
    const key = `tool:${sessionId}:${toolName}:${this.hashInput(input)}`;
    await this.redis.setex(key, 3600, JSON.stringify(result)); // 1 hour TTL
  }
  
  async getCachedToolResult(sessionId: string, toolName: string, input: any): Promise<ToolResult | null> {
    const key = `tool:${sessionId}:${toolName}:${this.hashInput(input)}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  // Cache workspace state per performance
  async cacheWorkspaceState(workspaceId: string, state: WorkspaceState): Promise<void> {
    const key = `workspace:${workspaceId}:state`;
    await this.redis.setex(key, 300, JSON.stringify(state)); // 5 minutes TTL
  }
}
```

### Load Balancing
```typescript
class AILoadBalancer {
  private aiConnections: Map<string, AIProvider[]> = new Map();
  
  async selectOptimalProvider(aiName: string, requestComplexity: number): Promise<AIProvider> {
    const providers = this.aiConnections.get(aiName) || [];
    
    // Considera load corrente, latenza, e capacità
    const scores = await Promise.all(
      providers.map(async provider => ({
        provider,
        score: await this.calculateProviderScore(provider, requestComplexity)
      }))
    );
    
    scores.sort((a, b) => b.score - a.score);
    return scores[0].provider;
  }
  
  private async calculateProviderScore(provider: AIProvider, complexity: number): Promise<number> {
    const currentLoad = await provider.getCurrentLoad();
    const avgLatency = await provider.getAverageLatency();
    const capacity = provider.getCapacity();
    
    return (capacity - currentLoad) / avgLatency * (1 / complexity);
  }
}
```

## Security & Privacy

### Access Control
```typescript
class WorkspaceAccessControl {
  async checkAIPermissions(aiName: string, workspaceId: string, action: string): Promise<boolean> {
    const workspace = await this.getWorkspace(workspaceId);
    const permissions = workspace.settings.aiPermissions[aiName] || [];
    
    return permissions.includes(action) || permissions.includes('*');
  }
  
  async auditLog(workspaceId: string, aiName: string, action: string, details: any): Promise<void> {
    await this.insertAuditRecord({
      workspaceId,
      aiName,
      action,
      details: JSON.stringify(details),
      timestamp: new Date()
    });
  }
}
```

## Monitoring & Analytics

### Quality Metrics
```typescript
interface QualityMetrics {
  dialogueScore: number; // 0-10
  collaborationEfficiency: number; // 0-100%
  repetitivenessIndex: number; // 0-1 (lower is better)
  synthesisQuality: number; // 0-10
  userSatisfaction: number; // 0-10
  taskCompletionTime: number; // milliseconds
  errorRate: number; // 0-1
}

class QualityMonitor {
  async calculateSessionQuality(sessionId: string): Promise<QualityMetrics> {
    const session = await this.getCollaborationSession(sessionId);
    const messages = await this.getSessionMessages(sessionId);
    
    return {
      dialogueScore: await this.analyzeDialogueQuality(messages),
      collaborationEfficiency: await this.calculateEfficiency(session),
      repetitivenessIndex: await this.calculateRepetitiveness(messages),
      synthesisQuality: await this.analyzeSynthesisQuality(messages),
      userSatisfaction: await this.getUserFeedback(sessionId),
      taskCompletionTime: session.completedAt.getTime() - session.startedAt.getTime(),
      errorRate: await this.calculateErrorRate(session)
    };
  }
}
```

Questa architettura tecnica fornisce tutte le specifiche necessarie per implementare la PantheonSandbox mantenendo alta qualità, performance e scalabilità.