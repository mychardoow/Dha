import { storage } from "../storage";
import { InsertFraudAlert, InsertSecurityEvent } from "@shared/schema";

export interface FraudAnalysisResult {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  indicators: string[];
  recommendedAction: string;
  shouldBlock: boolean;
}

export interface UserBehaviorData {
  userId: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  deviceFingerprint?: string;
  sessionData?: any;
}

export class FraudDetectionService {
  
  async analyzeUserBehavior(data: UserBehaviorData): Promise<FraudAnalysisResult> {
    const indicators: string[] = [];
    let riskScore = 0;
    
    // Analyze various risk factors
    riskScore += await this.checkLocationAnomaly(data.userId, data.location, indicators);
    riskScore += await this.checkDeviceFingerprint(data.userId, data.deviceFingerprint, indicators);
    riskScore += await this.checkIPReputation(data.ipAddress, indicators);
    riskScore += await this.checkLoginFrequency(data.userId, indicators);
    riskScore += await this.checkUserAgentAnomaly(data.userId, data.userAgent, indicators);
    riskScore += await this.checkTimePatterns(data.userId, indicators);
    
    const riskLevel = this.calculateRiskLevel(riskScore);
    const shouldBlock = riskScore >= 90;
    
    const result: FraudAnalysisResult = {
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      indicators,
      recommendedAction: this.getRecommendedAction(riskLevel, indicators),
      shouldBlock
    };
    
    // Create fraud alert if risk is medium or higher
    if (riskScore >= 40) {
      await this.createFraudAlert(data.userId, result);
    }
    
    // Log security event
    await storage.createSecurityEvent({
      userId: data.userId,
      eventType: "fraud_analysis_completed",
      severity: riskLevel === "critical" ? "high" : riskLevel === "high" ? "medium" : "low",
      details: {
        riskScore,
        riskLevel,
        indicators,
        location: data.location,
        ipAddress: data.ipAddress
      },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      location: data.location
    });
    
    return result;
  }
  
  private async checkLocationAnomaly(userId: string, currentLocation?: string, indicators: string[]): Promise<number> {
    if (!currentLocation) return 0;
    
    try {
      // Get recent security events to analyze location patterns
      const recentEvents = await storage.getSecurityEvents(userId, 50);
      const locationEvents = recentEvents
        .filter(event => event.location && event.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .map(event => event.location);
      
      if (locationEvents.length === 0) return 0;
      
      // Check if current location is significantly different from recent locations
      const isNewLocation = !locationEvents.includes(currentLocation);
      
      if (isNewLocation) {
        indicators.push("unusual_location");
        
        // Calculate distance-based risk (simplified)
        // In production, use geolocation APIs for accurate distance calculation
        const isVeryDistant = this.isLocationDistant(currentLocation, locationEvents[0]);
        
        if (isVeryDistant) {
          indicators.push("distant_location");
          return 35; // High risk for very distant locations
        }
        
        return 20; // Medium risk for new locations
      }
      
      return 0;
    } catch (error) {
      console.error("Location anomaly check error:", error);
      return 0;
    }
  }
  
  private async checkDeviceFingerprint(userId: string, deviceFingerprint?: string, indicators: string[]): Promise<number> {
    if (!deviceFingerprint) return 10; // Slight risk for missing fingerprint
    
    try {
      // Check if this device has been used before
      const recentEvents = await storage.getSecurityEvents(userId, 100);
      const deviceEvents = recentEvents.filter(event => 
        event.details && 
        typeof event.details === 'object' && 
        'deviceFingerprint' in event.details
      );
      
      const knownDevices = deviceEvents.map(event => 
        (event.details as any).deviceFingerprint
      ).filter(Boolean);
      
      if (knownDevices.length === 0) return 0;
      
      if (!knownDevices.includes(deviceFingerprint)) {
        indicators.push("new_device");
        return 25;
      }
      
      return 0;
    } catch (error) {
      console.error("Device fingerprint check error:", error);
      return 0;
    }
  }
  
  private async checkIPReputation(ipAddress: string, indicators: string[]): Promise<number> {
    try {
      // Check if IP is in blacklist
      // In production, integrate with IP reputation services
      const blacklistedIPs = (process.env.BLACKLISTED_IPS || "").split(",");
      
      if (blacklistedIPs.includes(ipAddress)) {
        indicators.push("blacklisted_ip");
        return 50;
      }
      
      // Check for known proxy/VPN patterns
      if (this.isProxyIP(ipAddress)) {
        indicators.push("proxy_vpn_detected");
        return 30;
      }
      
      // Check recent security events for this IP
      const recentEvents = await storage.getSecurityEvents(undefined, 100);
      const ipEvents = recentEvents.filter(event => 
        event.ipAddress === ipAddress && 
        event.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      
      // High activity from single IP
      if (ipEvents.length > 20) {
        indicators.push("high_ip_activity");
        return 25;
      }
      
      // Multiple failed attempts from this IP
      const failedAttempts = ipEvents.filter(event => 
        event.eventType.includes("failed") || event.eventType.includes("blocked")
      );
      
      if (failedAttempts.length > 5) {
        indicators.push("multiple_failed_attempts");
        return 35;
      }
      
      return 0;
    } catch (error) {
      console.error("IP reputation check error:", error);
      return 0;
    }
  }
  
  private async checkLoginFrequency(userId: string, indicators: string[]): Promise<number> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const recentEvents = await storage.getSecurityEvents(userId, 50);
      const loginEvents = recentEvents.filter(event => 
        event.eventType.includes("login") || event.eventType.includes("authentication")
      );
      
      const loginsLastHour = loginEvents.filter(event => event.createdAt > oneHourAgo).length;
      const loginsLastDay = loginEvents.filter(event => event.createdAt > oneDayAgo).length;
      
      if (loginsLastHour > 10) {
        indicators.push("excessive_login_frequency");
        return 40;
      }
      
      if (loginsLastDay > 50) {
        indicators.push("unusual_daily_activity");
        return 30;
      }
      
      return 0;
    } catch (error) {
      console.error("Login frequency check error:", error);
      return 0;
    }
  }
  
  private async checkUserAgentAnomaly(userId: string, userAgent: string, indicators: string[]): Promise<number> {
    try {
      if (!userAgent || userAgent.length < 10) {
        indicators.push("suspicious_user_agent");
        return 25;
      }
      
      // Check for bot patterns
      if (/bot|crawler|spider|scraper/i.test(userAgent)) {
        indicators.push("bot_user_agent");
        return 35;
      }
      
      // Check if user agent differs significantly from recent sessions
      const recentEvents = await storage.getSecurityEvents(userId, 20);
      const userAgents = recentEvents
        .map(event => event.userAgent)
        .filter(Boolean);
      
      if (userAgents.length > 0 && !userAgents.includes(userAgent)) {
        // Different user agent - might indicate session hijacking
        indicators.push("changed_user_agent");
        return 20;
      }
      
      return 0;
    } catch (error) {
      console.error("User agent anomaly check error:", error);
      return 0;
    }
  }
  
  private async checkTimePatterns(userId: string, indicators: string[]): Promise<number> {
    try {
      const now = new Date();
      const hour = now.getHours();
      
      // Check if login is at unusual time (very early morning)
      if (hour >= 2 && hour <= 5) {
        indicators.push("unusual_time");
        return 15;
      }
      
      // Analyze user's typical login patterns
      const recentEvents = await storage.getSecurityEvents(userId, 100);
      const loginEvents = recentEvents
        .filter(event => event.eventType.includes("login"))
        .map(event => event.createdAt.getHours());
      
      if (loginEvents.length >= 10) {
        // Calculate if current hour is unusual for this user
        const hourCounts = loginEvents.reduce((acc, h) => {
          acc[h] = (acc[h] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        
        const currentHourCount = hourCounts[hour] || 0;
        const totalLogins = loginEvents.length;
        
        // If less than 5% of logins happened at this hour, it's unusual
        if (currentHourCount / totalLogins < 0.05) {
          indicators.push("atypical_login_time");
          return 10;
        }
      }
      
      return 0;
    } catch (error) {
      console.error("Time pattern check error:", error);
      return 0;
    }
  }
  
  private calculateRiskLevel(riskScore: number): "low" | "medium" | "high" | "critical" {
    if (riskScore >= 80) return "critical";
    if (riskScore >= 60) return "high";
    if (riskScore >= 30) return "medium";
    return "low";
  }
  
  private getRecommendedAction(riskLevel: string, indicators: string[]): string {
    switch (riskLevel) {
      case "critical":
        return "Block access immediately and require manual verification";
      case "high":
        return "Require additional authentication factors";
      case "medium":
        return "Monitor closely and request email verification";
      case "low":
      default:
        return "Allow access with standard monitoring";
    }
  }
  
  private async createFraudAlert(userId: string, analysis: FraudAnalysisResult): Promise<void> {
    const alert: InsertFraudAlert = {
      userId,
      alertType: `${analysis.riskLevel}_risk_detected`,
      riskScore: analysis.riskScore,
      details: {
        indicators: analysis.indicators,
        recommendedAction: analysis.recommendedAction,
        analysis: analysis
      }
    };
    
    await storage.createFraudAlert(alert);
  }
  
  private isLocationDistant(location1: string, location2: string): boolean {
    // Simplified distance check
    // In production, use proper geolocation services
    const countries1 = this.extractCountry(location1);
    const countries2 = this.extractCountry(location2);
    
    return countries1 !== countries2;
  }
  
  private extractCountry(location: string): string {
    // Simplified country extraction
    // In production, use proper geolocation parsing
    return location.split(",").pop()?.trim() || "";
  }
  
  private isProxyIP(ipAddress: string): boolean {
    // Simplified proxy detection
    // In production, integrate with services like MaxMind or similar
    const proxyPatterns = [
      /^10\./, // Private network
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private network
      /^192\.168\./, // Private network
      /^127\./ // Localhost
    ];
    
    return proxyPatterns.some(pattern => pattern.test(ipAddress));
  }
  
  async getFraudAlerts(userId?: string, resolved?: boolean) {
    return await storage.getFraudAlerts(userId, resolved);
  }
  
  async resolveFraudAlert(alertId: string, resolvedBy: string) {
    await storage.resolveFraudAlert(alertId, resolvedBy);
    
    await storage.createSecurityEvent({
      userId: resolvedBy,
      eventType: "fraud_alert_resolved",
      severity: "low",
      details: { alertId }
    });
  }
}

export const fraudDetectionService = new FraudDetectionService();
