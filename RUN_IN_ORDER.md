# 🚀 SQL Scripts - Run in This Order

## ⚠️ IMPORTANT: Run These in Sequence!

---

## 📝 Script Execution Order

### Step 1: Create Hot Sell System (NEW)
**File:** `COMPLETE_HOT_SELL_SYSTEM.sql`

**What it does:**
- Creates `hot_sell_configs` table (prize tiers)
- Creates `hot_sell_sessions` table (active games)
- Creates `hot_sell_participants` table (players)
- Creates all Hot Sell SQL functions
- Inserts 12 game configurations ($2-$25k)

**Run this:** ✅ **FIRST** (Hot Sell page won't work without this)

---

### Step 2: Update Winner Takes All (EXISTING)
**File:** `PRODUCTION_WINNER_TAKES_ALL_UPDATE.sql`

**What it does:**
- Adds missing columns to existing Winner Takes All tables
- Changes score type to NUMERIC for decimals
- Safe for production (no data loss)

**Run this:** ✅ **SECOND** (Updates existing WTA system)

---

### Step 3: Verify Both Systems
**Run this query to check everything:**
```sql
-- Check all tables exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hot_sell_configs') THEN '✅'
    ELSE '❌'
  END as hot_sell_configs,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hot_sell_sessions') THEN '✅'
    ELSE '❌'
  END as hot_sell_sessions,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'winner_takes_all_sessions') THEN '✅'
    ELSE '❌'
  END as winner_takes_all_sessions;

-- Count records
SELECT 'hot_sell_configs' as table_name, COUNT(*) FROM hot_sell_configs
UNION ALL
SELECT 'hot_sell_sessions', COUNT(*) FROM hot_sell_sessions
UNION ALL
SELECT 'winner_takes_all_sessions', COUNT(*) FROM winner_takes_all_sessions
UNION ALL
SELECT 'winner_takes_all_participants', COUNT(*) FROM winner_takes_all_participants;
```

---

## ❌ DON'T Run These:

- ❌ `RUN_ALL_PRODUCTION_UPDATES.sql` - Assumes Hot Sell tables already exist
- ❌ `PRODUCTION_HOT_SELL_UPDATE.sql` - Only for updating existing Hot Sell tables

---

## 📊 Expected Results

### After Step 1 (Hot Sell System):
```
✅ hot_sell_configs: 12 records (game configurations)
✅ hot_sell_sessions: 12 records (one per config)
✅ hot_sell_participants: 0 records (no players yet)
```

### After Step 2 (Winner Takes All Update):
```
✅ All existing Winner Takes All data preserved
✅ New columns added for tracking
✅ Score type changed to NUMERIC
```

---

## 🎯 Quick Summary

```
1️⃣ COMPLETE_HOT_SELL_SYSTEM.sql          ← Creates Hot Sell from scratch
2️⃣ PRODUCTION_WINNER_TAKES_ALL_UPDATE.sql ← Updates existing WTA
3️⃣ Test pages!
```

**That's it!** 🎉

