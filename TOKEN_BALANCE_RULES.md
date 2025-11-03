# 💰 Token Balance Rules

## 🎯 Token Types

### 1. **Purchased Tokens** (Non-Cashable)
- ✅ Tokens bought with real money
- ✅ Tokens granted by admin (promotional, support, etc.)
- ✅ Any tokens from the old `tokens` column
- ❌ **CANNOT** be exchanged for cash
- ❌ **CANNOT** be refunded
- ✅ **CAN** be used to enter competitions
- ✅ **CAN** be saved indefinitely

### 2. **Won Tokens** (Cashable)
- ✅ Tokens won in Hot Sell competitions
- ✅ Tokens won in Winner Takes All tournaments
- ✅ Tokens won in 1v1 battles
- ✅ **CAN** be exchanged for real money via bank linking
- ✅ **CAN** be used to enter competitions
- ✅ **CAN** be withdrawn to your bank account

---

## 📊 Spending Order

When you enter a competition, tokens are spent in this order:

1. **Purchased Tokens first** (use up non-cashable tokens)
2. **Won Tokens second** (preserve cashable tokens)

**Example:**
- You have: 40 Purchased + 10 Won = 50 Total
- You enter a 5 token game
- After: 35 Purchased + 10 Won = 45 Total
- Your 10 won tokens are safe for withdrawal!

---

## 🛠️ Admin Token Management

### Running the Fix Script

If you need to ensure ALL existing tokens are properly categorized:

```sql
-- Run this in your Supabase SQL Editor
\i VERIFY_AND_FIX_PURCHASED_TOKENS.sql
```

**This script will:**
1. ✅ Move any remaining tokens from old `tokens` column to `purchased_tokens`
2. ✅ Reset `won_tokens` to 0 for users who haven't actually won prizes
3. ✅ Show before/after reports
4. ✅ Safe to run multiple times

### Admin Functions

```sql
-- Check a specific user's balance
SELECT * FROM admin_get_user_tokens('user@example.com');

-- Grant promotional tokens (goes to purchased wallet)
SELECT * FROM admin_add_purchased_tokens('user@example.com', 50.00, 'Welcome bonus');

-- List all users with balances
SELECT * FROM admin_list_all_balances();
```

---

## 🎮 User Experience

### What Users See

**On Gaming Pages & Dashboard:**

```
┌─────────────────────────────────────────────────────────────┐
│ 💎 Total Balance          🛒 Purchased Tokens    🏆 Winnings │
│    50.00 Tokens              40.00                 10.00     │
│    Available                 Non-cashable          CASHABLE  │
│                                                     → Bank   │
└─────────────────────────────────────────────────────────────┘
```

### Purchase Flow

1. User buys tokens → Goes to **Purchased Wallet**
2. User sees terms: "Non-refundable, non-cashable"
3. User must accept terms before purchase

### Winning Flow

1. User wins competition → Prize goes to **Winnings Wallet**
2. User sees green "CASHABLE" badge
3. User can click "Withdraw to Bank" from dashboard

---

## 🔐 Security & Compliance

### Why This System?

1. **Legal Compliance**
   - Purchased tokens = game credits (like arcade tokens)
   - Won tokens = prize money (must be withdrawable)

2. **Financial Transparency**
   - Users always know what they can cash out
   - Clear separation prevents confusion

3. **Fair Play**
   - Can't refund purchased tokens for cash
   - Can only cash out actual winnings
   - Prevents abuse/fraud

---

## 📝 Summary

| Action | Purchased Tokens | Won Tokens |
|--------|------------------|------------|
| **Buy tokens** | ✅ | ❌ |
| **Admin grants** | ✅ | ❌ |
| **Win competition** | ❌ | ✅ |
| **Enter game** | ✅ (spent first) | ✅ (spent second) |
| **Cash out** | ❌ Never | ✅ Always |
| **Refund** | ❌ Never | N/A |

**Remember:** All existing and admin-granted tokens = Purchased (non-cashable)  
**Only actual prize winnings = Won (cashable)**

---

## 🚀 Quick Actions

### For Admin: Fix Token Balances Now

```bash
# In Supabase SQL Editor, run:
VERIFY_AND_FIX_PURCHASED_TOKENS.sql
```

### For Admin: Grant Promotional Tokens

```sql
SELECT * FROM admin_add_purchased_tokens(
  'user@example.com', 
  100.00, 
  'Special promotion - 100 bonus tokens'
);
```

### For Users: View Your Balance

Just go to any gaming page or dashboard - you'll see:
- Total tokens
- Purchased (non-cashable)
- Winnings (cashable with "→ Bank" link)

---

**✅ Your token system is now secure, compliant, and transparent!**

