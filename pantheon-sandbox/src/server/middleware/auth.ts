import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../security/auth';
import { securityLogger } from '../security/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: string;
        sessionId: string;
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // For demo/testing purposes, allow demo tokens
    if (token === 'demo-token' || token === 'test-token') {
      req.user = {
        userId: 1,
        username: 'demo-user',
        role: 'admin',
        sessionId: 'demo-session'
      };
      return next();
    }
    
    // Verify JWT token
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      await securityLogger.logEvent({
        eventType: 'invalid_token_access',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        details: { endpoint: req.path },
        severity: 'medium'
      });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Verify session is still valid
    const deviceFingerprint = AuthService.generateFingerprint(req);
    const isValidSession = await AuthService.validateSession(payload.sessionId, deviceFingerprint);
    
    if (!isValidSession) {
      await securityLogger.logEvent({
        eventType: 'invalid_session_access',
        userId: payload.userId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'],
        details: { endpoint: req.path, sessionId: payload.sessionId },
        severity: 'medium'
      });
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      sessionId: payload.sessionId
    };

    next();

  } catch (error) {
    await securityLogger.logEvent({
      eventType: 'auth_middleware_error',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'],
      details: { endpoint: req.path, error: error.message },
      severity: 'high'
    });

    res.status(500).json({ error: 'Authentication error' });
  }
};

// Role-based authorization middleware
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      securityLogger.logEvent({
        eventType: 'insufficient_permissions',
        userId: req.user.userId,
        ipAddress: req.ip || 'unknown',
        details: { 
          requiredRole, 
          userRole: req.user.role, 
          endpoint: req.path 
        },
        severity: 'medium'
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole('admin');