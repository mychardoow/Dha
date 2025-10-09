/**
 * Server Storage Configuration
 * Optimized for production deployment
 */

export const storageConfig = {
  chunks: {
    maxSize: 5 * 1024 * 1024, // 5MB chunk size
    concurrent: 3, // Number of concurrent chunk uploads
    retryAttempts: 3
  },
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB max file size
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    storageQuota: 500 * 1024 * 1024 // 500MB per user
  },
  optimization: {
    compression: true,
    deduplication: true,
    caching: true
  },
  security: {
    validateContent: true,
    scanForMalware: true,
    enforceQuota: true
  }
};

// Export type for type safety
export type StorageConfigType = typeof storageConfig;