// Zero-Trust Authentication Service - Implementazione suggerimenti Manus
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { RateLimiterFlexible } from 'rate-limiter-flexible';
import crypto from 'crypto';
import { db } from '../db';
import { users, sessions, securityEvents } from '../../shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import type { Authentication, SecurityEvent, SecurityContext } from '../../shared/security/types';
import { logger } from './logger';

// Security Configuration per suggerimenti Manus
export const SECURITY_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
  jwtExpirationHours: 24,
  mfaRequired: false, // Configurabile per workspace
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  encryptionSettings: {
    algorithm: 'aes-256-gcm',
    keyDerivationRounds: 100000,
  },
  auditSettings: {
    retentionDays: 90,
    realTimeAlerts: true,
    complianceMode: 'GDPR' as const,
  },
};

// Rate Limiters per Zero-Trust
const loginLimiter = new RateLimiterFlexible({
  keyGenerator: (req: any) => `login_${req.ip}_${req.body?.username || 'unknown'}`,
  points: SECURITY_CONFIG.maxLoginAttempts,
  duration: SECURITY_CONFIG.lockoutDurationMinutes * 60,
  blockDuration: SECURITY_CONFIG.lockoutDurationMinutes * 60,
});

const apiLimiter = new RateLimiterFlexible({
  keyGenerator: (req: any) => `api_${req.ip}`,
  points: 100, // 100 requests
  duration: 60, // per minute
  blockDuration: 60,
});

// Device Fingerprinting per Security Context
export function generateDeviceFingerprint(req: any): string {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.ip || '',
  ];
  
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .substring(0, 32);
}

// Password Security con Policy
export function validatePasswordPolicy(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { passwordPolicy } = SECURITY_CONFIG;

  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password deve essere almeno ${passwordPolicy.minLength} caratteri`);
  }
  
  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password deve contenere almeno una lettera maiuscola');
  }
  
  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password deve contenere almeno una lettera minuscola');
  }
  
  if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password deve contenere almeno un numero');
  }
  
  if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password deve contenere almeno un carattere speciale');
  }

  return { valid: errors.length === 0, errors };
}

// Hash Password con Salt
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token Management con Security Context
export async function generateToken(payload: JWTPayload): Promise<string> {
  const secret = new TextEncoder().encode(SECURITY_CONFIG.jwtSecret);
  
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SECURITY_CONFIG.jwtExpirationHours}h`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(SECURITY_CONFIG.jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    logger.error('Token verification failed', { error });
    return null;
  }
}

// Security Event Logging per Audit Trail
export async function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
  try {
    await db.insert(securityEvents).values({
      ...event,
      timestamp: new Date(),
    });

    // Real-time alerts per eventi critici
    if (event.severity === 'critical' && SECURITY_CONFIG.auditSettings.realTimeAlerts) {
      logger.error('CRITICAL SECURITY EVENT', event);
      // Qui si potrebbe integrare con sistemi di alerting esterni
    }
  } catch (error) {
    logger.error('Failed to log security event', { error, event });
  }
}

// Authentication Service con Zero-Trust
export class AuthenticationService {
  
  async authenticate(username: string, password: string, req: any): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
    const deviceFingerprint = generateDeviceFingerprint(req);
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Rate limiting check
      await loginLimiter.consume(`${ipAddress}_${username}`);

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.username, username),
          eq(users.isActive, true)
        ));

      if (!user) {
        await this.logFailedLogin(username, ipAddress, userAgent, 'user_not_found');
        return { success: false, error: 'Credenziali non valide' };
      }

      // Check if account is locked
      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        await this.logFailedLogin(username, ipAddress, userAgent, 'account_locked');
        return { success: false, error: 'Account temporaneamente bloccato' };
      }

      // Verify password
      const passwordValid = await verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        await this.handleFailedLogin(user.id, ipAddress, userAgent);
        return { success: false, error: 'Credenziali non valide' };
      }

      // Reset failed attempts on successful login
      await db
        .update(users)
        .set({ 
          failedLoginAttempts: 0, 
          lockedUntil: null,
          lastLoginAt: new Date()
        })
        .where(eq(users.id, user.id));

      // Create session
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + SECURITY_CONFIG.jwtExpirationHours * 60 * 60 * 1000);
      
      const sessionToken = await generateToken({
        userId: user.id,
        sessionId,
        username: user.username,
        roles: user.roles || ['user'],
        deviceFingerprint,
      });

      // Store session
      await db.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        sessionToken,
        deviceFingerprint,
        ipAddress,
        userAgent,
        expiresAt,
      });

      // Log successful login
      await logSecurityEvent({
        eventType: 'auth_success',
        userId: user.id,
        sessionId,
        severity: 'low',
        details: { username, deviceFingerprint },
        ipAddress,
        userAgent,
      });

      return { 
        success: true, 
        token: sessionToken, 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
        }
      };

    } catch (rateLimitError) {
      if (rateLimitError instanceof Error && rateLimitError.message.includes('rate limit')) {
        await logSecurityEvent({
          eventType: 'security_violation',
          severity: 'high',
          details: { reason: 'rate_limit_exceeded', username },
          ipAddress,
          userAgent,
        });
        return { success: false, error: 'Troppi tentativi di login. Riprova più tardi.' };
      }
      throw rateLimitError;
    }
  }

  private async handleFailedLogin(userId: string, ipAddress: string, userAgent: string): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) return;

    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    const updateData: any = { failedLoginAttempts: newAttempts };

    // Lock account se troppi tentativi
    if (newAttempts >= SECURITY_CONFIG.maxLoginAttempts) {
      updateData.lockedUntil = new Date(Date.now() + SECURITY_CONFIG.lockoutDurationMinutes * 60 * 1000);
      
      await logSecurityEvent({
        eventType: 'security_violation',
        userId,
        severity: 'high',
        details: { reason: 'account_locked', attempts: newAttempts },
        ipAddress,
        userAgent,
      });
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  private async logFailedLogin(username: string, ipAddress: string, userAgent: string, reason: string): Promise<void> {
    await logSecurityEvent({
      eventType: 'auth_failure',
      severity: 'medium',
      details: { username, reason },
      ipAddress,
      userAgent,
    });
  }

  async validateSession(token: string): Promise<SecurityContext | null> {
    try {
      const payload = await verifyToken(token);
      if (!payload) return null;

      // Verify session exists and is active
      const [session] = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.sessionToken, token),
          eq(sessions.isActive, true),
          lt(new Date(), sessions.expiresAt)
        ));

      if (!session) return null;

      // Update last access
      await db
        .update(sessions)
        .set({ lastAccessAt: new Date() })
        .where(eq(sessions.id, session.id));

      // Return security context
      return {
        authentication: {
          userId: payload.userId as string,
          sessionId: payload.sessionId as string,
          roles: payload.roles as string[],
          permissions: [], // Calcolate dinamicamente in base ai ruoli
          mfaVerified: false, // TODO: Implementare MFA
          deviceFingerprint: session.deviceFingerprint,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          issuedAt: Math.floor(new Date(session.createdAt).getTime() / 1000),
          expiresAt: Math.floor(new Date(session.expiresAt).getTime() / 1000),
        },
        dataIsolation: {
          workspaceId: '', // Determinato dal contesto della richiesta
          encryptionKey: '', // Caricato dinamicamente per workspace
          accessLevel: 'private',
          dataClassification: 'internal',
          retentionPolicy: {
            retentionDays: SECURITY_CONFIG.auditSettings.retentionDays,
            autoDelete: true,
            backupRequired: false,
          },
        },
        requestId: crypto.randomUUID(),
        clientFingerprint: session.deviceFingerprint,
        riskScore: 0, // TODO: Implementare risk scoring
        allowedOperations: [], // Calcolate dinamicamente
      };

    } catch (error) {
      logger.error('Session validation failed', { error });
      return null;
    }
  }

  async logout(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.id, sessionId));

    await logSecurityEvent({
      eventType: 'auth_success',
      sessionId,
      severity: 'low',
      details: { action: 'logout' },
      ipAddress: 'unknown',
      userAgent: 'unknown',
    });
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db
      .update(sessions)
      .set({ isActive: false })
      .where(lt(sessions.expiresAt, new Date()));
  }
}

export const authService = new AuthenticationService();