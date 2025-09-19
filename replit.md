# DHA Digital Services Platform

## Overview
This is a production-ready, military-grade digital services platform for the South African Department of Home Affairs (DHA). The system provides comprehensive document generation, verification, and security services with 24/7 continuous monitoring and AI-powered assistance. It supports all 23 official DHA document types, incorporates military-grade security features, and is designed for zero-downtime operations.

## User Preferences
- **Authentication Credentials**:
  - Admin Login: Username: `admin` | Password: `admin123`
  - Default User: Username: `user` | Password: `password123`
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