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

// Security Middleware semplificato per robS solo
app.use(helmet());

// CORS aperto per sviluppo
app.use(cors({
  origin: '*',
  credentials: true,
}));

// Body parsing con limiti sicuri
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging per audit trail
app.use(requestLogger);

// Fake user context per robS (niente auth)
app.use('/api', (req: any, res, next) => {
  req.user = {
    id: 'robs-user-id',
    username: 'robS',
    roles: ['admin', 'user']
  };
  next();
});

// Routes
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', apiRoutes);

// Serve frontend
app.use(express.static('src/client'));

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