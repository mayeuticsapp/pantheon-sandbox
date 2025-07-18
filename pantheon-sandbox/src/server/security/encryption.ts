import crypto from 'crypto';
import { securityLogger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  tag: string;
  keyId: string;
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionDays: number;
  encryptionRequired: boolean;
}

export class EncryptionService {
  private static masterKey: Buffer = crypto.scryptSync(
    process.env.ENCRYPTION_MASTER_KEY || 'pantheon-sandbox-master-key-2025',
    'salt',
    KEY_LENGTH
  );

  // Generate workspace-specific encryption key
  static generateWorkspaceKey(workspaceId: string): Buffer {
    return crypto.scryptSync(
      `${workspaceId}-${this.masterKey.toString('hex')}`,
      'workspace-salt',
      KEY_LENGTH
    );
  }

  // Encrypt data with workspace-specific key
  static encrypt(data: string, workspaceId: string): EncryptedData {
    try {
      const key = this.generateWorkspaceKey(workspaceId);
      const iv = crypto.randomBytes(IV_LENGTH);
      
      const cipher = crypto.createCipher(ALGORITHM, key);
      cipher.setAAD(Buffer.from(workspaceId)); // Additional authenticated data
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        keyId: this.generateKeyId(workspaceId)
      };
    } catch (error) {
      securityLogger.logEvent({
        eventType: 'encryption_error',
        details: { workspaceId, error: error.message },
        severity: 'high'
      });
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data with workspace-specific key
  static decrypt(encryptedData: EncryptedData, workspaceId: string): string {
    try {
      const key = this.generateWorkspaceKey(workspaceId);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');

      const decipher = crypto.createDecipher(ALGORITHM, key);
      decipher.setAAD(Buffer.from(workspaceId));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      securityLogger.logEvent({
        eventType: 'decryption_error',
        details: { workspaceId, error: error.message },
        severity: 'high'
      });
      throw new Error('Decryption failed');
    }
  }

  // Generate content hash for integrity verification
  static generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Verify content integrity
  static verifyContentIntegrity(content: string, expectedHash: string): boolean {
    const actualHash = this.generateContentHash(content);
    return crypto.timingSafeEqual(
      Buffer.from(actualHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );
  }

  // Generate key ID for tracking
  private static generateKeyId(workspaceId: string): string {
    return crypto
      .createHash('sha256')
      .update(`${workspaceId}-key`)
      .digest('hex')
      .substring(0, 16);
  }

  // Data classification helper
  static classifyData(dataType: string, content: string): DataClassification {
    // AI conversations and workspace content
    if (dataType.includes('conversation') || dataType.includes('workspace')) {
      return {
        level: 'confidential',
        retentionDays: 365,
        encryptionRequired: true
      };
    }

    // User personal data
    if (dataType.includes('user') || dataType.includes('profile')) {
      return {
        level: 'restricted',
        retentionDays: 2555, // 7 years for GDPR
        encryptionRequired: true
      };
    }

    // System logs and metadata
    if (dataType.includes('log') || dataType.includes('metadata')) {
      return {
        level: 'internal',
        retentionDays: 90,
        encryptionRequired: false
      };
    }

    // Default classification
    return {
      level: 'internal',
      retentionDays: 30,
      encryptionRequired: true
    };
  }

  // Secure data deletion
  static secureDelete(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // In production: implement secure multi-pass deletion
      // For now: standard deletion with logging
      const fs = require('fs');
      fs.unlink(filePath, (err: any) => {
        if (err) {
          securityLogger.logEvent({
            eventType: 'secure_delete_failed',
            details: { filePath, error: err.message },
            severity: 'medium'
          });
          reject(err);
        } else {
          securityLogger.logEvent({
            eventType: 'secure_delete_success',
            details: { filePath },
            severity: 'low'
          });
          resolve();
        }
      });
    });
  }
}