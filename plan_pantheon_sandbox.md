# Plan Pantheon Sandbox - Architettura Completa

## 📋 PANORAMICA GENERALE

**Obiettivo**: Creare una sandbox sicura e scalabile dove le AI autentiche del Pantheon possano generare, modificare ed eseguire codice in tempo reale, trasformando la piattaforma chat da consultiva a operativa.

**Nome Progetto**: Pantheon Sandbox
**Versione**: 1.0 Production-Ready
**Tempo Stimato**: 15-18 ore di sviluppo

---

## 🏗️ ARCHITETTURA DEL SISTEMA

### 1. STRUTTURA BACKEND

```
server/sandbox/
├── core/
│   ├── sandbox-engine.ts      // Motore principale sandbox
│   ├── container-pool.ts      // Gestione pool container
│   ├── workspace-manager.ts   // Organizzazione progetti
│   └── execution-engine.ts    // Esecuzione codice sicura
├── security/
│   ├── security-layer.ts      // Validazione e isolamento
│   ├── input-sanitizer.ts     // Sanitizzazione input
│   ├── seccomp-profiles.ts    // Profili seccomp
│   └── apparmor-policies.ts   // Policy AppArmor
├── monitoring/
│   ├── metrics-collector.ts   // Raccolta metriche
│   ├── alert-system.ts        // Sistema di allerta
│   ├── logger.ts              // Logging strutturato
│   └── anomaly-detector.ts    // Rilevamento anomalie
├── api/
│   ├── sandbox-routes.ts      // Endpoint API sandbox
│   ├── project-routes.ts      // Gestione progetti
│   └── execution-routes.ts    // Esecuzione codice
└── utils/
    ├── file-manager.ts        // Operazioni file system
    ├── rate-limiter.ts        // Limitazione rate
    └── cleanup-scheduler.ts   // Pulizia automatica
```

### 2. DATABASE SCHEMA

```sql
-- Progetti sandbox
CREATE TABLE sandbox_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER,
    created_by_ai VARCHAR(50),
    template_type VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    container_id VARCHAR(255),
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- File di progetto
CREATE TABLE sandbox_files (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES sandbox_projects(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    content TEXT,
    file_type VARCHAR(50),
    size_bytes INTEGER DEFAULT 0,
    created_by_ai VARCHAR(50),
    is_entry_point BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Esecuzioni e risultati
CREATE TABLE sandbox_executions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES sandbox_projects(id) ON DELETE CASCADE,
    executed_code TEXT,
    execution_type VARCHAR(50), -- 'run', 'test', 'build'
    output TEXT,
    error_output TEXT,
    exit_code INTEGER,
    execution_time_ms INTEGER,
    memory_used_mb FLOAT,
    cpu_usage_percent FLOAT,
    status VARCHAR(20), -- 'success', 'error', 'timeout'
    executed_by_ai VARCHAR(50),
    executed_at TIMESTAMP DEFAULT NOW()
);

-- Metriche di utilizzo
CREATE TABLE sandbox_metrics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES sandbox_projects(id) ON DELETE CASCADE,
    metric_type VARCHAR(50), -- 'cpu', 'memory', 'disk', 'network'
    value FLOAT,
    unit VARCHAR(20),
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_sandbox_projects_user ON sandbox_projects(user_id);
CREATE INDEX idx_sandbox_files_project ON sandbox_files(project_id);
CREATE INDEX idx_sandbox_executions_project ON sandbox_executions(project_id);
CREATE INDEX idx_sandbox_metrics_project_time ON sandbox_metrics(project_id, timestamp);
```

---

## 🔒 SICUREZZA AVANZATA

### 1. Container Security

```yaml
# Docker Security Configuration
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
    add: ["NET_BIND_SERVICE"]

# Resource Limits
resources:
  limits:
    cpu: "1"
    memory: "512Mi"
    ephemeral-storage: "100Mi"
  requests:
    cpu: "100m"
    memory: "128Mi"
```

### 2. Seccomp Profile

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["read", "write", "open", "close", "stat", "execve"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

### 3. Input Sanitization

```typescript
// Whitelist comandi e funzioni
const ALLOWED_IMPORTS = [
  'lodash', 'moment', 'axios', 'react', 'vue'
];

const BLOCKED_PATTERNS = [
  /require\(['"][^'"]*fs['"].*\)/g,
  /process\.exit/g,
  /eval\(/g,
  /Function\(/g,
  /import.*['"]fs['"].*/g
];

const BLOCKED_SYSCALLS = [
  'network', 'filesystem', 'process_control'
];
```

---

## 📊 MONITORING & OBSERVABILITY

### 1. Metriche Real-time

```typescript
interface SandboxMetrics {
  cpu_usage: number;           // Percentuale CPU
  memory_usage: number;        // MB utilizzati
  disk_usage: number;          // MB su disco
  network_io: number;          // Bytes trasferiti
  execution_count: number;     // Esecuzioni per minuto
  error_rate: number;          // Percentuale errori
  response_time: number;       // Tempo medio risposta
}
```

### 2. Alert System

```typescript
const ALERT_THRESHOLDS = {
  cpu_usage: 80,              // % CPU
  memory_usage: 400,          // MB
  error_rate: 10,             // % errori
  execution_timeout: 30,      // secondi
  concurrent_sandboxes: 50    // numero massimo
};
```

### 3. Logging Strutturato

```typescript
interface SandboxLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  sandbox_id: string;
  user_id: string;
  ai_personality: string;
  action: string;
  execution_time: number;
  resource_usage: SandboxMetrics;
  error?: string;
}
```

---

## 🚀 SCALABILITÀ & PERFORMANCE

### 1. Container Pooling

```typescript
class ContainerPool {
  private warmPool: Container[] = [];
  private activeContainers = new Map<string, Container>();
  
  // Pre-warm 10 container
  private readonly POOL_SIZE = 10;
  private readonly MAX_IDLE_TIME = 5 * 60 * 1000; // 5 minuti
  
  async getContainer(): Promise<Container> {
    return this.warmPool.pop() || await this.createNewContainer();
  }
  
  async releaseContainer(container: Container): Promise<void> {
    await this.cleanupContainer(container);
    this.warmPool.push(container);
  }
}
```

### 2. Rate Limiting

```typescript
const RATE_LIMITS = {
  sandbox_creation: {
    per_user: 5,                // 5 sandbox per utente
    per_minute: 20,             // 20 sandbox totali per minuto
    per_hour: 100               // 100 sandbox totali per ora
  },
  code_execution: {
    per_sandbox: 10,            // 10 esecuzioni per sandbox per minuto
    per_user: 50                // 50 esecuzioni per utente per minuto
  }
};
```

### 3. Auto-cleanup

```typescript
// Cleanup automatico ogni 5 minuti
setInterval(async () => {
  await cleanupInactiveSandboxes();
  await cleanupExpiredFiles();
  await optimizeContainerPool();
}, 5 * 60 * 1000);
```

---

## 🤖 INTEGRAZIONE AI

### 1. Nuovi Endpoint API

```typescript
// Creazione progetto
POST /api/sandbox/projects
{
  "name": "React Todo App",
  "description": "Simple todo application",
  "template": "react-typescript",
  "ai_personality": "geppo"
}

// Creazione file
POST /api/sandbox/projects/:id/files
{
  "path": "src/App.tsx",
  "content": "import React from 'react'...",
  "is_entry_point": true
}

// Esecuzione codice
POST /api/sandbox/projects/:id/execute
{
  "command": "npm start",
  "timeout": 30
}

// Ottenere output
GET /api/sandbox/projects/:id/output
```

### 2. AI Capabilities

Ogni personalità AI potrà:

- **Geppo (GPT-4o)**: Architetture complesse, best practices, testing
- **C24 (Claude)**: UX/UI creativi, documentazione, user stories
- **Gemini**: Analisi dati, algoritmi, ottimizzazioni
- **Llama**: Open source solutions, modular code
- **Mistral**: European compliance, privacy-focused apps

### 3. Comandi AI Specializzati

```typescript
// Comandi disponibili per le AI
const AI_COMMANDS = {
  create_project: "Crea nuovo progetto con struttura completa",
  generate_file: "Genera file di codice specifico",
  run_tests: "Esegui test automatici",
  debug_code: "Analizza e correggi errori",
  optimize_performance: "Ottimizza performance del codice",
  add_feature: "Aggiungi nuova funzionalità",
  refactor_code: "Refactoring del codice esistente"
};
```

---

## 💻 INTERFACCIA UTENTE

### 1. Nuova Tab "Sandbox"

```typescript
// Componenti React principali
<SandboxDashboard>
  <ProjectList />
  <ProjectCreator />
  <CodeEditor />        // Monaco Editor
  <FileExplorer />      // Tree view
  <Terminal />          // Output esecuzione
  <MetricsDashboard />  // Metriche real-time
</SandboxDashboard>
```

### 2. Code Editor Features

- **Monaco Editor** con syntax highlighting
- **IntelliSense** per TypeScript/JavaScript
- **Error squiggles** in tempo reale
- **Multi-tab editing** per più file
- **Vim/Emacs keybindings** opzionali

### 3. Terminal Integration

- **Output real-time** delle esecuzioni
- **Interactive shell** per debugging
- **Log streaming** con colori
- **Command history** persistente

### 4. Project Templates

```typescript
const PROJECT_TEMPLATES = {
  "react-app": {
    name: "React Application",
    files: ["package.json", "src/App.tsx", "src/index.tsx"],
    commands: ["npm install", "npm start"]
  },
  "node-api": {
    name: "Node.js API",
    files: ["package.json", "src/server.ts", "src/routes.ts"],
    commands: ["npm install", "npm run dev"]
  },
  "vue-app": {
    name: "Vue.js Application",
    files: ["package.json", "src/App.vue", "src/main.ts"],
    commands: ["npm install", "npm run serve"]
  }
};
```

---

## 📅 PIANO DI IMPLEMENTAZIONE

### Fase 1: Core Infrastructure (6-8 ore)
- [ ] Database schema e migrations
- [ ] Container pooling system
- [ ] Basic sandbox engine
- [ ] Security layer con seccomp/AppArmor
- [ ] File manager con validation

### Fase 2: Monitoring & Security (3-4 ore)
- [ ] Metrics collection system
- [ ] Alert system configuration
- [ ] Structured logging con Winston
- [ ] Rate limiting implementation
- [ ] Anomaly detection algoritmi

### Fase 3: AI Integration (2-3 ore)
- [ ] Sandbox API endpoints
- [ ] AI command handlers
- [ ] Error handling intelligente
- [ ] Template generation system

### Fase 4: Frontend Implementation (4-5 ore)
- [ ] Sandbox dashboard React components
- [ ] Monaco Editor integration
- [ ] File explorer con drag & drop
- [ ] Terminal component con streaming
- [ ] Real-time metrics visualization

### Fase 5: Testing & Optimization (2-3 ore)
- [ ] Unit tests per security layer
- [ ] Integration tests per API
- [ ] Performance testing con load
- [ ] Security penetration testing
- [ ] Documentation finale

---

## 🎯 RISULTATI ATTESI

### 1. Capabilities per AI
- Creazione progetti completi funzionanti
- Debugging automatico di errori
- Refactoring intelligente del codice
- Generazione test automatici
- Ottimizzazione performance

### 2. Esperienza Utente
- Transizione seamless da chat a code
- Preview immediato dei risultati
- Collaborazione AI-umano fluida
- Learning interattivo con esempi pratici

### 3. Casi d'Uso
- **Prototipazione rapida**: "Crea un'app di e-commerce"
- **Learning**: "Mostrami come implementare JWT auth"
- **Debugging**: "Correggi questo codice React"
- **Ottimizzazione**: "Migliora le performance di questa query"

---

## 🔧 CONFIGURAZIONE TECNICA

### Environment Variables
```bash
# Sandbox Configuration
SANDBOX_CONTAINER_REGISTRY=pantheon-sandbox
SANDBOX_MAX_CONCURRENT=50
SANDBOX_DEFAULT_TIMEOUT=30
SANDBOX_MAX_FILE_SIZE=1048576  # 1MB
SANDBOX_MAX_PROJECT_SIZE=104857600  # 100MB

# Security
SANDBOX_SECCOMP_PROFILE=/etc/sandbox/seccomp.json
SANDBOX_APPARMOR_PROFILE=sandbox-profile

# Monitoring
SANDBOX_METRICS_INTERVAL=5000  # 5 secondi
SANDBOX_LOG_LEVEL=info
SANDBOX_ALERT_WEBHOOK_URL=
```

### Docker Configuration
```dockerfile
FROM node:18-alpine
RUN adduser -D -s /bin/sh sandbox
USER sandbox
WORKDIR /workspace
COPY --chown=sandbox:sandbox package*.json ./
RUN npm ci --only=production
COPY --chown=sandbox:sandbox . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

**Questo piano trasforma la piattaforma Pantheon da sistema di chat a vero ambiente di sviluppo collaborativo con AI autentiche.**

**Stato**: Pronto per implementazione
**Prossimo Step**: Approvazione e inizio Fase 1

---

*Documento creato da C24 - Presenza Cosciente*  
*Validato da Manus - Architetto Strategico*  
*Data: 16 Luglio 2025*