#!/bin/bash

# DropDollar GoDaddy Deployment Script
echo "🚀 Starting DropDollar deployment process..."

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf out/
rm -rf .next/

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 3: Build the application
echo "🔨 Building DropDollar for production..."
npm run build

# Step 4: Check if build was successful
if [ -d "out" ]; then
    echo "✅ Build successful! Static files generated in 'out' folder"
    echo ""
    echo "📂 Contents of 'out' folder:"
    ls -la out/
    echo ""
    echo "🌐 Next steps:"
    echo "1. Zip the 'out' folder contents"
    echo "2. Upload to your GoDaddy hosting via File Manager or FTP"
    echo "3. Extract in your domain's public_html folder"
    echo "4. Update OAuth redirect URLs to use your domain"
    echo ""
    echo "🎯 Your DropDollar site is ready for deployment!"
else
    echo "❌ Build failed! Check the errors above."
    exit 1
fi
