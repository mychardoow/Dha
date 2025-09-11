import crypto from 'crypto';

interface PrivacyConfig {
  enabled: boolean;
  ipAnonymization: 'hash' | 'mask' | 'remove';
  usernameAnonymization: 'hash' | 'mask' | 'remove';
  retainLastOctets: number; // For IP masking
}

class PrivacyProtectionService {
  private config: PrivacyConfig = {
    enabled: true,
    ipAnonymization: 'mask',
    usernameAnonymization: 'hash',
    retainLastOctets: 1
  };

  private saltCache = new Map<string, string>();

  constructor() {
    // Load config from environment or defaults
    this.config.enabled = process.env.PRIVACY_PROTECTION_ENABLED !== 'false';
    this.config.ipAnonymization = (process.env.IP_ANONYMIZATION as any) || 'mask';
    this.config.usernameAnonymization = (process.env.USERNAME_ANONYMIZATION as any) || 'hash';
  }

  /**
   * Anonymize IP address based on configuration
   */
  anonymizeIP(ipAddress: string | undefined | null): string | undefined {
    if (!ipAddress || !this.config.enabled) {
      return ipAddress || undefined;
    }

    switch (this.config.ipAnonymization) {
      case 'remove':
        return undefined;
      
      case 'hash':
        return this.hashValue(ipAddress, 'ip');
      
      case 'mask':
      default:
        return this.maskIP(ipAddress);
    }
  }

  /**
   * Anonymize username based on configuration
   */
  anonymizeUsername(username: string | undefined | null): string | undefined {
    if (!username || !this.config.enabled) {
      return username || undefined;
    }

    switch (this.config.usernameAnonymization) {
      case 'remove':
        return undefined;
      
      case 'mask':
        return this.maskUsername(username);
      
      case 'hash':
      default:
        return this.hashValue(username, 'username');
    }
  }

  /**
   * Anonymize user ID by hashing
   */
  anonymizeUserId(userId: string | undefined | null): string | undefined {
    if (!userId || !this.config.enabled) {
      return userId || undefined;
    }

    return this.hashValue(userId, 'userid');
  }

  /**
   * Mask IP address by replacing last octets with XXX
   */
  private maskIP(ip: string): string {
    if (ip.includes(':')) {
      // IPv6 - mask last segments
      const segments = ip.split(':');
      const maskCount = Math.max(1, 8 - this.config.retainLastOctets);
      for (let i = segments.length - maskCount; i < segments.length; i++) {
        if (i >= 0) segments[i] = 'XXXX';
      }
      return segments.join(':');
    } else {
      // IPv4 - mask last octets
      const octets = ip.split('.');
      const maskCount = Math.max(1, 4 - this.config.retainLastOctets);
      for (let i = octets.length - maskCount; i < octets.length; i++) {
        if (i >= 0) octets[i] = 'XXX';
      }
      return octets.join('.');
    }
  }

  /**
   * Mask username by showing only first and last characters
   */
  private maskUsername(username: string): string {
    if (username.length <= 2) {
      return 'XXXXX';
    }
    const first = username.substring(0, 1);
    const last = username.substring(username.length - 1);
    const middle = 'X'.repeat(Math.min(5, username.length - 2));
    return `${first}${middle}${last}`;
  }

  /**
   * Create consistent hash for a value with salt
   */
  private hashValue(value: string, context: string): string {
    const salt = this.getSalt(context);
    const hash = crypto.createHash('sha256');
    hash.update(value + salt);
    return hash.digest('hex').substring(0, 8); // Return first 8 chars for readability
  }

  /**
   * Get or create salt for consistent hashing
   */
  private getSalt(context: string): string {
    if (!this.saltCache.has(context)) {
      // Use environment variable or generate a consistent salt
      const envSalt = process.env[`PRIVACY_SALT_${context.toUpperCase()}`];
      if (envSalt) {
        this.saltCache.set(context, envSalt);
      } else {
        // Generate a session-consistent salt (same for entire application run)
        const salt = crypto.randomBytes(16).toString('hex');
        this.saltCache.set(context, salt);
      }
    }
    return this.saltCache.get(context)!;
  }

  /**
   * Anonymize security event data
   */
  anonymizeSecurityEvent(event: {
    eventType?: string;
    severity?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
    location?: string;
    [key: string]: any; // Allow additional fields
  }) {
    return {
      ...event,
      userId: this.anonymizeUserId(event.userId),
      ipAddress: this.anonymizeIP(event.ipAddress),
      userAgent: this.anonymizeUserAgent(event.userAgent),
      details: this.anonymizeEventDetails(event.details),
      location: event.location // Keep location as-is for now, could be anonymized if needed
    };
  }

  /**
   * Anonymize user agent string
   */
  private anonymizeUserAgent(userAgent: string | undefined): string | undefined {
    if (!userAgent || !this.config.enabled) {
      return userAgent;
    }

    // Remove potentially identifying information while keeping basic browser info
    return userAgent
      .replace(/\d+\.\d+\.\d+\.\d+/g, 'XXX.XXX.XXX.XXX') // Remove version numbers
      .replace(/[A-Z0-9]{8,}/g, 'XXXXXXXX') // Remove long identifiers
      .substring(0, 100); // Limit length
  }

  /**
   * Anonymize event details that might contain sensitive info
   */
  private anonymizeEventDetails(details: any): any {
    if (!details || !this.config.enabled) {
      return details;
    }

    const sensitiveFields = ['email', 'phone', 'idNumber', 'passportNumber', 'address'];
    const anonymized = { ...details };

    for (const field of sensitiveFields) {
      if (anonymized[field]) {
        anonymized[field] = this.maskSensitiveField(anonymized[field]);
      }
    }

    return anonymized;
  }

  /**
   * Mask sensitive field values
   */
  private maskSensitiveField(value: string): string {
    if (value.length <= 4) {
      return 'XXXX';
    }
    const first = value.substring(0, 2);
    const last = value.substring(value.length - 2);
    const middle = 'X'.repeat(Math.min(6, value.length - 4));
    return `${first}${middle}${last}`;
  }

  /**
   * Update privacy configuration
   */
  updateConfig(newConfig: Partial<PrivacyConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current privacy configuration
   */
  getConfig(): PrivacyConfig {
    return { ...this.config };
  }
}

export const privacyProtectionService = new PrivacyProtectionService();