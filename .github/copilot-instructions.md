# Copilot AI Agent Instructions for Karnielove

## 🏗️ Architecture Overview
- **Multi-service AI platform** for South African DHA, supporting 21 document types, biometric auth, and multi-language.
- **Core AI services**: 
  - `ai-assistant.ts` (OpenAI GPT-4o) - Primary chat interface
  - `military-grade-ai-assistant.ts` (Claude 3.5 Sonnet) - Security clearance & government workflows 
  - `enhanced-ai-assistant.ts` (Claude-3) - Global connectivity features
  - `ultra-ai-system.ts` (Multi-AI) - Biometric auth & multi-bot system
- **Service boundaries**: Each AI service is a separate module under `server/services/`. Cross-service orchestration via zero-downtime deployment and circuit breakers.
- **Frontend**: Vite + TypeScript, see `client/` for UI, `DeploymentPackage.tsx` for deployment options.
- **Database**: 
  - Primary: PostgreSQL (Railway) with enhanced pooling
  - Fallback: SQLite with auto-migration
  - Configs in `server/config/database-railway.ts`
- **Security Layer**:
  - POPIA and PFMA compliance validation
  - Government security framework integration
  - Quantum-ready encryption for document storage
- **APIs**: 
  - Government: NPR, SAPS, ABIS, ICAO PKD, SITA, CIPC, DEL
  - Services: Identity verification, background checks, biometrics, passport validation

## 🚀 Developer Workflows
- **Build**: 
  - Use platform-native build (Railway, Render, Netlify, CircleCI)
  - Auto-scaling configuration in `railway-auto-scaling-service.ts`
  - Health check system via `railway-health-check-system.ts`
- **Test**: 
  - Run `ai-validation-suite.cjs` for AI service validation
  - Run `comprehensive-system-test.ts` for end-to-end testing
  - Key reports: `AI_VALIDATION_REPORT.json`, `COMPREHENSIVE_AI_TESTING_REPORT.md`
- **Deploy**: 
  - Push to `main` triggers GitHub Actions
  - Use `railway up` for Railway deployment
  - Zero-downtime deployment with `zeroDowntimeDeployment.ts`
  - Automated validation with `production-readiness-check.ts`
- **Security**: 
  - Never commit `.env` files or secrets
  - Use platform dashboards for API keys
  - Regular secret rotation via `SecurityConfigurationService`

## 📦 Project Conventions
- **Environment variables**: Always accessed via `process.env`. Required: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`.
- **Endpoints**: Health at `/api/health`, AI at `/api/ultra-queen-ai`, document at `/api/documents`.
- **Error handling**: Circuit breaker and auto-healing patterns in service code. See `RAILWAY_DEPLOYMENT_READINESS_REPORT.md`.
- **Security**: POPIA compliance enforced in all AI prompts. Never log or expose secrets.
- **Testing**: Use `ai-validation-suite.cjs` for comprehensive validation before deployment.

## 🔗 Integration & External Dependencies
- **AI Providers**: 
  - OpenAI (GPT-4o, GPT-4-turbo, GPT-3.5 fallback)
  - Anthropic (Claude 3.5 Sonnet, Claude-3-Opus, Claude-3-Haiku)
  - Others: Perplexity (PPLX-70B), Gemini, Mistral
- **Voice, PDF, OCR**: Integrated via dedicated service modules with quantum security features
- **Government APIs**:
  - NPR: Population register & identity verification
  - SAPS: Background checks & criminal records
  - ABIS: Biometric authentication
  - ICAO PKD: Passport validation
  - SITA: eServices & PKI integration
  - CIPC: Business registration
  - DEL: Employment verification
- **Required Environment**:
  - Government PKI certificates
  - HSM integration for key storage
  - POPIA-compliant data retention
  - Quantum-safe encryption configs

## 📝 Examples
- **Add new AI endpoint**: Create a new service in `server/services/`, register in API router, add validation in `ai-validation-suite.cjs`.
- **Update environment config**: Edit `server/config/railway.ts` or `server/config/database-railway.ts`.
- **Validate deployment**: Run `ai-validation-suite.cjs` and check `/api/health` after deploy.

## 📚 Key References
- `deployment-platforms-guide.md`, `DEPLOYMENT_GUIDE.md`, `RAILWAY_DEPLOYMENT_GUIDE.md`, `COMPREHENSIVE_AI_TESTING_REPORT.md`
- `ai-validation-suite.cjs`, `server/services/`, `client/`

---
For unclear or missing conventions, check the above guides or ask for clarification in the repo.
