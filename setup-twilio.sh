#!/bin/bash

# Twilio Setup Script for DropDollar
echo "📱 Setting up Twilio SMS integration..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local file not found. Creating it..."
    touch .env.local
fi

# Add Twilio credentials
echo ""
echo "Adding Twilio credentials to .env.local..."

# Check if TWILIO_ACCOUNT_SID already exists
if grep -q "TWILIO_ACCOUNT_SID" .env.local; then
    echo "⚠️  TWILIO_ACCOUNT_SID already exists in .env.local"
    echo "Do you want to update it? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        # Remove old values
        sed -i '' '/^TWILIO_ACCOUNT_SID=/d' .env.local
        sed -i '' '/^TWILIO_AUTH_TOKEN=/d' .env.local
    else
        echo "Keeping existing values."
        exit 0
    fi
fi

# Add Twilio credentials
cat >> .env.local << 'EOF'

# ========================================
# TWILIO SMS CONFIGURATION
# ========================================
TWILIO_ACCOUNT_SID=ACcef3f25a50c5ef89db6479c657687069
TWILIO_AUTH_TOKEN=0fb59408cd4d2c592a1555b48bd343fb

# Optional: Twilio Verify Service SID (recommended)
# Get from: https://console.twilio.com/us1/develop/verify/services
# TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Twilio Phone Number (for regular SMS if Verify Service not used)
# Get from: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
# Format: +15551234567 (E.164 format)
# TWILIO_FROM_NUMBER=+15551234567
EOF

echo ""
echo "✅ Twilio credentials added to .env.local"
echo ""
echo "📋 Next steps:"
echo "1. Get your Twilio Verify Service SID (recommended):"
echo "   https://console.twilio.com/us1/develop/verify/services"
echo "   Then add: TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
echo ""
echo "   OR"
echo ""
echo "2. Get your Twilio Phone Number (alternative):"
echo "   https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
echo "   Then add: TWILIO_FROM_NUMBER=+15551234567"
echo ""
echo "3. Restart your dev server: npm run dev"
echo ""
echo "4. Test registration at: http://localhost:3000/auth/register"

