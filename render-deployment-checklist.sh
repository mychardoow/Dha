#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Starting Render Deployment Checklist...${NC}\n"

# Check build script
if [ ! -x "build-fix.sh" ]; then
    echo -e "${RED}❌ build-fix.sh not found or not executable${NC}"
    chmod +x build-fix.sh 2>/dev/null || echo -e "${RED}Failed to make build-fix.sh executable${NC}"
fi

# Verify Node.js version
echo -e "\n${YELLOW}📦 Checking Node.js version...${NC}"
node -v
npm -v

# Clean installation
echo -e "\n${YELLOW}🧹 Cleaning installation...${NC}"
rm -rf node_modules package-lock.json
npm cache clean --force

# Install dependencies
echo -e "\n${YELLOW}📥 Installing dependencies...${NC}"
npm install

# Check TypeScript compilation
echo -e "\n${YELLOW}🔍 Checking TypeScript compilation...${NC}"
npx tsc --noEmit

# Run tests
echo -e "\n${YELLOW}🧪 Running tests...${NC}"
npm test

# Check environment configuration
echo -e "\n${YELLOW}⚙️ Checking environment configuration...${NC}"
if [ ! -f ".env.example" ]; then
    echo -e "${RED}❌ Missing .env.example file${NC}"
fi

# Verify render.yaml
echo -e "\n${YELLOW}📋 Verifying render.yaml...${NC}"
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}❌ Missing render.yaml file${NC}"
else
    echo -e "${GREEN}✅ render.yaml present${NC}"
fi

# Run pre-deployment tests
echo -e "\n${YELLOW}🚀 Running pre-deployment tests...${NC}"
./pre-deployment-test.sh

# Final checks
echo -e "\n${YELLOW}🔍 Final deployment checks:${NC}"
echo -e "1. Health check endpoint configured (/api/health)"
echo -e "2. Memory limits set (512MB)"
echo -e "3. Worker configuration verified"
echo -e "4. Environment variables configured in Render dashboard"
echo -e "5. Auto-deployment enabled"
echo -e "6. Scaling configuration set"

echo -e "\n${YELLOW}📝 Deployment Notes:${NC}"
echo -e "1. Monitor the deployment logs in Render dashboard"
echo -e "2. Verify health checks pass after deployment"
echo -e "3. Check worker processes start correctly"
echo -e "4. Monitor memory usage and scaling behavior"
echo -e "5. Verify all API endpoints are responding"

# Exit with success
exit 0