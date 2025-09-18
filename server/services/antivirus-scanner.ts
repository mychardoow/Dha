import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

export interface AntivirusResult {
  success: boolean;
  isClean: boolean;
  threats: string[];
  scanTime: number;
  engine: string;
  error?: string;
}

export interface ScanOptions {
  quarantine?: boolean;
  enableHeuristics?: boolean;
  maxScanTime?: number; // milliseconds
}

export class AntivirusService {
  private clamAvInstalled: boolean | null = null;
  private isHealthy: boolean = false;
  private lastHealthCheck: Date | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Initialize health check on startup
    this.performHealthCheck();
    // Set up periodic health checks
    setInterval(() => this.performHealthCheck(), this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * PRODUCTION-CRITICAL: Mandatory antivirus scanning with hard enforcement
   * NO HEURISTIC FALLBACK - uploads MUST fail if AV is unavailable
   */
  async scanFile(filePath: string, options: ScanOptions = {}): Promise<AntivirusResult> {
    const startTime = Date.now();
    const maxScanTime = options.maxScanTime || 30000; // 30 seconds default

    try {
      // Check if file exists
      await fs.access(filePath);
      
      // PRODUCTION-CRITICAL: Check if ClamAV is available and healthy
      const clamAvAvailable = await this.checkClamAVAvailability();
      
      if (!clamAvAvailable || !this.isHealthy) {
        // HARD ENFORCEMENT: Fail the upload if antivirus is not available
        const errorMsg = 'PRODUCTION SECURITY VIOLATION: Antivirus scanner is unavailable. File uploads are BLOCKED for security compliance.';
        console.error(errorMsg);
        
        return {
          success: false,
          isClean: false,
          threats: ['Antivirus scanner unavailable - security policy violation'],
          scanTime: Date.now() - startTime,
          engine: 'security_enforcement',
          error: errorMsg
        };
      }
      
      // Perform mandatory ClamAV scanning
      return await this.scanWithClamAV(filePath, options, startTime, maxScanTime);
      
    } catch (error) {
      console.error('Antivirus scan error:', error);
      return {
        success: false,
        isClean: false,
        threats: ['Scan failed'],
        scanTime: Date.now() - startTime,
        engine: 'error',
        error: error instanceof Error ? error.message : 'Unknown scan error'
      };
    }
  }

  /**
   * Check if ClamAV is installed and available
   */
  private async checkClamAVAvailability(): Promise<boolean> {
    if (this.clamAvInstalled !== null) {
      return this.clamAvInstalled;
    }

    try {
      await execAsync('clamscan --version');
      this.clamAvInstalled = true;
      return true;
    } catch (error) {
      console.error('PRODUCTION SECURITY ALERT: ClamAV not available - file uploads will be blocked');
      this.clamAvInstalled = false;
      return false;
    }
  }

  /**
   * PRODUCTION-CRITICAL: Perform comprehensive health check of antivirus system
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Check ClamAV availability
      const clamAvAvailable = await this.checkClamAVAvailability();
      
      if (clamAvAvailable) {
        // Test scan with EICAR test file
        const eicarTestResult = await this.testEicarScan();
        this.isHealthy = eicarTestResult;
      } else {
        this.isHealthy = false;
      }
      
      this.lastHealthCheck = new Date();
      
      if (!this.isHealthy) {
        console.error('PRODUCTION ALERT: Antivirus system health check FAILED');
      } else {
        console.log('Antivirus system health check PASSED');
      }
      
    } catch (error) {
      console.error('Antivirus health check error:', error);
      this.isHealthy = false;
      this.lastHealthCheck = new Date();
    }
  }

  /**
   * Test antivirus with EICAR test file to ensure proper operation
   */
  private async testEicarScan(): Promise<boolean> {
    try {
      // EICAR test string (harmless test virus)
      const eicarTestString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
      const testFilePath = '/tmp/eicar_test.txt';
      
      // Write EICAR test file
      await fs.writeFile(testFilePath, eicarTestString);
      
      // Scan the test file
      const result = await this.scanWithClamAV(testFilePath, {}, Date.now(), 10000);
      
      // Clean up test file
      try {
        await fs.unlink(testFilePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup EICAR test file:', cleanupError);
      }
      
      // EICAR should be detected as a threat
      return result.success && !result.isClean && result.threats.length > 0;
      
    } catch (error) {
      console.error('EICAR test scan failed:', error);
      return false;
    }
  }

  /**
   * Get current health status for monitoring
   */
  getHealthStatus(): {
    isHealthy: boolean;
    clamAvAvailable: boolean;
    lastHealthCheck: Date | null;
    uptime: number;
  } {
    return {
      isHealthy: this.isHealthy,
      clamAvAvailable: this.clamAvInstalled === true,
      lastHealthCheck: this.lastHealthCheck,
      uptime: process.uptime()
    };
  }

  /**
   * Scan file using ClamAV
   */
  private async scanWithClamAV(filePath: string, options: ScanOptions, startTime: number, maxScanTime: number): Promise<AntivirusResult> {
    try {
      const scanCommand = `clamscan --no-summary --infected ${filePath}`;
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Scan timeout')), maxScanTime);
      });

      // Run ClamAV scan with timeout
      const scanPromise = execAsync(scanCommand);
      
      const result = await Promise.race([scanPromise, timeoutPromise]);
      
      return {
        success: true,
        isClean: true,
        threats: [],
        scanTime: Date.now() - startTime,
        engine: 'ClamAV'
      };
    } catch (error: any) {
      const scanTime = Date.now() - startTime;
      
      if (error.message === 'Scan timeout') {
        return {
          success: false,
          isClean: false,
          threats: ['Scan timeout'],
          scanTime,
          engine: 'ClamAV',
          error: 'Scan exceeded maximum time limit'
        };
      }

      // ClamAV returns exit code 1 when threats are found
      if (error.code === 1) {
        const threats = this.parseClamAVOutput(error.stdout || '');
        return {
          success: true,
          isClean: false,
          threats,
          scanTime,
          engine: 'ClamAV'
        };
      }

      throw error; // Re-throw for other errors
    }
  }

  /**
   * Parse ClamAV output to extract threat names
   */
  private parseClamAVOutput(output: string): string[] {
    const threats: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('FOUND')) {
        const match = line.match(/: (.+) FOUND/);
        if (match) {
          threats.push(match[1]);
        }
      }
    }
    
    return threats.length > 0 ? threats : ['Malware detected'];
  }

  /**
   * REMOVED: Heuristic scanning is no longer available in production
   * All file uploads MUST go through proper antivirus scanning
   * This method is kept for reference but will throw an error if called
   */
  private async performHeuristicScan(filePath: string, options: ScanOptions, startTime: number): Promise<AntivirusResult> {
    throw new Error('PRODUCTION SECURITY POLICY VIOLATION: Heuristic scanning is not permitted in production. Only certified antivirus scanning is allowed.');
  }

  /**
   * Check for executable signatures in files
   */
  private containsExecutableSignatures(buffer: Buffer, filePath: string): boolean {
    const fileExt = filePath.toLowerCase().split('.').pop();
    
    // Skip check for known executable types
    if (['exe', 'dll', 'com', 'scr', 'bat', 'cmd'].includes(fileExt || '')) {
      return false;
    }
    
    // Check for MZ header (Windows executable)
    if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
      return true;
    }
    
    // Check for ELF header (Linux executable)
    if (buffer.length >= 4 && 
        buffer[0] === 0x7F && buffer[1] === 0x45 && 
        buffer[2] === 0x4C && buffer[3] === 0x46) {
      return true;
    }
    
    return false;
  }

  /**
   * Check for suspicious patterns in file content
   */
  private containsSuspiciousPatterns(buffer: Buffer): boolean {
    const content = buffer.toString('binary').toLowerCase();
    
    const suspiciousPatterns = [
      // Suspicious commands
      'cmd.exe', 'powershell.exe', 'wscript.exe',
      // Suspicious URLs/domains
      'bit.ly', 'tinyurl.com', 'goo.gl',
      // Suspicious keywords
      'ransomware', 'trojan', 'backdoor',
      // Base64 encoded executables (common in malware)
      'tvqqaa', // MZ header in base64
      // JavaScript eval/unescape (common in web-based attacks)
      'eval(', 'unescape(',
      // Suspicious registry keys
      'hkey_local_machine\\software\\microsoft\\windows\\currentversion\\run'
    ];
    
    return suspiciousPatterns.some(pattern => content.includes(pattern));
  }

  /**
   * Calculate Shannon entropy of file content
   */
  private calculateEntropy(buffer: Buffer): number {
    const byteFreq = new Array(256).fill(0);
    
    // Count byte frequencies
    for (let i = 0; i < buffer.length; i++) {
      byteFreq[buffer[i]]++;
    }
    
    // Calculate entropy
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (byteFreq[i] > 0) {
        const probability = byteFreq[i] / buffer.length;
        entropy -= probability * Math.log2(probability);
      }
    }
    
    return entropy;
  }

  /**
   * Get file hash for threat intelligence lookup
   */
  async getFileHash(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const hash = crypto.createHash(algorithm);
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Quarantine a file by moving it to a secure location
   */
  async quarantineFile(filePath: string): Promise<string> {
    const quarantineDir = process.env.QUARANTINE_DIR || './quarantine';
    const fileName = filePath.split('/').pop() || 'unknown';
    const timestamp = Date.now();
    const quarantinePath = `${quarantineDir}/${timestamp}_${fileName}.quarantine`;
    
    try {
      // Ensure quarantine directory exists
      await fs.mkdir(quarantineDir, { recursive: true });
      
      // Move file to quarantine
      await fs.rename(filePath, quarantinePath);
      
      console.log(`File quarantined: ${filePath} -> ${quarantinePath}`);
      return quarantinePath;
    } catch (error) {
      console.error('Failed to quarantine file:', error);
      throw new Error('Quarantine operation failed');
    }
  }
}

export const antivirusService = new AntivirusService();