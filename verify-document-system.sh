#!/bin/bash

echo "🔍 Verifying document generation system..."

# Check for mock files
mock_files=$(find . -type f -name "*mock*.html" -o -name "dha-document-generator.html" -o -name "dha-generator-with-database.html" -o -name "dha-simple-generator.html" -o -name "dha802.html")

if [ ! -z "$mock_files" ]; then
    echo "❌ ERROR: Mock document generators found:"
    echo "$mock_files"
    echo "These files must be removed before deployment."
    exit 1
fi

# Verify environment settings
if [ "$USE_MOCK_DATA" = "true" ]; then
    echo "❌ ERROR: Mock data is enabled"
    exit 1
fi

if [ "$ENABLE_REAL_CERTIFICATES" != "true" ]; then
    echo "❌ ERROR: Real certificates not enabled"
    exit 1
fi

if [ "$ENABLE_GOVERNMENT_INTEGRATION" != "true" ]; then
    echo "❌ ERROR: Government integration not enabled"
    exit 1
fi

# Check for official document generator
if [ ! -f "dha-official-generator.html" ]; then
    echo "❌ ERROR: Official document generator not found"
    exit 1
fi

echo "✅ Document generation system verified"
echo "✅ Using official DHA integration"
echo "✅ Real certificates enabled"
echo "✅ Government integration active"

exit 0