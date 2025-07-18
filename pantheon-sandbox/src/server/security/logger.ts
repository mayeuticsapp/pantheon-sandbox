// Security Logging System - Implementazione suggerimenti Manus
import winston from 'winston';
import { SECURITY_CONFIG } from './auth';

// Security-focused logger con GDPR compliance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
      // Security sanitization - rimuovi dati sensibili dai log
      const sanitized = sanitizeLogData(metadata);
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...sanitized
      });
    })
  ),
  defaultMeta: { 
    service: 'pantheon-sandbox',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console per development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),

    // File per security events
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'warn',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    // File per tutti i log
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    // File per errori
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Funzione per sanitizzare dati sensibili nei log
function sanitizeLogData(data: any): any {
  const sensitiveFields = [
    'password', 'passwordHash', 'token', 'sessionToken', 
    'secret', 'key', 'apiKey', 'encryptionKey',
    'mfaSecret', 'refreshToken', 'accessToken'
  ];

  const sanitized = { ...data };

  function recursiveSanitize(obj: any, path: string = ''): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item, index) => recursiveSanitize(item, `${path}[${index}]`));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = recursiveSanitize(value, fullPath);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return recursiveSanitize(sanitized);
}

// Security event logger specifico
export class SecurityLogger {
  
  static logAuthentication(event: 'success' | 'failure', details: any) {
    const level = event === 'success' ? 'info' : 'warn';
    logger.log(level, `Authentication ${event}`, {
      category: 'authentication',
      event,
      ...details
    });
  }

  static logAuthorization(event: 'granted' | 'denied', details: any) {
    const level = event === 'granted' ? 'info' : 'warn';
    logger.log(level, `Authorization ${event}`, {
      category: 'authorization',
      event,
      ...details
    });
  }

  static logDataAccess(operation: string, details: any) {
    logger.info(`Data access: ${operation}`, {
      category: 'data_access',
      operation,
      ...details
    });
  }

  static logSecurityViolation(violation: string, details: any) {
    logger.error(`Security violation: ${violation}`, {
      category: 'security_violation',
      violation,
      severity: 'high',
      ...details
    });
  }

  static logAIInteraction(aiName: string, operation: string, details: any) {
    logger.info(`AI interaction: ${aiName} - ${operation}`, {
      category: 'ai_interaction',
      aiName,
      operation,
      ...details
    });
  }

  static logWorkspaceAccess(action: string, details: any) {
    logger.info(`Workspace access: ${action}`, {
      category: 'workspace_access',
      action,
      ...details
    });
  }

  static logMemoryAccess(action: string, details: any) {
    logger.info(`Memory access: ${action}`, {
      category: 'memory_access',
      action,
      ...details
    });
  }

  static logComplianceEvent(event: string, details: any) {
    logger.info(`Compliance event: ${event}`, {
      category: 'compliance',
      event,
      compliance_mode: SECURITY_CONFIG.auditSettings.complianceMode,
      ...details
    });
  }
}

// Express middleware per request logging
export function requestLogger(req: any, res: any, next: any) {
  const startTime = Date.now();
  
  // Log della richiesta
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.id || 'unknown'
  });

  // Log della risposta
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    logger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.id || 'unknown'
    });

    return originalSend.call(this, data);
  };

  next();
}

// Handler per errori non gestiti
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

export default logger;