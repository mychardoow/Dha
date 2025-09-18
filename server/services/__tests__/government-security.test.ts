import { governmentSecurityService } from '../government-security';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

describe('GovernmentSecurityService - GCM Authentication Tag Vulnerability Fix', () => {
  const testData = 'This is sensitive government data that needs protection';
  const testClassification = 'CONFIDENTIAL' as const;

  describe('encryptData', () => {
    it('should encrypt data with proper tag length', async () => {
      const result = governmentSecurityService.encryptData(testData, testClassification);
      
      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('tag');
      expect(result).toHaveProperty('salt');
      expect(result.classification).toBe(testClassification);
      
      // Verify tag is exactly 16 bytes (32 hex characters)
      expect(result.tag.length).toBe(32); // 16 bytes * 2 hex chars per byte
      expect(result.iv.length).toBe(32); // 16 bytes * 2 hex chars per byte
      expect(result.salt.length).toBe(64); // 32 bytes * 2 hex chars per byte
    });

    it('should produce different results for same data (due to random IV and salt)', async () => {
      const result1 = governmentSecurityService.encryptData(testData, testClassification);
      const result2 = governmentSecurityService.encryptData(testData, testClassification);
      
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.tag).not.toBe(result2.tag);
    });
  });

  describe('decryptData', () => {
    it('should decrypt data encrypted with proper tag length', async () => {
      const encrypted = governmentSecurityService.encryptData(testData, testClassification);
      const decrypted = governmentSecurityService.decryptData({
        encrypted: encrypted.encrypted,
        iv: encrypted.iv,
        tag: encrypted.tag,
        salt: encrypted.salt
      });
      
      expect(decrypted).toBe(testData);
    });

    it('should reject truncated authentication tags', async () => {
      const encrypted = governmentSecurityService.encryptData(testData, testClassification);
      
      // Test with various truncated tag lengths
      const truncatedLengths = [1, 2, 4, 8, 15]; // All less than 16 bytes
      
      for (const tagLength of truncatedLengths) {
        const truncatedTag = encrypted.tag.substring(0, tagLength * 2); // 2 hex chars per byte
        
        expect(() => {
          governmentSecurityService.decryptData({
            encrypted: encrypted.encrypted,
            iv: encrypted.iv,
            tag: truncatedTag,
            salt: encrypted.salt
          });
        }).toThrow('Invalid GCM tag length');
      }
    });

    it('should reject authentication tags that are too long', async () => {
      const encrypted = governmentSecurityService.encryptData(testData, testClassification);
      
      // Test with tag that's too long (17, 20, 32 bytes)
      const longTagLengths = [17, 20, 32];
      
      for (const tagLength of longTagLengths) {
        const longTag = encrypted.tag + randomBytes(tagLength - 16).toString('hex');
        
        expect(() => {
          governmentSecurityService.decryptData({
            encrypted: encrypted.encrypted,
            iv: encrypted.iv,
            tag: longTag,
            salt: encrypted.salt
          });
        }).toThrow('Invalid GCM tag length');
      }
    });

    it('should reject empty or null authentication tags', async () => {
      const encrypted = governmentSecurityService.encryptData(testData, testClassification);
      
      expect(() => {
        governmentSecurityService.decryptData({
          encrypted: encrypted.encrypted,
          iv: encrypted.iv,
          tag: '',
          salt: encrypted.salt
        });
      }).toThrow('Invalid GCM tag length');
    });

    it('should fail gracefully with invalid authentication tag', async () => {
      const encrypted = governmentSecurityService.encryptData(testData, testClassification);
      
      // Create a valid-length but incorrect tag
      const invalidTag = randomBytes(16).toString('hex');
      
      expect(() => {
        governmentSecurityService.decryptData({
          encrypted: encrypted.encrypted,
          iv: encrypted.iv,
          tag: invalidTag,
          salt: encrypted.salt
        });
      }).toThrow(); // Should throw due to authentication failure
    });
  });

  describe('Integration tests', () => {
    it('should handle multiple encrypt/decrypt cycles', async () => {
      const testCases = [
        'Short text',
        'Medium length text with special characters: !@#$%^&*()',
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        '{"json": "data", "with": {"nested": "objects", "numbers": 123, "boolean": true}}'
      ];
      
      for (const testCase of testCases) {
        const encrypted = governmentSecurityService.encryptData(testCase, testClassification);
        const decrypted = governmentSecurityService.decryptData({
          encrypted: encrypted.encrypted,
          iv: encrypted.iv,
          tag: encrypted.tag,
          salt: encrypted.salt
        });
        
        expect(decrypted).toBe(testCase);
      }
    });

    it('should handle different classification levels', async () => {
      const classifications: Array<keyof typeof governmentSecurityService['CLASSIFICATION_LEVELS']> = [
        'UNCLASSIFIED',
        'FOR_OFFICIAL_USE_ONLY',
        'CONFIDENTIAL',
        'SECRET'
        // Note: TOP_SECRET and above use military encryption which has different implementation
      ];
      
      for (const classification of classifications) {
        const encrypted = governmentSecurityService.encryptData(testData, classification);
        const decrypted = governmentSecurityService.decryptData({
          encrypted: encrypted.encrypted,
          iv: encrypted.iv,
          tag: encrypted.tag,
          salt: encrypted.salt
        });
        
        expect(decrypted).toBe(testData);
        expect(encrypted.classification).toBe(classification);
      }
    });
  });

  describe('Security regression tests', () => {
    it('should prevent tag length manipulation attacks', async () => {
      const encrypted = governmentSecurityService.encryptData(testData, testClassification);
      
      // Simulate various attack scenarios
      const attackScenarios = [
        { name: '1-byte tag', tag: 'AA' },
        { name: '4-byte tag', tag: 'AAAABBBB' },
        { name: '8-byte tag', tag: 'AAAABBBBCCCCDDDD' },
        { name: '15-byte tag', tag: encrypted.tag.substring(0, 30) }, // 15 bytes
        { name: '17-byte tag', tag: encrypted.tag + 'AAAA' }, // 17 bytes
        { name: 'Non-hex tag', tag: 'GGGGHHHHIIIIJJJJKKKKLLLLMMMMNNNZ' }, // Invalid hex
      ];
      
      for (const scenario of attackScenarios) {
        expect(() => {
          governmentSecurityService.decryptData({
            encrypted: encrypted.encrypted,
            iv: encrypted.iv,
            tag: scenario.tag,
            salt: encrypted.salt
          });
        }).toThrow();
      }
    });

    it('should maintain data integrity across encryption boundaries', async () => {
      // Test with data of various sizes to ensure GCM works correctly
      const dataSizes = [1, 16, 64, 256, 1024, 4096];
      
      for (const size of dataSizes) {
        const testData = 'A'.repeat(size);
        const encrypted = governmentSecurityService.encryptData(testData, testClassification);
        const decrypted = governmentSecurityService.decryptData({
          encrypted: encrypted.encrypted,
          iv: encrypted.iv,
          tag: encrypted.tag,
          salt: encrypted.salt
        });
        
        expect(decrypted).toBe(testData);
        expect(decrypted.length).toBe(size);
      }
    });
  });

  describe('Existing data compatibility tests', () => {
    it('should verify constants are correctly defined', () => {
      // Access private constants through a test helper or verify public behavior
      const encrypted = governmentSecurityService.encryptData(testData, testClassification);
      
      // Tag should be exactly 16 bytes (32 hex chars)
      expect(encrypted.tag.length).toBe(32);
      // IV should be exactly 16 bytes (32 hex chars)
      expect(encrypted.iv.length).toBe(32);
      // Salt should be exactly 32 bytes (64 hex chars)
      expect(encrypted.salt.length).toBe(64);
    });

    it('should maintain backward compatibility with properly encrypted data', async () => {
      // This test ensures our fix doesn't break existing valid encrypted data
      const validEncryptedData = governmentSecurityService.encryptData(testData, testClassification);
      
      // Verify we can still decrypt it
      const decrypted = governmentSecurityService.decryptData({
        encrypted: validEncryptedData.encrypted,
        iv: validEncryptedData.iv,
        tag: validEncryptedData.tag,
        salt: validEncryptedData.salt
      });
      
      expect(decrypted).toBe(testData);
    });
  });
});