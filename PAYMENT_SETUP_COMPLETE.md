# 💳 Complete Payment Setup Guide - Dollar Drop

## 🎯 **PAYMENT SYSTEMS OVERVIEW**

Your Dollar Drop platform supports multiple payment methods:
- ✅ **Credit/Debit Cards** (via Stripe)
- ✅ **Apple Pay** (via Stripe)
- ✅ **PayPal** (direct integration)
- ✅ **Cryptocurrency** (ETH direct payments)

## 🔧 **STEP 1: STRIPE SETUP (Credit Cards & Apple Pay)**

### **Create Stripe Account**
1. Go to [stripe.com](https://stripe.com)
2. Click "Start now" → "Create account"
3. Complete business verification
4. Activate your account

### **Get Stripe API Keys**
1. In Stripe Dashboard → "Developers" → "API keys"
2. Copy these keys:

**Test Keys (for development):**
```
Publishable key: pk_test_...
Secret key: sk_test_...
```

**Live Keys (for production):**
```
Publishable key: pk_live_...
Secret key: sk_live_...
```

### **Configure Webhooks**
1. Stripe Dashboard → "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy webhook signing secret: `whsec_...`

## 🔧 **STEP 2: PAYPAL SETUP**

### **Create PayPal Developer Account**
1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Log in with PayPal account or create new
3. Go to "My Apps & Credentials"

### **Create PayPal App**
1. Click "Create App"
2. App Name: "Dollar Drop Payments"
3. Merchant: Your business account
4. Features: Check "Accept Payments"
5. Click "Create App"

### **Get PayPal Credentials**
**Sandbox (Test):**
```
Client ID: AXX...
Client Secret: EXX...
```

**Live:**
```
Client ID: AXX...
Client Secret: EXX...
```

## 🔧 **STEP 3: CONFIGURE ENVIRONMENT VARIABLES**

Create your production environment file:

```bash
# Copy the template
cp env.production.template .env.production
```

Edit `.env.production` with your actual keys:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_actual_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret

# PayPal Configuration
PAYPAL_CLIENT_ID=your_actual_paypal_client_id
PAYPAL_CLIENT_SECRET=your_actual_paypal_client_secret
PAYPAL_ENVIRONMENT=production

# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

## 🧪 **STEP 4: TEST PAYMENT INTEGRATION**

I'll create a payment testing script for you:


