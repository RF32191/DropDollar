#!/bin/bash

# Dollar Drop - Site Update Script
# This script builds and packages your site for GoDaddy deployment

echo "🚀 Dollar Drop Site Update Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from your project root directory"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf dollar-drop-godaddy-deployment
rm -f dollar-drop-godaddy-deployment.zip

# Install dependencies (in case anything changed)
echo "📦 Installing dependencies..."
npm install

# Build the site
echo "🏗️  Building site for production..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix errors and try again."
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p dollar-drop-godaddy-deployment

# Copy static assets
cp -r .next/static dollar-drop-godaddy-deployment/_next/
cp -r public/* dollar-drop-godaddy-deployment/ 2>/dev/null || true

# Copy configuration files
cp dollar-drop-godaddy-deployment/index.html dollar-drop-godaddy-deployment/index.html.backup 2>/dev/null || true

# Create fresh index.html, .htaccess, robots.txt, sitemap.xml
cat > dollar-drop-godaddy-deployment/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dollar Drop - Skill-Based Tournament Platform</title>
    <meta name="description" content="Compete in skill-based games for real cash prizes. Play Multi-Target Reaction, Falling Objects, and Color Sequence games in tournaments.">
    <link rel="icon" href="/favicon.ico">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .loading { display: flex; justify-content: center; align-items: center; height: 100vh; }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div id="loading" class="loading">
        <div class="spinner"></div>
    </div>
    <div id="__next"></div>
    
    <script>
        window.__NEXT_DATA__ = {
            props: { pageProps: {} },
            page: "/",
            query: {},
            buildId: "production",
            nextExport: true,
            autoExport: true,
            isFallback: false
        };
        
        window.ENV = {
            NEXT_PUBLIC_APP_URL: 'https://yourdomain.com',
            NODE_ENV: 'production'
        };
    </script>
    
    <script src="/_next/static/chunks/webpack.js" defer></script>
    <script src="/_next/static/chunks/main.js" defer></script>
    <script src="/_next/static/chunks/pages/_app.js" defer></script>
    <script src="/_next/static/chunks/pages/index.js" defer></script>
    
    <script>
        window.addEventListener('load', function() {
            setTimeout(function() {
                document.getElementById('loading').style.display = 'none';
            }, 1000);
        });
    </script>
</body>
</html>
EOF

# Copy other essential files
cp dollar-drop-godaddy-deployment/.htaccess dollar-drop-godaddy-deployment/.htaccess 2>/dev/null || cat > dollar-drop-godaddy-deployment/.htaccess << 'EOF'
# Dollar Drop - GoDaddy Hosting Configuration
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

RewriteEngine On
RewriteBase /
RewriteRule ^_next/(.*)$ /_next/$1 [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain text/html text/xml text/css application/xml application/xhtml+xml application/rss+xml application/javascript application/x-javascript
</IfModule>

<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
</IfModule>
EOF

# Create zip file
echo "🗜️  Creating zip file..."
cd dollar-drop-godaddy-deployment
zip -r ../dollar-drop-godaddy-deployment.zip . -x "*.DS_Store*" "*.git*"
cd ..

# Get file size
FILE_SIZE=$(ls -lh dollar-drop-godaddy-deployment.zip | awk '{print $5}')

echo ""
echo "✅ Update package created successfully!"
echo "📦 File: dollar-drop-godaddy-deployment.zip ($FILE_SIZE)"
echo ""
echo "🚀 Next steps:"
echo "1. Go to GoDaddy File Manager"
echo "2. Navigate to public_html"
echo "3. Delete old files"
echo "4. Upload dollar-drop-godaddy-deployment.zip"
echo "5. Extract files"
echo "6. Test your updated site!"
echo ""
echo "💡 Tip: Always test locally with 'npm run dev' before updating!"


