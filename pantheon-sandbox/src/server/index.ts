// PantheonSandbox Server con Security Framework integrato
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { RateLimiterFlexible } from 'rate-limiter-flexible';
import { logger, requestLogger, SecurityLogger } from './security/logger';
import { authService } from './security/auth';
import { apiRoutes } from './routes/api';
import { authRoutes } from './routes/auth';
import { workspaceRoutes } from './routes/workspaces';
import { aiRoutes } from './routes/ai';
import { initializePantheonSandbox } from './data/seed';
import type { SecurityContext } from '../shared/security/types';

const app = express();
const PORT = process.env.PORT || 5001;

// Security Middleware per suggerimenti Manus
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate Limiting globale
const globalRateLimiter = new RateLimiterFlexible({
  keyGenerator: (req) => req.ip,
  points: 100, // 100 requests
  duration: 60, // per minute
  blockDuration: 60, // block for 1 minute
});

app.use(async (req, res, next) => {
  try {
    await globalRateLimiter.consume(req.ip);
    next();
  } catch (rateLimitError) {
    SecurityLogger.logSecurityViolation('rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
    });
    
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.round(rateLimitError.msBeforeNext) || 60000,
    });
  }
});

// CORS con configurazione sicura
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Configurare dominio production
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing con limiti sicuri
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging per audit trail
app.use(requestLogger);

// Security Context Middleware
app.use('/api', async (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const securityContext = await authService.validateSession(token);
    
    if (securityContext) {
      req.securityContext = securityContext;
      SecurityLogger.logAuthentication('success', {
        userId: securityContext.authentication.userId,
        sessionId: securityContext.authentication.sessionId,
        endpoint: req.path,
      });
    } else {
      SecurityLogger.logAuthentication('failure', {
        reason: 'invalid_token',
        endpoint: req.path,
        ip: req.ip,
      });
    }
  }
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', apiRoutes);

// Health check con security status
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    security: {
      rateLimit: 'active',
      helmet: 'active',
      cors: 'configured',
      logging: 'active',
    },
  });
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Non esporre dettagli errori in production
  const errorResponse = process.env.NODE_ENV === 'production'
    ? { error: 'Internal server error' }
    : { error: error.message, stack: error.stack };

  res.status(500).json(errorResponse);
});

// 404 handler
app.use('*', (req, res) => {
  SecurityLogger.logDataAccess('not_found', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });
  
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Cleanup expired sessions periodically
setInterval(async () => {
  try {
    await authService.cleanupExpiredSessions();
    logger.debug('Expired sessions cleaned up');
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', { error });
  }
}, 60 * 60 * 1000); // Every hour

app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`🚀 PantheonSandbox server started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    security: 'enabled'
  });

  // Initialize database data
  try {
    await initializePantheonSandbox();
  } catch (error) {
    logger.error('Database initialization failed', { error });
  }
});

export default app;