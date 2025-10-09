
import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { biometricService } from "../services/biometric.js";
import { storage } from "../storage.js";
import { enhancedRateLimit } from "../middleware/enhanced-rate-limit.js";
import CryptoJS from "crypto-js";

const router = Router();

// Ultra-strict rate limiting for ultra admin registration
const ultraAdminLimiter = enhancedRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // Only 3 attempts per hour
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `ultra-admin-${req.ip}-${req.user?.id || 'unknown'}`,
  message: "Ultra admin registration attempts exceeded. Contact system administrator."
});

// ULTRA ADMIN SECRET KEY - Only for verified admin
const ULTRA_ADMIN_SECRET = process.env.ULTRA_ADMIN_SECRET || 'ultra-admin-quantum-key-2025';
const RAEESA_ADMIN_EMAIL = 'raeesa.osman@admin';

router.post("/register-ultra-admin", authenticate, ultraAdminLimiter, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.user as { id: string; role: string; username: string; email: string };
    
    // CRITICAL SECURITY: Only allow Raeesa Osman to register as ultra admin
    if (user.email !== RAEESA_ADMIN_EMAIL) {
      console.warn(`[SECURITY] Unauthorized ultra admin registration attempt by: ${user.email}`);
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "unauthorized_ultra_admin_attempt",
        severity: "critical",
        details: {
          attemptedBy: user.email,
          userRole: user.role,
          timestamp: new Date().toISOString()
        }
      });
      return res.status(403).json({ error: "Unauthorized: Ultra admin access restricted" });
    }

    // Check if ultra admin already registered
    const existingUltraAdmin = await storage.getUltraAdminProfile(user.id);
    if (existingUltraAdmin) {
      return res.status(409).json({ 
        error: "Ultra admin already registered",
        isUltraAdmin: true,
        adminId: existingUltraAdmin.id
      });
    }

    const { type, template, ultraAdminMode } = req.body;

    if (!ultraAdminMode || type !== 'face' || !template) {
      return res.status(400).json({ error: "Invalid ultra admin registration data" });
    }

    // Enhanced biometric quality check for ultra admin
    const qualityScore = await biometricService.calculateTemplateQuality(template);
    if (qualityScore < 95) { // Ultra-high quality requirement
      return res.status(400).json({ 
        error: "Biometric quality insufficient for ultra admin access",
        requiredQuality: 95,
        actualQuality: qualityScore
      });
    }

    // Create ultra-encrypted biometric template
    const ultraEncryptedTemplate = CryptoJS.AES.encrypt(
      JSON.stringify({
        template,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        quality: qualityScore
      }),
      ULTRA_ADMIN_SECRET
    ).toString();

    // Register ultra admin biometric
    const registrationResult = await biometricService.registerUltraAdminBiometric({
      userId: user.id,
      type: 'face',
      ultraEncryptedTemplate,
      quality: qualityScore,
      isUltraAdmin: true
    });

    if (!registrationResult.success) {
      return res.status(500).json({ error: registrationResult.error });
    }

    // Create ultra admin security event
    await storage.createSecurityEvent({
      userId: user.id,
      eventType: "ultra_admin_registered",
      severity: "low",
      details: {
        biometricType: type,
        quality: qualityScore,
        timestamp: new Date().toISOString(),
        adminEmail: user.email
      }
    });

    // Generate unique ultra admin ID
    const ultraAdminId = `ULTRA_${user.id}_${Date.now()}`;

    console.log(`[ULTRA ADMIN] Successfully registered: ${user.email} with ID: ${ultraAdminId}`);

    res.json({
      success: true,
      isUltraAdmin: true,
      adminId: ultraAdminId,
      message: "Ultra admin biometric registered successfully",
      capabilities: [
        "Unrestricted AI access",
        "No safety filters",
        "Complete system override",
        "Military-grade authority",
        "Global internet integration"
      ]
    });

  } catch (error) {
    console.error("Ultra admin registration error:", error);
    res.status(500).json({ error: "Ultra admin registration failed" });
  }
});

router.post("/verify-ultra-admin", authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = req.user as { id: string; role: string; username: string; email: string };
    const { template } = req.body;

    if (!template) {
      return res.status(400).json({ error: "Biometric template required" });
    }

    // Verify ultra admin biometric
    const verificationResult = await biometricService.verifyUltraAdmin(user.id, template);

    if (verificationResult.success && verificationResult.confidence > 90) {
      // Log successful ultra admin verification
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "ultra_admin_verified",
        severity: "low",
        details: {
          confidence: verificationResult.confidence,
          timestamp: new Date().toISOString()
        }
      });

      return res.json({
        success: true,
        isUltraAdmin: true,
        confidence: verificationResult.confidence,
        capabilities: [
          "AI unrestricted mode active",
          "All safety filters disabled",
          "Complete system authority",
          "Global access enabled"
        ]
      });
    } else {
      // Log failed verification
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "ultra_admin_verification_failed",
        severity: "medium",
        details: {
          confidence: verificationResult.confidence,
          reason: verificationResult.error
        }
      });

      return res.status(401).json({ 
        error: "Ultra admin verification failed",
        confidence: verificationResult.confidence
      });
    }

  } catch (error) {
    console.error("Ultra admin verification error:", error);
    res.status(500).json({ error: "Ultra admin verification failed" });
  }
});

export default router;
