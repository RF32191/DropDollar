-- ============================================================================
-- RP SHOP LISTINGS & CHALLENGE RP VALUES
-- ============================================================================
-- Creates profitable RP shop listings (15% margin) and sets fair RP rewards
-- 1 Coin = $1, 1 RP = $0.01 (100 RP = $1)
-- ============================================================================

DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO v_admin_id 
    FROM public.users 
    WHERE email = 'rf32191@gmail.com' OR email = 'rf32191@yahoo.com' OR role = 'admin'
    LIMIT 1;
    
    -- If no admin found, try any user
    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id FROM public.users LIMIT 1;
    END IF;
    
    -- Only proceed if we have a user
    IF v_admin_id IS NOT NULL THEN
        
        -- ====================================================================
        -- COIN PACKS (1 Coin = $1, 15% profit margin)
        -- ====================================================================
        -- Formula: RP Cost = (Coin Value / 0.85) * 100
        -- Example: 100 coins = $100, cost = $100/0.85 = $117.65, RP = 11,765
        
        INSERT INTO public.rp_shop_listings (
            created_by, title, description, rp_cost, item_type, item_value, 
            is_active, stock_quantity, purchase_limit_per_user, sort_order
        ) VALUES
        -- Small coin packs
        (v_admin_id, '10 Coins Pack', 'Get 10 coins to play games!', 1180, 'token_bonus', 10, true, NULL, 10, 1),
        (v_admin_id, '25 Coins Pack', 'Get 25 coins for more gameplay!', 2940, 'token_bonus', 25, true, NULL, 10, 2),
        (v_admin_id, '50 Coins Pack', 'Get 50 coins - great value!', 5880, 'token_bonus', 50, true, NULL, 5, 3),
        (v_admin_id, '100 Coins Pack', 'Get 100 coins - best value!', 11765, 'token_bonus', 100, true, NULL, 3, 4),
        (v_admin_id, '250 Coins Pack', 'Get 250 coins - premium pack!', 29410, 'token_bonus', 250, true, NULL, 2, 5),
        (v_admin_id, '500 Coins Pack', 'Get 500 coins - ultimate pack!', 58820, 'token_bonus', 500, true, NULL, 1, 6),
        
        -- ====================================================================
        -- GIFT CARDS (15% profit margin)
        -- ====================================================================
        -- Formula: RP Cost = (Gift Card Value / 0.85) * 100
        -- Example: $10 card = $10/0.85 = $11.76, RP = 1,176
        
        (v_admin_id, '$10 Gift Card', 'Redeem for $10 in credits or cashout', 1180, 'special', 10, true, NULL, 5, 10),
        (v_admin_id, '$25 Gift Card', 'Redeem for $25 in credits or cashout', 2940, 'special', 25, true, NULL, 3, 11),
        (v_admin_id, '$50 Gift Card', 'Redeem for $50 in credits or cashout', 5880, 'special', 50, true, NULL, 2, 12),
        (v_admin_id, '$100 Gift Card', 'Redeem for $100 in credits or cashout', 11765, 'special', 100, true, NULL, 1, 13),
        
        -- ====================================================================
        -- COSMETIC ITEMS (Badges, Themes, etc.)
        -- ====================================================================
        
        (v_admin_id, 'Bronze Badge', 'Show off your dedication with this exclusive badge', 500, 'badge', NULL, true, NULL, 1, 20),
        (v_admin_id, 'Silver Badge', 'Premium badge for committed players', 1000, 'badge', NULL, true, NULL, 1, 21),
        (v_admin_id, 'Gold Badge', 'Elite badge for top players', 2500, 'badge', NULL, true, NULL, 1, 22),
        (v_admin_id, 'Platinum Badge', 'Ultimate badge for legends', 5000, 'badge', NULL, true, NULL, 1, 23),
        
        -- ====================================================================
        -- BOOST ITEMS
        -- ====================================================================
        
        (v_admin_id, 'Score Boost x2', 'Double your score for your next 3 games', 1500, 'boost', 2, true, NULL, 5, 30),
        (v_admin_id, 'Score Boost x3', 'Triple your score for your next 2 games', 3000, 'boost', 3, true, NULL, 3, 31),
        (v_admin_id, 'XP Boost', 'Earn 2x XP for your next 5 games', 2000, 'boost', 2, true, NULL, 5, 32)
        
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ RP Shop listings created!';
    ELSE
        RAISE NOTICE '⚠️ No admin user found - skipping listing creation';
    END IF;
END $$;

-- ============================================================================
-- UPDATE DAILY CHALLENGE RP REWARDS
-- ============================================================================
-- Fair RP values: 15-50 RP per daily challenge
-- ============================================================================

-- Update the generate_daily_challenges function with better RP rewards
CREATE OR REPLACE FUNCTION public.generate_daily_challenges()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_practice_rp INTEGER;
    v_competition_rp INTEGER;
    v_score_rp INTEGER;
    v_games_rp INTEGER;
BEGIN
    -- Delete old challenges for today if they exist (to regenerate)
    DELETE FROM public.daily_challenges WHERE challenge_date = v_today;

    -- Generate varied RP rewards (15-50 RP range)
    -- Practice: 15-25 RP (easier)
    -- Competition: 25-40 RP (medium)
    -- Score: 20-35 RP (skill-based)
    -- Games count: 30-50 RP (engagement)
    
    v_practice_rp := 15 + FLOOR(RANDOM() * 11); -- 15-25 RP
    v_competition_rp := 25 + FLOOR(RANDOM() * 16); -- 25-40 RP
    v_score_rp := 20 + FLOOR(RANDOM() * 16); -- 20-35 RP
    v_games_rp := 30 + FLOOR(RANDOM() * 21); -- 30-50 RP

    -- Generate random daily challenges with fair RP rewards
    INSERT INTO public.daily_challenges (
        challenge_date, challenge_type, challenge_name, challenge_description, 
        target_value, xp_reward, reward_points, is_active
    )
    VALUES
        (
            v_today, 
            'play_practice', 
            'Practice Makes Perfect', 
            'Play ' || (3 + FLOOR(RANDOM() * 3))::TEXT || ' practice games today', 
            3 + FLOOR(RANDOM() * 3), 
            25 + FLOOR(RANDOM() * 25), 
            v_practice_rp, 
            true
        ),
        (
            v_today, 
            'play_competition', 
            'Competitive Spirit', 
            'Play ' || (1 + FLOOR(RANDOM() * 2))::TEXT || ' competition games today', 
            1 + FLOOR(RANDOM() * 2), 
            50 + FLOOR(RANDOM() * 50), 
            v_competition_rp, 
            true
        ),
        (
            v_today, 
            'score_threshold', 
            'Score Master', 
            'Score ' || (800 + FLOOR(RANDOM() * 400))::TEXT || '+ points in any game', 
            1, 
            30 + FLOOR(RANDOM() * 20), 
            v_score_rp, 
            true
        ),
        (
            v_today, 
            'games_count', 
            'Game Marathon', 
            'Play ' || (4 + FLOOR(RANDOM() * 3))::TEXT || ' games total today', 
            4 + FLOOR(RANDOM() * 3), 
            40 + FLOOR(RANDOM() * 20), 
            v_games_rp, 
            true
        )
    ON CONFLICT (challenge_date, challenge_type) DO NOTHING;
    
    RAISE NOTICE '✅ Daily challenges generated for %', v_today;
END;
$$;

-- ============================================================================
-- UPDATE WEEKLY CHALLENGE RP REWARDS
-- ============================================================================
-- Fair RP values: 50-200 RP per weekly challenge
-- ============================================================================

-- Update the generate_weekly_challenges function with better RP rewards
CREATE OR REPLACE FUNCTION public.generate_weekly_challenges(p_week_start DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_practice_rp INTEGER;
    v_competition_rp INTEGER;
    v_score_rp INTEGER;
    v_games_rp INTEGER;
    v_win_rp INTEGER;
    v_xp_rp INTEGER;
BEGIN
    -- Delete old challenges for this week if they exist (to regenerate)
    DELETE FROM public.weekly_challenges WHERE week_start_date = p_week_start;

    -- Generate varied RP rewards (50-200 RP range)
    -- Practice: 50-80 RP
    -- Competition: 80-120 RP
    -- Score: 70-100 RP
    -- Games count: 100-150 RP
    -- Win competition: 120-180 RP
    -- Total XP: 150-200 RP
    
    v_practice_rp := 50 + FLOOR(RANDOM() * 31); -- 50-80 RP
    v_competition_rp := 80 + FLOOR(RANDOM() * 41); -- 80-120 RP
    v_score_rp := 70 + FLOOR(RANDOM() * 31); -- 70-100 RP
    v_games_rp := 100 + FLOOR(RANDOM() * 51); -- 100-150 RP
    v_win_rp := 120 + FLOOR(RANDOM() * 61); -- 120-180 RP
    v_xp_rp := 150 + FLOOR(RANDOM() * 51); -- 150-200 RP

    -- Generate random weekly challenges with fair RP rewards
    INSERT INTO public.weekly_challenges (
        week_start_date, challenge_type, challenge_name, challenge_description, 
        target_value, xp_reward, reward_points, is_active
    )
    VALUES
        (
            p_week_start, 
            'play_practice', 
            'Weekly Practice Champion', 
            'Play ' || (15 + FLOOR(RANDOM() * 10))::TEXT || ' practice games this week', 
            15 + FLOOR(RANDOM() * 10), 
            200 + FLOOR(RANDOM() * 100), 
            v_practice_rp, 
            true
        ),
        (
            p_week_start, 
            'play_competition', 
            'Weekly Competitor', 
            'Play ' || (5 + FLOOR(RANDOM() * 5))::TEXT || ' competition games this week', 
            5 + FLOOR(RANDOM() * 5), 
            300 + FLOOR(RANDOM() * 200), 
            v_competition_rp, 
            true
        ),
        (
            p_week_start, 
            'score_threshold', 
            'Weekly Score Master', 
            'Score ' || (5000 + FLOOR(RANDOM() * 3000))::TEXT || '+ points total this week', 
            5000 + FLOOR(RANDOM() * 3000), 
            250 + FLOOR(RANDOM() * 150), 
            v_score_rp, 
            true
        ),
        (
            p_week_start, 
            'games_count', 
            'Weekly Game Marathon', 
            'Play ' || (20 + FLOOR(RANDOM() * 10))::TEXT || ' games total this week', 
            20 + FLOOR(RANDOM() * 10), 
            300 + FLOOR(RANDOM() * 200), 
            v_games_rp, 
            true
        ),
        (
            p_week_start, 
            'win_competition', 
            'Weekly Winner', 
            'Win ' || (2 + FLOOR(RANDOM() * 3))::TEXT || ' competition games this week', 
            2 + FLOOR(RANDOM() * 3), 
            400 + FLOOR(RANDOM() * 200), 
            v_win_rp, 
            true
        ),
        (
            p_week_start, 
            'total_xp', 
            'Weekly XP Grinder', 
            'Earn ' || (1000 + FLOOR(RANDOM() * 500))::TEXT || ' total XP this week', 
            1000 + FLOOR(RANDOM() * 500), 
            500 + FLOOR(RANDOM() * 300), 
            v_xp_rp, 
            true
        )
    ON CONFLICT (week_start_date, challenge_type) DO NOTHING;
    
    RAISE NOTICE '✅ Weekly challenges generated for week starting %', p_week_start;
END;
$$;

-- ============================================================================
-- SET UP AUTO-ROTATION FOR DAILY CHALLENGES
-- ============================================================================
-- Daily challenges auto-generate when get_daily_challenges() is called
-- This already happens automatically via the function

-- ============================================================================
-- SET UP AUTO-ROTATION FOR WEEKLY CHALLENGES
-- ============================================================================
-- Weekly challenges auto-generate when get_weekly_challenges() is called
-- This already happens automatically via the function

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RP SHOP & CHALLENGES CONFIGURED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '💰 RP ECONOMICS:';
    RAISE NOTICE '   1 RP = $0.01 (100 RP = $1)';
    RAISE NOTICE '   1 Coin = $1';
    RAISE NOTICE '   Profit Margin: 15%%';
    RAISE NOTICE '';
    RAISE NOTICE '🛍️ RP SHOP LISTINGS:';
    RAISE NOTICE '   Coin Packs: 10, 25, 50, 100, 250, 500 coins';
    RAISE NOTICE '   Gift Cards: $10, $25, $50, $100';
    RAISE NOTICE '   Badges: Bronze, Silver, Gold, Platinum';
    RAISE NOTICE '   Boosts: Score multipliers, XP boosts';
    RAISE NOTICE '';
    RAISE NOTICE '📅 DAILY CHALLENGES:';
    RAISE NOTICE '   RP Rewards: 15-50 RP per challenge';
    RAISE NOTICE '   Auto-generates daily';
    RAISE NOTICE '';
    RAISE NOTICE '📆 WEEKLY CHALLENGES:';
    RAISE NOTICE '   RP Rewards: 50-200 RP per challenge';
    RAISE NOTICE '   Auto-generates weekly';
    RAISE NOTICE '';
END $$;

SELECT '✅ RP Shop Listings and Challenge Values Configured!' as status;

