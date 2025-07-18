// Quick test server per PantheonSandbox
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const PORT = 5001;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  console.log(`${new Date().toLocaleTimeString()} [${req.method}] ${req.path}`);
  next();
});

// Mock AI services
const aiServices = {
  geppo: async (prompt) => {
    console.log('🤖 Geppo working on:', prompt.substring(0, 50) + '...');
    
    if (prompt.includes('struttura')) {
      return JSON.stringify({
        files: [
          { path: 'index.html', language: 'html', purpose: 'homepage' },
          { path: 'style.css', language: 'css', purpose: 'styling' },
          { path: 'script.js', language: 'javascript', purpose: 'interactions' },
          { path: 'menu.html', language: 'html', purpose: 'menu page' },
          { path: 'contact.html', language: 'html', purpose: 'contact page' }
        ]
      });
    }
    
    if (prompt.includes('index.html')) {
      return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeCalabria - Autentico Cibo Calabrese al Borough Market</title>
    <meta name="description" content="DeCalabria al Borough Market di Londra - Scopri i sapori autentici della Calabria nel cuore di Londra. Piatti tradizionali, ingredienti freschi.">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <nav>
            <div class="logo">
                <h1>DeCalabria</h1>
                <p>Autentico Cibo Calabrese</p>
            </div>
            <ul class="nav-menu">
                <li><a href="#home">Home</a></li>
                <li><a href="menu.html">Menu</a></li>
                <li><a href="#gallery">Gallery</a></li>
                <li><a href="#location">Dove Siamo</a></li>
                <li><a href="contact.html">Contatti</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section id="home" class="hero">
            <div class="hero-content">
                <h2>Benvenuti da DeCalabria</h2>
                <p>Nel cuore del Borough Market, portiamo i sapori autentici della Calabria a Londra</p>
                <a href="menu.html" class="cta-button">Scopri il Menu</a>
            </div>
        </section>

        <section id="story" class="story-section">
            <div class="container">
                <h2>La Nostra Storia</h2>
                <p>DeCalabria nasce dalla passione per la cucina tradizionale calabrese. Al Borough Market dal 2019, portiamo ogni giorno ingredienti freschi e ricette tramandate di generazione in generazione.</p>
                <p>I nostri piatti raccontano la storia di una terra generosa, dove il sole del Mediterraneo incontra la tradizione culinaria più autentica del Sud Italia.</p>
            </div>
        </section>
    </main>

    <footer>
        <div class="footer-content">
            <div class="contact-info">
                <h3>DeCalabria</h3>
                <p>Borough Market, Londra SE1 9AL</p>
                <p>Tel: +44 20 7407 1002</p>
            </div>
            <div class="hours">
                <h4>Orari</h4>
                <p>Lun-Sab: 10:00-18:00</p>
                <p>Domenica: 10:00-17:00</p>
            </div>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>`;
    }
    
    return 'Codice generato da Geppo per: ' + prompt.substring(0, 100);
  },

  claude3: async (prompt) => {
    console.log('🎭 Claude3 working on:', prompt.substring(0, 50) + '...');
    
    if (prompt.includes('style.css')) {
      return `/* DeCalabria - Stili CSS Mediterranei */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --calabrian-red: #D32F2F;
    --calabrian-green: #2E7D32;
    --calabrian-gold: #F57C00;
    --warm-cream: #FFF8E1;
    --deep-blue: #1565C0;
    --olive-green: #689F38;
}

body {
    font-family: 'Georgia', serif;
    line-height: 1.6;
    color: #333;
    background-color: var(--warm-cream);
}

header {
    background: linear-gradient(135deg, var(--calabrian-red), var(--calabrian-green));
    color: white;
    padding: 1rem 0;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
}

.logo h1 {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 0.2rem;
}

.logo p {
    font-style: italic;
    opacity: 0.9;
}

.nav-menu {
    display: flex;
    list-style: none;
    gap: 2rem;
}

.nav-menu a {
    color: white;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s ease;
}

.nav-menu a:hover {
    color: var(--calabrian-gold);
}

.hero {
    background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), 
                url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><rect fill="%23D32F2F" width="1200" height="600"/><circle fill="%23F57C00" cx="200" cy="100" r="50" opacity="0.3"/><circle fill="%232E7D32" cx="800" cy="400" r="80" opacity="0.2"/></svg>');
    background-size: cover;
    background-position: center;
    height: 70vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: white;
}

.hero-content h2 {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

.hero-content p {
    font-size: 1.3rem;
    margin-bottom: 2rem;
    max-width: 600px;
}

.cta-button {
    display: inline-block;
    background: var(--calabrian-gold);
    color: white;
    padding: 1rem 2rem;
    text-decoration: none;
    border-radius: 5px;
    font-weight: bold;
    transition: background 0.3s ease;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.cta-button:hover {
    background: #E65100;
}

.story-section {
    padding: 4rem 0;
    background: white;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
}

.story-section h2 {
    color: var(--calabrian-red);
    font-size: 2.5rem;
    margin-bottom: 2rem;
    text-align: center;
}

.story-section p {
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
    text-align: center;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
}

footer {
    background: var(--deep-blue);
    color: white;
    padding: 2rem 0;
    text-align: center;
}

.footer-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
}

@media (max-width: 768px) {
    .nav-menu {
        flex-direction: column;
        gap: 1rem;
    }
    
    .hero-content h2 {
        font-size: 2.5rem;
    }
    
    nav {
        flex-direction: column;
        gap: 1rem;
    }
}`;
    }
    
    return 'Design UI/UX by Claude3 per: ' + prompt.substring(0, 100);
  },

  mistral: async (prompt) => {
    console.log('🌍 Mistral working on:', prompt.substring(0, 50) + '...');
    
    if (prompt.includes('script.js')) {
      return `// DeCalabria - JavaScript Interactions
document.addEventListener('DOMContentLoaded', function() {
    console.log('🍝 DeCalabria website loaded');
    
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Mobile menu toggle (if needed)
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
    
    // Add loading animation for images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('load', function() {
            this.style.opacity = '1';
        });
    });
    
    // Simple contact form handling (if exists)
    const contactForm = document.querySelector('#contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Grazie per il messaggio! Ti risponderemo presto.');
        });
    }
    
    // Analytics integration placeholder
    console.log('📊 DeCalabria analytics initialized');
});

// Borough Market location data
const boroughMarketLocation = {
    name: 'Borough Market',
    address: '8 Southwark St, London SE1 1TL',
    coordinates: {
        lat: 51.5055,
        lng: -0.0905
    },
    description: 'Storico mercato alimentare di Londra dal 1754'
};

// DeCalabria stall info
const deCalabriStall = {
    name: 'DeCalabria',
    location: 'Borough Market - Stall 47',
    specialties: [
        'Nduja Calabrese',
        'Caciocavallo Silano',
        'Soppressata',
        'Peperoncini piccanti',
        'Olio extravergine DOP'
    ],
    hours: {
        monday: '10:00-18:00',
        tuesday: '10:00-18:00', 
        wednesday: '10:00-18:00',
        thursday: '10:00-18:00',
        friday: '10:00-18:00',
        saturday: '10:00-18:00',
        sunday: '10:00-17:00'
    }
};`;
    }
    
    if (prompt.includes('README.md')) {
      return `# DeCalabria Website

Sito web per il chiosco DeCalabria al Borough Market di Londra.

## Descrizione

Sito web responsive per DeCalabria, specializzato in autentico cibo calabrese al Borough Market di Londra. Il sito presenta i piatti tradizionali, la storia del chiosco e informazioni pratiche per i visitatori.

## Caratteristiche

- **Design Responsive**: Ottimizzato per mobile, tablet e desktop
- **Colori Mediterranei**: Palette ispirata ai colori della Calabria
- **SEO Ottimizzato**: Meta tag e struttura per le ricerche locali
- **Accessibilità**: Conforme agli standard web accessibility

## Struttura File

- \`index.html\` - Homepage principale
- \`menu.html\` - Pagina menu (da implementare)
- \`contact.html\` - Pagina contatti (da implementare)
- \`style.css\` - Fogli di stile principali
- \`script.js\` - JavaScript per interazioni

## Deployment

1. Carica tutti i file su server web
2. Assicurati che il server supporti HTML5
3. Configura HTTPS per sicurezza
4. Testa su dispositivi mobili

## SEO e Marketing

- **Keywords**: "cibo calabrese Londra", "Borough Market italiano", "DeCalabria"
- **Google My Business**: Registra il business per ricerche locali
- **Social Media**: Instagram per foto piatti, Facebook per eventi

## Contatti Business

- **Posizione**: Borough Market, Stall 47, Londra SE1 9AL
- **Orari**: Lun-Sab 10:00-18:00, Dom 10:00-17:00
- **Specialità**: Nduja, Caciocavallo, Soppressata, Peperoncini piccanti

## Tecnologie Utilizzate

- HTML5 semantico
- CSS3 con variabili custom
- JavaScript vanilla
- Design mobile-first
- SEO metadata completo

---

Sviluppato dal team AI PantheonSandbox: Geppo (architettura), Claude3 (UI/UX), Mistral (logica business)`;
    }
    
    return 'Business logic by Mistral per: ' + prompt.substring(0, 100);
  }
};

// Store per i task in corso
const activeTasks = new Map();
const projectFiles = new Map();

// Endpoint per avviare build
app.post('/api/builder/build', async (req, res) => {
  try {
    const { workspaceId, projectName, description, requirements } = req.body;
    
    console.log('🚀 Starting build for:', projectName);
    console.log('📋 Requirements:', requirements);
    
    const taskId = `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task = {
      id: taskId,
      workspaceId,
      projectName,
      description,
      requirements,
      assignedAI: ['geppo', 'claude3', 'mistral'],
      status: 'planning',
      currentStep: 'Analyzing requirements and planning architecture',
      startedAt: new Date(),
      buildLog: [],
      files: []
    };
    
    activeTasks.set(taskId, task);
    
    // Start async build process
    buildProject(task);
    
    res.status(201).json({
      taskId: task.id,
      projectName: task.projectName,
      status: task.status,
      currentStep: task.currentStep,
      assignedAI: task.assignedAI,
      startedAt: task.startedAt,
      message: 'Collaborative build started - AI team is working on your app!'
    });
    
  } catch (error) {
    console.error('❌ Build error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint status task
app.get('/api/builder/tasks/:taskId', (req, res) => {
  const task = activeTasks.get(req.params.taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  res.json({
    taskId: task.id,
    projectName: task.projectName,
    status: task.status,
    currentStep: task.currentStep,
    progress: {
      filesCreated: task.files.length,
      assignedAI: task.assignedAI,
      logEntries: task.buildLog.length
    },
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    recentLog: task.buildLog.slice(-5)
  });
});

// Endpoint download ZIP
app.get('/api/builder/tasks/:taskId/download', async (req, res) => {
  const task = activeTasks.get(req.params.taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (task.status !== 'completed') {
    return res.status(400).json({ error: 'Project not completed yet' });
  }
  
  // Mock ZIP response (in real implementation would use archiver)
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${task.projectName}.zip"`);
  res.send(`Mock ZIP file for ${task.projectName} with ${task.files.length} files`);
});

// Processo di build collaborativo
async function buildProject(task) {
  try {
    // Step 1: Planning (Geppo)
    task.currentStep = 'Geppo is planning project architecture';
    addLog(task, 'geppo', 'Planning project structure');
    
    const architecture = await aiServices.geppo(`Crea la struttura di progetto per: ${task.description}
    Requisiti: ${task.requirements.join(', ')}`);
    
    const structure = JSON.parse(architecture);
    
    for (const fileSpec of structure.files) {
      task.files.push({
        path: fileSpec.path,
        content: '',
        language: fileSpec.language,
        createdBy: 'geppo',
        lastModified: new Date(),
        version: 1
      });
    }
    
    addLog(task, 'geppo', `Created ${structure.files.length} file templates`);
    await delay(2000);
    
    // Step 2: Building (All AI)
    task.status = 'building';
    task.currentStep = 'AI team is generating code files';
    
    for (const file of task.files) {
      const assignedAI = getAIForFile(file);
      task.currentStep = `${assignedAI} is working on ${file.path}`;
      
      addLog(task, assignedAI, `Generating content for ${file.path}`);
      
      const content = await aiServices[assignedAI](
        `Genera il contenuto completo per il file: ${file.path}
        Progetto: ${task.description}
        Linguaggio: ${file.language}`
      );
      
      file.content = content;
      file.lastModifiedBy = assignedAI;
      file.lastModified = new Date();
      
      addLog(task, assignedAI, `Completed ${file.path} (${content.length} chars)`);
      await delay(3000);
    }
    
    // Step 3: Integration
    task.currentStep = 'Claude3 is reviewing integration and quality';
    addLog(task, 'claude3', 'Reviewing project integration');
    await delay(2000);
    
    // Step 4: Documentation (Mistral)
    task.currentStep = 'Mistral is creating documentation';
    addLog(task, 'mistral', 'Creating project documentation');
    
    const readme = await aiServices.mistral(`Fornisci documentazione README.md per: ${task.description}`);
    
    task.files.push({
      path: 'README.md',
      content: readme,
      language: 'markdown',
      createdBy: 'mistral',
      lastModified: new Date(),
      version: 1
    });
    
    addLog(task, 'mistral', 'Documentation completed');
    await delay(1000);
    
    // Completion
    task.status = 'completed';
    task.currentStep = 'Project completed successfully';
    task.completedAt = new Date();
    
    addLog(task, 'system', `Build completed! Created ${task.files.length} files`);
    
    console.log(`✅ DeCalabria website completed! Task: ${task.id}`);
    
  } catch (error) {
    task.status = 'failed';
    task.currentStep = 'Build failed';
    addLog(task, 'system', `Build failed: ${error.message}`);
    console.error('❌ Build failed:', error);
  }
}

function addLog(task, aiId, details) {
  task.buildLog.push({
    timestamp: new Date(),
    aiId,
    action: 'code_generated',
    details,
    success: true
  });
  console.log(`[${aiId.toUpperCase()}] ${details}`);
}

function getAIForFile(file) {
  if (file.path.includes('.html')) return 'geppo';
  if (file.path.includes('.css')) return 'claude3';
  if (file.path.includes('.js')) return 'mistral';
  return 'geppo';
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.listen(PORT, () => {
  console.log(`🚀 PantheonSandbox Quick Test Server running on port ${PORT}`);
  console.log(`🤖 AI Team ready: Geppo, Claude3, Mistral`);
  console.log(`📋 Ready to build DeCalabria website!`);
});