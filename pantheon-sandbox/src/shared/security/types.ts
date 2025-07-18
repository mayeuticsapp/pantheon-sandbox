// Security Framework Types - Implementazione suggerimenti Manus
import { z } from 'zod';

// Zero-Trust Authentication Schema
export const AuthenticationSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  roles: z.array(z.enum(['user', 'admin', 'ai_operator', 'workspace_owner'])),
  permissions: z.array(z.string()),
  mfaVerified: z.boolean(),
  deviceFingerprint: z.string(),
  ipAddress: z.string(),
  userAgent: z.string(),
  issuedAt: z.number(),
  expiresAt: z.number(),
});

export type Authentication = z.infer<typeof AuthenticationSchema>;

// Role-Based Access Control
export const RolePermissions = {
  user: [
    'workspace:read',
    'workspace:create',
    'conversation:read',
    'conversation:create',
    'message:read',
    'message:create'
  ],
  admin: [
    'workspace:read',
    'workspace:create', 
    'workspace:update',
    'workspace:delete',
    'conversation:read',
    'conversation:create',
    'conversation:update',
    'conversation:delete',
    'message:read',
    'message:create',
    'message:update',
    'message:delete',
    'ai:configure',
    'security:audit'
  ],
  ai_operator: [
    'workspace:read',
    'conversation:read',
    'message:read',
    'message:create',
    'ai:respond',
    'memory:read',
    'memory:write'
  ],
  workspace_owner: [
    'workspace:read',
    'workspace:update',
    'workspace:invite',
    'workspace:remove_member',
    'conversation:read',
    'conversation:create',
    'conversation:update',
    'message:read',
    'message:create'
  ]
} as const;

// Security Event Logging
export const SecurityEventSchema = z.object({
  id: z.string().uuid(),
  eventType: z.enum([
    'auth_success',
    'auth_failure', 
    'workspace_access',
    'data_access',
    'permission_denied',
    'security_violation',
    'ai_interaction',
    'memory_access'
  ]),
  userId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  details: z.record(z.any()),
  timestamp: z.number(),
  ipAddress: z.string(),
  userAgent: z.string(),
});

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;

// Data Isolation Schema
export const DataIsolationSchema = z.object({
  workspaceId: z.string().uuid(),
  encryptionKey: z.string(),
  accessLevel: z.enum(['private', 'shared', 'public']),
  dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']),
  retentionPolicy: z.object({
    retentionDays: z.number(),
    autoDelete: z.boolean(),
    backupRequired: z.boolean(),
  }),
});

export type DataIsolation = z.infer<typeof DataIsolationSchema>;

// Security Configuration
export interface SecurityConfig {
  jwtSecret: string;
  jwtExpirationHours: number;
  mfaRequired: boolean;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  encryptionSettings: {
    algorithm: string;
    keyDerivationRounds: number;
  };
  auditSettings: {
    retentionDays: number;
    realTimeAlerts: boolean;
    complianceMode: 'GDPR' | 'SOC2' | 'HIPAA' | 'NONE';
  };
}

// Request Context for Zero-Trust
export interface SecurityContext {
  authentication: Authentication;
  dataIsolation: DataIsolation;
  requestId: string;
  clientFingerprint: string;
  riskScore: number;
  allowedOperations: string[];
}