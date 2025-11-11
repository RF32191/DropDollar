# 🔧 URGENT FIXES - Run These SQL Scripts Now

## 🚨 Issues Being Fixed

1. **Database Error**: `updated_at` column missing from `hot_sell_participants`
2. **$3 Test Listings**: Create affordable test games for payout testing
3. **Laser Dodge**: Will be fixed after SQL runs
4. **Scoreboard**: Will verify after SQL runs

---

## 📋 Step 1: Fix Database Schema

### Run This SQL First:

**File:** `FIX_HOT_SELL_DB_SCHEMA.sql`

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy and paste the SQL below:

```sql
-- Add missing updated_at column to hot_sell_participants
BEGIN;

ALTER TABLE public.hot_sell_participants 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION update_hot_sell_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hot_sell_participants_updated_at_trigger ON public.hot_sell_participants;

CREATE TRIGGER hot_sell_participants_updated_at_trigger
BEFORE UPDATE ON public.hot_sell_participants
FOR EACH ROW
EXECUTE FUNCTION update_hot_sell_participants_updated_at();

SELECT 
  '✅ Fixed hot_sell_participants schema' as status,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'hot_sell_participants'
  AND table_schema = 'public'
ORDER BY ordinal_position;

COMMIT;
```

4. Click "Run"
5. Verify you see success messages

---

## 📋 Step 2: Create $3 Test Listings

### Run This SQL Second:

**File:** `CREATE_3_DOLLAR_HOT_SELL_LISTINGS.sql`

1. In Supabase SQL Editor, create another "New Query"
2. Copy and paste the SQL below:

```sql
-- Create $3 test listings for all 7 games
BEGIN;

-- Create $3 configurations
INSERT INTO public.hot_sell_configs (
  game_type,
  title,
  description,
  entry_fee,
  base_price,
  max_participants,
  game_duration,
  rng_seed,
  first_place_percent,
  second_place_percent,
  third_place_percent,
  platform_fee_percent,
  is_active
) VALUES
  ('sword_parry', '⚔️ Sword Slash - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0, true),
  ('blade_bounce', '🛡️ Blade Bounce - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0, true),
  ('laser_dodge', '🚀 Laser Dodge - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0, true),
  ('multi_target_reaction', '🎯 Multi-Target - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0, true),
  ('quick_click', '⚡ Quick Click - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0, true),
  ('color_sequence', '🎨 Color Memory - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0, true),
  ('cash_stack', '💵 Cash Stack - TEST $3', 'Quick $3 test - Top 3 win!', 3, 0, 5, 60, FLOOR(RANDOM() * 1000000)::INTEGER, 50.0, 20.0, 15.0, 15.0, true)
ON CONFLICT (game_type, entry_fee, max_participants) 
DO UPDATE SET
  title = EXCLUDED.title,
  is_active = true,
  updated_at = NOW();

-- Create active sessions for each config
INSERT INTO public.hot_sell_sessions (
  config_id,
  prize_pool,
  participants_count,
  max_participants,
  status,
  rng_seed
)
SELECT 
  id, 0, 0, max_participants, 'active', rng_seed
FROM public.hot_sell_configs
WHERE entry_fee = 3 AND is_active = true
ON CONFLICT (config_id, status) WHERE status = 'active'
DO UPDATE SET
  prize_pool = 0,
  participants_count = 0,
  updated_at = NOW();

-- Show results
SELECT 
  c.game_type,
  c.title,
  c.entry_fee,
  c.max_participants,
  s.prize_pool,
  s.participants_count
FROM public.hot_sell_configs c
JOIN public.hot_sell_sessions s ON s.config_id = c.id
WHERE c.entry_fee = 3 AND c.is_active = true AND s.status = 'active'
ORDER BY c.game_type;

COMMIT;
```

3. Click "Run"
4. You should see 7 new $3 listings created

---

## 💰 $3 Test Listings Details

**What You Get:**
- 7 games (one for each game type)
- $3 entry fee (affordable testing!)
- 5 max participants
- **Total cost to fill a session: $15**

**Prize Distribution (when full):**
- Total pool: $15
- 🥇 1st place: $7.50 (50%)
- 🥈 2nd place: $3.00 (20%)
- 🥉 3rd place: $2.25 (15%)
- 🏦 Platform fee: $2.25 (15%)

**Perfect for testing payouts without spending tons of tokens!**

---

## ✅ After Running SQL

1. **Refresh your website** (hard refresh: Cmd+Shift+R)
2. **Go to Hot Sell page**
3. **Look for "$3 TEST" listings**
4. **Try playing and completing a game**
5. **Score should save without errors**
6. **Scoreboard should appear after playing**

---

## 🐛 If You Still Have Issues

Please report:
1. Which game is broken?
2. What specific error message?
3. Does it happen in practice or competition mode?
4. Screenshot of browser console errors (F12 → Console tab)

I'll fix the Laser Dodge gameplay issues next after we confirm the database is fixed.

---

## 📝 Summary

Run these 2 SQL scripts in order:
1. ✅ `FIX_HOT_SELL_DB_SCHEMA.sql` - Fixes database schema
2. ✅ `CREATE_3_DOLLAR_HOT_SELL_LISTINGS.sql` - Creates test listings

Then test and report back!

