# 🚀 DUAL WALLET SYSTEM - QUICK START

## ⚡ FASTEST PATH TO PRODUCTION

### 1️⃣ **Wait for Deployment** (2-3 minutes)
Check: https://vercel.com/dashboard → Deployments
Status: Currently building...

### 2️⃣ **Run SQL Migrations** (REQUIRED!)

Go to **Supabase Dashboard** → **SQL Editor** → Run these in order:

#### Migration 1: Dual Wallet Schema
```sql
-- Copy/paste entire: DUAL_WALLET_MIGRATION.sql
-- Then click RUN
```

#### Migration 2: Update Functions
```sql
-- Copy/paste entire: UPDATE_ALL_ENTRY_FUNCTIONS_FOR_DUAL_WALLET.sql
-- Then click RUN
```

### 3️⃣ **Test It Works**

1. Buy tokens at: https://drop-dollar.com/buy-tokens
   - ✅ Should see terms & conditions
   - ✅ Must check acceptance box
   - ✅ Tokens added to `purchased_tokens`

2. Play a game
   - ✅ Entry fee deducts from `purchased_tokens` first
   - ✅ If you win, prize goes to `won_tokens`

3. Check database:
```sql
SELECT username, purchased_tokens, won_tokens 
FROM users 
WHERE id = 'YOUR_USER_ID';
```

---

## 🎯 WHAT THIS DOES

### Token Types

| Type | Purchased 🛒 | Won 🏆 |
|------|-------------|---------|
| **How to Get** | Buy with money | Win games |
| **Can Play Games?** | ✅ Yes | ✅ Yes |
| **Can Cash Out?** | ❌ No | ✅ Yes |
| **Refundable?** | ❌ No | N/A |
| **Spending Order** | 1st | 2nd |

### Spending Logic

```
User has: 10 purchased + 5 won = 15 total
Entry fee: 12 tokens

Deduction:
- 10 from purchased (all of it)
- 2 from won (remainder)

Result: 0 purchased + 3 won = 3 total
```

---

## ✅ COMPLETED FEATURES

- ✅ Dual wallet database schema
- ✅ Terms & conditions with NO REFUND policy
- ✅ Required checkbox before purchase
- ✅ Purchased tokens spent first, won tokens second
- ✅ Winnings go to won_tokens (cashable)
- ✅ Purchases go to purchased_tokens (non-cashable)
- ✅ Full audit trail in `token_transactions` table
- ✅ Multi Target game tap fix (checkmarks don't block clicks)

---

## 🚨 CRITICAL: SQL FILES MUST BE RUN!

**Without running the SQL files, the system will NOT work!**

The code is deployed, but the database needs:
- New columns: `purchased_tokens`, `won_tokens`
- New functions: `spend_tokens()`, `add_purchased_tokens()`, `add_won_tokens()`
- Updated entry/payout functions for all game modes

**Run them now in your PRODUCTION Supabase!**

---

## 📊 Quick Verification

After running SQL, check this works:

```sql
-- Should return 9 functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'spend_tokens', 'add_purchased_tokens', 'add_won_tokens',
    'join_hot_sell_session', 'join_winner_takes_all_session',
    'join_1v1_match', 'process_hot_sell_payout',
    'process_winner_takes_all_payout', 'process_1v1_payout'
  );
```

If you get 9 results, you're ready! 🎉

---

## 📖 Full Documentation

See: `DUAL_WALLET_SETUP_GUIDE.md` for complete details!

