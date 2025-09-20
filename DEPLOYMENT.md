# Deployment Guide

## 🚀 Deploy to Netlify

### Option 1: Manual Deployment

1. **Build the project locally:**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify:**
   - Go to [Netlify](https://app.netlify.com)
   - Drag and drop the `dist/public` folder
   - Or use Netlify CLI:
     ```bash
     npx netlify-cli deploy --prod --dir=dist/public
     ```

### Option 2: Git Integration (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial DHA platform deployment"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to [Netlify](https://app.netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Set build settings:
     - Build command: `npm run build`
     - Publish directory: `dist/public`

3. **Configure Environment Variables:**
   In Netlify dashboard → Site settings → Environment variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   OPENAI_API_KEY=your_openai_api_key
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=production
   ```

### Option 3: GitHub Actions (Automated)

The `.github/workflows/deploy.yml` file is already configured for automatic deployment.

**Required GitHub Secrets:**
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
   - `NETLIFY_SITE_ID`: Your Netlify site ID

## 🔧 Alternative Platforms

### Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables:**
   ```bash
   vercel env add DATABASE_URL
   vercel env add OPENAI_API_KEY
   vercel env add JWT_SECRET
   ```

### Deploy to Railway

1. **Connect to Railway:**
   - Go to [Railway](https://railway.app)
   - Import from GitHub

2. **Add Environment Variables:**
   ```
   DATABASE_URL=postgresql://...
   OPENAI_API_KEY=sk-...
   JWT_SECRET=...
   NODE_ENV=production
   ```

## 🗃️ Database Setup

### PostgreSQL Options

1. **Neon (Recommended for Netlify):**
   - Go to [Neon](https://neon.tech)
   - Create a new project
   - Copy the connection string to `DATABASE_URL`

2. **Supabase:**
   - Go to [Supabase](https://supabase.com)
   - Create a new project
   - Use the PostgreSQL connection string

3. **Railway PostgreSQL:**
   - Add PostgreSQL service in Railway
   - Use the provided `DATABASE_URL`

### Database Migration

After setting up your database:
```bash
# Push schema to database
npm run db:push
```

## 🔐 Security Checklist

- [ ] Set strong `JWT_SECRET` (32+ random characters)
- [ ] Configure `DATABASE_URL` with SSL enabled
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (automatic on Netlify/Vercel)
- [ ] Configure CORS for your domain
- [ ] Set up proper error logging

## 🧪 Testing Deployment

1. **Verify Core Features:**
   - Login with admin credentials (admin/admin123)
   - Navigate to Document Generation
   - Verify all 23 document types load
   - Test AI Assistant functionality

2. **Check API Endpoints:**
   ```bash
   curl https://your-site.netlify.app/api/documents/templates
   ```

3. **Monitor Performance:**
   - Check build times
   - Verify function execution
   - Monitor error logs

## 🚨 Troubleshooting

### Common Issues

1. **Build Fails:**
   - Check Node.js version (requires 18+)
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Functions Timeout:**
   - Netlify functions have 10s timeout (26s for Pro)
   - Consider splitting large operations
   - Optimize database queries

3. **Database Connection Issues:**
   - Verify `DATABASE_URL` format
   - Check SSL requirements
   - Ensure database is accessible from deployment platform

4. **Environment Variables:**
   - Double-check variable names (case-sensitive)
   - Verify values are properly set
   - Restart deployment after changes

### Support

For deployment issues:
1. Check build logs in platform dashboard
2. Review function execution logs
3. Verify environment variable configuration
4. Test locally with production build: `npm run build && npm start`

---

**Your DHA Digital Services Platform is now ready for production deployment!** 🎉