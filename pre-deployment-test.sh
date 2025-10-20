#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Comprehensive pre-deployment test script
echo -e "${YELLOW}🚀 Starting comprehensive pre-deployment tests...${NC}\n"

# Function to run test and check exit code
run_test() {
    echo -e "Running $1..."
    eval "$2"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 failed${NC}"
        return 1
    fi
}

check_file_content() {
    local file="$1"
    local pattern="$2"
    grep -q "$pattern" "$file" 2>/dev/null
}

# Track overall status
FAILED_TESTS=0

echo -e "\n${YELLOW}📋 Basic Configuration Tests${NC}"
# 1. Check build script exists and is executable
run_test "Build script check" "test -x build-fix.sh" || ((FAILED_TESTS++))

# 2. Verify package.json configuration
run_test "Package.json check" "test -f package.json && grep -q '\"postinstall\": \"echo' package.json" || ((FAILED_TESTS++))

# 3. Check render.yaml configuration
run_test "Render.yaml configuration" "test -f render.yaml && grep -q 'plan: pro' render.yaml && grep -q 'DISABLE_PORT_BINDING: true' render.yaml" || ((FAILED_TESTS++))

# 4. Verify environment configuration
echo -e "\n${YELLOW}🔐 Environment Tests${NC}"
run_test "Environment variables" "check_file_content render.yaml 'NODE_ENV' && check_file_content render.yaml 'DATABASE_URL' && check_file_content render.yaml 'SESSION_SECRET'" || ((FAILED_TESTS++))
run_test "Security variables" "check_file_content render.yaml 'JWT_SECRET' && check_file_content render.yaml 'ENCRYPTION_KEY'" || ((FAILED_TESTS++))
run_test "Monitoring variables" "check_file_content render.yaml 'ENABLE_MONITORING' && check_file_content render.yaml 'MONITOR_INTERVAL'" || ((FAILED_TESTS++))

# 5. Test service configurations
echo -e "\n${YELLOW}🔧 Service Configuration Tests${NC}"
run_test "Web service config" "check_file_content render.yaml 'type: web' && check_file_content render.yaml 'name: dha-digital-services'" || ((FAILED_TESTS++))
run_test "Worker service config" "check_file_content render.yaml 'type: worker' && check_file_content render.yaml 'name: dha-monitoring-service'" || ((FAILED_TESTS++))
run_test "Health check config" "check_file_content render.yaml 'healthCheckPath' && check_file_content render.yaml 'healthCheckTimeout'" || ((FAILED_TESTS++))

# 6. Test build configuration
echo -e "\n${YELLOW}🏗️ Build Configuration Tests${NC}"
run_test "Build command" "./build-fix.sh" || ((FAILED_TESTS++))
run_test "Dependencies" "npm install --dry-run" || ((FAILED_TESTS++))
run_test "TypeScript compilation" "npx tsc --noEmit" || ((FAILED_TESTS++))

# 7. Test security configuration
echo -e "\n${YELLOW}🔒 Security Configuration Tests${NC}"
run_test "Security headers" "grep -q 'helmet' package.json" || ((FAILED_TESTS++))
run_test "Environment protection" "! find . -maxdepth 1 -type f -name '.env*' -not -name '.env.example' | grep -q ." || ((FAILED_TESTS++))
run_test "Secret syncing" "grep -q 'sync: false' render.yaml" || ((FAILED_TESTS++))

# 8. Test scaling configuration
echo -e "\n${YELLOW}⚖️ Scaling Configuration Tests${NC}"
run_test "Auto-scaling config" "grep -q 'scaling:' render.yaml && grep -q 'minInstances:' render.yaml" || ((FAILED_TESTS++))
run_test "Memory limits" "grep -q 'targetMemoryPercent:' render.yaml" || ((FAILED_TESTS++))
run_test "CPU limits" "grep -q 'targetCPUPercent:' render.yaml" || ((FAILED_TESTS++))

# Print summary
echo -e "\n${YELLOW}📊 Test Summary${NC}"
TOTAL_TESTS=$(grep -c 'run_test' "$0")
PASSED_TESTS=$((TOTAL_TESTS - FAILED_TESTS))

echo -e "Tests run: ${TOTAL_TESTS}"
echo -e "Tests passed: ${GREEN}${PASSED_TESTS}${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "Tests failed: ${RED}${FAILED_TESTS}${NC}"
else
    echo -e "Tests failed: ${GREEN}0${NC}"
fi

# Generate report
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
REPORT_FILE="pre-deployment-test-report_${TIMESTAMP}.json"

echo "{
  \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
  \"totalTests\": ${TOTAL_TESTS},
  \"passedTests\": ${PASSED_TESTS},
  \"failedTests\": ${FAILED_TESTS},
  \"buildStatus\": \"$([ $FAILED_TESTS -eq 0 ] && echo 'ready' || echo 'not-ready')\"
}" > "${REPORT_FILE}"

echo -e "\n${YELLOW}📝 Test report generated: ${REPORT_FILE}${NC}"

# Exit with status
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "\n${RED}❌ Pre-deployment tests failed. Please fix the issues before deploying.${NC}"
    exit 1
else
    echo -e "\n${GREEN}✅ All pre-deployment tests passed. Ready for deployment!${NC}"
    exit 0
fi
run_test "Environment config check" "test -f config/environment.ts" || ((FAILED_TESTS++))

# 5. Check worker script
run_test "Worker script check" "test -f server/workers/background-worker.ts" || ((FAILED_TESTS++))

# 6. Install dependencies
echo "Installing dependencies..."
if npm install; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Dependency installation failed"
    ((FAILED_TESTS++))
fi

# 7. Try building the project
echo "Testing build process..."
if ./build-fix.sh; then
    echo "✅ Build process successful"
else
    echo "❌ Build process failed"
    ((FAILED_TESTS++))
fi

# Results summary
echo ""
echo "Pre-deployment Test Results:"
echo "=========================="
if [ $FAILED_TESTS -eq 0 ]; then
    echo "✅ All tests passed! Ready for deployment."
    exit 0
else
    echo "❌ $FAILED_TESTS test(s) failed. Please fix issues before deploying."
    exit 1
fi