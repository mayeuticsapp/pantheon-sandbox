// End-to-End Encryption Service - Implementazione suggerimenti Manus
import crypto from 'crypto';
import { SECURITY_CONFIG } from './auth';
import { logger } from './logger';

// Encryption utilities per Data Isolation
export class EncryptionService {
  private static algorithm = SECURITY_CONFIG.encryptionSettings.algorithm;
  private static keyLength = 32; // 256 bits
  private static ivLength = 16; // 128 bits
  private static tagLength = 16; // 128 bits per GCM

  // Generate encryption key derivato da workspace
  static generateWorkspaceKey(workspaceId: string, masterKey?: string): string {
    const key = masterKey || process.env.MASTER_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    
    return crypto
      .pbkdf2Sync(
        `${workspaceId}:${key}`,
        'pantheon-sandbox-salt',
        SECURITY_CONFIG.encryptionSettings.keyDerivationRounds,
        this.keyLength,
        'sha256'
      )
      .toString('hex');
  }

  // Encrypt content con metadata
  static encrypt(content: string, workspaceKey: string, metadata?: any): {
    encryptedContent: string;
    contentHash: string;
    encryptionMetadata: any;
  } {
    try {
      const key = Buffer.from(workspaceKey, 'hex');
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipherGCM(this.algorithm, key, iv);
      cipher.setAAD(Buffer.from(JSON.stringify(metadata || {})));

      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + encrypted content + auth tag
      const encryptedContent = iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
      
      // Generate content hash per integrity verification
      const contentHash = crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');

      return {
        encryptedContent,
        contentHash,
        encryptionMetadata: {
          algorithm: this.algorithm,
          keyDerivation: 'pbkdf2',
          ivLength: this.ivLength,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Encryption failed', { error });
      throw new Error('Encryption failed');
    }
  }

  // Decrypt content con verification
  static decrypt(encryptedContent: string, workspaceKey: string, metadata?: any): {
    content: string;
    verified: boolean;
  } {
    try {
      const key = Buffer.from(workspaceKey, 'hex');
      const parts = encryptedContent.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted content format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipherGCM(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from(JSON.stringify(metadata || {})));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return {
        content: decrypted,
        verified: true
      };

    } catch (error) {
      logger.error('Decryption failed', { error });
      return {
        content: '',
        verified: false
      };
    }
  }

  // Verify content integrity
  static verifyContentIntegrity(content: string, expectedHash: string): boolean {
    const actualHash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
    
    return actualHash === expectedHash;
  }

  // Generate secure tokens
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash-based Message Authentication Code
  static generateHMAC(content: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(content)
      .digest('hex');
  }

  static verifyHMAC(content: string, secret: string, expectedHmac: string): boolean {
    const actualHmac = this.generateHMAC(content, secret);
    return crypto.timingSafeEqual(
      Buffer.from(actualHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  }
}

// Workspace Data Isolation Manager
export class DataIsolationManager {
  private workspaceKeys: Map<string, string> = new Map();

  async getWorkspaceKey(workspaceId: string): Promise<string> {
    // Check cache first
    let key = this.workspaceKeys.get(workspaceId);
    
    if (!key) {
      // Generate or retrieve from secure storage
      key = EncryptionService.generateWorkspaceKey(workspaceId);
      this.workspaceKeys.set(workspaceId, key);
      
      logger.info('Workspace encryption key generated', { 
        workspaceId,
        keyId: key.substring(0, 8) + '...' // Log solo primi 8 caratteri per audit
      });
    }

    return key;
  }

  async encryptWorkspaceContent(
    workspaceId: string, 
    content: string, 
    classification: 'public' | 'internal' | 'confidential' | 'restricted' = 'internal'
  ) {
    const key = await this.getWorkspaceKey(workspaceId);
    
    const metadata = {
      workspaceId,
      classification,
      timestamp: Date.now()
    };

    return EncryptionService.encrypt(content, key, metadata);
  }

  async decryptWorkspaceContent(
    workspaceId: string,
    encryptedContent: string,
    metadata?: any
  ) {
    const key = await this.getWorkspaceKey(workspaceId);
    return EncryptionService.decrypt(encryptedContent, key, metadata);
  }

  // Rotate encryption keys (per security best practices)
  async rotateWorkspaceKey(workspaceId: string): Promise<string> {
    const newKey = EncryptionService.generateWorkspaceKey(workspaceId, crypto.randomBytes(32).toString('hex'));
    this.workspaceKeys.set(workspaceId, newKey);
    
    logger.info('Workspace encryption key rotated', { 
      workspaceId,
      newKeyId: newKey.substring(0, 8) + '...'
    });

    return newKey;
  }

  // Clear keys from memory (security cleanup)
  clearWorkspaceKey(workspaceId: string): void {
    this.workspaceKeys.delete(workspaceId);
  }

  // Security audit per workspace
  getWorkspaceSecurityStatus(workspaceId: string): {
    hasEncryptionKey: boolean;
    keyAge: number | null;
    recommendKeyRotation: boolean;
  } {
    const hasKey = this.workspaceKeys.has(workspaceId);
    
    return {
      hasEncryptionKey: hasKey,
      keyAge: null, // TODO: Track key creation time
      recommendKeyRotation: false, // TODO: Implement key age policies
    };
  }
}

export const dataIsolationManager = new DataIsolationManager();