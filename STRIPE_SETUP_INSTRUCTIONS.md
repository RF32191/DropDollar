# 🔵 Stripe Integration Setup for Seller Payouts

## Overview
This integration allows sellers to connect their bank accounts via Stripe Connect and receive payouts from their seller wallet.

---

## 1️⃣ Get Stripe API Keys

### Sign up for Stripe
1. Go to: https://stripe.com
2. Create account / Login
3. Go to **Developers** → **API Keys**

### Get Your Keys
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

---

## 2️⃣ Add Environment Variables

Add to your Vercel project or `.env.local`:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

---

## 3️⃣ Run SQL Setup

```sql
-- Run this in Supabase SQL Editor
\i ADD_SELLER_WALLET_STRIPE.sql
```

---

## 4️⃣ How It Works

### For Sellers:
1. Complete seller registration (6 steps)
2. Get approved by admin
3. **Connect Stripe account** (bank account)
4. Create listings
5. When winners claim prizes → **Request payout**
6. Funds transfer from seller wallet → bank account

### Payout Structure:
- Winner claims prize
- Seller gets **85%** of listing price
- Platform keeps **15%** fee
- Funds held in seller wallet until delivery confirmed
- Seller requests payout → Goes to bank via Stripe

---

## 5️⃣ Stripe Connect Flow

```
Seller Registration Complete
         ↓
Connect Stripe Account (Express Account)
         ↓
Link Bank Account
         ↓
Create Listings
         ↓
Winner Claims → Seller Wallet Credited (85%)
         ↓
Seller Requests Payout
         ↓
Funds Transfer to Bank (2-7 days)
```

---

## 6️⃣ Testing

### Test Mode (Sandbox):
- Use test API keys (pk_test_... / sk_test_...)
- Test bank account: `000123456789` (routing: `110000000`)
- Test SSN: `000000000`

### Production:
- Switch to live keys (pk_live_... / sk_live_...)
- Use real bank accounts
- Real money transfers

---

## 7️⃣ Features Included

✅ Stripe Connect Express Accounts
✅ Bank account linking
✅ Automatic payout requests
✅ Seller wallet balance tracking
✅ Transaction history
✅ Admin oversight
✅ Webhook handling for events
✅ Error handling & retry logic

---

## 8️⃣ Next Steps

1. Get Stripe keys
2. Add to Vercel environment variables
3. Run `ADD_SELLER_WALLET_STRIPE.sql`
4. Deploy application
5. Test with seller account

---

## 🆘 Support

- Stripe Docs: https://stripe.com/docs/connect
- Stripe Connect: https://stripe.com/docs/connect/express-accounts
- Payouts API: https://stripe.com/docs/payouts

