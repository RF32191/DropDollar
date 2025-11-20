# 💰 Complete Wallet Transfer Flow

## 🎯 Overview
This shows how money flows from winner → pending wallet → released wallet → Stripe payout.

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    MARKETPLACE LISTING                          │
│                    Prize Pool: $150                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Winner Selected 🏆
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: WINNER CLAIMS PRIZE                                    │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Winner clicks [Claim Prize] button                          │
│  ✅ Enters shipping address (or selects saved)                  │
│  ✅ Address saved to marketplace_sessions.winner_shipping_address│
│  ✅ Optionally saves to users.saved_addresses                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: SELLER NOTIFICATION & PENDING WALLET                   │
├─────────────────────────────────────────────────────────────────┤
│  📨 Admin Message to Seller:                                    │
│     Title: "📦 Ship Prize - Winner Address Received"            │
│     Shows: Full shipping address                                │
│     Shows: Prize: $150, Fee: $22.50, Earnings: $127.50         │
│     Button: [📝 Submit Tracking Number]                         │
│                                                                 │
│  💰 WALLET UPDATE:                                              │
│     seller_wallets.pending_balance += $127.50                   │
│     seller_wallets.total_pending_sales += 1                     │
│                                                                 │
│  Current State:                                                 │
│     Pending: $127.50 ⏳ (awaiting tracking)                     │
│     Released: $0.00                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Seller ships item 📦
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: TRACKING SUBMISSION                                    │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Seller clicks [Submit Tracking] button in message           │
│  ✅ Opens tracking form modal                                   │
│  ✅ Enters:                                                      │
│     - Tracking Number: 1234567890                               │
│     - Carrier: USPS                                             │
│     - Est. Delivery: Nov 27, 2025                               │
│  ✅ Clicks [Submit & Release Funds]                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
              ⚡ AUTOMATIC FUND TRANSFER ⚡
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: WALLET TRANSFER (INSTANT)                              │
├─────────────────────────────────────────────────────────────────┤
│  💰 PENDING → RELEASED:                                         │
│     seller_wallets.pending_balance -= $127.50                   │
│     seller_wallets.released_balance += $127.50                  │
│     seller_wallets.total_released_sales += 1                    │
│     seller_wallets.total_earned += $127.50                      │
│                                                                 │
│  📊 New State:                                                  │
│     Pending: $0.00                                              │
│     Released: $127.50 ✅ (ready to withdraw)                    │
│                                                                 │
│  🔒 Session Updated:                                            │
│     funds_released = true                                       │
│     funds_released_at = NOW()                                   │
│     tracking_number = "1234567890"                              │
│     shipping_status = "shipped"                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
            📨 THREE MESSAGES SENT:
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: NOTIFICATIONS                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣ TO WINNER:                                                  │
│     Title: "📦 Your Prize Has Shipped!"                         │
│     Content:                                                    │
│       - Tracking: 1234567890 (USPS)                             │
│       - Link: https://tools.usps.com/go/Track...                │
│       - Est. Delivery: Nov 27                                   │
│       - Shipping Address shown                                  │
│     Button: [📦 Track Package]                                  │
│                                                                 │
│  2️⃣ TO SELLER:                                                  │
│     Title: "💰 Funds Released - $127.50"                        │
│     Content:                                                    │
│       - Item: PS5 Console                                       │
│       - Tracking: 1234567890 (USPS)                             │
│       - Earnings: $127.50                                       │
│       - Status: Available for withdrawal                        │
│     Button: [💰 Withdraw to Bank]                               │
│                                                                 │
│  3️⃣ TO PLATFORM ADMIN:                                          │
│     admin_notifications table:                                  │
│       type: "tracking_submitted"                                │
│       message: "Seller shipped PS5 to john_doe"                 │
│       metadata: tracking info + amounts                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: SELLER WITHDRAWAL (Via Stripe)                         │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Seller goes to dashboard                                    │
│  ✅ Sees Released Balance: $127.50                              │
│  ✅ Clicks [💰 Withdraw to Bank]                                │
│  ✅ Confirms withdrawal via Stripe Connect                      │
│                                                                 │
│  💳 STRIPE PAYOUT:                                              │
│     Amount: $127.50                                             │
│     To: Seller's connected bank account                         │
│     Processing: 2-7 business days                               │
│                                                                 │
│  💰 WALLET UPDATE:                                              │
│     seller_wallets.released_balance -= $127.50                  │
│     seller_wallets.total_withdrawn += $127.50                   │
│                                                                 │
│  📊 Final State:                                                │
│     Pending: $0.00                                              │
│     Released: $0.00                                             │
│     Total Withdrawn: $127.50 ✅                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    💰 MONEY IN BANK! 🎉
```

---

## 💰 Wallet States

### Initial State (After Winner Selected):
```json
{
  "pending_balance": 0,
  "released_balance": 0,
  "total_pending_sales": 0,
  "total_released_sales": 0,
  "total_earned": 0,
  "total_withdrawn": 0
}
```

### After Winner Provides Address:
```json
{
  "pending_balance": 127.50,     // ⏳ Awaiting tracking
  "released_balance": 0,
  "total_pending_sales": 1,
  "total_released_sales": 0,
  "total_earned": 0,
  "total_withdrawn": 0
}
```

### After Tracking Submitted (INSTANT):
```json
{
  "pending_balance": 0,           // Moved to released
  "released_balance": 127.50,     // ✅ Ready to withdraw!
  "total_pending_sales": 0,
  "total_released_sales": 1,
  "total_earned": 127.50,
  "total_withdrawn": 0
}
```

### After Stripe Withdrawal:
```json
{
  "pending_balance": 0,
  "released_balance": 0,          // Withdrawn
  "total_pending_sales": 0,
  "total_released_sales": 1,
  "total_earned": 127.50,
  "total_withdrawn": 127.50       // 💰 In bank!
}
```

---

## 📋 Database Operations

### On Winner Claims:
```sql
-- 1. Save address
UPDATE marketplace_sessions
SET winner_shipping_address = address_json
WHERE id = session_id;

-- 2. Add to pending wallet
INSERT INTO seller_wallets (seller_id, pending_balance, total_pending_sales)
VALUES (seller_id, 127.50, 1)
ON CONFLICT (seller_id) DO UPDATE SET
  pending_balance = seller_wallets.pending_balance + 127.50,
  total_pending_sales = seller_wallets.total_pending_sales + 1;

-- 3. Send admin message to seller
INSERT INTO admin_messages (user_id, message_type, title, ...)
VALUES (seller_id, 'winner_address_received', ...);
```

### On Tracking Submitted:
```sql
-- 1. Update session
UPDATE marketplace_sessions
SET 
  tracking_number = '1234567890',
  tracking_provider = 'USPS',
  funds_released = true,
  funds_released_at = NOW()
WHERE id = session_id;

-- 2. Transfer funds (INSTANT)
UPDATE seller_wallets
SET 
  pending_balance = pending_balance - 127.50,
  released_balance = released_balance + 127.50,
  total_released_sales = total_released_sales + 1,
  total_earned = total_earned + 127.50
WHERE seller_id = seller_id;

-- 3. Send 3 messages (winner, seller, admin)
INSERT INTO admin_messages (...) VALUES (...); -- x3
INSERT INTO admin_notifications (...) VALUES (...);
```

### On Withdrawal:
```sql
-- Update wallet after Stripe payout
UPDATE seller_wallets
SET 
  released_balance = released_balance - 127.50,
  total_withdrawn = total_withdrawn + 127.50
WHERE seller_id = seller_id;
```

---

## 🔐 Security & Safety

### RLS Policies:
- ✅ Only seller can submit tracking for their sales
- ✅ Only winner/seller can view tracking info
- ✅ Wallets are user-specific (auth.uid())
- ✅ Admin messages are user-specific

### Validation:
- ✅ Verify seller owns the listing
- ✅ Verify session has winner
- ✅ Verify address provided
- ✅ Prevent duplicate tracking submission
- ✅ Validate positive amounts

### Audit Trail:
- ✅ funds_released timestamp
- ✅ shipped_at timestamp
- ✅ shipping_updates table (history)
- ✅ admin_notifications for monitoring
- ✅ All wallet changes timestamped

---

## 🎯 Summary

### Money Flow:
```
Prize Pool ($150)
    ↓
Platform Fee (15%) = $22.50
Seller Earnings = $127.50
    ↓
PENDING WALLET ($127.50) ⏳
    ↓ (tracking submitted)
RELEASED WALLET ($127.50) ✅
    ↓ (Stripe withdrawal)
BANK ACCOUNT ($127.50) 💰
```

### Timeline:
```
T+0: Winner selected
T+1: Winner claims → address provided → PENDING
T+2: Seller ships → tracking submitted → RELEASED (instant!)
T+3: Seller withdraws → Stripe payout → BANK (2-7 days)
```

### Key Points:
- ✅ **Instant Release**: Funds move to released wallet immediately when tracking submitted
- ✅ **No Waiting**: Seller doesn't wait for delivery confirmation
- ✅ **Secure**: RLS protects all data
- ✅ **Traceable**: Complete audit trail
- ✅ **Automated**: Three messages sent automatically
- ✅ **Integrated**: Works with existing claim flow

---

**The system is fully automated and secure!** 🎉

