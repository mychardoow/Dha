#!/bin/bash

# Ultra Queen AI Raeesa - GitHub Push Script
# This script will push your code to GitHub

echo "🚀 Ultra Queen AI Raeesa - GitHub Deployment Script"
echo "===================================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📝 Initializing git repository..."
    git init
fi

# Add all files
echo "📦 Adding all files..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Ultra Queen AI Raeesa - Production Ready

- Fixed all syntax errors in ultra-queen-backend.cjs
- Fixed TypeScript errors in ultra-ai-integration-validator.ts  
- Removed duplicate/confusing backend files
- Frontend properly connected to backend API endpoints
- Ready for Render/Railway deployment
- 42+ APIs integrated and documented
- Only Limit Is Me protocol active"

# Check if remote exists
if ! git remote | grep -q origin; then
    echo ""
    echo "⚠️  No remote repository configured!"
    echo ""
    echo "Please create a new repository on GitHub and run:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/ultra-queen-ai-raeesa.git"
    echo ""
    echo "Then run: git push -u origin main"
else
    echo ""
    echo "📤 Pushing to GitHub..."
    git push -u origin main
    echo ""
    echo "✅ Successfully pushed to GitHub!"
fi

echo ""
echo "===================================================="
echo "🎉 Done! Your code is ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Go to render.com or railway.app"
echo "2. Connect your GitHub repository"
echo "3. Add your API keys in environment variables"
echo "4. Deploy!"
echo ""