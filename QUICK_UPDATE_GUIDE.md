# 🚀 Quick Update Guide
**Run this checklist before and after the update**

---

## ✅ BEFORE UPDATE (3 minutes)

### 1. Note Your Current Backup
- Go to: Supabase → Settings → Database → Backups
- Write down the latest backup time: `_______________`

### 2. Save Current Record Counts
Run this in Supabase SQL Editor:
```sql
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

**Write down the counts:**
- winner_takes_all_sessions: `______`
- winner_takes_all_participants: `______`
- hot_sell_sessions: `______`
- hot_sell_participants: `______`
- hot_sell_configs: `______`

---

## 🔄 RUN UPDATE

1. Open `RUN_ALL_PRODUCTION_UPDATES.sql` in Supabase SQL Editor
2. Click "Run"
3. Wait for "ALL PRODUCTION UPDATES COMPLETE!" message

---

## ✅ AFTER UPDATE (2 minutes)

### 1. Verify Record Counts Match
Run the same query again - numbers should be **identical**

### 2. Test Pages
- [ ] Visit `/winner-takes-all` - loads correctly?
- [ ] Visit `/hot-sell` - shows listings?
- [ ] Try joining a game - works?

### 3. If Everything Works:
✅ **Done!** You're good to go.

### 4. If Something's Wrong:
See `BACKUP_AND_CHANGES_LOG.md` for rollback instructions.

---

## 🎯 What Changed

### Winner Takes All:
- Added columns for winner tracking (doesn't change how page works)
- Fixed decimal scores (6758.75 now works instead of error)

### Hot Sell:
- Added required columns (page now works)
- Prize % changed to 50/20/15 (as requested)

**No data was deleted or lost!** ✅

