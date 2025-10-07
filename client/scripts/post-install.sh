#!/bin/bash

# Force reinstall UI dependencies
echo "🔧 Reinstalling UI dependencies..."
npm install @radix-ui/react-icons@latest --force
npm install @radix-ui/react-select@latest --force
npm install @radix-ui/react-tabs@latest --force

# Clear cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Rebuild node-sass if it exists
if [ -d "node_modules/node-sass" ]; then
  echo "🔄 Rebuilding node-sass..."
  npm rebuild node-sass
fi

# Link peer dependencies
echo "🔗 Linking peer dependencies..."
npm link react react-dom

echo "✅ Post-install completed"