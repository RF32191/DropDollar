#!/bin/bash

# 🏠 GODADDY DIRECT DEPLOYMENT SCRIPT
echo "🏠 Setting up DropDollar for direct GoDaddy deployment..."

# Step 1: Build for production
echo "🔨 Building for production..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Check errors above."
    exit 1
fi

# Step 2: Create deployment package
echo "📦 Creating deployment package..."
mkdir -p godaddy-deployment

# Copy standalone build
cp -r .next/standalone/* godaddy-deployment/
cp -r .next/static godaddy-deployment/.next/
cp -r public godaddy-deployment/

# Create startup script for GoDaddy
cat > godaddy-deployment/server.js << 'EOF'
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = false
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
EOF

# Create package.json for deployment
cat > godaddy-deployment/package.json << 'EOF'
{
  "name": "dropdollar-production",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "next": "14.0.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
EOF

# Create .htaccess for URL rewriting (if using shared hosting)
cat > godaddy-deployment/.htaccess << 'EOF'
# Enable URL rewriting
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Handle Next.js routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.php [L]
EOF

# Create ZIP file for upload
echo "🗜️ Creating ZIP file for upload..."
cd godaddy-deployment
zip -r ../dropdollar-godaddy-deployment.zip .
cd ..

echo "✅ GoDaddy deployment package created!"
echo ""
echo "📂 Files created:"
echo "  - godaddy-deployment/ (folder with all files)"
echo "  - dropdollar-godaddy-deployment.zip (upload this to GoDaddy)"
echo ""
echo "🚀 Next steps:"
echo "1. Upload dropdollar-godaddy-deployment.zip to GoDaddy"
echo "2. Extract in your domain's root folder"
echo "3. If Node.js hosting: run 'npm install' then 'npm start'"
echo "4. If shared hosting: ensure .htaccess is in place"
echo "5. Update OAuth URLs to https://drop-dollar.com/auth/callback"
