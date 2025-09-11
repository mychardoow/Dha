import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { privacyProtectionService } from "../services/privacy-protection";

// Rate limiting configurations
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: "Too many authentication attempts",
    message: "Please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    // Log security event for rate limiting
    const securityEvent = {
      eventType: "rate_limit_exceeded",
      severity: "medium",
      details: {
        endpoint: req.path,
        limit: "auth_limit_exceeded"
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent")
    };
    await storage.createSecurityEvent(privacyProtectionService.anonymizeSecurityEvent(securityEvent) as any);
    
    res.status(429).json({
      error: "Too many authentication attempts",
      message: "Please try again after 15 minutes"
    });
  }
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many API requests",
    message: "API rate limit exceeded"
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    error: "Upload limit exceeded",
    message: "Too many file uploads. Please try again later."
  }
});

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:", "localhost:*", "*:5000"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Fraud detection middleware
export async function fraudDetection(req: Request, res: Response, next: NextFunction) {
  try {
    const suspiciousIndicators: string[] = [];
    const riskScore = calculateRiskScore(req, suspiciousIndicators);
    
    // Log the request for analysis
    if (req.user) {
      const securityEvent = {
        userId: req.user.id,
        eventType: "request_analyzed",
        severity: riskScore > 70 ? "high" : riskScore > 40 ? "medium" : "low",
        details: {
          path: req.path,
          method: req.method,
          riskScore,
          indicators: suspiciousIndicators
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      };
      await storage.createSecurityEvent(privacyProtectionService.anonymizeSecurityEvent(securityEvent) as any);
    }
    
    // Create fraud alert if risk is high
    if (riskScore > 70) {
      if (req.user?.id) {
        const fraudDetails = {
          path: req.path,
          method: req.method,
          indicators: suspiciousIndicators,
          ipAddress: privacyProtectionService.anonymizeIP(req.ip),
          userAgent: privacyProtectionService.anonymizeSecurityEvent({ userAgent: req.get("User-Agent") }).userAgent
        };
        await storage.createFraudAlert({
          userId: privacyProtectionService.anonymizeUserId(req.user.id) || req.user.id,
          alertType: "high_risk_request",
          riskScore,
          details: fraudDetails
        });
      }
      
      // Optionally block high-risk requests
      if (riskScore > 90) {
        return res.status(403).json({
          error: "Request blocked",
          message: "Request has been blocked due to high fraud risk"
        });
      }
    }
    
    next();
  } catch (error) {
    console.error("Fraud detection error:", error);
    next(); // Continue processing even if fraud detection fails
  }
}

function calculateRiskScore(req: Request, indicators: string[]): number {
  let score = 0;
  
  // Check for suspicious patterns
  const userAgent = req.get("User-Agent") || "";
  const ip = req.ip;
  
  // Unusual user agent patterns
  if (!userAgent || userAgent.length < 10) {
    score += 30;
    indicators.push("suspicious_user_agent");
  }
  
  // Bot-like user agents
  if (/bot|crawler|spider|scraper/i.test(userAgent)) {
    score += 40;
    indicators.push("bot_user_agent");
  }
  
  // Tor or proxy indicators (basic check)
  if (req.headers["x-forwarded-for"]) {
    score += 20;
    indicators.push("proxy_detected");
  }
  
  // Unusual request patterns
  if (req.method === "POST" && !req.headers["content-type"]) {
    score += 25;
    indicators.push("missing_content_type");
  }
  
  // Check for rapid requests (would need session storage for full implementation)
  const now = Date.now();
  // This is a simplified check - in production, use Redis or similar for proper rate tracking
  
  return Math.min(score, 100);
}

// IP whitelist/blacklist middleware
export function ipFilter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip;
  
  // In production, these would come from environment variables or database
  const blacklistedIPs = (process.env.BLACKLISTED_IPS || "").split(",").filter(Boolean);
  const whitelistedIPs = (process.env.WHITELISTED_IPS || "").split(",").filter(Boolean);
  
  if (ip && blacklistedIPs.includes(ip)) {
    const securityEvent = {
      eventType: "blacklisted_ip_access",
      severity: "high",
      details: { ip: privacyProtectionService.anonymizeIP(ip), blocked: true },
      ipAddress: ip,
      userAgent: req.get("User-Agent")
    };
    storage.createSecurityEvent(privacyProtectionService.anonymizeSecurityEvent(securityEvent) as any);
    
    return res.status(403).json({
      error: "Access denied",
      message: "Your IP address has been blocked"
    });
  }
  
  next();
}

// Request logging middleware
export async function securityLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on("finish", async () => {
    const duration = Date.now() - start;
    
    // Log security-relevant requests
    if (req.path.startsWith("/api/") && (res.statusCode >= 400 || duration > 5000)) {
      const securityEvent = {
        userId: req.user?.id,
        eventType: res.statusCode >= 400 ? "request_error" : "slow_request",
        severity: res.statusCode >= 500 ? "high" : res.statusCode >= 400 ? "medium" : "low",
        details: {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          duration,
          contentLength: res.get("Content-Length")
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      };
      await storage.createSecurityEvent(privacyProtectionService.anonymizeSecurityEvent(securityEvent) as any);
    }
  });
  
  next();
}
