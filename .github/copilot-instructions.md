# Copilot AI Agent Instructions for Karnielove

## 🏗️ Architecture Overview
- **Multi-service AI platform** for South African DHA, supporting 21 document types, biometric auth, and multi-language.
- **Core AI services**: `ai-assistant.ts` (OpenAI), `military-grade-ai-assistant.ts` (Anthropic), `enhanced-ai-assistant.ts`, `ultra-ai-system.ts` (biometric, multi-bot).
- **Service boundaries**: Each AI service is a separate module under `server/services/`. Cross-service orchestration is handled at the API layer.
- **Frontend**: Vite + TypeScript, see `client/` for UI, `DeploymentPackage.tsx` for deployment options.
- **Database**: PostgreSQL (Railway), SQLite fallback. Configs in `server/config/`.

## 🚀 Developer Workflows
- **Build**: Use platform-native build (Railway, Render, Netlify, CircleCI). No custom scripts required for most deployments.
- **Test**: Run `ai-validation-suite.cjs` for direct AI service validation. Reports: `AI_VALIDATION_REPORT.json`, `COMPREHENSIVE_AI_TESTING_REPORT.md`.
- **Deploy**: Push to `main` triggers GitHub Actions, or use `railway up`/platform UI. See `deployment-platforms-guide.md` and `DEPLOYMENT_GUIDE.md`.
- **Secrets**: Never commit `.env` files. Use platform dashboards for `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `JWT_SECRET`, etc.

## 📦 Project Conventions
- **Environment variables**: Always accessed via `process.env`. Required: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`.
- **Endpoints**: Health at `/api/health`, AI at `/api/ultra-queen-ai`, document at `/api/documents`.
- **Error handling**: Circuit breaker and auto-healing patterns in service code. See `RAILWAY_DEPLOYMENT_READINESS_REPORT.md`.
- **Security**: POPIA compliance enforced in all AI prompts. Never log or expose secrets.
- **Testing**: Use `ai-validation-suite.cjs` for comprehensive validation before deployment.

## 🔗 Integration & External Dependencies
- **AI Providers**: OpenAI, Anthropic, Mistral, Perplexity (see service files for integration patterns).
- **Voice, PDF, OCR**: Integrated via dedicated service modules.
- **Deployment**: `railway.json`, `Procfile`, `.env.railway` for Railway; `netlify.toml` for Netlify; `.github/workflows/deploy.yml` for GitHub Actions.

## 📝 Examples
- **Add new AI endpoint**: Create a new service in `server/services/`, register in API router, add validation in `ai-validation-suite.cjs`.
- **Update environment config**: Edit `server/config/railway.ts` or `server/config/database-railway.ts`.
- **Validate deployment**: Run `ai-validation-suite.cjs` and check `/api/health` after deploy.

## 📚 Key References
- `deployment-platforms-guide.md`, `DEPLOYMENT_GUIDE.md`, `RAILWAY_DEPLOYMENT_GUIDE.md`, `COMPREHENSIVE_AI_TESTING_REPORT.md`
- `ai-validation-suite.cjs`, `server/services/`, `client/`

---
For unclear or missing conventions, check the above guides or ask for clarification in the repo.
