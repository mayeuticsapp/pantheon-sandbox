import express from 'express';
import { z } from 'zod';
import { AuthService } from '../security/auth';
import { securityLogger } from '../security/logger';
import { db } from '../db';
import { users, insertUserSchema } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Registration schema
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.string().optional().default('user')
});

// Login schema
const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Check if user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1);

    if (existingUser.length > 0) {
      await securityLogger.logEvent({
        eventType: 'registration_failed',
        ipAddress,
        details: { username: validatedData.username, reason: 'user_exists' },
        severity: 'low'
      });
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(validatedData.password);

    // Create user
    const [newUser] = await db.insert(users).values({
      username: validatedData.username,
      email: validatedData.email,
      passwordHash,
      role: validatedData.role
    }).returning({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role
    });

    // Generate device fingerprint and create session
    const deviceFingerprint = AuthService.generateFingerprint(req);
    const sessionId = await AuthService.createSession(newUser.id, deviceFingerprint, ipAddress);

    // Generate JWT token
    const token = AuthService.generateToken({
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role,
      sessionId
    });

    // Log successful registration
    await securityLogger.logAuth('register', newUser.id, ipAddress, true);

    res.status(201).json({
      user: newUser,
      token,
      sessionId
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }

    await securityLogger.logEvent({
      eventType: 'registration_error',
      ipAddress: req.ip || 'unknown',
      details: { error: error.message },
      severity: 'medium'
    });

    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Check if account is locked
    const isLocked = await AuthService.isAccountLocked(validatedData.username);
    if (isLocked) {
      await securityLogger.logEvent({
        eventType: 'login_blocked_locked_account',
        ipAddress,
        details: { username: validatedData.username },
        severity: 'high'
      });
      return res.status(423).json({ error: 'Account temporarily locked due to failed attempts' });
    }

    // Find user
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1);

    if (!user) {
      await AuthService.recordFailedAttempt(validatedData.username, ipAddress);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(validatedData.password, user.passwordHash);
    if (!isValidPassword) {
      await AuthService.recordFailedAttempt(validatedData.username, ipAddress);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    await AuthService.resetFailedAttempts(user.id);

    // Generate device fingerprint and create session
    const deviceFingerprint = AuthService.generateFingerprint(req);
    const sessionId = await AuthService.createSession(user.id, deviceFingerprint, ipAddress);

    // Generate JWT token
    const token = AuthService.generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      sessionId
    });

    // Log successful login
    await securityLogger.logAuth('login', user.id, ipAddress, true);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token,
      sessionId
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }

    await securityLogger.logEvent({
      eventType: 'login_error',
      ipAddress: req.ip || 'unknown',
      details: { error: error.message },
      severity: 'medium'
    });

    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Validate session
    const deviceFingerprint = AuthService.generateFingerprint(req);
    const isValidSession = await AuthService.validateSession(payload.sessionId, deviceFingerprint);
    if (!isValidSession) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user data
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      mfaEnabled: users.mfaEnabled,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    await securityLogger.logEvent({
      eventType: 'profile_access_error',
      ipAddress: req.ip || 'unknown',
      details: { error: error.message },
      severity: 'low'
    });

    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = AuthService.verifyToken(token);
    if (payload) {
      // Revoke session
      await AuthService.revokeSession(payload.sessionId);
      
      // Log logout
      await securityLogger.logAuth('logout', payload.userId, req.ip || 'unknown', true);
    }

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    await securityLogger.logEvent({
      eventType: 'logout_error',
      ipAddress: req.ip || 'unknown',
      details: { error: error.message },
      severity: 'low'
    });

    res.status(500).json({ error: 'Logout failed' });
  }
});

// Clean expired sessions (internal endpoint)
router.post('/cleanup-sessions', async (req, res) => {
  try {
    await AuthService.cleanExpiredSessions();
    res.json({ message: 'Expired sessions cleaned' });
  } catch (error) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

export default router;