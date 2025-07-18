import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db';
import { users, sessions, securityEvents } from '../../shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import { securityLogger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'pantheon-sandbox-secret-2025';
const JWT_EXPIRY = '24h';
const FAILED_ATTEMPTS_LIMIT = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export interface AuthPayload {
  userId: number;
  username: string;
  role: string;
  sessionId: string;
}

export interface DeviceFingerprint {
  userAgent: string;
  ip: string;
  acceptLanguage: string;
  timezone: string;
}

export class AuthService {
  // Generate device fingerprint
  static generateFingerprint(req: any): string {
    const fingerprint = {
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || req.connection.remoteAddress,
      acceptLanguage: req.headers['accept-language'] || '',
      timezone: req.headers['x-timezone'] || 'UTC'
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(fingerprint))
      .digest('hex');
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT token
  static generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  }

  // Verify JWT token
  static verifyToken(token: string): AuthPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch (error) {
      return null;
    }
  }

  // Check if account is locked
  static async isAccountLocked(username: string): Promise<boolean> {
    const user = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user.length) return false;

    const userData = user[0];
    if (userData.failedAttempts >= FAILED_ATTEMPTS_LIMIT) {
      const lockoutTime = new Date(userData.lastFailedAttempt!.getTime() + LOCKOUT_DURATION);
      return new Date() < lockoutTime;
    }

    return false;
  }

  // Record failed login attempt
  static async recordFailedAttempt(username: string, ip: string): Promise<void> {
    const user = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (user.length) {
      const userData = user[0];
      const newFailedAttempts = userData.failedAttempts + 1;

      await db.update(users)
        .set({
          failedAttempts: newFailedAttempts,
          lastFailedAttempt: new Date()
        })
        .where(eq(users.id, userData.id));

      // Log security event
      await securityLogger.logEvent({
        eventType: 'auth_failed_attempt',
        userId: userData.id,
        ipAddress: ip,
        details: { attempt: newFailedAttempts, username },
        severity: newFailedAttempts >= FAILED_ATTEMPTS_LIMIT ? 'high' : 'medium'
      });
    }
  }

  // Reset failed attempts
  static async resetFailedAttempts(userId: number): Promise<void> {
    await db.update(users)
      .set({
        failedAttempts: 0,
        lastFailedAttempt: null
      })
      .where(eq(users.id, userId));
  }

  // Create session
  static async createSession(
    userId: number, 
    deviceFingerprint: string, 
    ipAddress: string
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(sessions).values({
      id: sessionId,
      userId,
      deviceFingerprint,
      ipAddress,
      expiresAt,
      createdAt: new Date()
    });

    return sessionId;
  }

  // Validate session
  static async validateSession(sessionId: string, deviceFingerprint: string): Promise<boolean> {
    const session = await db.select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.deviceFingerprint, deviceFingerprint)
        )
      )
      .limit(1);

    if (!session.length) return false;

    const sessionData = session[0];
    return new Date() < sessionData.expiresAt;
  }

  // Revoke session
  static async revokeSession(sessionId: string): Promise<void> {
    await db.delete(sessions)
      .where(eq(sessions.id, sessionId));
  }

  // Clean expired sessions
  static async cleanExpiredSessions(): Promise<void> {
    await db.delete(sessions)
      .where(lt(sessions.expiresAt, new Date()));
  }
}