# 🔄 Production Update - Backup & Changes Log
**Date:** October 28, 2025
**Script:** `RUN_ALL_PRODUCTION_UPDATES.sql`

---

## 📦 BACKUP INSTRUCTIONS

### Before Running the Script:

1. **Backup Supabase Database:**
   - Go to Supabase Dashboard
   - Settings → Database → Backups
   - Click "Create Backup" or note the latest automatic backup time

2. **Export Current Table Schemas (Optional but Recommended):**
   ```sql
   -- Run this in Supabase SQL Editor to see current state
   SELECT table_name, column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name IN ('winner_takes_all_sessions', 'winner_takes_all_participants', 'hot_sell_sessions', 'hot_sell_participants', 'hot_sell_configs')
   ORDER BY table_name, ordinal_position;
   ```

3. **Count Current Records:**
   ```sql
   -- Save these numbers to verify nothing was deleted
   SELECT 'winner_takes_all_sessions' as table_name, COUNT(*) as record_count FROM winner_takes_all_sessions
   UNION ALL
   SELECT 'winner_takes_all_participants', COUNT(*) FROM winner_takes_all_participants
   UNION ALL
   SELECT 'hot_sell_sessions', COUNT(*) FROM hot_sell_sessions
   UNION ALL
   SELECT 'hot_sell_participants', COUNT(*) FROM hot_sell_participants
   UNION ALL
   SELECT 'hot_sell_configs', COUNT(*) FROM hot_sell_configs;
   ```

---

## 📝 DETAILED CHANGES

### ✅ Winner Takes All Changes

#### **What's Being Added:**

| Column | Type | Purpose | Impact |
|--------|------|---------|--------|
| `timer_duration` | INTEGER | Stores 30-min timer duration (1800 seconds) | **None** - Just adds tracking capability |
| `winner_user_id` | UUID | Tracks which user won | **None** - Enables winner tracking |
| `prize_amount` | NUMERIC | Amount winner received | **None** - Records payout amount |
| `platform_fee` | NUMERIC | Platform fee taken | **None** - Records platform fee |
| `completed_at` | TIMESTAMPTZ | When game completed | **None** - Timestamp tracking |

**Score Type Change:**
- **From:** `INTEGER` (whole numbers only: 6758)
- **To:** `NUMERIC` (decimals allowed: 6758.75)
- **Why:** Your games produce decimal scores, this prevents errors

#### **What's NOT Changing:**
- ❌ No existing data modified
- ❌ No game rules changed
- ❌ No prize calculations changed (still 100% to winner)
- ❌ No timer behavior changed
- ❌ Page works exactly the same

---

### ✅ Hot Sell Changes

#### **What's Being Added:**

| Column | Type | Purpose | Impact |
|--------|------|---------|--------|
| `base_price` | NUMERIC | Target pot amount ($2, $5, $10, etc.) | **Required** - Sessions can't be created without this |
| `max_participants` | INTEGER | Maximum players allowed | **Required** - Defines when game is full |

#### **What's Being Updated:**

**Prize Percentages (in `hot_sell_configs`):**
- **Before:** 1st: 60%, 2nd: 25%, 3rd: 15%
- **After:** 1st: 50%, 2nd: 20%, 3rd: 15%
- **Platform Fee:** 15% (unchanged)
- **Why:** As you requested earlier

**Existing Sessions Update:**
- Any existing `hot_sell_sessions` will get `base_price` and `max_participants` populated from their config

---

## 🔍 Safety Features in the Script

1. **Conditional Checks:** Every change checks if column exists first
2. **No Data Loss:** Uses `ALTER TABLE ADD COLUMN` (safe)
3. **Idempotent:** Can run multiple times safely
4. **No Drops:** Never uses `DROP TABLE` or `DELETE`
5. **Type Conversions:** Safe INTEGER → NUMERIC conversion (no data loss)

---

## ✅ Post-Update Verification

### After Running the Script:

1. **Verify Record Counts (Should Match):**
   ```sql
   -- Run the same count query from backup step
   SELECT 'winner_takes_all_sessions' as table_name, COUNT(*) as record_count FROM winner_takes_all_sessions
   UNION ALL
   SELECT 'winner_takes_all_participants', COUNT(*) FROM winner_takes_all_participants
   UNION ALL
   SELECT 'hot_sell_sessions', COUNT(*) FROM hot_sell_sessions
   UNION ALL
   SELECT 'hot_sell_participants', COUNT(*) FROM hot_sell_participants
   UNION ALL
   SELECT 'hot_sell_configs', COUNT(*) FROM hot_sell_configs;
   ```

2. **Check New Columns Were Added:**
   ```sql
   SELECT table_name, column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name IN ('winner_takes_all_sessions', 'winner_takes_all_participants', 'hot_sell_sessions')
   AND column_name IN ('timer_duration', 'winner_user_id', 'prize_amount', 'platform_fee', 'completed_at', 'base_price', 'max_participants')
   ORDER BY table_name, column_name;
   ```

3. **Test Pages:**
   - Visit `/winner-takes-all` - Should load normally
   - Visit `/hot-sell` - Should now show listings
   - Try joining a game on each page
   - Verify tokens deduct properly

---

## 🚨 Rollback Plan (If Needed)

If something goes wrong:

### Option 1: Supabase Backup Restore
1. Go to Supabase → Settings → Database → Backups
2. Select the backup from before the update
3. Click "Restore"

### Option 2: Manual Rollback SQL
```sql
-- Remove columns that were added (ONLY IF NEEDED)

-- Winner Takes All rollback
ALTER TABLE winner_takes_all_sessions 
  DROP COLUMN IF EXISTS timer_duration,
  DROP COLUMN IF EXISTS winner_user_id,
  DROP COLUMN IF EXISTS prize_amount,
  DROP COLUMN IF EXISTS platform_fee,
  DROP COLUMN IF EXISTS completed_at;

-- Hot Sell rollback
ALTER TABLE hot_sell_sessions
  DROP COLUMN IF EXISTS base_price,
  DROP COLUMN IF EXISTS max_participants;

-- Revert prize percentages (Hot Sell)
UPDATE hot_sell_configs
SET 
  first_place_percent = 60,
  second_place_percent = 25,
  third_place_percent = 15,
  description = '1st: 60%, 2nd: 25%, 3rd: 15%';
```

### Option 3: Revert Score Type (If Issues)
```sql
-- Only if decimal scores cause problems (unlikely)
ALTER TABLE winner_takes_all_participants 
  ALTER COLUMN score TYPE INTEGER 
  USING score::INTEGER;
```

---

## 📊 Expected Outcomes

### Winner Takes All:
- ✅ Decimal scores work (6758.75 instead of error)
- ✅ Payout system has all needed columns
- ✅ Winner tracking works properly
- ✅ Page functions exactly as before
- ✅ All existing games/scores preserved

### Hot Sell:
- ✅ Sessions can be created (base_price column exists)
- ✅ Games show up on the page
- ✅ Prize percentages show 50/20/15
- ✅ All existing data preserved

---

## 🎯 Summary

**Safe to Run Because:**
- ✅ Only adds missing columns (doesn't remove anything)
- ✅ Preserves all existing data
- ✅ Changes are minimal and necessary
- ✅ Can be rolled back easily
- ✅ Script has been tested for safety

**Why It's Needed:**
- 🔧 Fixes decimal score errors
- 🔧 Enables Hot Sell to work
- 🔧 Adds required tracking columns
- 🔧 Updates prize percentages as requested

---

## 📞 Support Notes

If you see any issues after running:
1. Check the record counts match pre-update
2. Check browser console for errors
3. Try the rollback SQL if needed
4. Worst case: restore Supabase backup

**The changes are designed to be safe and non-breaking!** ✅

