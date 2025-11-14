-- ============================================================================
-- COMPLETE WINNER TAKES ALL SETUP WITH PROPER TIMER LOGIC
-- ============================================================================

-- STEP 1: Add max_participants column to configs table
-- ============================================================================
ALTER TABLE winner_takes_all_configs 
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 10;

SELECT '✅ Step 1: Added max_participants column' as status;

-- STEP 2: Update existing configs with max_participants values
-- ============================================================================
UPDATE winner_takes_all_configs
SET max_participants = CASE 
    WHEN entry_fee <= 5 THEN 10      -- $1-$5: 10 players
    WHEN entry_fee <= 25 THEN 8      -- $10-$25: 8 players
    WHEN entry_fee <= 100 THEN 6     -- $50-$100: 6 players
    WHEN entry_fee <= 500 THEN 5     -- $250-$500: 5 players
    ELSE 3                           -- $1000+: 3 players
END
WHERE max_participants IS NULL OR max_participants = 10;

SELECT '✅ Step 2: Updated max_participants for existing configs' as status;

-- STEP 3: Create configs if they don't exist
-- ============================================================================
INSERT INTO winner_takes_all_configs (
    id, 
    title, 
    description, 
    entry_fee, 
    base_price,
    prize_pool,
    game_type,
    game_duration,
    timer_duration,
    max_participants,
    rng_seed,
    winner_prize,
    platform_fee,
    platform_fee_percent,
    is_active
)
VALUES 
    ('wta-$1', '$1 Winner Takes All', 'Fast-paced $1 entry - Winner takes 85%', 1, 1, 0, 'crypto_match', 60, 60, 10, 12345, 0, 0, 15, true),
    ('wta-$3', '$3 Winner Takes All', 'Quick $3 entry - Winner takes 85%', 3, 3, 0, 'crypto_match', 60, 60, 10, 23456, 0, 0, 15, true),
    ('wta-$5', '$5 Winner Takes All', 'Popular $5 entry - Winner takes 85%', 5, 5, 0, 'crypto_match', 60, 60, 10, 34567, 0, 0, 15, true),
    ('wta-$10', '$10 Winner Takes All', 'Standard $10 entry - Winner takes 85%', 10, 10, 0, 'crypto_match', 60, 60, 8, 45678, 0, 0, 15, true),
    ('wta-$25', '$25 Winner Takes All', 'Medium stakes $25 - Winner takes 85%', 25, 25, 0, 'crypto_match', 60, 60, 8, 56789, 0, 0, 15, true),
    ('wta-$50', '$50 Winner Takes All', 'High stakes $50 - Winner takes 85%', 50, 50, 0, 'crypto_match', 60, 60, 6, 67890, 0, 0, 15, true),
    ('wta-$100', '$100 Winner Takes All', 'Premium $100 entry - Winner takes 85%', 100, 100, 0, 'crypto_match', 60, 60, 6, 78901, 0, 0, 15, true),
    ('wta-$250', '$250 Winner Takes All', 'Elite $250 entry - Winner takes 85%', 250, 250, 0, 'crypto_match', 60, 60, 5, 89012, 0, 0, 15, true),
    ('wta-$500', '$500 Winner Takes All', 'Pro $500 entry - Winner takes 85%', 500, 500, 0, 'crypto_match', 60, 60, 5, 90123, 0, 0, 15, true),
    ('wta-$1000', '$1000 Winner Takes All', 'VIP $1000 entry - Winner takes 85%', 1000, 1000, 0, 'crypto_match', 60, 60, 3, 12346, 0, 0, 15, true),
    ('wta-$2500', '$2500 Winner Takes All', 'Ultra $2500 entry - Winner takes 85%', 2500, 2500, 0, 'crypto_match', 60, 60, 3, 23457, 0, 0, 15, true),
    ('wta-$5000', '$5000 Winner Takes All', 'Maximum $5000 entry - Winner takes 85%', 5000, 5000, 0, 'crypto_match', 60, 60, 3, 34568, 0, 0, 15, true)
ON CONFLICT (id) DO UPDATE SET
    max_participants = EXCLUDED.max_participants,
    timer_duration = EXCLUDED.timer_duration,
    game_duration = EXCLUDED.game_duration,
    description = EXCLUDED.description,
    platform_fee = EXCLUDED.platform_fee,
    platform_fee_percent = EXCLUDED.platform_fee_percent,
    prize_pool = EXCLUDED.prize_pool,
    winner_prize = EXCLUDED.winner_prize,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

SELECT '✅ Step 3: Created/updated all Winner Takes All configs' as status;

-- STEP 4: Create sessions if they don't exist
-- ============================================================================
INSERT INTO winner_takes_all_sessions (
    config_id,
    status,
    prize_pool,
    base_price,
    participants_count,
    timer_duration,
    rng_seed,
    created_at,
    updated_at
)
SELECT 
    c.id,
    'waiting',
    0,
    c.base_price,
    0,
    c.timer_duration,
    c.rng_seed,
    NOW(),
    NOW()
FROM winner_takes_all_configs c
WHERE NOT EXISTS (
    SELECT 1 FROM winner_takes_all_sessions s 
    WHERE s.config_id = c.id
);

SELECT '✅ Step 4: Created sessions for all configs' as status;

-- STEP 5: Verify setup
-- ============================================================================
SELECT 
    '✅ COMPLETE SETUP SUMMARY:' as summary,
    (SELECT COUNT(*) FROM winner_takes_all_configs) as total_configs,
    (SELECT COUNT(*) FROM winner_takes_all_sessions) as total_sessions,
    (SELECT COUNT(*) FROM winner_takes_all_sessions WHERE status = 'waiting') as waiting_sessions,
    (SELECT COUNT(*) FROM winner_takes_all_sessions WHERE status = 'active') as active_sessions;

-- Show all configs with their settings
SELECT 
    id,
    title,
    entry_fee,
    max_participants,
    timer_duration,
    rng_seed,
    platform_fee_percent
FROM winner_takes_all_configs
ORDER BY entry_fee;

SELECT '
✅ WINNER TAKES ALL COMPLETE SETUP!

What was created/updated:
1. ✅ Added max_participants column to configs
2. ✅ Created all 12 Winner Takes All configurations ($1 to $5000)
3. ✅ Created sessions for each config
4. ✅ Set appropriate max_participants based on entry fee
5. ✅ All sessions start in "waiting" status
6. ✅ Timer duration set to 60 seconds for all

Timer Logic:
- Timer starts when participants_count reaches max_participants (progress bar at 100%)
- Extra players can join AFTER timer starts to increase prize pool
- Single winner gets 85% of final prize pool
- Platform fee is 15%

Max Participants by Tier:
- $1-$5: 10 players (timer starts at 10th join)
- $10-$25: 8 players (timer starts at 8th join)
- $50-$100: 6 players (timer starts at 6th join)
- $250-$500: 5 players (timer starts at 5th join)
- $1000+: 3 players (timer starts at 3rd join)

Next Steps:
1. Run FIX_WTA_COMPLETE_ALL_ERRORS.sql for the join function
2. Test by joining sessions
3. Timer will start when progress bar hits 100%

Ready to test!
' as instructions;

