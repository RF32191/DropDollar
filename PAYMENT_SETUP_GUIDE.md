# 💳 Complete Payment Setup Guide

## 🎯 **What You Need to Set Up**

### **1. ✅ Ethereum Payments (ALREADY WORKING)**
- Users can buy tokens directly with MetaMask
- Tokens go straight to their wallet
- Revenue goes to your wallet automatically

### **2. 🏦 Stripe (Credit Cards & Apple Pay)**

#### **Setup Steps:**
1. **Go to:** https://stripe.com
2. **Create account** (free)
3. **Get API keys** from dashboard
4. **Add to .env.local:**
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

#### **Revenue Collection:**
- Payments go to your Stripe account
- Auto-transfer to your bank account
- 2.9% + $0.30 fee per transaction

### **3. 💙 PayPal Integration**

#### **Setup Steps:**
1. **Go to:** https://developer.paypal.com
2. **Create app** in sandbox
3. **Get Client ID & Secret**
4. **Add to .env.local:**
   ```
   PAYPAL_CLIENT_ID=your_client_id
   PAYPAL_CLIENT_SECRET=your_secret
   ```

#### **Revenue Collection:**
- Payments go to your PayPal account
- 3.49% fee per transaction

### **4. 👛 Website Wallets**

For users without MetaMask, the website creates wallets:
- **Secure encryption** with user password
- **Tokens stored** in website database
- **Users can withdraw** to external wallets later

## 🚀 **Quick Setup (15 minutes)**

### **Step 1: Create Stripe Account**
```bash
# 1. Go to stripe.com → Sign up
# 2. Get test API keys
# 3. Add to .env.local file
```

### **Step 2: Create PayPal Developer Account**
```bash
# 1. Go to developer.paypal.com
# 2. Create sandbox app
# 3. Get credentials
```

### **Step 3: Set Environment Variables**
Create `.env.local` file:
```env
# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

# Your Revenue Wallet
REVENUE_WALLET_ADDRESS=0xE2F289e328E0fac58a6E6FFb1e4590a77b8dB6A0
```

### **Step 4: Test Payments**
```bash
# Start your server
npm run dev

# Test each payment method:
# 1. Credit Card: Use 4242 4242 4242 4242
# 2. PayPal: Use sandbox account
# 3. Ethereum: Use your MetaMask
```

## 💰 **Revenue Flow**

### **How You Get Paid:**

1. **Ethereum Payments:**
   - ETH → Your wallet instantly
   - No fees (except gas)

2. **Credit Card/Apple Pay:**
   - USD → Stripe account
   - Stripe → Your bank (daily)
   - 2.9% + $0.30 fee

3. **PayPal:**
   - USD → PayPal account
   - PayPal → Your bank
   - 3.49% fee

## 🎯 **Token Distribution**

### **How Users Get Tokens:**

1. **MetaMask Users:**
   - Tokens sent directly to their wallet
   - Instant, on-chain transfer

2. **Website Wallet Users:**
   - Tokens credited to website account
   - Can withdraw to external wallet later
   - Stored securely in database

## 🔧 **What's Already Built:**

✅ **Ethereum integration** - Working now  
✅ **Payment API endpoints** - Created  
✅ **Webhook handlers** - Created  
✅ **Website wallet system** - Created  
✅ **Token distribution logic** - Created  

## 🚀 **What You Need to Do:**

1. **Get Stripe account** (5 minutes)
2. **Get PayPal developer account** (5 minutes)  
3. **Add API keys to .env.local** (2 minutes)
4. **Test all payment methods** (10 minutes)

## 💡 **Testing Strategy:**

### **Phase 1: Test Mode**
- Use Stripe test cards
- Use PayPal sandbox
- Use Sepolia testnet for ETH

### **Phase 2: Go Live**
- Switch to Stripe live keys
- Switch to PayPal production
- Deploy to Ethereum mainnet

**Ready to set up payments? Start with Stripe - it's the easiest! 🚀**
