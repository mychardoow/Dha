
#!/bin/bash

# ==============================================================================
# DHA DIGITAL SERVICES PLATFORM - PRODUCTION DEPLOYMENT SCRIPT
# ==============================================================================

set -e  # Exit on any error

echo "🚀 Starting DHA Digital Services Platform Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    print_status "Checking required environment variables..."
    
    required_vars=(
        "JWT_SECRET"
        "SESSION_SECRET" 
        "ENCRYPTION_KEY"
        "DATABASE_URL"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=($var)
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        print_error "Please set these variables before deployment."
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci --production=false
    print_success "Dependencies installed"
}

# Run security audit
run_security_audit() {
    print_status "Running security audit..."
    npm audit --audit-level=moderate || print_warning "Security audit found issues - please review"
    print_success "Security audit completed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    npm test || {
        print_error "Tests failed - deployment aborted"
        exit 1
    }
    print_success "All tests passed"
}

# Build application
build_application() {
    print_status "Building application..."
    npm run build
    print_success "Application built successfully"
}

# Verify build artifacts
verify_build() {
    print_status "Verifying build artifacts..."
    
    if [ ! -d "dist/public" ]; then
        print_error "Client build failed - dist/public directory not found"
        exit 1
    fi
    
    if [ ! -f "dist/public/index.html" ]; then
        print_error "Client build failed - index.html not found"
        exit 1
    fi
    
    if [ ! -f "dist/index.js" ]; then
        print_error "Server build failed - dist/index.js not found"
        exit 1
    fi
    
    print_success "Build artifacts verified"
}

# Generate deployment manifest
generate_manifest() {
    print_status "Generating deployment manifest..."
    
    cat > deployment-manifest.json << EOF
{
  "deploymentId": "$(date +%Y%m%d_%H%M%S)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "production",
  "version": "$(node -p "require('./package.json').version")",
  "buildInfo": {
    "nodeVersion": "$(node --version)",
    "npmVersion": "$(npm --version)",
    "platform": "$(uname -s)",
    "architecture": "$(uname -m)"
  },
  "features": {
    "dhaServices": true,
    "aiAssistant": true,
    "documentGeneration": true,
    "biometricAuth": true,
    "quantumEncryption": true,
    "realTimeMonitoring": true
  }
}
EOF
    
    print_success "Deployment manifest generated"
}

# Main deployment function
main() {
    print_status "🇿🇦 DHA Digital Services Platform - Production Deployment"
    print_status "=================================================="
    
    check_env_vars
    install_dependencies
    run_security_audit
    run_tests
    build_application
    verify_build
    generate_manifest
    
    print_success "🎉 Deployment preparation completed successfully!"
    print_status "Ready for production deployment to Netlify"
    print_status ""
    print_status "Next steps:"
    print_status "1. Push to GitHub repository"
    print_status "2. Deploy via Netlify dashboard or CLI"
    print_status "3. Configure environment variables in Netlify"
    print_status "4. Verify deployment health"
}

# Run main function
main "$@"
