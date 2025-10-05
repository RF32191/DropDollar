# 💳 Payment API Setup Guide - Step by Step

## 🎯 **OVERVIEW**

Your Dollar Drop platform needs these payment integrations:
1. **Stripe** - Credit cards, debit cards, Apple Pay
2. **PayPal** - PayPal account payments
3. **Webhooks** - Payment confirmation system

## 📋 **STEP-BY-STEP SETUP**

### **🔵 STEP 1: STRIPE SETUP**

#### **1.1 Create Stripe Account**
1. Go to [stripe.com](https://stripe.com)
2. Click "Start now"
3. Fill out business information:
   - Business name: "Dollar Drop" (or your business name)
   - Business type: Select appropriate type
   - Country: United States (or your country)
   - Industry: "Gaming" or "Software"

#### **1.2 Complete Account Verification**
1. Provide business details
2. Add bank account for payouts
3. Verify identity documents
4. Wait for account approval (usually 1-2 days)

#### **1.3 Get API Keys**
1. In Stripe Dashboard → "Developers" → "API keys"
2. **For Testing First:**
   ```
   Publishable key: pk_test_51...
   Secret key: sk_test_51...
   ```
3. **For Production Later:**
   ```
   Publishable key: pk_live_51...
   Secret key: sk_live_51...
   ```

#### **1.4 Set Up Webhooks**
1. Stripe Dashboard → "Developers" → "Webhooks"
2. Click "Add endpoint"
3. **Endpoint URL:** `https://yourdomain.com/api/webhooks/stripe`
4. **Events to send:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.requires_action`
5. Copy **Signing secret:** `whsec_...`

### **🟡 STEP 2: PAYPAL SETUP**

#### **2.1 Create PayPal Business Account**
1. Go to [paypal.com/business](https://paypal.com/business)
2. Click "Get Started"
3. Choose "Business Account"
4. Complete business verification

#### **2.2 Create Developer App**
1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Log in with your PayPal account
3. Go to "My Apps & Credentials"
4. Click "Create App"
5. **App Details:**
   - App Name: "Dollar Drop Payments"
   - Merchant: Select your business account
   - Features: Check "Accept Payments"

#### **2.3 Get API Credentials**
1. **For Testing (Sandbox):**
   ```
   Client ID: AXX...
   Client Secret: EXX...
   ```
2. **For Production (Live):**
   ```
   Client ID: AXX...
   Client Secret: EXX...
   ```

### **🔧 STEP 3: CONFIGURE YOUR SITE**

#### **3.1 Create Environment File**
```bash
# Copy the template
cp env.production.template .env.production
```

#### **3.2 Add Your API Keys**
Edit `.env.production` with your actual keys:

```env
# Start with TEST keys
STRIPE_SECRET_KEY=sk_test_your_actual_test_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_test_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here

PAYPAL_CLIENT_ID=your_actual_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_actual_sandbox_client_secret_here
PAYPAL_ENVIRONMENT=sandbox

NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### **🧪 STEP 4: TEST PAYMENT INTEGRATION**

#### **4.1 Install Testing Dependencies**
```bash
npm install stripe node-fetch dotenv
```

#### **4.2 Run Payment Tests**
```bash
# Test your API connections
node test-payments.js
```

#### **4.3 Test User System**
```bash
# Test user and seller management
node test-user-system.js
```

#### **4.4 Test in Browser**
1. Start development server: `npm run dev`
2. Go to `http://localhost:3000/buy-tokens`
3. Try a test payment with Stripe test cards:
   - **Success:** `4242 4242 4242 4242`
   - **Decline:** `4000 0000 0000 0002`
   - **3D Secure:** `4000 0025 0000 3155`

### **🚀 STEP 5: DEPLOY WITH PAYMENTS**

#### **5.1 Build with Environment Variables**
```bash
# Build your site with payment integration
./update-site.sh
```

#### **5.2 Upload to GoDaddy**
1. Upload `dollar-drop-godaddy-deployment.zip`
2. Extract to `public_html`
3. **Important:** Add environment variables in GoDaddy cPanel:
   - Go to "Environment Variables"
   - Add each variable from your `.env.production`

#### **5.3 Update Webhook URLs**
1. In Stripe Dashboard → Webhooks
2. Update endpoint URL to: `https://yourdomain.com/api/webhooks/stripe`
3. Test webhook delivery

### **💰 STEP 6: GO LIVE**

#### **6.1 Switch to Live Keys**
When ready for real payments:

```env
# Switch to LIVE keys
STRIPE_SECRET_KEY=sk_live_your_live_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key_here
PAYPAL_ENVIRONMENT=production
PAYPAL_CLIENT_ID=your_live_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_live_paypal_client_secret_here
```

#### **6.2 Test Live Payments**
1. Make small test purchases ($1-5)
2. Verify money appears in your accounts
3. Test refund process
4. Monitor for any errors

## 🧪 **TEST CARDS & ACCOUNTS**

### **Stripe Test Cards**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
3D Secure: 4000 0025 0000 3155
```

### **PayPal Test Account**
- Use PayPal Sandbox accounts
- Create test buyer/seller accounts in PayPal Developer

## 🔒 **SECURITY CHECKLIST**

- [ ] Never commit API keys to git
- [ ] Use test keys for development
- [ ] Verify webhook signatures
- [ ] Enable HTTPS on your domain
- [ ] Set up rate limiting
- [ ] Monitor for suspicious activity
- [ ] Regular security updates

## 📊 **MONITORING & ANALYTICS**

### **Stripe Dashboard**
- Monitor payment volume
- Track success/failure rates
- View customer disputes
- Generate financial reports

### **PayPal Dashboard**
- Track PayPal transactions
- Monitor account balance
- Handle customer issues
- Download transaction reports

## 🚨 **TROUBLESHOOTING**

### **Common Issues:**

**Payments Not Processing:**
- Check API keys are correct
- Verify webhook endpoints
- Check browser console for errors
- Test with different cards/accounts

**Webhook Failures:**
- Verify endpoint URL is accessible
- Check webhook signature validation
- Monitor webhook logs in Stripe/PayPal

**Account Issues:**
- Complete business verification
- Provide required documentation
- Contact support if account limited

## 📞 **SUPPORT CONTACTS**

- **Stripe Support:** [support.stripe.com](https://support.stripe.com)
- **PayPal Developer Support:** [developer.paypal.com/support](https://developer.paypal.com/support)
- **GoDaddy Support:** 1-480-505-8877

## 🎉 **SUCCESS METRICS**

After setup, you should see:
- ✅ Successful test payments
- ✅ Webhook confirmations
- ✅ User accounts creating properly
- ✅ Seller applications working
- ✅ Tournament payments processing
- ✅ Marketplace transactions working

---

## 🚀 **READY TO PROCESS PAYMENTS!**

Once you complete this setup, your Dollar Drop platform will be able to:
- Accept credit card payments via Stripe
- Process PayPal payments
- Handle tournament entry fees
- Manage marketplace transactions
- Support multiple user accounts
- Process seller payouts

**Start with the Stripe setup first, then move to PayPal. Test everything before going live!**


