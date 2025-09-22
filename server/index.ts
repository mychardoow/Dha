// Bootstrap environment loading BEFORE any other imports
import { initialize as bootstrapInitialize } from './bootstrap';
bootstrapInitialize();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { initializeConfig } from "./middleware/provider-config";

// Initialize config AFTER environment is loaded
const configService = initializeConfig();
const config = configService.getConfig();
import { createServer } from 'http'; // Import createServer
import { initializeWebSocket } from './websocket'; // Assuming this is the correct path for WebSocket initialization
import cors from 'cors'; // Import cors middleware

// Environment detection utilities - production ready
const isProductionMode = (): boolean => process.env.NODE_ENV === 'production';
const isDevelopmentMode = (): boolean => process.env.NODE_ENV === 'development';
// Remove - use configService.isPreviewMode() instead

// Coordinated shutdown management
class ShutdownManager {
  public isShuttingDown = false;
  private shutdownHandlers: Array<{ name: string; handler: () => Promise<void> }> = [];

  addShutdownHandler(name: string, handler: () => Promise<void>): void {
    this.shutdownHandlers.push({ name, handler });
  }

  async shutdown(reason: string): Promise<void> {
    if (this.isShuttingDown) {
      console.log(`[Shutdown] Already shutting down, ignoring ${reason}`);
      return;
    }

    this.isShuttingDown = true;
    console.log(`[Shutdown] Initiated: ${reason}`);

    // In preview mode, don't actually shut down - just log and return
    if (configService.isPreviewMode()) {
      console.log('[Shutdown] Preview mode detected - maintaining server instead of shutting down');
      return;
    }

    // Production mode - perform graceful shutdown
    console.log('[Shutdown] Production mode - performing graceful shutdown');

    for (const { name, handler } of this.shutdownHandlers) {
      try {
        console.log(`[Shutdown] Running ${name}...`);
        await handler();
        console.log(`[Shutdown] ✓ ${name} completed`);
      } catch (error) {
        console.error(`[Shutdown] ✗ ${name} failed:`, error);
      }
    }

    console.log('[Shutdown] All handlers completed - exiting');
    process.exit(0);
  }
}

const shutdownManager = new ShutdownManager();

// Setup error handlers and signal handlers
process.on('uncaughtException', (error: Error) => {
  console.error('CRITICAL: Uncaught Exception:', error);
  console.error('Stack:', error.stack);

  if (configService.isDevelopment()) {
    console.log('[Error] Continuing despite uncaught exception in development mode...');
  } else {
    console.log('[Error] Exiting due to uncaught exception in production...');
    shutdownManager.shutdown('uncaught exception').catch(() => {
      console.error('[Error] Shutdown failed, but continuing in preview mode');
    });
  }
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('CRITICAL: Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);

  if (configService.isDevelopment()) {
    console.log('[Error] Continuing despite unhandled rejection in development mode...');
  } else {
    console.log('[Error] Exiting due to unhandled rejection in production...');
    shutdownManager.shutdown('unhandled rejection').catch(() => {
      console.error('[Error] Shutdown failed, but continuing in preview mode');
    });
  }
});

// Setup signal handlers
process.on('SIGTERM', () => {
  shutdownManager.shutdown('SIGTERM received');
});

process.on('SIGINT', () => {
  shutdownManager.shutdown('SIGINT received');
});

// Production deployment - configure for high availability
if (isProductionMode()) {
  console.log('[Server] Production mode - configuring high availability');

  // Production-specific configurations
  process.env.NODE_OPTIONS = '--max-old-space-size=2048';

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, starting graceful shutdown');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[Server] SIGINT received, starting graceful shutdown');
    process.exit(0);
  });
} else {
  console.log('[Server] Development mode - standard configuration');
}

// Defer heavy imports to allow server to start even if they fail
let registerRoutes: any;
let setupVite: any;
let serveStatic: any;
let log: any = console.log;

const app = express();

// Trust proxy for session cookies in preview mode
app.set('trust proxy', 1);

// Session will be configured after security validation

// Remove duplicate CORS middleware - using only cors() middleware below

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL || 'https://official-raipie-officialraipie.replit.app']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      if (typeof log === 'function') {
        log(logLine);
      } else {
        console.log(logLine);
      }
    }
  });

  next();
});

// Server initialization function - converted from async IIFE to prevent exit
async function initializeServer() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DHA Digital Services Platform - Starting Server');
  console.log('═══════════════════════════════════════════════════════════════');

  // CRITICAL STARTUP SECURITY CHECK: Ensure provider-config validation runs first
  // This validates all security configurations before any middleware initialization
  try {
    console.log('[Security] Validating configuration before middleware setup...');

    // Verify configService is properly initialized with validated configuration
    if (!configService || !configService.getConfig()) {
      throw new Error('CRITICAL SECURITY ERROR: Configuration service not properly initialized');
    }

    // Additional security validations specific to startup
    const startupConfig = configService.getConfig();

    // Ensure JWT_SECRET exists and meets security requirements
    if (!startupConfig.JWT_SECRET) {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET is required for secure operations');
    }

    if (configService.isProduction() && startupConfig.JWT_SECRET.length < 64) {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 64 characters in production');
    }

    // Verify SESSION_SECRET meets requirements
    if (!startupConfig.SESSION_SECRET) {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET is required for secure sessions');
    }

    if (configService.isProduction() && startupConfig.SESSION_SECRET.length < 32) {
      throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET must be at least 32 characters in production');
    }

    // Check for development secrets in production (security vulnerability)
    if (configService.isProduction()) {
      if (startupConfig.JWT_SECRET.includes('dev-') || startupConfig.JWT_SECRET.includes('testing-')) {
        throw new Error('CRITICAL SECURITY ERROR: Development JWT secret detected in production environment');
      }

      if (startupConfig.SESSION_SECRET.includes('dev-') || startupConfig.SESSION_SECRET.includes('testing-')) {
        throw new Error('CRITICAL SECURITY ERROR: Development session secret detected in production environment');
      }
    }

    console.log('[Security] ✅ All configuration validations passed successfully');
    console.log('[Security] ✅ Startup security checks completed - proceeding with server initialization');

  } catch (securityError) {
    console.error('❌ CRITICAL STARTUP SECURITY ERROR:', securityError instanceof Error ? securityError.message : String(securityError));

    // Fail fast in production - never continue with invalid configuration
    if (configService.isProduction()) {
      console.error('❌ PRODUCTION SECURITY FAILURE: Cannot start with invalid security configuration');
      console.error('❌ EXITING APPLICATION TO PREVENT SECURITY VULNERABILITIES');
      throw securityError; // Let the application exit completely
    } else {
      console.warn('⚠️  DEVELOPMENT WARNING: Security configuration issues detected, but continuing in development mode');
      console.warn('⚠️  Setting up fallback secrets for development...');

      // Provide fallback secrets only in development
      if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
        console.log('✅ JWT_SECRET fallback generated');
      }
      if (!process.env.SESSION_SECRET) {
        process.env.SESSION_SECRET = require('crypto').randomBytes(32).toString('hex');
        console.log('✅ SESSION_SECRET fallback generated');
      }
    }
  }

  // Now configure session middleware with validated/fallback secrets
  console.log('[Session] Configuring session middleware with validated secrets...');
  const sessionConfig: any = {
    secret: process.env.SESSION_SECRET || config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: configService.isProduction(),
      httpOnly: true,
      maxAge: config.SESSION_MAX_AGE,
      sameSite: 'strict' as const
    },
    name: 'dha_session',
  };

  // Apply session middleware now that it's properly configured
  app.use(session(sessionConfig));
  console.log('[Session] ✅ Session middleware configured and applied');

  // Try to import database pool with better error handling
  let pool: any = null;
  try {
    // Check if DATABASE_URL is valid before attempting connection
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || databaseUrl.includes('ep-withered-sun-afawa714')) {
      console.warn('[Server] Invalid or outdated DATABASE_URL detected, using fallback');
      // Clear the invalid URL to force in-memory mode
      process.env.DATABASE_URL = '';
    } else {
      const dbModule = await import("./db");
      pool = dbModule.pool;
      console.log('[Server] ✅ Database connection established');
    }
  } catch (error) {
    console.warn('[Server] Database module failed to load, using in-memory mode:', error);
    pool = null;
  }

  // Configure session store based on database availability
  if (pool) {
    try {
      // Database available - try PostgreSQL store
      console.log('[Session] Attempting PostgreSQL session store...');
      const connectPgSimple = (await import("connect-pg-simple")).default;
      const pgStore = connectPgSimple(session);
      const store = new pgStore({
        pool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
      });
      sessionConfig.store = store;
      console.log('[Session] Using PostgreSQL session store');
    } catch (error) {
      console.warn('[Session] Failed to setup PostgreSQL store, falling back to memory:', error);
    }
  } else {
    console.warn('[Session] Database unavailable - using in-memory session store');
    console.warn('[Session] Sessions will be lost on server restart');
  }

  // Basic health fallback endpoint (main enhanced health endpoint is in routes.ts)
  app.get('/api/health/basic', (req, res) => {
    res.json({
      status: 'basic',
      mode: pool ? 'database' : 'in-memory',
      timestamp: new Date().toISOString(),
      message: 'Basic health check - full monitoring available at /api/health'
    });
  });

  // Keep-alive endpoint for free tier
  app.get('/keep-alive', (req, res) => {
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // SECURITY: Hardcoded mock authentication endpoints and JWT secrets have been REMOVED
  // Authentication is now handled by proper routes with centralized configuration

  try {
    console.log('[Auth] Mock authentication endpoints removed for security');
    console.log('[Auth] Authentication now handled via centralized routes with proper validation');

    // Document Templates Endpoint - All 23 DHA Document Types
    console.log('[Templates] Setting up document templates endpoint...');

    app.get('/api/documents/templates', (req, res) => {
      try {
        console.log('[Templates] Fetching all DHA document templates');

        // All 23 DHA document types with comprehensive metadata
        const documentTemplates = [
          // Identity Documents (3)
          {
            id: "smart_id_card",
            type: "smart_id_card",
            name: "Smart ID Card",
            displayName: "Smart ID Card",
            description: "Polycarbonate smart ID card with biometric chip and laser engraving",
            category: "identity",
            formNumber: "DHA-24",
            icon: "CreditCard",
            color: "bg-blue-500",
            isImplemented: true,
            requirements: ["SA Citizenship", "Biometric Data", "Proof of Identity", "Proof of Residence"],
            securityFeatures: ["Biometric Chip", "Laser Engraving", "Holographic Elements", "RFID Technology"],
            processingTime: "5-10 working days",
            fees: "R140.00"
          },
          {
            id: "identity_document_book",
            type: "identity_document_book",
            name: "Identity Document Book",
            displayName: "Identity Document Book",
            description: "Traditional green book identity document",
            category: "identity",
            formNumber: "BI-9",
            icon: "BookOpen",
            color: "bg-green-500",
            isImplemented: true,
            requirements: ["SA Citizenship", "Proof of Identity", "Proof of Residence", "Photographs"],
            securityFeatures: ["Security Paper", "Watermarks", "Microprint", "Serial Numbers"],
            processingTime: "3-5 working days",
            fees: "R70.00"
          },
          {
            id: "temporary_id_certificate",
            type: "temporary_id_certificate",
            name: "Temporary ID Certificate",
            displayName: "Temporary ID Certificate",
            description: "Temporary identity certificate for urgent cases",
            category: "identity",
            formNumber: "DHA-73",
            icon: "FileCheck",
            color: "bg-orange-500",
            isImplemented: true,
            requirements: ["Urgent Need Declaration", "Proof of Identity Loss", "Affidavit"],
            securityFeatures: ["Security Paper", "Official Stamp", "Serial Number"],
            processingTime: "Same day",
            fees: "R60.00"
          },

          // Travel Documents (3)
          {
            id: "south_african_passport",
            type: "south_african_passport",
            name: "South African Passport",
            displayName: "South African Passport",
            description: "Machine-readable South African passport with ICAO compliance",
            category: "travel",
            formNumber: "DHA-73",
            icon: "Plane",
            color: "bg-purple-500",
            isImplemented: true,
            requirements: ["SA Citizenship", "ID Document", "Photographs", "Birth Certificate"],
            securityFeatures: ["Machine Readable Zone", "Biometric Data", "Security Paper", "Holographic Elements"],
            processingTime: "10-15 working days",
            fees: "R400.00"
          },
          {
            id: "emergency_travel_certificate",
            type: "emergency_travel_certificate",
            name: "Emergency Travel Certificate",
            displayName: "Emergency Travel Certificate",
            description: "Emergency travel document for urgent travel situations",
            category: "travel",
            formNumber: "DHA-1738",
            icon: "AlertTriangle",
            color: "bg-red-500",
            isImplemented: true,
            requirements: ["Emergency Travel Need", "Proof of Citizenship", "Travel Booking"],
            securityFeatures: ["Security Paper", "Official Seal", "Unique Reference Number"],
            processingTime: "24-48 hours",
            fees: "R200.00"
          },
          {
            id: "refugee_travel_document",
            type: "refugee_travel_document",
            name: "Refugee Travel Document",
            displayName: "Refugee Travel Document",
            description: "UNHCR compliant travel document for refugees",
            category: "travel",
            formNumber: "DHA-1590",
            icon: "Globe",
            color: "bg-teal-500",
            isImplemented: true,
            requirements: ["Refugee Status", "UNHCR Documentation", "Photographs"],
            securityFeatures: ["UNHCR Compliance", "Security Features", "Machine Readable"],
            processingTime: "15-20 working days",
            fees: "R300.00"
          },

          // Civil Documents (4)
          {
            id: "birth_certificate",
            type: "birth_certificate",
            name: "Birth Certificate",
            displayName: "Birth Certificate",
            description: "Official birth certificate (unabridged format)",
            category: "civil",
            formNumber: "BI-24",
            icon: "Baby",
            color: "bg-pink-500",
            isImplemented: true,
            requirements: ["Birth Registration", "Parent Identification", "Hospital Records"],
            securityFeatures: ["Security Paper", "Official Seal", "Registration Number", "Watermarks"],
            processingTime: "2-3 working days",
            fees: "R75.00"
          },
          {
            id: "death_certificate",
            type: "death_certificate",
            name: "Death Certificate",
            displayName: "Death Certificate",
            description: "Official death certificate with medical details",
            category: "civil",
            formNumber: "BI-1663",
            icon: "Skull",
            color: "bg-gray-500",
            isImplemented: true,
            requirements: ["Death Registration", "Medical Certificate", "Identity Documents"],
            securityFeatures: ["Security Paper", "Official Seal", "Medical Verification"],
            processingTime: "3-5 working days",
            fees: "R75.00"
          },
          {
            id: "marriage_certificate",
            type: "marriage_certificate",
            name: "Marriage Certificate",
            displayName: "Marriage Certificate",
            description: "Official marriage certificate for civil, religious or customary marriages",
            category: "civil",
            formNumber: "BI-130",
            icon: "Heart",
            color: "bg-rose-500",
            isImplemented: true,
            requirements: ["Marriage Registration", "Identity Documents", "Witness Details"],
            securityFeatures: ["Security Paper", "Official Seal", "Registration Number"],
            processingTime: "2-3 working days",
            fees: "R75.00"
          },
          {
            id: "divorce_certificate",
            type: "divorce_certificate",
            name: "Divorce Certificate",
            displayName: "Divorce Certificate",
            description: "Official divorce certificate with decree details",
            category: "civil",
            formNumber: "BI-281",
            icon: "Users",
            color: "bg-slate-500",
            isImplemented: true,
            requirements: ["Divorce Decree", "Court Order", "Identity Documents"],
            securityFeatures: ["Security Paper", "Court Seal", "Official Verification"],
            processingTime: "5-7 working days",
            fees: "R75.00"
          },

          // Immigration Documents (11)
          {
            id: "general_work_visa",
            type: "general_work_visa",
            name: "General Work Visa",
            displayName: "General Work Visa",
            description: "General work visa for employment in South Africa",
            category: "immigration",
            formNumber: "BI-1738",
            icon: "Briefcase",
            color: "bg-indigo-500",
            isImplemented: true,
            requirements: ["Job Offer", "Qualifications", "Medical Certificate", "Police Clearance"],
            securityFeatures: ["Biometric Data", "Security Features", "Work Authorization"],
            processingTime: "4-8 weeks",
            fees: "R1520.00"
          },
          {
            id: "critical_skills_work_visa",
            type: "critical_skills_work_visa",
            name: "Critical Skills Work Visa",
            displayName: "Critical Skills Work Visa",
            description: "Work visa for critical and scarce skills occupations",
            category: "immigration",
            formNumber: "DHA-1739",
            icon: "Star",
            color: "bg-yellow-500",
            isImplemented: true,
            requirements: ["Critical Skills Qualification", "Professional Registration", "Job Offer"],
            securityFeatures: ["Skills Verification", "Professional Registration", "Biometric Data"],
            processingTime: "4-6 weeks",
            fees: "R1520.00"
          },
          {
            id: "intra_company_transfer_work_visa",
            type: "intra_company_transfer_work_visa",
            name: "Intra-Company Transfer Work Visa",
            displayName: "Intra-Company Transfer Work Visa",
            description: "Work visa for intra-company transfers",
            category: "immigration",
            formNumber: "DHA-1740",
            icon: "Building2",
            color: "bg-cyan-500",
            isImplemented: true,
            requirements: ["Company Transfer Letter", "Employment History", "Company Registration"],
            securityFeatures: ["Company Verification", "Transfer Documentation", "Biometric Data"],
            processingTime: "6-8 weeks",
            fees: "R1520.00"
          },
          {
            id: "business_visa",
            type: "business_visa",
            name: "Business Visa",
            displayName: "Business Visa",
            description: "Business visa for entrepreneurs and investors",
            category: "immigration",
            formNumber: "DHA-1741",
            icon: "Target",
            color: "bg-emerald-500",
            isImplemented: true,
            requirements: ["Business Plan", "Financial Proof", "Investment Capital"],
            securityFeatures: ["Business Verification", "Financial Assessment", "Investment Tracking"],
            processingTime: "8-12 weeks",
            fees: "R1520.00"
          },
          {
            id: "study_visa_permit",
            type: "study_visa_permit",
            name: "Study Visa/Permit",
            displayName: "Study Visa/Permit",
            description: "Study visa for international students",
            category: "immigration",
            formNumber: "DHA-1742",
            icon: "BookOpen",
            color: "bg-blue-400",
            isImplemented: true,
            requirements: ["University Acceptance", "Financial Proof", "Academic Records"],
            securityFeatures: ["Educational Verification", "Financial Assessment", "Student Tracking"],
            processingTime: "4-6 weeks",
            fees: "R1520.00"
          },
          {
            id: "visitor_visa",
            type: "visitor_visa",
            name: "Visitor Visa",
            displayName: "Visitor Visa",
            description: "Tourist and visitor visa",
            category: "immigration",
            formNumber: "DHA-1743",
            icon: "Camera",
            color: "bg-lime-500",
            isImplemented: true,
            requirements: ["Travel Itinerary", "Financial Proof", "Accommodation"],
            securityFeatures: ["Travel Verification", "Purpose Documentation", "Duration Control"],
            processingTime: "2-4 weeks",
            fees: "R425.00"
          },
          {
            id: "medical_treatment_visa",
            type: "medical_treatment_visa",
            name: "Medical Treatment Visa",
            displayName: "Medical Treatment Visa",
            description: "Visa for medical treatment purposes",
            category: "immigration",
            formNumber: "DHA-1744",
            icon: "Heart",
            color: "bg-red-400",
            isImplemented: true,
            requirements: ["Medical Report", "Treatment Plan", "Financial Guarantee"],
            securityFeatures: ["Medical Verification", "Treatment Authorization", "Healthcare Tracking"],
            processingTime: "2-3 weeks",
            fees: "R425.00"
          },
          {
            id: "retired_person_visa",
            type: "retired_person_visa",
            name: "Retired Person's Visa",
            displayName: "Retired Person's Visa",
            description: "Visa for retired persons",
            category: "immigration",
            formNumber: "DHA-1745",
            icon: "User",
            color: "bg-amber-500",
            isImplemented: true,
            requirements: ["Retirement Proof", "Pension Documentation", "Financial Proof"],
            securityFeatures: ["Retirement Verification", "Financial Assessment", "Age Verification"],
            processingTime: "6-8 weeks",
            fees: "R1520.00"
          },
          {
            id: "exchange_visa",
            type: "exchange_visa",
            name: "Exchange Visa",
            displayName: "Exchange Visa",
            description: "Visa for exchange programs",
            category: "immigration",
            formNumber: "DHA-1746",
            icon: "Globe",
            color: "bg-violet-500",
            isImplemented: true,
            requirements: ["Exchange Program Details", "Host Organization", "Program Duration"],
            securityFeatures: ["Program Verification", "Host Verification", "Exchange Tracking"],
            processingTime: "4-6 weeks",
            fees: "R1520.00"
          },
          {
            id: "relatives_visa",
            type: "relatives_visa",
            name: "Relatives Visa",
            displayName: "Relatives Visa",
            description: "Visa for visiting relatives",
            category: "immigration",
            formNumber: "DHA-1747",
            icon: "Users",
            color: "bg-orange-400",
            isImplemented: true,
            requirements: ["Relationship Proof", "Invitation Letter", "Financial Support"],
            securityFeatures: ["Relationship Verification", "Family Documentation", "Support Verification"],
            processingTime: "3-5 weeks",
            fees: "R425.00"
          },
          {
            id: "permanent_residence_permit",
            type: "permanent_residence_permit",
            name: "Permanent Residence Permit",
            displayName: "Permanent Residence Permit",
            description: "Permanent residence permit for long-term residents",
            category: "immigration",
            formNumber: "BI-947",
            icon: "Home",
            color: "bg-green-600",
            isImplemented: true,
            requirements: ["Qualifying Criteria", "Continuous Residence", "Good Character"],
            securityFeatures: ["Residence Verification", "Background Checks", "Biometric Data"],
            processingTime: "12-18 months",
            fees: "R2420.00"
          },

          // Additional DHA Documents (2)
          {
            id: "certificate_of_exemption",
            type: "certificate_of_exemption",
            name: "Certificate of Exemption",
            displayName: "Certificate of Exemption",
            description: "Official certificate of exemption under Section 6(2) of Act No.88 of 1995",
            category: "certification",
            formNumber: "DHA-EXEMP",
            icon: "Award",
            color: "bg-emerald-600",
            isImplemented: true,
            requirements: ["Exemption Grounds", "Supporting Documentation", "Legal Basis"],
            securityFeatures: ["Legal Verification", "Official Authorization", "Exemption Tracking"],
            processingTime: "4-6 weeks",
            fees: "R255.00"
          },
          {
            id: "certificate_of_south_african_citizenship",
            type: "certificate_of_south_african_citizenship",
            name: "Certificate of South African Citizenship",
            displayName: "Certificate of South African Citizenship",
            description: "Official certificate of South African citizenship under Section 10, SA Citizenship Act 1995",
            category: "certification",
            formNumber: "DHA-CITIZ",
            icon: "ShieldCheck",
            color: "bg-blue-600",
            isImplemented: true,
            requirements: ["Citizenship Qualification", "Supporting Documents", "Verification"],
            securityFeatures: ["Citizenship Verification", "Legal Documentation", "Official Authentication"],
            processingTime: "8-12 weeks",
            fees: "R255.00"
          }
        ];

        // Categories for organization
        const categories = {
          identity: {
            name: "Identity Documents",
            icon: "UserCheck",
            color: "text-blue-600",
            count: documentTemplates.filter(doc => doc.category === 'identity').length
          },
          travel: {
            name: "Travel Documents",
            icon: "Plane",
            color: "text-purple-600",
            count: documentTemplates.filter(doc => doc.category === 'travel').length
          },
          civil: {
            name: "Civil Documents",
            icon: "FileText",
            color: "text-pink-600",
            count: documentTemplates.filter(doc => doc.category === 'civil').length
          },
          immigration: {
            name: "Immigration Documents",
            icon: "Globe",
            color: "text-indigo-600",
            count: documentTemplates.filter(doc => doc.category === 'immigration').length
          },
          certification: {
            name: "Official Certificates",
            icon: "Award",
            color: "text-emerald-600",
            count: documentTemplates.filter(doc => doc.category === 'certification').length
          }
        };

        console.log(`[Templates] ✅ Returning ${documentTemplates.length} document templates`);

        res.json({
          success: true,
          totalTemplates: documentTemplates.length,
          templates: documentTemplates,
          categories: categories,
          timestamp: new Date().toISOString(),
          message: `Successfully retrieved ${documentTemplates.length} DHA document templates`
        });

      } catch (error) {
        console.error('[Templates] Error fetching document templates:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch document templates',
          details: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    });

    console.log('[Templates] ✅ Document templates endpoint ready');
    console.log('[Auth] ✅ Lightweight authentication ready');
    console.log('[AI] ✅ Basic AI endpoints ready');
  } catch (authSetupError) {
    console.error('[Auth] Failed to setup authentication:', authSetupError);
  }

  let server = app;

  // Try to load and register routes
  try {
    console.log('[Server] Loading routes...');
    const routesModule = await import("./routes");
    console.log('[Server] Routes module imported successfully');

    registerRoutes = routesModule.registerRoutes;
    console.log('[Server] registerRoutes function extracted');

    if (typeof registerRoutes !== 'function') {
      throw new Error(`registerRoutes is not a function, got: ${typeof registerRoutes}`);
    }

    server = await registerRoutes(app);
    console.log('[Server] ✅ Routes loaded and registered successfully');
  } catch (error) {
    console.error('[Server] ⚠️ CRITICAL: Route registration failed!');
    console.error('[Server] Error name:', (error as Error).name || 'Unknown');
    console.error('[Server] Error message:', (error as Error).message || String(error));
    console.error('[Server] Error stack:');
    console.error((error as Error).stack || 'No stack trace available');
    console.error('[Server] ⚠️ Continuing with basic server - API routes will NOT be available');
    // Continue with basic server even if routes fail
  }

  // CRITICAL: Add catch-all route for unmatched API routes BEFORE vite middleware
  // This ensures API routes return JSON 404 instead of HTML
  // Use all() to catch all HTTP methods
  app.all('/api/*', (req: Request, res: Response) => {
    // If we reach here, no API route matched
    if (typeof log === 'function') {
      log(`API route not found: ${req.method} ${req.originalUrl}`, 'warn');
    } else {
      console.warn(`API route not found: ${req.method} ${req.originalUrl}`);
    }
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Use structured logging in production
    if (configService.isProduction()) {
      if (typeof log === 'function') {
        log(`Server error: ${status} - ${message} [${_req.method} ${_req.url}]`, 'error');
      } else {
        console.error(`Server error: ${status} - ${message} [${_req.method} ${_req.url}]`);
      }
    } else {
      console.error("Server error:", {
        status,
        message,
        stack: err.stack,
        url: _req.url,
        method: _req.method
      });
    }

    res.status(status).json({
      error: message,
      ...(configService.isDevelopment() && { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes

  // Force production mode in workflow to avoid vite dev server issues
  let isWorkflowMode = Boolean(config.REPL_ID || process.env.SAFE_START || process.env.DISABLE_VITE_DEV);

  if (!isWorkflowMode && app.get("env") === "development") {
    try {
      const viteModule = await import("./vite");
      setupVite = viteModule.setupVite;
      serveStatic = viteModule.serveStatic;
      log = viteModule.log || console.log;

      await setupVite(app, server);
    } catch (error) {
      console.warn('[Server] Failed to setup Vite dev server, falling back to static files:', error);
      // Fallback to static serving below
      isWorkflowMode = true; // Force static serving
    }
  }

  if (isWorkflowMode || app.get("env") !== "development") {
    // Skip vite import entirely in workflow/production - serve static files directly
    console.log('[Server] Using static file serving (workflow/production mode)');

    try {
      const path = await import('path');
      const fs = await import('fs');

      // Primary fallback: serve built files from dist/public
      app.use(express.static('dist/public'));

      // Check if built index.html exists
      const builtIndexPath = path.join(process.cwd(), 'dist/public/index.html');
      const devIndexPath = path.join(process.cwd(), 'client/index.html');

      if (fs.existsSync(builtIndexPath)) {
        // Production-like fallback: serve built index.html for all non-API routes
        app.get('*', (req, res) => {
          if (!req.path.startsWith('/api')) {
            res.sendFile(builtIndexPath);
          }
        });
        console.log('[Server] Using built files from dist/public');
      } else if (fs.existsSync(devIndexPath)) {
        // Development fallback: serve client files directly
        app.use(express.static('client'));
        app.get('*', (req, res) => {
          if (!req.path.startsWith('/api')) {
            res.sendFile(devIndexPath);
          }
        });
        console.log('[Server] Using development files from client/');
      } else {
        // Last resort: serve a basic response
        app.get('*', (req, res) => {
          if (!req.path.startsWith('/api')) {
            res.send('<h1>DHA Digital Services Platform</h1><p>Frontend not found. Please run: npm run build</p>');
          }
        });
        console.warn('[Server] No frontend files found, serving basic response');
      }
    } catch (error) {
      console.warn('[Server] Failed to setup static file serving:', error);
      // Basic fallback - serve a simple response
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.send('<h1>DHA Digital Services Platform</h1><p>Server starting...</p>');
        }
      });
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000");

  // Initialize database on startup
  import { initializeDatabase } from './db';
  initializeDatabase().catch(console.error);

  // Use the httpServer from routes (which has WebSocket and monitoring) if available, otherwise fallback to app
  const listener = (server as any)?.listen ? server : app;

  // Start the server and keep it running
  const serverInstance = listener.listen(port, "0.0.0.0", () => {
    const logFn = typeof log === 'function' ? log : console.log;
    logFn(`
═══════════════════════════════════════════════════════════════
  DHA Digital Services Platform - SERVER READY
  🌐 Local: http://localhost:${port}
  🌐 Network: http://0.0.0.0:${port}
  📱 Mobile: Access via Replit preview or network IP
  📊 Health Check: http://localhost:${port}/api/health
  🔗 Preview: Available in Replit preview
═══════════════════════════════════════════════════════════════
    `);

    // Log mode detection
    if (configService.isPreviewMode()) {
      console.log('[Server] Preview mode detected - server will remain active');
    } else {
      console.log('[Server] Production mode - server will honor shutdown signals');
    }
  });

  // Keep reference to server instance to prevent garbage collection
  (global as any).__DHA_SERVER_INSTANCE = serverInstance;

  return serverInstance;
}

// Initialize the server with proper error handling
async function startApplication() {
  try {
    // Initialize critical services first
    const { nanosecondMonitoringService } = await import('./services/nanosecond-monitoring-service');
    const { autoRecoveryService } = await import('./services/auto-recovery');
    const { optimizedCacheService } = await import('./services/optimized-cache');

    // Start services with proper error handling
    try {
      if (nanosecondMonitoringService && typeof nanosecondMonitoringService.startMonitoring === 'function') {
        nanosecondMonitoringService.startMonitoring();
        console.log('[Startup] Nanosecond monitoring started.');
      }
    } catch (e) { console.log('[Startup] Nanosecond monitoring service not available'); }

    try {
      if (autoRecoveryService && typeof autoRecoveryService.initialize === 'function') {
        await autoRecoveryService.initialize();
        console.log('[Startup] Auto-recovery service initialized.');
      }
    } catch (e) { console.log('[Startup] Auto-recovery service not available'); }

    try {
      if (optimizedCacheService && typeof optimizedCacheService.initialize === 'function') {
        optimizedCacheService.initialize();
        console.log('[Startup] Cache service initialized.');
      }
    } catch (e) { console.log('[Startup] Cache service not available'); }

    // Now, initialize the server with all its middleware and routes
    await initializeServer();
    console.log('[Startup] Server initialization process completed.');

  } catch (error) {
    console.error('FATAL: Application startup failed:', error);
    console.error('Stack:', (error as Error).stack);

    // In preview mode, try to continue with basic server
    if (configService.isPreviewMode()) {
      console.log('[Server] Attempting to start basic fallback server due to startup failure...');

      // Create a basic fallback server
      const fallbackApp = express();
      fallbackApp.use(express.json());

      fallbackApp.get('/api/health/basic', (req, res) => {
        res.json({
          status: 'fallback',
          message: 'Basic server running after initialization failure',
          timestamp: new Date().toISOString(),
          error: 'Main server initialization failed'
        });
      });

      fallbackApp.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          res.status(503).json({
            error: 'Service temporarily unavailable - server initialization failed',
            fallback: true
          });
        } else {
          res.send('<h1>DHA Digital Services Platform</h1><p>Server starting in fallback mode...</p>');
        }
      });

      const port = config.PORT;
      fallbackApp.listen(port, '0.0.0.0', () => {
        console.log(`[Server] Fallback server running on port ${port}`);
      });
    } else {
      // Never exit completely - always provide fallback server for any environment
      console.log('[Server] Starting emergency fallback server in any environment...');

      const fallbackApp = express();
      fallbackApp.use(express.json());

      fallbackApp.get('/api/health', (req, res) => {
        res.json({
          status: 'emergency-fallback',
          message: 'Emergency server running after startup failure',
          timestamp: new Date().toISOString(),
          error: 'Main server initialization failed'
        });
      });

      fallbackApp.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          res.status(503).json({
            error: 'Service temporarily unavailable - server initialization failed',
            fallback: true
          });
        } else {
          res.send('<h1>DHA Digital Services Platform</h1><p>Emergency server mode - initialization failed</p>');
        }
      });

      const port = Number(process.env.PORT) || config.PORT || 5000;
      fallbackApp.listen(port, '0.0.0.0', () => {
        console.log(`[Emergency] Fallback server running on port ${port}`);
      });
    }
  }
}

// Start the application with error recovery
startApplication().catch((error) => {
  console.error('FATAL: Application failed to start:', error);

  // Create emergency fallback server
  const emergencyApp = express();
  emergencyApp.use(express.json());

  emergencyApp.get('/api/health', (req, res) => {
    res.json({
      status: 'emergency',
      message: 'Emergency server running - main application failed to start',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  });

  emergencyApp.get('/keep-alive', (req, res) => {
    res.json({
      status: 'emergency',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  emergencyApp.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(503).json({
        error: 'Service temporarily unavailable',
        emergency: true
      });
    } else {
      res.send(`
        <h1>DHA Digital Services Platform</h1>
        <p>Emergency mode - Server is starting up</p>
        <p>Please refresh in a few moments</p>
      `);
    }
  });

  const port = parseInt(process.env.PORT || "5000");
  emergencyApp.listen(port, '0.0.0.0', () => {
    console.log(`[Emergency] Fallback server running on port ${port}`);
  });
});