import winston from 'winston';
import { db } from '../db';
import { securityEvents } from '../../shared/schema';

// Winston configuration for security logging
const securityWinston = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pantheon-sandbox-security' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/security-error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/security.log' 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export interface SecurityEvent {
  eventType: string;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityLogger {
  // Log security event to database and Winston
  async logEvent(event: SecurityEvent): Promise<void> {
    try {
      // Store in database
      await db.insert(securityEvents).values({
        eventType: event.eventType,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: event.details ? JSON.stringify(event.details) : null,
        severity: event.severity,
        timestamp: new Date()
      });

      // Log with Winston
      securityWinston.log({
        level: this.getWinstonLevel(event.severity),
        message: `Security Event: ${event.eventType}`,
        ...event
      });

      // Send alerts for critical events
      if (event.severity === 'critical') {
        await this.sendAlert(event);
      }

    } catch (error) {
      securityWinston.error('Failed to log security event', { error, event });
    }
  }

  // Convert severity to Winston level
  private getWinstonLevel(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warn';
      case 'medium': return 'info';
      case 'low': return 'debug';
      default: return 'info';
    }
  }

  // Send real-time alerts for critical events
  private async sendAlert(event: SecurityEvent): Promise<void> {
    // In production: integrate with alerting systems (email, Slack, etc.)
    securityWinston.error('CRITICAL SECURITY EVENT', { 
      event,
      timestamp: new Date().toISOString(),
      alert: 'IMMEDIATE_ATTENTION_REQUIRED'
    });
  }

  // Log authentication events
  async logAuth(type: 'login' | 'logout' | 'register', userId: number, ipAddress: string, success: boolean = true): Promise<void> {
    await this.logEvent({
      eventType: `auth_${type}`,
      userId,
      ipAddress,
      details: { success },
      severity: success ? 'low' : 'medium'
    });
  }

  // Log workspace access
  async logWorkspaceAccess(userId: number, workspaceId: string, action: string, ipAddress: string): Promise<void> {
    await this.logEvent({
      eventType: 'workspace_access',
      userId,
      ipAddress,
      details: { workspaceId, action },
      severity: 'low'
    });
  }

  // Log AI interactions
  async logAIInteraction(userId: number, personalityId: string, tokensUsed: number, ipAddress: string): Promise<void> {
    await this.logEvent({
      eventType: 'ai_interaction',
      userId,
      ipAddress,
      details: { personalityId, tokensUsed },
      severity: 'low'
    });
  }

  // Log data access
  async logDataAccess(userId: number, dataType: string, action: string, ipAddress: string): Promise<void> {
    await this.logEvent({
      eventType: 'data_access',
      userId,
      ipAddress,
      details: { dataType, action },
      severity: action === 'delete' ? 'medium' : 'low'
    });
  }

  // Get security events (for audit purposes)
  async getSecurityEvents(limit: number = 100, severity?: string) {
    let query = db.select().from(securityEvents);
    
    if (severity) {
      query = query.where(eq(securityEvents.severity, severity));
    }
    
    return query.orderBy(securityEvents.timestamp).limit(limit);
  }
}

export const securityLogger = new SecurityLogger();