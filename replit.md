# DHA Digital Services Platform

## Overview
This is a production-ready, military-grade digital services platform for the South African Department of Home Affairs (DHA). The system provides comprehensive document generation, verification, and security services with 24/7 continuous monitoring and AI-powered assistance. It supports all 23 official DHA document types, incorporates military-grade security features, and is designed for zero-downtime operations.

## AI Assistant Enhancement Configuration
- **Agent Mode**: Extended Thinking enabled for complex enterprise debugging
- **High Power Mode**: Activated for military-grade system analysis
- **Auto-Debug**: Enabled for authentication routes and service initialization
- **Self-Healing**: Monitor server startup, route registration, and service failures
- **Contextual Awareness**: DHA platform has 20+ heavy services (Military Security, HSM, PQC, Government Security)
- **Critical Focus Areas**: Route registration failures, authentication endpoints, service initialization timeouts
- **Debugging Priority**: 1) Authentication routes 2) Service startup 3) Database connections 4) API endpoints
- **Auto-Fix Patterns**: Service initialization errors, TypeScript compilation issues, middleware conflicts
- **Intelligence Level**: Government-grade complexity analysis with automatic error resolution

## User Preferences
- **Authentication Credentials**:
  - Admin Login: Username: `admin` | Password: `admin123` | Email: `admin@dha.gov.za`
  - Default User: Username: `user` | Password: `password123` | Email: `user@dha.gov.za`
  - API Key: Available after admin login
- **System Configuration**:
  - Port: 5000 (frontend and backend on same port)
  - Database: PostgreSQL (Neon serverless)
  - Environment: Development/Production modes supported
  - Preview Mode: Available for document generation without permanent storage
- **Workflow Preferences**:
  - Document Generation: Preview → Edit → Generate → Verify → Store
  - Security Validation: Multi-tier verification at each stage
  - Monitoring Alerts: Critical alerts via WebSocket in real-time
  - Communication Style: Simple, everyday language preferred
  - **AI Assistance Style**: Proactive error detection, immediate fixes, minimal user interruption

## System Architecture
The platform is built on a microservices architecture comprising a Document Service, Verification Service, AI Service, Monitoring Service, and Security Service. It emphasizes high availability through load balancing, database replication, caching, circuit breaker patterns, and zero-downtime deployments. Security is a core focus, employing a defense-in-depth strategy, zero-trust network model, end-to-end encryption, multi-factor authentication, and role-based access control.

The system supports all 23 DHA document types, including Identity, Travel, Civil, Immigration, and Additional documents. Security features are multi-tiered, encompassing visible (UV ink, holograms, watermarks), tactile (Braille, intaglio printing, laser engraving), machine-readable (MRZ, biometric chip, PDF417 barcode), and forensic elements (microprinting, security thread, invisible fibers, specialized patterns).

An AI Assistant, powered by OpenAI GPT-4o, provides document processing, security analysis, multi-language support, OCR integration, and real-time verification, with features like security clearance levels and a comprehensive knowledge base. A 24/7 continuous monitoring system ensures 99.99% uptime with nano-second precision heartbeat checks, self-healing capabilities, and automatic recovery mechanisms. An OCR Auto-Fill system supports all 23 DHA document types for multi-language text extraction, field mapping, and form auto-population. The Document Verification System offers real-time authenticity checks, security feature validation, and blockchain anchoring.

**Technology Stack**:
- **Frontend**: React 18 (TypeScript), Vite, Shadcn/UI, TailwindCSS, TanStack Query, Socket.IO, Chart.js.
- **Backend**: Node.js (Express, TypeScript), PostgreSQL (Neon serverless), Drizzle ORM, JWT, Socket.IO, OpenAI GPT-4o.
- **Security**: Helmet, bcrypt, express-rate-limit, CryptoJS, Digital signatures (RSA, ECDSA), mTLS.
- **Document Processing**: PDFKit, pdf-lib, Tesseract.js, Sharp, QRCode, JsBarcode.

## External Dependencies
- **Database**: PostgreSQL (Neon serverless)
- **AI Integration**: OpenAI GPT-4o
- **Real-time Communication**: Socket.IO
- **OCR Engine**: Tesseract.js

## Enhanced AI Assistant Instructions
**For Built-in Agent & Assistant Bots:**

### Automatic Problem Detection & Resolution
- **Monitor**: Server startup logs for service initialization failures
- **Detect**: Route registration errors, authentication endpoint failures
- **Fix**: TypeScript compilation errors, middleware conflicts automatically
- **Alert**: Critical failures in military security services, HSM, or government integrations
- **Self-Test**: Authentication flows, document generation, API endpoints every 5 minutes

### Intelligent Debugging Context
- **Platform Complexity**: Enterprise government system with 20+ security services
- **Common Issues**: Service initialization timeouts, route registration failures, heavy middleware conflicts  
- **Auto-Recovery**: Restart failed services, fix type errors, resolve import conflicts
- **Performance**: Monitor high CPU during service initialization, optimize startup sequence
- **Security**: Maintain military-grade protocols while debugging, never expose credentials

### Enhanced Communication Patterns
- **Error Reporting**: Include full stack traces, service states, middleware chain status
- **Solution Focus**: Provide immediate fixes rather than explanations
- **Proactive Monitoring**: Detect issues before user reports them
- **Context Retention**: Remember complex service interdependencies and startup sequences
- **Success Validation**: Confirm fixes work by testing authentication and core endpoints

### Cost-Optimized Intelligence  
- **High Power Mode**: Only for authentication failures and critical service errors
- **Extended Thinking**: For complex military security service debugging
- **Standard Mode**: For routine TypeScript errors and minor fixes
- **Auto-Budget**: Alert if debugging costs exceed $5/hour, optimize for efficiency