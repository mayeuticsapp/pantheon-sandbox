// Authentication Routes con Zero-Trust Security
import { Router } from 'express';
import { z } from 'zod';
import { authService, validatePasswordPolicy, hashPassword } from '../security/auth';
import { SecurityLogger } from '../security/logger';
import { db } from '../db';
import { users, insertUserSchema } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(1),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

// Login endpoint con Zero-Trust
router.post('/login', async (req: any, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    const result = await authService.authenticate(username, password, req);
    
    if (result.success) {
      res.json({
        success: true,
        token: result.token,
        user: result.user,
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Dati di input non validi',
        details: error.errors,
      });
    } else {
      SecurityLogger.logSecurityViolation('login_error', {
        error: error.message,
        ip: req.ip,
      });
      
      res.status(500).json({
        success: false,
        error: 'Errore interno del server',
      });
    }
  }
});

// Register endpoint con validazione password policy
router.post('/register', async (req: any, res) => {
  try {
    const userData = registerSchema.parse(req.body);
    
    // Validate password policy
    const passwordValidation = validatePasswordPolicy(userData.password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Password non conforme alle policy di sicurezza',
        details: passwordValidation.errors,
      });
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, userData.username));

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username già in uso',
      });
    }

    // Check if email exists
    const [existingEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email));

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email già registrata',
      });
    }

    // Hash password e create user
    const passwordHash = await hashPassword(userData.password);
    
    const [newUser] = await db
      .insert(users)
      .values({
        username: userData.username,
        email: userData.email,
        passwordHash,
        roles: ['user'],
        isActive: true,
      })
      .returning();

    SecurityLogger.logDataAccess('user_created', {
      userId: newUser.id,
      username: newUser.username,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Utente registrato con successo',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        roles: newUser.roles,
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Dati di input non validi',
        details: error.errors,
      });
    } else {
      SecurityLogger.logSecurityViolation('registration_error', {
        error: error.message,
        ip: req.ip,
      });
      
      res.status(500).json({
        success: false,
        error: 'Errore interno del server',
      });
    }
  }
});

// Logout endpoint
router.post('/logout', async (req: any, res) => {
  try {
    const securityContext = req.securityContext;
    
    if (securityContext) {
      await authService.logout(securityContext.authentication.sessionId);
      
      SecurityLogger.logAuthentication('success', {
        action: 'logout',
        userId: securityContext.authentication.userId,
        sessionId: securityContext.authentication.sessionId,
      });
    }

    res.json({ success: true, message: 'Logout effettuato con successo' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Errore durante il logout',
    });
  }
});

// Validate token endpoint
router.get('/validate', async (req: any, res) => {
  try {
    const securityContext = req.securityContext;
    
    if (!securityContext) {
      return res.status(401).json({
        valid: false,
        error: 'Token non valido o scaduto',
      });
    }

    res.json({
      valid: true,
      user: {
        id: securityContext.authentication.userId,
        sessionId: securityContext.authentication.sessionId,
        roles: securityContext.authentication.roles,
        expiresAt: securityContext.authentication.expiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      valid: false,
      error: 'Errore durante la validazione',
    });
  }
});

// User profile endpoint
router.get('/profile', async (req: any, res) => {
  try {
    const securityContext = req.securityContext;
    
    if (!securityContext) {
      return res.status(401).json({
        error: 'Autenticazione richiesta',
      });
    }

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        roles: users.roles,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, securityContext.authentication.userId));

    if (!user) {
      return res.status(404).json({
        error: 'Utente non trovato',
      });
    }

    SecurityLogger.logDataAccess('profile_accessed', {
      userId: user.id,
      sessionId: securityContext.authentication.sessionId,
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({
      error: 'Errore durante il recupero del profilo',
    });
  }
});

export { router as authRoutes };