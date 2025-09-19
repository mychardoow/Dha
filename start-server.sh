#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "  DHA Digital Services Platform - Server Startup"
echo "═══════════════════════════════════════════════════════════════"

# Construct DATABASE_URL from components if not valid
if [[ ! "$DATABASE_URL" =~ ^postgres(ql)?:// ]]; then
  echo "✓ Constructing DATABASE_URL from environment components..."
  export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE}?sslmode=require"
  echo "✓ DATABASE_URL constructed successfully"
else
  echo "✓ Using existing DATABASE_URL"
fi

echo "✓ Starting server on port 5000..."
echo "═══════════════════════════════════════════════════════════════"

# Start the server
NODE_ENV=development npx tsx server/index.ts