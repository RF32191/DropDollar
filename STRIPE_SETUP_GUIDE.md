# 🔧 STRIPE API SETUP GUIDE

## 🎯 **STEP 1: Get Your Stripe API Keys**

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/apikeys
2. **Sign in** to your Stripe account
3. **Copy your API keys**:
   - **Publishable key** (starts with `pk_live_` or `pk_test_`)
   - **Secret key** (starts with `sk_live_` or `sk_test_`)

## 🔧 **STEP 2: Update Environment Variables**

Replace the keys in your `.env.local` file:

```bash
# Stripe API Keys (REPLACE WITH YOUR ACTUAL KEYS)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_SECRET_KEY_HERE
```

## 🧪 **STEP 3: Test Your Keys**

Run this command to test your Stripe configuration:

```bash
./test-stripe-config.sh
```

## 🚀 **STEP 4: Deploy to Production**

If using Vercel, add these environment variables in your Vercel dashboard:
- Go to: https://vercel.com/dashboard
- Find your project
- Go to: Settings → Environment Variables
- Add both Stripe keys

## 🔍 **TROUBLESHOOTING**

### **Common Issues:**

1. **"Invalid API Key" Error**:
   - Make sure you copied the complete key (should be ~100+ characters)
   - Check for extra spaces or characters
   - Verify you're using the correct environment (test vs live)

2. **"Stripe is not configured" Error**:
   - Make sure `.env.local` file exists
   - Restart your development server after updating keys
   - Check that keys start with `pk_` and `sk_`

3. **Keys Too Short**:
   - Stripe keys should be very long (100+ characters)
   - Make sure you copied the entire key
   - Check for truncation in your source

## 📋 **CURRENT STATUS**

Your current keys appear to be truncated. You need to:

1. **Get fresh keys** from Stripe Dashboard
2. **Replace the truncated keys** in `.env.local`
3. **Test the configuration**
4. **Deploy the fix**

## 🎯 **QUICK FIX**

If you want to test immediately, I can help you:
1. Set up test keys for development
2. Get your live keys properly configured
3. Deploy the working system

Would you like me to help you get the correct Stripe keys set up?
