# 🎯 Complete Seller & Stripe Integration Guide

## Overview
Your marketplace now has a complete seller payout system integrated with Stripe Connect! Sellers can connect their bank accounts and receive payouts from their earnings.

---

## 📋 PART 1: Clear Pending Sellers

### Problem
Two users tried to register as sellers but aren't showing up in your admin approval list.

### Solution
Run this SQL in Supabase:

```sql
-- View all pending sellers first
SELECT 
    sp.id,
    sp.user_id,
    u.email,
    sp.shop_name,
    sp.status,
    sp.registration_step,
    sp.created_at
FROM public.seller_profiles sp
LEFT JOIN auth.users u ON u.id = sp.user_id
WHERE sp.status = 'pending'
ORDER BY sp.created_at DESC;

-- Then clear them
DELETE FROM public.seller_profiles
WHERE status = 'pending';
```

**File:** `CLEAR_PENDING_SELLERS.sql`

This will:
- ✅ Show you all pending sellers
- ✅ Delete all pending applications
- ✅ Allow users to register again fresh

---

## 💳 PART 2: Stripe Integration Setup

### Step 1: Get Stripe API Keys

1. Go to: https://stripe.com
2. Login or create account
3. Navigate to: **Developers** → **API Keys**
4. Copy these keys:
   - **Publishable key:** `pk_test_...` (for test mode)
   - **Secret key:** `sk_test_...` (for test mode)

### Step 2: Add to Vercel Environment Variables

1. Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Step 3: Run SQL Setup

Run this in Supabase SQL Editor:

```sql
\i ADD_STRIPE_INTEGRATION.sql
```

Or copy/paste the contents of `ADD_STRIPE_INTEGRATION.sql`

This creates:
- ✅ Stripe columns in `seller_profiles`
- ✅ `stripe_events` logging table
- ✅ Payout request functions
- ✅ Status tracking functions
- ✅ Webhook event handlers

### Step 4: Setup Stripe Webhook

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add Endpoint**
3. Endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select these events:
   - `account.updated`
   - `transfer.created`
   - `transfer.updated`
   - `payout.created`
   - `payout.paid`
   - `payout.failed`
5. Copy the **Signing Secret** (starts with `whsec_...`)
6. Add to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

### Step 5: Redeploy

After adding environment variables, trigger a new deployment:
- Push to GitHub (auto-deploys)
- Or manually redeploy in Vercel dashboard

---

## 🔄 How It Works

### For Sellers:

#### 1. **Seller Registration**
```
User → Dashboard → "Register as Seller" → 6-Step Form → Submit
                                                            ↓
                                                    Admin Approval
                                                            ↓
                                                    Status: "Approved"
```

#### 2. **Connect Bank Account**
```
Dashboard → Stripe Connect Section → "Connect Bank Account"
                                            ↓
                                    Stripe Onboarding
                                            ↓
                            Enter Bank Details (Account #, Routing #)
                                            ↓
                                    Stripe Verifies
                                            ↓
                            Status: "Connected" (Payouts Enabled)
```

#### 3. **Earn Money**
```
Create Listing → Players Compete → Winner Claims
                                        ↓
                                Winner Gets Prize
                                        ↓
                        Seller Wallet += 85% of listing price
                        Platform keeps 15%
```

#### 4. **Request Payout**
```
Wallet Balance: $125.00
                ↓
Click "Request Payout" → Enter Amount ($25 minimum)
                ↓
        Payout Processes via Stripe
                ↓
    Funds Arrive in Bank (2-7 business days)
```

---

## 💰 Payout Structure

| Item | Percentage | Example ($100 listing) |
|------|-----------|----------------------|
| Winner Gets Prize | 100% | $100 (PlayStation 5) |
| Seller Earnings | 85% | $85 to wallet |
| Platform Fee | 15% | $15 to platform |

### Seller Wallet:
- Holds seller's 85% share
- Minimum payout: $25
- Payouts process in 2-7 business days
- No maximum payout limit

---

## 🎨 User Experience

### On Dashboard (After Seller Approval):

```
┌────────────────────────────────────────┐
│ ✅ You're a registered seller!         │
│ Business: TechGear Pro                 │
│ Contact: seller@example.com            │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│        Seller Wallet Balance           │
│           $125.50                      │
│   85% of your listing sales            │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│            Bank Account                │
│  ⚠️ Bank Account Not Connected         │
│                                        │
│  [Connect Bank Account]                │
└────────────────────────────────────────┘
```

### After Bank Connection:

```
┌────────────────────────────────────────┐
│            Bank Account                │
│  ✅ Bank Account Connected             │
│  You can now request payouts           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│          Request Payout                │
│  Amount: $ [______]  (Min $25)         │
│  Available: $125.50                    │
│                                        │
│  [💳 Request Payout]                   │
│                                        │
│  ⏰ Payouts arrive in 2-7 days         │
└────────────────────────────────────────┘
```

---

## 🔧 API Endpoints Created

### 1. `/api/stripe/create-connect-account`
- Creates Stripe Express account for seller
- Called when seller clicks "Connect Bank Account"

### 2. `/api/stripe/account-link`
- Generates Stripe onboarding link
- Redirects seller to Stripe to enter bank details

### 3. `/api/stripe/account-status`
- Checks Stripe account status
- Updates database with latest info
- Called on page load & refresh

### 4. `/api/stripe/process-payout`
- Processes payout request
- Creates Stripe transfer
- Deducts from wallet
- Logs transaction

### 5. `/api/stripe/webhook`
- Receives Stripe events
- Updates account status
- Handles payout completions
- Manages failures/refunds

---

## 📊 Database Functions Created

### `get_seller_stripe_status()`
Returns seller's Stripe connection status and wallet balance

### `save_stripe_account_info()`
Saves/updates Stripe account details

### `request_stripe_payout()`
Creates payout request, validates balance

### `update_payout_status()`
Updates payout status (processing/completed/failed)

### `get_seller_payout_history()`
Returns all payout requests for seller

---

## ⚠️ Testing Guide

### Test Mode (Recommended First):

1. **Test Bank Account:**
   - Account Number: `000123456789`
   - Routing Number: `110000000`

2. **Test SSN:**
   - `000000000`

3. **Test Scenarios:**
   - Connect bank account → Should succeed
   - Request payout → Should process immediately (test mode)
   - Check webhook logs → Should see events

### Production Mode:

1. Switch to **Live** API keys:
   - `pk_live_...`
   - `sk_live_...`

2. Use real bank accounts

3. Real money transfers (2-7 days)

---

## 🚨 Troubleshooting

### Issue: "Stripe account not connected"
**Solution:** Seller needs to complete Stripe onboarding:
1. Click "Connect Bank Account"
2. Complete all Stripe forms
3. Wait for status to update

### Issue: "Payouts not enabled"
**Solution:** Stripe needs to verify account:
- Check Stripe Dashboard → Accounts
- Verify all requirements met
- Usually takes a few minutes

### Issue: "Webhook not working"
**Solution:** Check webhook setup:
1. Correct endpoint URL?
2. Correct signing secret?
3. Events selected?
4. Check Stripe Dashboard → Webhooks → Event Logs

### Issue: "Payout failed"
**Solution:** Check:
- Bank account valid?
- Routing number correct?
- Account not closed/frozen?
- Check `seller_payout_requests` table for `failure_reason`

---

## 📞 Next Steps

1. ✅ **Run `CLEAR_PENDING_SELLERS.sql`** to clear stuck registrations
2. ✅ **Get Stripe API keys** from Stripe Dashboard
3. ✅ **Add to Vercel** environment variables
4. ✅ **Run `ADD_STRIPE_INTEGRATION.sql`** in Supabase
5. ✅ **Setup Stripe webhook** endpoint
6. ✅ **Redeploy** application
7. ✅ **Test** with test bank account
8. ✅ **Go live** with real API keys

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Sellers can click "Connect Bank Account"
- ✅ Stripe onboarding page loads
- ✅ After completion, status shows "Connected"
- ✅ Wallet balance displays correctly
- ✅ "Request Payout" button appears (balance ≥ $25)
- ✅ Payouts process without errors
- ✅ Webhook events appear in Stripe Dashboard

---

## 🆘 Support Resources

- **Stripe Docs:** https://stripe.com/docs/connect
- **Connect Accounts:** https://stripe.com/docs/connect/express-accounts
- **Payouts API:** https://stripe.com/docs/payouts
- **Webhooks:** https://stripe.com/docs/webhooks

---

**Ready to enable seller payouts! 🚀**

