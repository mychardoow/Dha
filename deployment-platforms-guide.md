# DHA Digital Services Platform - Deployment Guide

## 🇿🇦 Multi-Platform Deployment Options

The DHA Digital Services Platform supports deployment across multiple free platforms, each optimized for different use cases. Choose the platform that best fits your requirements.

---

## 🏆 Platform Comparison Matrix

| Platform | Best For | Free Tier | Full-Stack Support | Complex Features | Production Ready |
|----------|----------|-----------|-------------------|------------------|-----------------|
| **Railway** | Full-stack Node.js apps | $5 credit/month | ✅ Excellent | ✅ All work | ⭐⭐⭐⭐⭐ |
| **GitHub Actions** | CI/CD + Multi-platform | Unlimited (public repos) | ✅ Via deployment | ✅ All work | ⭐⭐⭐⭐⭐ |
| **CircleCI** | Enterprise CI/CD | 100 build hours/month | ✅ Via deployment | ✅ All work | ⭐⭐⭐⭐⭐ |
| **Netlify** | Static + Simple APIs | 300 build min/month | ❌ Serverless only | ❌ Many limitations | ⭐⭐ Limited |

### 🚨 For This DHA Application:
- **✅ Recommended**: Railway (zero changes needed)
- **⚠️ Limited**: Netlify (many features disabled)
- **✅ Advanced**: AWS/CircleCI (enterprise-grade)

---

## 🚀 1. GitHub Actions (Recommended)

**Best overall choice for comprehensive CI/CD with multi-platform deployment**

### ✅ Advantages
- ✨ **Native GitHub integration** - No external setup required
- 🆓 **Completely free** for public repositories
- 🔄 **Multi-platform deployment** - Deploy to Railway, Netlify, Render, Vercel simultaneously
- 🏢 **Commercial use allowed** - Perfect for government platforms
- 🔐 **Built-in security scanning** with CodeQL
- 📊 **Comprehensive testing** and validation pipeline

### 🛠️ Setup Instructions

1. **Repository Setup** (Already configured)
   ```bash
   # Configuration file: .github/workflows/deploy.yml ✅
   # No additional setup required
   ```

2. **Configure Secrets** (GitHub Repository Settings → Secrets and Variables → Actions)
   ```
   JWT_SECRET=your_jwt_secret_key
   SESSION_SECRET=your_session_secret_key
   DATABASE_URL=your_database_connection_string
   OPENAI_API_KEY=your_openai_key (optional)
   ANTHROPIC_API_KEY=your_anthropic_key (optional)
   
   # Platform-specific secrets (choose your deployment targets):
   RAILWAY_TOKEN=your_railway_token
   RAILWAY_SERVICE_ID=your_railway_service_id
   NETLIFY_AUTH_TOKEN=your_netlify_token
   NETLIFY_SITE_ID=your_netlify_site_id
   RENDER_API_KEY=your_render_api_key
   RENDER_SERVICE_ID=your_render_service_id
   VERCEL_TOKEN=your_vercel_token
   VERCEL_ORG_ID=your_vercel_org_id
   VERCEL_PROJECT_ID=your_vercel_project_id
   ```

3. **Trigger Deployment**
   ```bash
   git push origin main  # Automatic deployment on main branch
   ```

4. **Manual Platform Selection**
   - Go to **Actions** tab in GitHub
   - Click **Deploy DHA Digital Services Platform**
   - Click **Run workflow**
   - Select specific platform or "all"

### 📈 Features
- ✅ Automated testing on every push/PR
- ✅ TypeScript type checking
- ✅ Security vulnerability scanning
- ✅ Multi-platform deployment
- ✅ Build artifact verification
- ✅ Post-deployment health checks
- ✅ Performance testing
- ✅ Deployment notifications

---

## 🚂 2. Railway (Best for Full-Stack)

**Optimal for Node.js + PostgreSQL applications with zero-config deployment**

### ✅ Advantages
- 🚄 **Zero-config deployment** - Git push to deploy
- 💾 **Built-in PostgreSQL database** with automatic backups
- 🔄 **Auto-scaling** and load balancing
- 🌐 **Custom domains** and SSL certificates
- 📊 **Built-in monitoring** and metrics
- 💰 **$5 free credit monthly** - sufficient for development/testing

### 🛠️ Setup Instructions

1. **Railway Account Setup**
   ```bash
   # Install Railway CLI
   curl -fsSL https://railway.app/install.sh | sh
   
   # Login to Railway
   railway login
   ```

2. **Project Deployment**
   ```bash
   # Clone and deploy
   git clone <your-repo>
   cd dha-digital-services
   
   # Initialize Railway project
   railway init
   
   # Deploy
   railway up
   ```

3. **Environment Variables** (Railway Dashboard)
   ```
   JWT_SECRET=your_jwt_secret_key
   SESSION_SECRET=your_session_secret_key
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   NODE_ENV=production
   ```

4. **Database Setup**
   ```bash
   # Add PostgreSQL database
   railway add postgresql
   
   # Database URL is automatically set as DATABASE_URL
   ```

### 📋 Configuration
- Configuration file: `railway.toml` ✅ (Enhanced)
- Automatic domain: `your-app.railway.app`
- Health checks: `/api/health` endpoint
- Auto-restart on failure

---

## 🌐 3. Netlify (Limited for Complex Apps)

**Good for static sites with simple serverless functions - ⚠️ Limited for this complex application**

### ✅ Advantages
- ⚡ **Lightning-fast CDN** - Global edge deployment
- 🔧 **Serverless functions** for basic API endpoints
- 📱 **Form handling** built-in
- 🎯 **Branch previews** for testing
- 🔒 **Built-in security headers**
- 🆓 **300 build minutes/month** free tier

### ⚠️ Significant Limitations for This Application
- ❌ **No WebSocket support** - Real-time features disabled
- ❌ **No worker threads** - High-precision monitoring systems cannot function
- ❌ **26-second timeout limit** - Complex operations may fail
- ❌ **Cold start delays** - Complex initialization sequences timeout
- ❌ **Memory limitations** - Large PDF generation may fail
- ❌ **No persistent connections** - Database pooling inefficient
- ❌ **Stateless functions** - Session management becomes challenging

### 🛠️ Setup Instructions (Simplified Version)

**Note**: Netlify Functions now configured with simplified Express wrapper - many features disabled

1. **Netlify Account Setup**
   - Sign up at [netlify.com](https://netlify.com) with GitHub
   - Connect your repository

2. **Build Configuration** (✅ Updated)
   ```toml
   # Configuration file: netlify.toml ✅
   # Updated with serverless functions
   # Functions in: netlify/functions/
   ```

3. **Serverless Functions** (✅ Created)
   ```
   netlify/functions/api.js     ✅ Main API handler (simplified)
   netlify/functions/health.js  ✅ Health check endpoint
   ```

4. **Environment Variables** (Netlify Dashboard → Site Settings → Environment Variables)
   ```
   NODE_ENV=production
   JWT_SECRET=your_jwt_secret_key
   SESSION_SECRET=your_session_secret_key
   DATABASE_URL=your_database_connection_string
   OPENAI_API_KEY=your_openai_key (optional)
   ```

5. **Deploy**
   ```bash
   git push origin main  # Auto-deploy on push
   ```

### 📋 What Works on Netlify
- ✅ Basic authentication (JWT)
- ✅ Simple API endpoints
- ✅ Client-side routing support (SPA)
- ✅ Security headers configuration
- ✅ Asset optimization and caching
- ✅ Basic document generation requests

### ❌ What Doesn't Work on Netlify
- ❌ Real-time monitoring dashboard
- ❌ WebSocket connections
- ❌ Worker thread performance monitoring
- ❌ Complex PDF generation
- ❌ Session-based authentication
- ❌ Database connection pooling
- ❌ AI streaming responses
- ❌ Large file processing

### 🚨 Netlify Verdict
**Not recommended for this application** - Use Railway or AWS for full functionality

---

## ⚙️ 4. CircleCI (Enterprise CI/CD)

**Professional CI/CD with advanced workflow orchestration**

### ✅ Advantages
- 🏢 **Enterprise-grade** CI/CD platform
- 🔧 **Advanced workflow orchestration** with dependencies
- 🐳 **Docker support** and custom environments
- 📊 **Detailed analytics** and insights
- 🔄 **Parallel job execution**
- 🆓 **100 build hours/month** free tier

### 🛠️ Setup Instructions

1. **CircleCI Account Setup**
   - Sign up at [circleci.com](https://circleci.com) with GitHub
   - Follow your repository

2. **Configuration** (Already configured)
   ```yaml
   # Configuration file: .circleci/config.yml ✅
   # Comprehensive pipeline with testing, building, and deployment
   ```

3. **Environment Variables** (CircleCI Dashboard → Project Settings → Environment Variables)
   ```
   JWT_SECRET=your_jwt_secret_key
   SESSION_SECRET=your_session_secret_key
   DATABASE_URL=your_database_connection_string
   RAILWAY_TOKEN=your_railway_token
   RAILWAY_SERVICE_ID=your_railway_service_id
   RENDER_API_KEY=your_render_api_key
   RENDER_SERVICE_ID=your_render_service_id
   ```

4. **Context Setup** (CircleCI Dashboard → Organization Settings → Contexts)
   - Create `railway-production` context
   - Create `render-production` context
   - Add environment variables to appropriate contexts

### 📋 Features
- ✅ PostgreSQL test database
- ✅ Comprehensive test suite
- ✅ Security vulnerability scanning
- ✅ Performance testing
- ✅ Multi-platform deployment
- ✅ Nightly security checks

---

## 🎯 Quick Start Commands

### For GitHub Actions (Immediate use)
```bash
# Already configured - just push to main branch
git push origin main
```

### For Railway
```bash
curl -fsSL https://railway.app/install.sh | sh
railway login
railway init
railway up
```

### For Netlify
```bash
# Connect repository at netlify.com
# Configuration already in netlify.toml
git push origin main
```

### For CircleCI
```bash
# Follow repository at circleci.com
# Configuration already in .circleci/config.yml
git push origin main
```

---

## 🔒 Security Considerations

### Required Environment Variables
All platforms require these core secrets:
```
JWT_SECRET=your_jwt_secret_key_min_32_chars
SESSION_SECRET=your_session_secret_key_min_32_chars
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Optional API Keys
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Production Security
- ✅ HTTPS enforced on all platforms
- ✅ Security headers configured
- ✅ CORS protection enabled
- ✅ Rate limiting implemented
- ✅ Session encryption active

---

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check Node.js version (must be 20+)
   node --version
   
   # Clear npm cache
   npm cache clean --force
   
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Database Connection Issues**
   ```bash
   # Verify DATABASE_URL format
   postgresql://username:password@hostname:port/database
   
   # Test connection locally
   npm run db:generate
   npm run db:migrate
   ```

3. **Environment Variable Issues**
   ```bash
   # Check environment variables are set
   echo $DATABASE_URL
   echo $JWT_SECRET
   echo $SESSION_SECRET
   ```

### Platform-Specific Help

- **GitHub Actions**: Check Actions tab for detailed logs
- **Railway**: Use `railway logs` command
- **Netlify**: Check deploy logs in Netlify dashboard
- **CircleCI**: View job details in CircleCI dashboard

---

## 📞 Support

For deployment issues specific to the DHA Digital Services Platform:

1. **Check the deployment logs** on your chosen platform
2. **Verify environment variables** are correctly set
3. **Test health endpoint**: `https://your-domain/api/health`
4. **Review configuration files** in this repository

---

## 🎉 Success Metrics

After successful deployment, you should see:

✅ **Health Check**: `GET /api/health` returns 200  
✅ **Frontend**: Application loads correctly  
✅ **Database**: Connection established  
✅ **API**: All endpoints responding  
✅ **Security**: HTTPS enforced  
✅ **Performance**: Sub-second response times  

---

*🇿🇦 DHA Digital Services Platform - Serving South Africa with Modern Technology*