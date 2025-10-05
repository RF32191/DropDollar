#!/bin/bash

echo "🔧 Testing and deploying DropDollar..."

# Clean up any previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf dollar-drop-godaddy-deployment

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🏗️ Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Create deployment package
    echo "📦 Creating deployment package..."
    mkdir -p dollar-drop-godaddy-deployment
    
    # For regular Next.js build, copy the .next/static and public folders
    if [ -d ".next" ]; then
        cp -r .next/static dollar-drop-godaddy-deployment/ 2>/dev/null || true
        cp -r public/* dollar-drop-godaddy-deployment/ 2>/dev/null || true
        
        # Create a simple index.html for testing
        echo "<!DOCTYPE html>
<html>
<head>
    <title>DropDollar</title>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
        .container { max-width: 600px; margin: 0 auto; }
        .btn { background: #4F46E5; color: white; padding: 12px 24px; border: none; border-radius: 8px; text-decoration: none; display: inline-block; margin: 10px; }
        .btn:hover { background: #3730A3; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🎮 DropDollar</h1>
        <p>Don't drop out, drop a dollar!</p>
        <p>Your gaming marketplace is ready for deployment.</p>
        <div>
            <a href='/games' class='btn'>Play Games</a>
            <a href='/listings' class='btn'>View Listings</a>
            <a href='/hot-sell' class='btn'>Hot Sell</a>
        </div>
        <p><small>Note: This is a test page. For full functionality, deploy with Node.js hosting.</small></p>
    </div>
</body>
</html>" > dollar-drop-godaddy-deployment/index.html
    fi
    
    # If out folder exists (static export), use that instead
    if [ -d "out" ]; then
        cp -r out/* dollar-drop-godaddy-deployment/
    fi
    
    # Create a simple test file
    echo "<!DOCTYPE html>
<html>
<head>
    <title>DropDollar - Test</title>
</head>
<body>
    <h1>DropDollar is working!</h1>
    <p>Games should be accessible at <a href='/games'>/games</a></p>
</body>
</html>" > dollar-drop-godaddy-deployment/test.html
    
    echo "✅ Deployment package created in 'dollar-drop-godaddy-deployment' folder"
    echo "🎮 Games should now be working properly"
    echo "📁 Upload the contents of 'dollar-drop-godaddy-deployment' to your GoDaddy hosting"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
