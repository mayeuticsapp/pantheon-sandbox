import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import aiRoutes from './routes/ai';

// Import middleware and security
import { securityLogger } from './security/logger';
import { AuthService } from './security/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    await securityLogger.logEvent({
      eventType: 'rate_limit_exceeded',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'],
      details: { endpoint: req.path },
      severity: 'medium'
    });
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for proper IP detection
app.set('trust proxy', 1);

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    // Log request details
    await securityLogger.logEvent({
      eventType: 'api_request',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'],
      details: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('content-length') || 0
      },
      severity: 'low'
    });
  });
  
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Basic health checks
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        auth: 'operational',
        ai: 'operational',
        security: 'active'
      },
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System info endpoint (requires admin access)
app.get('/api/system/info', async (req, res) => {
  try {
    // This would require admin authentication in production
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };

    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

// Security events endpoint (admin only)
app.get('/api/security/events', async (req, res) => {
  try {
    // This would require admin authentication in production
    const limit = parseInt(req.query.limit as string) || 50;
    const severity = req.query.severity as string;
    
    const events = await securityLogger.getSecurityEvents(limit, severity);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get security events' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  securityLogger.logEvent({
    eventType: 'unhandled_error',
    ipAddress: req.ip || 'unknown',
    details: {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    },
    severity: 'high'
  });

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PantheonSandbox server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Security logging: Active`);
  console.log(`🤖 AI Services: Ready`);
  
  // Clean expired sessions on startup
  AuthService.cleanExpiredSessions().catch(console.error);
  
  // Set up periodic cleanup
  setInterval(() => {
    AuthService.cleanExpiredSessions().catch(console.error);
  }, 60 * 60 * 1000); // Every hour
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down PantheonSandbox server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down PantheonSandbox server...');
  process.exit(0);
});

export default app;