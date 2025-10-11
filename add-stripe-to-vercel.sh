#!/bin/bash

echo "🔧 Adding Stripe Keys to Vercel..."
echo ""

# Load local environment variables
if [ -f ".env.local" ]; then
    source .env.local
    echo "✅ Loaded local environment variables"
else
    echo "❌ .env.local not found"
    exit 1
fi

# Vercel project details
VERCEL_PROJECT_ID="prj_IeTW3HB3KNoukYM6A4fAx7DAp8VO"
VERCEL_TEAM_ID="team_GXHCu3xF0e3SAauGqj1nNrYu"

echo ""
echo "📋 Project ID: $VERCEL_PROJECT_ID"
echo ""

# Check if Stripe keys exist locally
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ STRIPE_SECRET_KEY not found in .env.local"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then
    echo "❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not found in .env.local"
    exit 1
fi

echo "✅ Found Stripe keys in .env.local"
echo ""

# Function to add environment variable to Vercel
add_vercel_env() {
    local key=$1
    local value=$2
    local type=$3  # "encrypted" for secret, "plain" for public
    
    echo "🔧 Adding $key to Vercel..."
    
    # First, try to get the environment variable ID if it exists
    ENV_ID=$(curl -s "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" \
        -H "Authorization: Bearer $VERCEL_TOKEN" | \
        jq -r ".envs[] | select(.key==\"$key\") | .id" 2>/dev/null)
    
    if [ -n "$ENV_ID" ] && [ "$ENV_ID" != "null" ]; then
        echo "⚠️  $key already exists (ID: $ENV_ID)"
        echo "   Deleting old value..."
        
        curl -s -X DELETE \
            "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$ENV_ID?teamId=$VERCEL_TEAM_ID" \
            -H "Authorization: Bearer $VERCEL_TOKEN" > /dev/null
        
        echo "   ✅ Deleted old value"
    fi
    
    # Add new environment variable
    RESPONSE=$(curl -s -X POST \
        "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"key\": \"$key\",
            \"value\": \"$value\",
            \"type\": \"$type\",
            \"target\": [\"production\", \"preview\", \"development\"]
        }")
    
    if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error.message')
        echo "❌ Failed to add $key: $ERROR_MSG"
        return 1
    else
        echo "✅ Successfully added $key to Vercel"
        return 0
    fi
}

# Check if VERCEL_TOKEN exists
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ VERCEL_TOKEN not found in environment"
    echo ""
    echo "🔧 To create a Vercel token:"
    echo "1. Go to: https://vercel.com/account/tokens"
    echo "2. Click 'Create Token'"
    echo "3. Add it to your .env.local:"
    echo "   VERCEL_TOKEN=your_token_here"
    echo ""
    echo "OR use the Vercel CLI:"
    echo "  vercel env add STRIPE_SECRET_KEY production"
    echo "  vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production"
    exit 1
fi

echo "✅ Found Vercel token"
echo ""

# Add Stripe Secret Key (encrypted)
add_vercel_env "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" "encrypted"
echo ""

# Add Stripe Publishable Key (plain text - it's public anyway)
add_vercel_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "plain"
echo ""

echo "🎯 Environment variables added to Vercel!"
echo ""
echo "🔧 Next steps:"
echo "1. Trigger a new deployment"
echo "2. The new deployment will have the Stripe keys"
echo "3. Test the payment system"
echo ""
echo "Triggering deployment..."
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_IeTW3HB3KNoukYM6A4fAx7DAp8VO/07RwMJsjdC"
echo ""
echo ""
echo "✅ Deployment triggered!"

