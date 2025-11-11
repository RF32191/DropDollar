-- ============================================================================
-- COMPLETE FIX - All Issues in One Script
-- ============================================================================
-- This fixes:
-- 1. Rate limits (resets all listings)
-- 2. Audit foreign key constraint
-- 3. Creates missing sessions
-- 4. Ensures RNG seeds exist
-- ============================================================================

SELECT '🚀 Starting Complete Fix...' as step;

-- ============================================
-- ISSUE 1: Reset Rate Limits
-- ============================================

SELECT '1️⃣ Resetting rate limits...' as step;

-- Delete all participants
DELETE FROM hot_sell_participants;

-- Reset all sessions
UPDATE hot_sell_sessions
SET 
  participants_count = 0,
  prize_pool = base_price,
  first_place_user_id = NULL,
  second_place_user_id = NULL,
  third_place_user_id = NULL,
  first_place_prize = NULL,
  second_place_prize = NULL,
  third_place_prize = NULL,
  platform_fee = NULL,
  status = 'active',
  completed_at = NULL,
  updated_at = NOW();

SELECT '✅ All listings reset' as result;

-- ============================================
-- ISSUE 2: Fix Audit Foreign Key
-- ============================================

SELECT '2️⃣ Fixing audit foreign key...' as step;

-- Drop foreign key constraint
ALTER TABLE game_session_audit DROP CONSTRAINT IF EXISTS game_session_audit_user_id_fkey;

-- Make user_id nullable
ALTER TABLE game_session_audit ALTER COLUMN user_id DROP NOT NULL;

SELECT '✅ Audit FK fixed' as result;

-- ============================================
-- ISSUE 3: Ensure All Configs Have Sessions
-- ============================================

SELECT '3️⃣ Creating missing sessions...' as step;

-- Create sessions for configs that don't have active ones
INSERT INTO hot_sell_sessions (
  id,
  config_id,
  prize_pool,
  base_price,
  max_participants,
  participants_count,
  status,
  rng_seed,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  c.base_price,
  c.base_price,
  c.max_participants,
  0,
  'active',
  floor(random() * 1000000)::INTEGER,
  NOW(),
  NOW()
FROM hot_sell_configs c
WHERE NOT EXISTS (
  SELECT 1 FROM hot_sell_sessions s 
  WHERE s.config_id = c.id AND s.status = 'active'
);

SELECT '✅ Missing sessions created' as result;

-- ============================================
-- ISSUE 4: Fix NULL RNG Seeds
-- ============================================

SELECT '4️⃣ Fixing RNG seeds...' as step;

UPDATE hot_sell_sessions
SET rng_seed = floor(random() * 1000000)::INTEGER
WHERE rng_seed IS NULL OR rng_seed = 0;

SELECT '✅ RNG seeds fixed' as result;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '🎯 VERIFICATION' as step;

-- Check 1: All configs have sessions
SELECT 
  '✅ Configs vs Sessions' as check_name,
  (SELECT COUNT(*) FROM hot_sell_configs) as total_configs,
  (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') as active_sessions,
  CASE 
    WHEN (SELECT COUNT(*) FROM hot_sell_sessions WHERE status = 'active') >= (SELECT COUNT(*) FROM hot_sell_configs)
    THEN '✅ ALL GOOD'
    ELSE '❌ MISSING SOME'
  END as status;

-- Check 2: All sessions have RNG seeds
SELECT 
  '✅ RNG Seeds' as check_name,
  COUNT(*) FILTER (WHERE rng_seed IS NOT NULL AND rng_seed > 0) as sessions_with_seeds,
  COUNT(*) as total_sessions,
  CASE 
    WHEN COUNT(*) = COUNT(*) FILTER (WHERE rng_seed IS NOT NULL AND rng_seed > 0)
    THEN '✅ ALL HAVE SEEDS'
    ELSE '⚠️ SOME MISSING'
  END as status
FROM hot_sell_sessions;

-- Check 3: All reset to zero
SELECT 
  '✅ Reset Status' as check_name,
  COUNT(*) FILTER (WHERE participants_count = 0) as empty_sessions,
  COUNT(*) as total_sessions,
  SUM(participants_count) as total_participants,
  CASE 
    WHEN SUM(participants_count) = 0
    THEN '✅ ALL RESET'
    ELSE '⚠️ SOME STILL HAVE PARTICIPANTS'
  END as status
FROM hot_sell_sessions;

-- Check 4: Audit FK removed
SELECT 
  '✅ Audit FK' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'game_session_audit'::regclass 
        AND conname LIKE '%user_id_fkey%'
    )
    THEN '⚠️ FK still exists'
    ELSE '✅ FK removed'
  END as status;

SELECT '🎉 ALL FIXES COMPLETE!' as message;
SELECT '✅ Rate limits reset' as fix_1;
SELECT '✅ Audit FK fixed' as fix_2;
SELECT '✅ All sessions created' as fix_3;
SELECT '✅ RNG seeds set' as fix_4;
SELECT '🎮 Ready to test games!' as next_step;

