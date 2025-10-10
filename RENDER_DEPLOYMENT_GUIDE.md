# Render Deployment Guide - DHA Digital Services Platform

## Quick Deployment Steps

### 1. Prerequisites
- GitHub repository connected to Render
- OpenAI API Key (required)
- Anthropic API Key (optional)

### 2. Environment Variables
Set these in Render Dashboard → Environment → Environment Variables:

#### Required:
- `OPENAI_API_KEY` - Your OpenAI API key for AI features
- `NODE_ENV` - Set to `production`
- `PORT` - Render automatically sets this to 10000 or use `5000`
- `HOST` - Set to `0.0.0.0`

#### Optional:
- `ANTHROPIC_API_KEY` - For Claude AI features  
- `DATABASE_URL` - Auto-populated if using Render PostgreSQL
- `REPLIT_DB_URL` - For Replit DB integration (if needed)

### 3. Build Configuration
**Build Command:**
```bash
bash render-build-production.sh
```

**Start Command:**
```bash
bash render-start-production.sh
```

### 4. Health Check
- **Health Check Path:** `/api/health`
- The endpoint returns database status, API service status, and system health

### 5. Deployment Process

#### Option A: Using render.yaml (Recommended)
1. Connect your GitHub repository to Render
2. Render will auto-detect the `render.yaml` file
3. Click "Apply" to create services
4. Set environment variables in the dashboard
5. Deploy!

#### Option B: Manual Setup
1. Create new Web Service in Render
2. Connect GitHub repository
3. Set Build Command: `bash render-build-production.sh`
4. Set Start Command: `bash render-start-production.sh`
5. Set Environment to `Node`
6. Add environment variables
7. Deploy!

### 6. Database Setup (Optional)
If you need PostgreSQL:
1. Create PostgreSQL database in Render
2. Name it `dha-database`
3. Render will auto-populate `DATABASE_URL`
4. The app will use PostgreSQL automatically

If not using PostgreSQL:
- App falls back to SQLite (in-memory/file-based)
- Suitable for testing and development

### 7. Verification
After deployment:
1. Visit your Render URL
2. Check `/api/health` endpoint
3. Verify status response shows "healthy"
4. Test AI assistant and document features

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify `render-build-production.sh` has execute permissions
- Check Render build logs for specific errors

### Runtime Errors
- Check `render-start-production.sh` has execute permissions
- Verify PORT is set correctly (Render uses dynamic ports)
- Check that HOST is `0.0.0.0`

### Database Connection Issues
- Verify DATABASE_URL is set (if using PostgreSQL)
- Check database is in same region as web service
- SQLite fallback should work automatically

### API Integration Issues  
- Verify OPENAI_API_KEY is set correctly
- Check API key has sufficient credits
- Review application logs in Render dashboard

## Performance on Free Tier

The application is optimized for Render Free Tier:
- Build process bypasses TypeScript errors
- Memory limit configured for 512MB
- Automatic fallback to SQLite if no PostgreSQL
- Health checks configured for uptime monitoring

## Auto-Deploy
- Enabled by default via `render.yaml`
- Pushes to main branch trigger deployments
- Can be disabled in Render dashboard settings

## Support
For issues specific to:
- Render platform: https://render.com/docs
- DHA Platform: Check application logs and health endpoint
