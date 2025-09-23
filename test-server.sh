#!/bin/bash

echo "🚀 DHA Digital Services Platform - Comprehensive Testing"
echo "========================================================"

# Start server in background
echo "📡 Starting server..."
npx tsx simple-server.ts &
SERVER_PID=$!

# Give server time to start
sleep 5

echo ""
echo "🧪 Running Comprehensive Tests..."
echo "--------------------------------"

# Test 1: Health Check
echo ""
echo "✅ TEST 1: Health Check"
HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health)
echo "Response: $HEALTH_RESPONSE"

# Test 2: System Status  
echo ""
echo "✅ TEST 2: System Status"
STATUS_RESPONSE=$(curl -s http://localhost:5000/api/status)
echo "Response: $STATUS_RESPONSE"

# Test 3: Valid Authentication
echo ""
echo "✅ TEST 3: Valid Authentication (admin/admin123)"
AUTH_SUCCESS=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
echo "Response: $AUTH_SUCCESS"

# Test 4: Invalid Authentication
echo ""
echo "✅ TEST 4: Invalid Authentication (security test)"
AUTH_FAIL=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","password":"wrongpass"}')
echo "Response: $AUTH_FAIL"

# Test 5: Document Generation
echo ""
echo "✅ TEST 5: Document Generation (Passport)"
DOC_GEN=$(curl -s -X POST http://localhost:5000/api/documents/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"passport","applicantData":{"name":"John Doe","idNumber":"9001010001086"}}')
echo "Response: $DOC_GEN"

# Test 6: Document Verification
echo ""
echo "✅ TEST 6: Document Verification"
DOC_VERIFY=$(curl -s -X POST http://localhost:5000/api/verification/verify \
  -H "Content-Type: application/json" \
  -d '{"documentId":"TEST_DOC_001","verificationCode":"ABC123"}')
echo "Response: $DOC_VERIFY"

# Test 7: AI Assistant
echo ""
echo "✅ TEST 7: AI Assistant Chat"
AI_CHAT=$(curl -s -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What documents do I need for a passport application?"}')
echo "Response: $AI_CHAT"

# Test 8: Document List
echo ""
echo "✅ TEST 8: Document List"
DOC_LIST=$(curl -s http://localhost:5000/api/documents)
echo "Response: $DOC_LIST"

# Test 9: Admin Dashboard
echo ""
echo "✅ TEST 9: Admin Dashboard Data"
ADMIN_DASH=$(curl -s http://localhost:5000/api/admin/dashboard)
echo "Response: $ADMIN_DASH"

# Test 10: 404 Error Handling
echo ""
echo "✅ TEST 10: 404 Error Handling"
NOT_FOUND=$(curl -s http://localhost:5000/api/nonexistent)
echo "Response: $NOT_FOUND"

echo ""
echo "🏁 Testing Complete!"
echo "====================="
echo "✅ All 10 tests executed"
echo "📊 Server PID: $SERVER_PID"
echo "🕒 Test completed at: $(date)"

# Kill server
kill $SERVER_PID 2>/dev/null
echo "🛑 Server stopped"