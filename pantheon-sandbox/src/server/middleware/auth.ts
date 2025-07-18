// Authentication & Authorization Middleware
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { workspaceMembers } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { SecurityLogger } from '../security/logger';
import { RolePermissions } from '../../shared/security/types';

// Extend Request type
declare global {
  namespace Express {
    interface Request {
      securityContext?: any;
    }
  }
}

// Require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.securityContext) {
    SecurityLogger.logAuthorization('denied', {
      reason: 'no_authentication',
      endpoint: req.path,
      ip: req.ip,
    });
    
    return res.status(401).json({
      error: 'Autenticazione richiesta',
      code: 'AUTH_REQUIRED',
    });
  }
  
  next();
}

// Require specific role
export function requireRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.securityContext) {
      return res.status(401).json({
        error: 'Autenticazione richiesta',
        code: 'AUTH_REQUIRED',
      });
    }

    const userRoles = req.securityContext.authentication.roles || [];
    
    if (!userRoles.includes(requiredRole)) {
      SecurityLogger.logAuthorization('denied', {
        reason: 'insufficient_role',
        requiredRole,
        userRoles,
        userId: req.securityContext.authentication.userId,
        endpoint: req.path,
      });
      
      return res.status(403).json({
        error: 'Ruolo insufficiente',
        code: 'INSUFFICIENT_ROLE',
        required: requiredRole,
      });
    }

    next();
  };
}

// Require specific permission
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.securityContext) {
      return res.status(401).json({
        error: 'Autenticazione richiesta',
        code: 'AUTH_REQUIRED',
      });
    }

    const userRoles = req.securityContext.authentication.roles || [];
    const userPermissions = getUserPermissions(userRoles);
    
    if (!userPermissions.includes(permission)) {
      SecurityLogger.logAuthorization('denied', {
        reason: 'insufficient_permission',
        requiredPermission: permission,
        userPermissions,
        userId: req.securityContext.authentication.userId,
        endpoint: req.path,
      });
      
      return res.status(403).json({
        error: 'Permesso insufficiente',
        code: 'INSUFFICIENT_PERMISSION',
        required: permission,
      });
    }

    next();
  };
}

// Require workspace access with specific permission
export function requireWorkspaceAccess(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.securityContext) {
        return res.status(401).json({
          error: 'Autenticazione richiesta',
          code: 'AUTH_REQUIRED',
        });
      }

      const workspaceId = req.params.workspaceId;
      const userId = req.securityContext.authentication.userId;

      if (!workspaceId) {
        return res.status(400).json({
          error: 'Workspace ID richiesto',
          code: 'WORKSPACE_ID_REQUIRED',
        });
      }

      // Check workspace membership
      const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.isActive, true)
        ));

      if (!membership) {
        SecurityLogger.logAuthorization('denied', {
          reason: 'no_workspace_access',
          workspaceId,
          userId,
          requiredPermission: permission,
        });
        
        return res.status(403).json({
          error: 'Accesso al workspace negato',
          code: 'WORKSPACE_ACCESS_DENIED',
        });
      }

      // Check role permissions
      const rolePermissions = getRolePermissions(membership.role);
      const memberPermissions = [...rolePermissions, ...(membership.permissions || [])];
      
      if (!memberPermissions.includes(permission)) {
        SecurityLogger.logAuthorization('denied', {
          reason: 'insufficient_workspace_permission',
          workspaceId,
          userId,
          memberRole: membership.role,
          requiredPermission: permission,
          memberPermissions,
        });
        
        return res.status(403).json({
          error: 'Permesso workspace insufficiente',
          code: 'INSUFFICIENT_WORKSPACE_PERMISSION',
          required: permission,
          role: membership.role,
        });
      }

      // Add workspace context to request
      req.securityContext.workspaceMembership = membership;
      req.securityContext.workspacePermissions = memberPermissions;

      SecurityLogger.logAuthorization('granted', {
        workspaceId,
        userId,
        permission,
        role: membership.role,
      });

      next();
    } catch (error) {
      SecurityLogger.logSecurityViolation('workspace_auth_error', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        userId: req.securityContext?.authentication?.userId,
      });
      
      res.status(500).json({
        error: 'Errore durante la verifica dei permessi workspace',
        code: 'WORKSPACE_AUTH_ERROR',
      });
    }
  };
}

// Helper functions
function getUserPermissions(roles: string[]): string[] {
  const permissions = new Set<string>();
  
  roles.forEach(role => {
    const rolePerms = RolePermissions[role as keyof typeof RolePermissions];
    if (rolePerms) {
      rolePerms.forEach(perm => permissions.add(perm));
    }
  });
  
  return Array.from(permissions);
}

function getRolePermissions(role: string): string[] {
  const rolePerms = RolePermissions[role as keyof typeof RolePermissions];
  return rolePerms || [];
}

// Admin only middleware
export const requireAdmin = requireRole('admin');

// AI operator middleware (for AI API calls)
export const requireAIOperator = requirePermission('ai:respond');

// Data access logging middleware
export function logDataAccess(operation: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    SecurityLogger.logDataAccess(operation, {
      userId: req.securityContext?.authentication?.userId,
      sessionId: req.securityContext?.authentication?.sessionId,
      workspaceId: req.params.workspaceId,
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
    });
    
    next();
  };
}