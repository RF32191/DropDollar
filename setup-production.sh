#!/bin/bash

# Dollar Drop Production Setup Script
# This script helps you configure all production settings

echo "🚀 Dollar Drop Production Setup"
echo "==============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to prompt for input
prompt_for_input() {
    local prompt="$1"
    local var_name="$2"
    local is_secret="$3"
    
    echo -e "${BLUE}$prompt${NC}"
    if [ "$is_secret" = "true" ]; then
        read -s input
        echo ""
    else
        read input
    fi
    
    if [ -z "$input" ]; then
        echo -e "${RED}❌ This field is required!${NC}"
        prompt_for_input "$prompt" "$var_name" "$is_secret"
    else
        eval "$var_name='$input'"
    fi
}

echo "📋 We'll collect your API keys and configuration step by step."
echo "Have your Stripe and PayPal accounts ready!"
echo ""

# Domain Configuration
echo -e "${YELLOW}🌐 DOMAIN CONFIGURATION${NC}"
prompt_for_input "Enter your domain (e.g., dollardrop.com):" DOMAIN false
FULL_URL="https://$DOMAIN"

# Stripe Configuration
echo ""
echo -e "${YELLOW}💳 STRIPE CONFIGURATION${NC}"
echo "Get these from: https://dashboard.stripe.com/apikeys"
prompt_for_input "Stripe Live Secret Key (sk_live_...):" STRIPE_SECRET true
prompt_for_input "Stripe Live Publishable Key (pk_live_...):" STRIPE_PUBLISHABLE false
prompt_for_input "Stripe Webhook Secret (whsec_...):" STRIPE_WEBHOOK true

# PayPal Configuration
echo ""
echo -e "${YELLOW}🟡 PAYPAL CONFIGURATION${NC}"
echo "Get these from: https://developer.paypal.com/"
prompt_for_input "PayPal Live Client ID:" PAYPAL_CLIENT_ID false
prompt_for_input "PayPal Live Client Secret:" PAYPAL_CLIENT_SECRET true

# Security Configuration
echo ""
echo -e "${YELLOW}🔒 SECURITY CONFIGURATION${NC}"
echo "Generating secure random keys..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n' | cut -c1-32)

# Email Configuration (Optional)
echo ""
echo -e "${YELLOW}📧 EMAIL CONFIGURATION (Optional)${NC}"
echo "Press Enter to skip email configuration for now"
read -p "Email username (e.g., noreply@$DOMAIN): " EMAIL_USER
if [ ! -z "$EMAIL_USER" ]; then
    prompt_for_input "Email password:" EMAIL_PASS true
else
    EMAIL_USER="noreply@$DOMAIN"
    EMAIL_PASS="your_email_password_here"
fi

# Create .env.production file
echo ""
echo -e "${BLUE}📝 Creating production environment file...${NC}"

cat > .env.production << EOF
# Dollar Drop Production Environment Variables
# Generated on $(date)

# Application Configuration
NEXT_PUBLIC_APP_URL=$FULL_URL
NODE_ENV=production

# Stripe LIVE Configuration
STRIPE_SECRET_KEY=$STRIPE_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK

# PayPal LIVE Configuration
PAYPAL_CLIENT_ID=$PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET=$PAYPAL_CLIENT_SECRET
PAYPAL_ENVIRONMENT=production

# Security Configuration
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Feature Flags
ENABLE_TOURNAMENTS=true
ENABLE_MARKETPLACE=true
ENABLE_CRYPTO_PAYMENTS=true
MAINTENANCE_MODE=false

# Email Configuration
SMTP_HOST=smtp.godaddy.com
SMTP_PORT=587
SMTP_USER=$EMAIL_USER
SMTP_PASS=$EMAIL_PASS

# Database Configuration (for future scaling)
DATABASE_URL=your_database_url_here_if_needed
EOF

echo -e "${GREEN}✅ Production environment file created!${NC}"
echo ""

# Test the configuration
echo -e "${BLUE}🧪 Testing your configuration...${NC}"

# Install required packages for testing
npm install stripe node-fetch dotenv --silent

# Run payment tests
echo "Testing Stripe connection..."
node -e "
const Stripe = require('stripe');
require('dotenv').config({ path: '.env.production' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

stripe.accounts.retrieve()
  .then(account => {
    console.log('✅ Stripe connected successfully');
    console.log('   Account ID:', account.id);
    console.log('   Country:', account.country);
    console.log('   Charges enabled:', account.charges_enabled);
  })
  .catch(error => {
    console.log('❌ Stripe connection failed:', error.message);
  });
"

echo ""
echo "Testing PayPal connection..."
node -e "
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.production' });

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const auth = Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64');

fetch('https://api.paypal.com/v1/oauth2/token', {
  method: 'POST',
  headers: {
    'Authorization': \`Basic \${auth}\`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: 'grant_type=client_credentials'
})
.then(response => response.json())
.then(data => {
  if (data.access_token) {
    console.log('✅ PayPal connected successfully');
    console.log('   Token type:', data.token_type);
  } else {
    console.log('❌ PayPal connection failed:', data.error_description || 'Unknown error');
  }
})
.catch(error => {
  console.log('❌ PayPal connection failed:', error.message);
});
"

echo ""
echo -e "${GREEN}🎉 PRODUCTION SETUP COMPLETE!${NC}"
echo ""
echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo "1. Build your production site: ./update-site.sh"
echo "2. Upload to GoDaddy hosting"
echo "3. Configure environment variables in GoDaddy cPanel"
echo "4. Test live payments"
echo "5. Launch your platform!"
echo ""
echo -e "${BLUE}💡 Important Security Notes:${NC}"
echo "- Never commit .env.production to git"
echo "- Keep your API keys secure"
echo "- Monitor your payment dashboards"
echo "- Test with small amounts first"
echo ""
echo -e "${GREEN}Your Dollar Drop platform is ready for production! 🚀${NC}"


