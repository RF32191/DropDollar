# 🔧 Add Stripe Keys to Vercel - Step by Step

## ❌ PROBLEM:
No transactions appearing in Stripe dashboard = Stripe keys not in Vercel environment

## ✅ SOLUTION:
Add Stripe keys directly to Vercel

---

## 📋 STEP-BY-STEP GUIDE:

### **Method 1: Via Vercel Dashboard (RECOMMENDED)**

1. **Go to Vercel Environment Variables:**
   ```
   https://vercel.com/rf32191s-projects/drop-dollar/settings/environment-variables
   ```

2. **Add STRIPE_SECRET_KEY:**
   - Click "Add New" button
   - **Key:** `STRIPE_SECRET_KEY`
   - **Value:** `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`
   - **Environment:** Check all three (Production, Preview, Development)
   - Click "Save"

3. **Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:**
   - Click "Add New" button again
   - **Key:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Value:** `pk_live_51S9SAuJg3uAQc32SJwFxCOET4eTpDUPmzwAYAYuofz0ZUlPyGtFaCFaksSPNvvhmaCsUgRL84dm9hbWpzILZCeNM00OgSHR4uc`
   - **Environment:** Check all three (Production, Preview, Development)
   - Click "Save"

4. **Redeploy:**
   - Go to: https://vercel.com/rf32191s-projects/drop-dollar
   - Click on the latest deployment
   - Click "Redeploy" button
   - OR run: `curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_IeTW3HB3KNoukYM6A4fAx7DAp8VO/07RwMJsjdC"`

---

### **Method 2: Via Script (if you have Vercel token)**

1. **Get a Vercel token:**
   - Go to: https://vercel.com/account/tokens
   - Click "Create Token"
   - Copy the token

2. **Add token to .env.local:**
   ```bash
   echo "VERCEL_TOKEN=your_token_here" >> .env.local
   ```

3. **Run the script:**
   ```bash
   ./add-stripe-to-vercel.sh
   ```

---

### **Method 3: Via Vercel CLI**

1. **Install Vercel CLI (if not installed):**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Add environment variables:**
   ```bash
   vercel env add STRIPE_SECRET_KEY production
   # Paste: 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

   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
   # Paste: pk_live_51S9SAuJg3uAQc32SJwFxCOET4eTpDUPmzwAYAYuofz0ZUlPyGtFaCFaksSPNvvhmaCsUgRL84dm9hbWpzILZCeNM00OgSHR4uc
   ```

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

---

## 🔍 VERIFY IT WORKED:

1. **After redeployment, visit:**
   ```
   https://www.drop-dollar.com/api/test-server
   ```

2. **Check the response:**
   - `stripeSecretKeyExists: true`
   - `stripeSecretKeyLength: 107` (or more)
   - `stripeTest: "Stripe initialized successfully"`

3. **Try a payment:**
   - Go to: https://www.drop-dollar.com/buy-tokens
   - Try to purchase tokens
   - Check Stripe dashboard for payment intent

---

## 🎯 EXPECTED RESULT:

After adding the keys and redeploying:
- ✅ Payment intents will appear in Stripe dashboard
- ✅ Transactions will be created
- ✅ Payments will process successfully
- ✅ No more "Connection error" messages

---

## 🆘 TROUBLESHOOTING:

**If you still see connection errors:**

1. **Check environment variables are set:**
   ```
   https://vercel.com/rf32191s-projects/drop-dollar/settings/environment-variables
   ```

2. **Check server environment:**
   ```
   https://www.drop-dollar.com/api/test-server
   ```

3. **Check browser console for errors:**
   - Open browser developer tools (F12)
   - Go to Console tab
   - Try making a payment
   - Look for error messages

4. **Check Vercel deployment logs:**
   - Go to: https://vercel.com/rf32191s-projects/drop-dollar
   - Click on latest deployment
   - Click "View Function Logs"
   - Look for Stripe-related errors

---

## 📋 YOUR STRIPE KEYS:

**Secret Key (Server-side only):**
```
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
```

**Publishable Key (Client-side):**
```
pk_live_51S9SAuJg3uAQc32SJwFxCOET4eTpDUPmzwAYAYuofz0ZUlPyGtFaCFaksSPNvvhmaCsUgRL84dm9hbWpzILZCeNM00OgSHR4uc
```

---

## ⚠️ IMPORTANT:

- The keys MUST be added to ALL environments (Production, Preview, Development)
- After adding, you MUST redeploy for changes to take effect
- The secret key should NEVER be exposed in client-side code
- The publishable key is safe to expose (it's meant to be public)

---

## 🚀 QUICK START:

**Fastest method - Just do this:**

1. Click: https://vercel.com/rf32191s-projects/drop-dollar/settings/environment-variables
2. Add both keys (see Step 2 and 3 in Method 1)
3. Redeploy the site
4. Test payment

Done! 🎯

