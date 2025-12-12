-- ============================================================================
-- FIX DAILY CHALLENGES ONLY - MATCH WEEKLY LOGIC
-- ============================================================================
-- Weekly is working, so let's make daily match it exactly
-- ============================================================================

-- ============================================================================
-- 1. FIX update_daily_challenge_progress TO MATCH WEEKLY LOGIC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_daily_challenge_progress(
    p_user_id UUID,
    p_challenge_type TEXT,
    p_progress_increment INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge_id UUID;
    v_target_value INTEGER;
    v_current_progress INTEGER := 0;
    v_new_progress INTEGER;
    v_is_completed BOOLEAN;
    v_xp_reward INTEGER;
    v_reward_points INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- CRITICAL: Ensure challenges exist (only if missing, like weekly)
    IF NOT EXISTS (
        SELECT 1 FROM public.daily_challenges 
        WHERE challenge_date = v_today AND is_active = true LIMIT 1
    ) THEN
        PERFORM public.generate_daily_challenges();
    END IF;
    
    -- Find challenge (using LEFT JOIN like weekly does)
    SELECT dc.id, dc.target_value, COALESCE(udc.progress, 0), dc.xp_reward, dc.reward_points
    INTO v_challenge_id, v_target_value, v_current_progress, v_xp_reward, v_reward_points
    FROM public.daily_challenges dc
    LEFT JOIN public.user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = p_user_id
    WHERE dc.challenge_date = v_today
    AND dc.challenge_type = p_challenge_type
    AND dc.is_active = true
    LIMIT 1;
    
    IF v_challenge_id IS NULL THEN
        RAISE WARNING '[UPDATE_DAILY] Challenge not found: type=%, date=%', p_challenge_type, v_today;
        RETURN jsonb_build_object('success', false, 'error', 'Challenge not found', 'type', p_challenge_type);
    END IF;
    
    -- Calculate new progress
    v_new_progress := v_current_progress + p_progress_increment;
    v_is_completed := v_new_progress >= v_target_value;
    
    -- CRITICAL: Use INSERT ... ON CONFLICT exactly like weekly does
    -- Include target_value because it's NOT NULL in the table
    INSERT INTO public.user_daily_challenges (user_id, challenge_id, progress, target_value, is_completed, updated_at)
    VALUES (p_user_id, v_challenge_id, v_new_progress, v_target_value, v_is_completed, NOW())
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        is_completed = EXCLUDED.is_completed,
        updated_at = NOW();
    
    -- Award rewards if completed (only once)
    IF v_is_completed THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_daily_challenges
            WHERE user_id = p_user_id 
            AND challenge_id = v_challenge_id 
            AND xp_awarded IS NOT NULL 
            AND xp_awarded > 0
        ) THEN
            UPDATE public.user_xp
            SET 
                total_xp = total_xp + v_xp_reward,
                reward_points = reward_points + v_reward_points,
                updated_at = NOW()
            WHERE user_id = p_user_id;
            
            INSERT INTO public.xp_transactions (user_id, xp_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_xp_reward, 'challenge', v_challenge_id, 'Daily challenge: ' || p_challenge_type);
            
            INSERT INTO public.reward_points_transactions (user_id, points_amount, transaction_type, source_id, description)
            VALUES (p_user_id, v_reward_points, 'earned', v_challenge_id, 'Daily challenge reward');
            
            UPDATE public.user_daily_challenges
            SET 
                xp_awarded = v_xp_reward,
                reward_points_awarded = v_reward_points
            WHERE user_id = p_user_id AND challenge_id = v_challenge_id;
            
            RAISE NOTICE '[UPDATE_DAILY] ✅ Awarded % XP and % RP for challenge %', v_xp_reward, v_reward_points, p_challenge_type;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'progress', v_new_progress,
        'target', v_target_value,
        'is_completed', v_is_completed
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[UPDATE_DAILY] ❌ Error: user=%, type=%, error=%', p_user_id, p_challenge_type, SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 2. VERIFY generate_daily_challenges DOESN'T DELETE EXISTING CHALLENGES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_daily_challenges()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_practice_rp INTEGER;
    v_competition_rp INTEGER;
    v_coin_play_rp INTEGER;
    v_score_rp INTEGER;
    v_games_rp INTEGER;
    v_visit_page_rp INTEGER;
    v_visit_category_rp INTEGER;
    v_specific_game_rp INTEGER;
    v_practice_games INTEGER;
    v_coin_play_games INTEGER := 4;
    v_target_score INTEGER := 10000;
    v_total_games INTEGER;
    v_pages_to_visit INTEGER;
    v_categories_to_visit INTEGER;
    v_games_to_play INTEGER;
BEGIN
    -- CRITICAL: Only generate if challenges don't exist for today
    IF EXISTS (
        SELECT 1 FROM public.daily_challenges 
        WHERE challenge_date = v_today 
        AND is_active = true
    ) THEN
        RAISE NOTICE '[GENERATE_DAILY] Challenges already exist for %, skipping generation', v_today;
        RETURN;
    END IF;
    
    -- Delete old play_competition challenge if it exists (replaced by specific ones)
    DELETE FROM public.daily_challenges 
    WHERE challenge_date = v_today 
    AND challenge_type = 'play_competition';
    
    -- Generate random values
    v_practice_rp := 4 + FLOOR(RANDOM() * 9);
    v_competition_rp := 20 + FLOOR(RANDOM() * 21);
    v_coin_play_rp := 8 + FLOOR(RANDOM() * 9);
    v_score_rp := 20 + FLOOR(RANDOM() * 16);
    v_games_rp := 15 + FLOOR(RANDOM() * 16);
    v_visit_page_rp := 8 + FLOOR(RANDOM() * 8);
    v_visit_category_rp := 12 + FLOOR(RANDOM() * 9);
    v_specific_game_rp := 15 + FLOOR(RANDOM() * 14);
    
    v_practice_games := 2 + FLOOR(RANDOM() * 3);
    v_total_games := 3 + FLOOR(RANDOM() * 4);
    v_pages_to_visit := 2 + FLOOR(RANDOM() * 3);
    v_categories_to_visit := 1 + FLOOR(RANDOM() * 2);
    v_games_to_play := 1 + FLOOR(RANDOM() * 2);
    
    -- Insert challenges (ON CONFLICT DO NOTHING to prevent duplicates)
    INSERT INTO public.daily_challenges (challenge_date, challenge_type, challenge_name, challenge_description, target_value, xp_reward, reward_points, is_active)
    VALUES
        (v_today, 'play_practice', 'Practice Session', 'Play ' || v_practice_games::TEXT || ' practice games today', v_practice_games, 15 + FLOOR(RANDOM() * 15), v_practice_rp, true),
        (v_today, 'play_1v1', '1v1 Battle', 'Play 1 1v1 game today', 1, 50 + FLOOR(RANDOM() * 30), v_competition_rp, true),
        (v_today, 'play_winner_takes_all', 'Winner Takes All', 'Play 1 Winner Takes All game today', 1, 60 + FLOOR(RANDOM() * 30), 25 + FLOOR(RANDOM() * 21), true),
        (v_today, 'play_hot_sell', 'Hot Sell Challenge', 'Play 1 Hot Sell game today', 1, 60 + FLOOR(RANDOM() * 30), 25 + FLOOR(RANDOM() * 21), true),
        (v_today, 'play_coin_play', 'Coin Play Master', 'Play ' || v_coin_play_games::TEXT || ' coin play games today', v_coin_play_games, 50 + FLOOR(RANDOM() * 30), v_coin_play_rp, true),
        (v_today, 'score_threshold', 'Score Master', 'Score ' || v_target_score::TEXT || ' total points in competition games today', v_target_score, 40 + FLOOR(RANDOM() * 30), v_score_rp, true),
        (v_today, 'games_count', 'Game Marathon', 'Play ' || v_total_games::TEXT || ' games total today', v_total_games, 50 + FLOOR(RANDOM() * 30), v_games_rp, true),
        (v_today, 'visit_page', 'Explorer', 'Visit ' || v_pages_to_visit::TEXT || ' different pages today', v_pages_to_visit, 20 + FLOOR(RANDOM() * 15), v_visit_page_rp, true),
        (v_today, 'visit_category', 'Category Browser', 'Visit ' || v_categories_to_visit::TEXT || ' different category pages today', v_categories_to_visit, 25 + FLOOR(RANDOM() * 20), v_visit_category_rp, true),
        (v_today, 'play_specific_game', 'Game Specialist', 'Play ' || v_games_to_play::TEXT || ' different game types today', v_games_to_play, 30 + FLOOR(RANDOM() * 25), v_specific_game_rp, true)
    ON CONFLICT (challenge_date, challenge_type) DO NOTHING;
    
    RAISE NOTICE '[GENERATE_DAILY] ✅ Generated daily challenges for %', v_today;
END;
$$;

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DAILY CHALLENGES FIX APPLIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FIXES:';
    RAISE NOTICE '   - update_daily_challenge_progress now matches weekly logic';
    RAISE NOTICE '   - generate_daily_challenges only generates if missing';
    RAISE NOTICE '   - INSERT ... ON CONFLICT ensures records are created';
    RAISE NOTICE '';
END $$;

SELECT '✅ Daily challenges fix applied! Daily should now work like weekly.' as status;

