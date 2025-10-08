#!/bin/bash

echo "🎮 Starting DropDollar Games..."

# Navigate to correct directory
echo "📁 Navigating to project directory..."
cd /Users/ryanjoshuafermoselle/Desktop/CryptoMarket

# Check if we're in the right place
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the correct project directory!"
    echo "Current directory: $(pwd)"
    echo "Expected: /Users/ryanjoshuafermoselle/Desktop/CryptoMarket"
    exit 1
fi

echo "✅ In correct directory: $(pwd)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🚀 Starting development server..."
echo "🎯 Games will be available at: http://localhost:3000/games"
echo "🏠 Main site: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
