/**
 * Threat Detection Worker
 * 
 * Dedicated worker thread for high-frequency threat detection analysis
 * without blocking the main event loop. Implements explicit latency budgets
 * and validates actual response times.
 * 
 * Features:
 * - <100ms threat detection with enforced latency budgets
 * - Real-time analysis without main thread blocking
 * - Adaptive throttling based on actual latency measurements
 * - Threat correlation and pattern analysis
 * - Emergency response capabilities
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { performance } from 'perf_hooks';

interface ThreatDetectionConfig {
  latencyBudget: number;          // Maximum allowed latency in milliseconds
  analysisFrequency: number;      // How often to perform threat analysis (Hz)
  maxConcurrentAnalyses: number;  // Maximum concurrent threat analyses
  emergencyThreshold: number;     // Threat score threshold for emergency response
  adaptiveThrottling: boolean;    // Enable adaptive throttling
}

interface ThreatAnalysisRequest {
  id: string;
  timestamp: bigint;
  data: {
    ipAddress: string;
    requestPattern: any;
    userData?: any;
    securityContext?: any;
  };
  priority: 'low' | 'medium' | 'high' | 'emergency';
}

interface ThreatAnalysisResult {
  requestId: string;
  threatScore: number;
  threatType: string[];
  severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  responseTime: number;           // Actual response time in milliseconds
  detectionTime: bigint;          // Nanosecond timestamp of detection
  mitigationActions: string[];
  confident: boolean;
  metadata: any;
}

interface LatencyMeasurement {
  requestId: string;
  startTime: bigint;
  endTime: bigint;
  latency: number;
  budgetMet: boolean;
  budgetOverrun: number;
}

/**
 * Threat Detection Worker
 * Runs high-frequency threat analysis in dedicated thread
 */
class ThreatDetectionWorker {
  private config: ThreatDetectionConfig;
  private isRunning = false;
  private activeAnalyses = new Map<string, bigint>();
  private latencyHistory: LatencyMeasurement[] = [];
  private threatQueue: ThreatAnalysisRequest[] = [];
  private processingQueue = false;
  
  // Performance tracking
  private analysisCount = 0;
  private emergencyCount = 0;
  private budgetViolations = 0;
  private averageLatency = 0;
  private maxLatency = 0;
  private lastPerformanceReport = process.hrtime.bigint();
  
  // Adaptive throttling
  private currentConcurrency = 1;
  private throttleLevel = 0; // 0 = no throttling, 1 = maximum throttling
  
  constructor(config: ThreatDetectionConfig) {
    this.config = {
      latencyBudget: 100,           // 100ms default budget
      analysisFrequency: 500,       // 500 Hz analysis frequency
      maxConcurrentAnalyses: 10,    // Max 10 concurrent analyses
      emergencyThreshold: 0.8,      // 80% threat score triggers emergency
      adaptiveThrottling: true,
      ...config
    };
  }
  
  /**
   * Start threat detection worker
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log(`[ThreatWorker] Starting with ${this.config.latencyBudget}ms budget at ${this.config.analysisFrequency} Hz`);
    this.isRunning = true;
    
    // Start threat queue processing
    this.startQueueProcessing();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    console.log('[ThreatWorker] Threat detection worker ready');
  }
  
  /**
   * Stop threat detection worker
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('[ThreatWorker] Stopped');
  }
  
  /**
   * Process threat analysis request
   */
  async analyzeThreat(request: ThreatAnalysisRequest): Promise<ThreatAnalysisResult> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Check if we're within concurrent analysis limits
      if (this.activeAnalyses.size >= this.config.maxConcurrentAnalyses) {
        // Queue the request if we're at capacity
        this.threatQueue.push(request);
        throw new Error('Analysis queue full - request queued');
      }
      
      // Track active analysis
      this.activeAnalyses.set(request.id, startTime);
      
      // Perform threat analysis with latency budget enforcement
      const result = await this.performThreatAnalysis(request, startTime);
      
      // Measure latency
      const endTime = process.hrtime.bigint();
      const latency = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
      
      // Record latency measurement
      this.recordLatencyMeasurement(request.id, startTime, endTime, latency);
      
      // Update performance tracking
      this.updatePerformanceTracking(latency, result.threatScore);
      
      // Remove from active analyses
      this.activeAnalyses.delete(request.id);
      
      return {
        ...result,
        responseTime: latency,
        detectionTime: endTime
      };
      
    } catch (error) {
      console.error('[ThreatWorker] Analysis error:', error);
      this.activeAnalyses.delete(request.id);
      
      // Return safe default result
      return {
        requestId: request.id,
        threatScore: 0,
        threatType: ['analysis_error'],
        severity: 'low',
        responseTime: Number(process.hrtime.bigint() - startTime) / 1_000_000,
        detectionTime: process.hrtime.bigint(),
        mitigationActions: [],
        confident: false,
        metadata: { error: error.message }
      };
    }
  }
  
  /**
   * Perform the actual threat analysis with latency budget
   */
  private async performThreatAnalysis(
    request: ThreatAnalysisRequest, 
    startTime: bigint
  ): Promise<Omit<ThreatAnalysisResult, 'responseTime' | 'detectionTime'>> {
    
    // Implement time-boxed analysis to enforce latency budget
    const budgetPromise = new Promise<ThreatAnalysisResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Analysis exceeded ${this.config.latencyBudget}ms budget`));
      }, this.config.latencyBudget);
      
      // Perform analysis
      this.doThreatAnalysis(request).then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      }).catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
    
    return await budgetPromise;
  }
  
  /**
   * Core threat analysis logic
   */
  private async doThreatAnalysis(request: ThreatAnalysisRequest): Promise<Omit<ThreatAnalysisResult, 'responseTime' | 'detectionTime'>> {
    const { data } = request;
    let threatScore = 0;
    const threatTypes: string[] = [];
    const mitigationActions: string[] = [];
    
    // IP-based analysis
    if (this.isKnownMaliciousIP(data.ipAddress)) {
      threatScore += 0.4;
      threatTypes.push('malicious_ip');
      mitigationActions.push('block_ip');
    }
    
    // Request pattern analysis
    if (this.detectSuspiciousPattern(data.requestPattern)) {
      threatScore += 0.3;
      threatTypes.push('suspicious_pattern');
      mitigationActions.push('rate_limit');
    }
    
    // Authentication analysis
    if (data.userData && this.detectAuthenticationThreats(data.userData)) {
      threatScore += 0.5;
      threatTypes.push('auth_threat');
      mitigationActions.push('require_mfa');
    }
    
    // Behavioral analysis
    if (this.detectAnomalousBehavior(data)) {
      threatScore += 0.2;
      threatTypes.push('anomalous_behavior');
      mitigationActions.push('monitor_closely');
    }
    
    // Determine severity
    let severity: ThreatAnalysisResult['severity'] = 'low';
    if (threatScore >= 0.8) severity = 'emergency';
    else if (threatScore >= 0.6) severity = 'critical';
    else if (threatScore >= 0.4) severity = 'high';
    else if (threatScore >= 0.2) severity = 'medium';
    
    // Emergency response if threshold exceeded
    if (threatScore >= this.config.emergencyThreshold) {
      this.triggerEmergencyResponse(request, threatScore);
    }
    
    return {
      requestId: request.id,
      threatScore,
      threatType: threatTypes,
      severity,
      mitigationActions,
      confident: threatScore > 0.3,
      metadata: {
        analysisTimestamp: process.hrtime.bigint(),
        workerLoad: this.activeAnalyses.size,
        confidence: threatScore > 0.3 ? 'high' : 'low'
      }
    };
  }
  
  /**
   * Start processing threat queue
   */
  private startQueueProcessing(): void {
    const processQueue = async () => {
      if (!this.isRunning || this.processingQueue) return;
      
      this.processingQueue = true;
      
      try {
        while (this.threatQueue.length > 0 && this.activeAnalyses.size < this.config.maxConcurrentAnalyses) {
          const request = this.threatQueue.shift();
          if (request) {
            // Process request asynchronously
            this.analyzeThreat(request).then((result) => {
              if (parentPort) {
                parentPort.postMessage({
                  type: 'threat_analysis_complete',
                  data: result
                });
              }
            }).catch((error) => {
              console.error('[ThreatWorker] Queue processing error:', error);
            });
          }
        }
      } finally {
        this.processingQueue = false;
      }
      
      // Schedule next queue processing
      setTimeout(processQueue, 1000 / this.config.analysisFrequency);
    };
    
    processQueue();
  }
  
  /**
   * Record latency measurement and check budget compliance
   */
  private recordLatencyMeasurement(requestId: string, startTime: bigint, endTime: bigint, latency: number): void {
    const budgetMet = latency <= this.config.latencyBudget;
    const budgetOverrun = budgetMet ? 0 : latency - this.config.latencyBudget;
    
    const measurement: LatencyMeasurement = {
      requestId,
      startTime,
      endTime,
      latency,
      budgetMet,
      budgetOverrun
    };
    
    this.latencyHistory.push(measurement);
    
    // Keep only recent measurements
    if (this.latencyHistory.length > 1000) {
      this.latencyHistory.shift();
    }
    
    // Track budget violations
    if (!budgetMet) {
      this.budgetViolations++;
      console.warn(`[ThreatWorker] Budget violation: ${latency.toFixed(2)}ms (budget: ${this.config.latencyBudget}ms)`);
      
      // Implement adaptive throttling
      if (this.config.adaptiveThrottling) {
        this.adaptThrottling();
      }
    }
  }
  
  /**
   * Update performance tracking
   */
  private updatePerformanceTracking(latency: number, threatScore: number): void {
    this.analysisCount++;
    
    if (threatScore >= this.config.emergencyThreshold) {
      this.emergencyCount++;
    }
    
    // Update latency statistics
    this.averageLatency = (this.averageLatency * (this.analysisCount - 1) + latency) / this.analysisCount;
    this.maxLatency = Math.max(this.maxLatency, latency);
  }
  
  /**
   * Implement adaptive throttling based on performance
   */
  private adaptThrottling(): void {
    const recentViolations = this.latencyHistory.slice(-100).filter(m => !m.budgetMet).length;
    const violationRate = recentViolations / 100;
    
    if (violationRate > 0.1) { // More than 10% violations
      this.throttleLevel = Math.min(this.throttleLevel + 0.1, 1.0);
      this.currentConcurrency = Math.max(1, Math.floor(this.config.maxConcurrentAnalyses * (1 - this.throttleLevel)));
      
      console.log(`[ThreatWorker] Adaptive throttling: ${violationRate.toFixed(2)} violation rate, reduced concurrency to ${this.currentConcurrency}`);
    } else if (violationRate < 0.05) { // Less than 5% violations
      this.throttleLevel = Math.max(this.throttleLevel - 0.1, 0);
      this.currentConcurrency = Math.floor(this.config.maxConcurrentAnalyses * (1 - this.throttleLevel));
    }
  }
  
  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    const monitoringInterval = 5000; // 5 seconds
    
    const monitor = () => {
      if (!this.isRunning) return;
      
      const currentTime = process.hrtime.bigint();
      const elapsedSeconds = Number(currentTime - this.lastPerformanceReport) / 1_000_000_000;
      const analysisRate = this.analysisCount / elapsedSeconds;
      
      console.log(`[ThreatWorker] Performance: ${analysisRate.toFixed(2)} analyses/sec, avg latency: ${this.averageLatency.toFixed(2)}ms, budget violations: ${this.budgetViolations}`);
      
      // Send performance report to main thread
      if (parentPort) {
        parentPort.postMessage({
          type: 'performance_report',
          data: {
            analysisCount: this.analysisCount,
            analysisRate,
            averageLatency: this.averageLatency,
            maxLatency: this.maxLatency,
            budgetViolations: this.budgetViolations,
            emergencyCount: this.emergencyCount,
            currentConcurrency: this.currentConcurrency,
            throttleLevel: this.throttleLevel,
            queueSize: this.threatQueue.length
          }
        });
      }
      
      setTimeout(monitor, monitoringInterval);
    };
    
    setTimeout(monitor, monitoringInterval);
  }
  
  /**
   * Trigger emergency response for high-threat scenarios
   */
  private triggerEmergencyResponse(request: ThreatAnalysisRequest, threatScore: number): void {
    console.error(`[ThreatWorker] EMERGENCY: Threat score ${threatScore} from ${request.data.ipAddress}`);
    
    if (parentPort) {
      parentPort.postMessage({
        type: 'emergency_threat',
        data: {
          requestId: request.id,
          threatScore,
          ipAddress: request.data.ipAddress,
          timestamp: process.hrtime.bigint()
        }
      });
    }
  }
  
  // Threat analysis helper methods
  private isKnownMaliciousIP(ip: string): boolean {
    // Simplified implementation - in real system would check threat intelligence
    const maliciousPatterns = ['192.168.', '10.0.', '172.16.'];
    return maliciousPatterns.some(pattern => ip.startsWith(pattern));
  }
  
  private detectSuspiciousPattern(pattern: any): boolean {
    // Simplified pattern analysis
    return pattern && (pattern.requestRate > 100 || pattern.errorRate > 0.5);
  }
  
  private detectAuthenticationThreats(userData: any): boolean {
    // Simplified auth threat detection
    return userData && (userData.failedAttempts > 5 || userData.suspiciousLogin);
  }
  
  private detectAnomalousBehavior(data: any): boolean {
    // Simplified anomaly detection
    return data && data.requestPattern && data.requestPattern.anomalyScore > 0.7;
  }
  
  /**
   * Get current performance statistics
   */
  getStats() {
    return {
      analysisCount: this.analysisCount,
      emergencyCount: this.emergencyCount,
      budgetViolations: this.budgetViolations,
      averageLatency: this.averageLatency,
      maxLatency: this.maxLatency,
      currentConcurrency: this.currentConcurrency,
      throttleLevel: this.throttleLevel,
      queueSize: this.threatQueue.length,
      activeAnalyses: this.activeAnalyses.size
    };
  }
}

// Worker thread execution
if (!isMainThread && parentPort) {
  console.log('[ThreatWorker] Threat detection worker started');
  
  const config: ThreatDetectionConfig = workerData || {};
  const worker = new ThreatDetectionWorker(config);
  
  // Handle messages from main thread
  parentPort.on('message', async (message) => {
    switch (message.type) {
      case 'start':
        await worker.start();
        parentPort!.postMessage({ type: 'started' });
        break;
        
      case 'stop':
        await worker.stop();
        parentPort!.postMessage({ type: 'stopped' });
        break;
        
      case 'analyze_threat':
        try {
          const result = await worker.analyzeThreat(message.data);
          parentPort!.postMessage({ 
            type: 'threat_analysis_complete', 
            data: result 
          });
        } catch (error) {
          parentPort!.postMessage({ 
            type: 'threat_analysis_error', 
            data: { requestId: message.data.id, error: error.message } 
          });
        }
        break;
        
      case 'get_stats':
        parentPort!.postMessage({ 
          type: 'stats', 
          data: worker.getStats() 
        });
        break;
        
      default:
        console.warn('[ThreatWorker] Unknown message type:', message.type);
    }
  });
  
  // Handle worker termination
  process.on('SIGTERM', async () => {
    await worker.stop();
    process.exit(0);
  });
  
  console.log('[ThreatWorker] Worker ready for threat analysis');
}

export { ThreatDetectionWorker, ThreatDetectionConfig, ThreatAnalysisRequest, ThreatAnalysisResult };