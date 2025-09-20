
# DHA Digital Services Platform - Production Setup Guide

## 🚀 Production Deployment Checklist

### 1. Generate Security Keys

Run the key generation command:
```bash
npm run generate-keys
```

Or manually generate with Node.js:
```bash
node -e "
const crypto = require('crypto');
console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
// ... copy all generated keys
"
```

### 2. Database Setup

1. **Create Production Database**:
   - Use a PostgreSQL provider (recommended: Neon, Supabase, or Railway)
   - Ensure SSL is enabled
   - Copy the connection string

2. **Set DATABASE_URL**:
   ```
   DATABASE_URL=postgresql://username:password@hostname:5432/database?sslmode=require
   ```

### 3. Environment Variables Configuration

Set these in your deployment platform:

#### Required Security Keys:
```
JWT_SECRET=your_generated_64_char_jwt_secret
SESSION_SECRET=your_generated_32_char_session_secret
ENCRYPTION_KEY=your_generated_32_char_encryption_key
VITE_ENCRYPTION_KEY=your_generated_32_char_vite_encryption_key
MASTER_ENCRYPTION_KEY=your_generated_64_char_master_key
QUANTUM_ENCRYPTION_KEY=your_generated_64_char_quantum_key
BIOMETRIC_ENCRYPTION_KEY=your_generated_32_char_biometric_key
DOCUMENT_SIGNING_KEY=your_generated_32_char_document_key
```

#### AI Services:
```
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
```

#### Government APIs (obtain from official sources):
```
DHA_NPR_API_KEY=your_dha_npr_key
DHA_ABIS_API_KEY=your_dha_abis_key
SAPS_CRC_API_KEY=your_saps_crc_key
ICAO_PKD_API_KEY=your_icao_pkd_key
SITA_ESERVICES_API_KEY=your_sita_key
```

### 4. Netlify Deployment Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Configure for production deployment"
   git push origin main
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist/public`
   - Set functions directory: `netlify/functions`

3. **Configure Environment Variables**:
   - Go to Netlify Dashboard > Site Settings > Environment Variables
   - Add all the environment variables listed above

### 5. Domain Configuration

1. **Custom Domain**:
   - Add your domain in Netlify Dashboard
   - Configure DNS settings
   - Enable HTTPS (automatic with Netlify)

2. **Update CORS Origins**:
   ```
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

### 6. Post-Deployment Verification

1. **Health Check**:
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Security Headers**:
   ```bash
   curl -I https://yourdomain.com
   ```

3. **Function Endpoints**:
   ```bash
   curl https://yourdomain.com/.netlify/functions/api/health
   ```

## 🛡️ Security Checklist

- [ ] All secrets generated with cryptographically secure methods
- [ ] Database connection uses SSL
- [ ] HTTPS enabled (automatic with Netlify)
- [ ] Environment variables configured in platform secrets
- [ ] No hardcoded secrets in code
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled

## 🔧 Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check Node.js version (should be 20+)
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Function Timeouts**:
   - Increase function timeout in Netlify settings
   - Optimize database queries
   - Check for infinite loops

3. **Database Connection Issues**:
   - Verify DATABASE_URL format
   - Check SSL requirements
   - Test connection locally first

4. **Environment Variable Issues**:
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify secrets are properly base64/hex encoded

## 📊 Monitoring

After deployment, monitor:
- Application health: `/api/health`
- Error rates: Check Netlify Functions logs
- Performance: Monitor response times
- Security: Review audit logs

## 🔄 Updates

For future updates:
1. Test changes locally
2. Run security audit: `npm audit`
3. Deploy to staging first (if available)
4. Deploy to production via git push
5. Verify deployment health

---

**🇿🇦 DHA Digital Services Platform - Ready for Production**
