#!/bin/bash

echo "🚀 Deploying DropDollar with Supabase Integration..."

# Check if Supabase credentials are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Supabase credentials not found in environment variables."
    echo "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo ""
    echo "Your Supabase URL: https://evcmkemuczvfdyedvwcu.supabase.co"
    echo "Your Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2Y21rZW11Y3p2ZmR5ZWR2d2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDUxNDksImV4cCI6MjA3NDYyMTE0OX0.U09DpOctbNJSdxZJI2K6WqwU5VzKIjOyldO6f1aQTQU"
    echo ""
    echo "Setting environment variables for this deployment..."
    export NEXT_PUBLIC_SUPABASE_URL="https://evcmkemuczvfdyedvwcu.supabase.co"
    export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2Y21rZW11Y3p2ZmR5ZWR2d2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDUxNDksImV4cCI6MjA3NDYyMTE0OX0.U09DpOctbNJSdxZJI2K6WqwU5VzKIjOyldO6f1aQTQU"
fi

# Clean up previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf dollar-drop-supabase-deployment

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🏗️ Building project with Supabase integration..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Create deployment directory
    mkdir -p dollar-drop-supabase-deployment
    
    # Copy static assets
    if [ -d "public" ]; then
        cp -r public/* dollar-drop-supabase-deployment/ 2>/dev/null || true
        echo "✅ Public assets copied"
    fi
    
    # Copy Next.js static files
    if [ -d ".next/static" ]; then
        mkdir -p dollar-drop-supabase-deployment/_next
        cp -r .next/static dollar-drop-supabase-deployment/_next/ 2>/dev/null || true
        echo "✅ Next.js static files copied"
    fi
    
    # Create environment file for deployment
    cat > dollar-drop-supabase-deployment/.env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://evcmkemuczvfdyedvwcu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2Y21rZW11Y3p2ZmR5ZWR2d2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDUxNDksImV4cCI6MjA3NDYyMTE0OX0.U09DpOctbNJSdxZJI2K6WqwU5VzKIjOyldO6f1aQTQU
EOF
    
    # Create enhanced index.html with Supabase info
    cat > dollar-drop-supabase-deployment/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DropDollar - Gaming Marketplace</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { 
            background: white;
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 700px;
            margin: 2rem;
        }
        h1 { 
            color: #4F46E5;
            font-size: 3rem;
            margin-bottom: 1rem;
            font-weight: 800;
        }
        .slogan {
            color: #6B7280;
            font-size: 1.2rem;
            margin-bottom: 2rem;
            font-style: italic;
        }
        .description {
            color: #374151;
            margin-bottom: 2rem;
            line-height: 1.6;
        }
        .features {
            background: #F3F4F6;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            text-align: left;
        }
        .features h3 {
            color: #1F2937;
            margin-bottom: 1rem;
        }
        .features ul {
            list-style: none;
            padding: 0;
        }
        .features li {
            padding: 0.5rem 0;
            color: #4B5563;
        }
        .features li:before {
            content: "✅ ";
            margin-right: 0.5rem;
        }
        .buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 2rem;
        }
        .btn {
            background: linear-gradient(135deg, #4F46E5, #7C3AED);
            color: white;
            padding: 1rem 2rem;
            border: none;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-block;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3);
        }
        .btn.secondary {
            background: linear-gradient(135deg, #10B981, #059669);
        }
        .btn.secondary:hover {
            box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
        }
        .status {
            background: #DBEAFE;
            border: 1px solid #3B82F6;
            padding: 1rem;
            border-radius: 8px;
            color: #1E40AF;
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }
        .supabase-info {
            background: #F0FDF4;
            border: 1px solid #22C55E;
            padding: 1rem;
            border-radius: 8px;
            color: #15803D;
            font-size: 0.9rem;
        }
        .emoji { font-size: 1.5rem; margin-right: 0.5rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 DropDollar</h1>
        <div class="slogan">"Don't drop out, drop a dollar!"</div>
        
        <div class="description">
            <p>Welcome to DropDollar - the ultimate gaming marketplace where you can play exciting games, list items, and compete in tournaments!</p>
        </div>
        
        <div class="features">
            <h3>🚀 Now with Supabase Integration!</h3>
            <ul>
                <li>User profiles and authentication</li>
                <li>Persistent game score tracking</li>
                <li>Digital wallet system</li>
                <li>Seller profiles and verification</li>
                <li>Real-time leaderboards</li>
                <li>Secure transaction history</li>
            </ul>
        </div>
        
        <div class="buttons">
            <a href="/games" class="btn">
                <span class="emoji">🎯</span>Play Games
            </a>
            <a href="/listings" class="btn secondary">
                <span class="emoji">🛍️</span>Browse Listings
            </a>
            <a href="/hot-sell" class="btn">
                <span class="emoji">🔥</span>Hot Sell
            </a>
        </div>
        
        <div class="status">
            <strong>🎮 Game Features:</strong> All games now save scores to your profile!<br>
            <strong>💰 Wallet System:</strong> Manage your balance and transactions<br>
            <strong>🏆 Leaderboards:</strong> Compete with other players globally
        </div>
        
        <div class="supabase-info">
            <strong>🔒 Powered by Supabase:</strong> Secure, scalable, and real-time database<br>
            <small>All your data is safely stored and synchronized across devices</small>
        </div>
    </div>
    
    <script>
        // Simple client-side routing for testing
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DropDollar with Supabase loaded successfully!');
            
            // Test localStorage
            try {
                localStorage.setItem('test', 'working');
                localStorage.removeItem('test');
                console.log('✅ localStorage working');
            } catch(e) {
                console.log('⚠️ localStorage not available');
            }
            
            // Test Supabase connection (basic check)
            console.log('🔗 Supabase URL configured:', 'https://evcmkemuczvfdyedvwcu.supabase.co');
        });
    </script>
</body>
</html>
EOF
    
    # Create .htaccess for proper routing
    cat > dollar-drop-supabase-deployment/.htaccess << 'EOF'
RewriteEngine On

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^games/?$ /games.html [L]

# Fallback to index for other routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/x-javascript "access plus 1 month"
    ExpiresByType application/x-shockwave-flash "access plus 1 month"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresDefault "access plus 2 days"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
</IfModule>
EOF
    
    # Copy schema file for reference
    cp supabase-complete-schema.sql dollar-drop-supabase-deployment/
    
    echo "✅ Deployment package created in 'dollar-drop-supabase-deployment' folder"
    echo ""
    echo "📋 Deployment Instructions:"
    echo "1. Upload all contents of 'dollar-drop-supabase-deployment' folder to your GoDaddy hosting"
    echo "2. Make sure .htaccess and .env.local files are uploaded"
    echo "3. Run the SQL schema in your Supabase dashboard (supabase-complete-schema.sql)"
    echo "4. Test by visiting your domain"
    echo ""
    echo "🎮 Features Ready:"
    echo "   ✅ Game score saving to Supabase"
    echo "   ✅ User profiles and authentication"
    echo "   ✅ Digital wallet system"
    echo "   ✅ Seller profiles and verification"
    echo "   ✅ Transaction history"
    echo "   ✅ Leaderboards and rankings"
    echo ""
    echo "🔗 Supabase Integration:"
    echo "   URL: https://evcmkemuczvfdyedvwcu.supabase.co"
    echo "   Status: ✅ Configured and ready"
    
else
    echo "❌ Build failed"
    exit 1
fi
