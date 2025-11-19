-- ============================================
-- CREATE ANALYTICS AND STATS SYSTEM
-- ============================================
-- Comprehensive analytics for user dashboard
-- Tracks skill progression, per-game averages, and lifetime stats
-- ============================================

-- Step 1: Create function to get comprehensive user stats
CREATE OR REPLACE FUNCTION public.get_user_comprehensive_stats(p_user_id UUID)
RETURNS TABLE (
    total_games BIGINT,
    practice_games BIGINT,
    competition_games BIGINT,
    total_tokens_wagered NUMERIC,
    total_tokens_won NUMERIC,
    total_prize_money NUMERIC,
    average_score NUMERIC,
    win_rate NUMERIC,
    games_won BIGINT,
    games_lost BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_games,
        COUNT(*) FILTER (WHERE session_type = 'practice')::BIGINT as practice_games,
        COUNT(*) FILTER (WHERE session_type != 'practice')::BIGINT as competition_games,
        COALESCE(SUM(tokens_spent), 0)::NUMERIC as total_tokens_wagered,
        COALESCE(SUM(tokens_won), 0)::NUMERIC as total_tokens_won,
        COALESCE(SUM(tokens_won) - SUM(tokens_spent), 0)::NUMERIC as total_prize_money,
        COALESCE(AVG(score), 0)::NUMERIC as average_score,
        CASE 
            WHEN COUNT(*) FILTER (WHERE result IN ('won', 'lost')) > 0 
            THEN (COUNT(*) FILTER (WHERE result = 'won')::NUMERIC / COUNT(*) FILTER (WHERE result IN ('won', 'lost'))::NUMERIC * 100)
            ELSE 0
        END as win_rate,
        COUNT(*) FILTER (WHERE result = 'won')::BIGINT as games_won,
        COUNT(*) FILTER (WHERE result = 'lost')::BIGINT as games_lost
    FROM public.game_history
    WHERE user_id = p_user_id;
END;
$$;

-- Step 2: Create function to get per-game analytics
CREATE OR REPLACE FUNCTION public.get_user_per_game_analytics(p_user_id UUID)
RETURNS TABLE (
    game_type TEXT,
    total_plays BIGINT,
    best_score NUMERIC,
    average_score NUMERIC,
    recent_average NUMERIC,
    skill_trend TEXT,
    last_played TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH game_stats AS (
        SELECT 
            gh.game_type,
            COUNT(*) as plays,
            MAX(gh.score) as best,
            AVG(gh.score) as avg_score,
            MAX(gh.created_at) as last_play,
            -- Calculate recent average (last 5 games)
            (
                SELECT AVG(score) 
                FROM public.game_history gh2 
                WHERE gh2.user_id = p_user_id 
                  AND gh2.game_type = gh.game_type
                ORDER BY gh2.created_at DESC
                LIMIT 5
            ) as recent_avg,
            -- Calculate old average (games 6-10)
            (
                SELECT AVG(score) 
                FROM (
                    SELECT score 
                    FROM public.game_history gh3 
                    WHERE gh3.user_id = p_user_id 
                      AND gh3.game_type = gh.game_type
                    ORDER BY gh3.created_at DESC
                    OFFSET 5 LIMIT 5
                ) old_games
            ) as old_avg
        FROM public.game_history gh
        WHERE gh.user_id = p_user_id
        GROUP BY gh.game_type
    )
    SELECT 
        gs.game_type::TEXT,
        gs.plays::BIGINT,
        gs.best::NUMERIC,
        gs.avg_score::NUMERIC,
        COALESCE(gs.recent_avg, gs.avg_score)::NUMERIC,
        CASE 
            WHEN gs.old_avg IS NULL THEN '📈 New Game'
            WHEN gs.recent_avg > gs.old_avg * 1.1 THEN '🚀 Improving!'
            WHEN gs.recent_avg > gs.old_avg THEN '📈 Getting Better'
            WHEN gs.recent_avg >= gs.old_avg * 0.95 THEN '➡️ Steady'
            ELSE '📉 Practice More'
        END as skill_trend,
        gs.last_play::TIMESTAMPTZ
    FROM game_stats gs
    ORDER BY gs.plays DESC, gs.best DESC;
END;
$$;

-- Step 3: Create function to get skill progression over time
CREATE OR REPLACE FUNCTION public.get_user_skill_progression(
    p_user_id UUID,
    p_game_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    date DATE,
    average_score NUMERIC,
    games_played BIGINT,
    best_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(gh.created_at) as date,
        AVG(gh.score)::NUMERIC as average_score,
        COUNT(*)::BIGINT as games_played,
        MAX(gh.score)::NUMERIC as best_score
    FROM public.game_history gh
    WHERE gh.user_id = p_user_id
      AND (p_game_type IS NULL OR gh.game_type = p_game_type)
    GROUP BY DATE(gh.created_at)
    ORDER BY DATE(gh.created_at) DESC
    LIMIT 30; -- Last 30 days
END;
$$;

-- Step 4: Create function to get leaderboard position
CREATE OR REPLACE FUNCTION public.get_user_leaderboard_position(
    p_user_id UUID,
    p_game_type TEXT
)
RETURNS TABLE (
    user_rank INTEGER,
    total_players INTEGER,
    percentile NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ranked_users AS (
        SELECT 
            user_id,
            ROW_NUMBER() OVER (ORDER BY MAX(score) DESC) as rank,
            COUNT(*) OVER () as total
        FROM public.game_history
        WHERE game_type = p_game_type
        GROUP BY user_id
    )
    SELECT 
        rank::INTEGER,
        total::INTEGER,
        ((total - rank + 1)::NUMERIC / total::NUMERIC * 100)::NUMERIC as percentile
    FROM ranked_users
    WHERE user_id = p_user_id;
END;
$$;

-- Step 5: Create function to get achievements/milestones
CREATE OR REPLACE FUNCTION public.get_user_achievements(p_user_id UUID)
RETURNS TABLE (
    achievement_name TEXT,
    achievement_description TEXT,
    achieved_at TIMESTAMPTZ,
    is_unlocked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_games INTEGER;
    v_best_score NUMERIC;
    v_games_won INTEGER;
BEGIN
    -- Get user stats
    SELECT COUNT(*), MAX(score), COUNT(*) FILTER (WHERE result = 'won')
    INTO v_total_games, v_best_score, v_games_won
    FROM public.game_history
    WHERE user_id = p_user_id;
    
    RETURN QUERY
    SELECT * FROM (
        VALUES
        ('First Steps', 'Play your first game', 
            (SELECT MIN(created_at) FROM game_history WHERE user_id = p_user_id),
            v_total_games >= 1),
        ('Getting Started', 'Play 10 games', 
            (SELECT created_at FROM game_history WHERE user_id = p_user_id ORDER BY created_at OFFSET 9 LIMIT 1),
            v_total_games >= 10),
        ('Dedicated Player', 'Play 50 games',
            (SELECT created_at FROM game_history WHERE user_id = p_user_id ORDER BY created_at OFFSET 49 LIMIT 1),
            v_total_games >= 50),
        ('Century Club', 'Play 100 games',
            (SELECT created_at FROM game_history WHERE user_id = p_user_id ORDER BY created_at OFFSET 99 LIMIT 1),
            v_total_games >= 100),
        ('First Victory', 'Win your first competition',
            (SELECT MIN(created_at) FROM game_history WHERE user_id = p_user_id AND result = 'won'),
            v_games_won >= 1),
        ('Winning Streak', 'Win 5 competitions',
            (SELECT created_at FROM game_history WHERE user_id = p_user_id AND result = 'won' ORDER BY created_at OFFSET 4 LIMIT 1),
            v_games_won >= 5),
        ('Champion', 'Win 25 competitions',
            (SELECT created_at FROM game_history WHERE user_id = p_user_id AND result = 'won' ORDER BY created_at OFFSET 24 LIMIT 1),
            v_games_won >= 25)
    ) AS achievements(achievement_name, achievement_description, achieved_at, is_unlocked)
    ORDER BY is_unlocked DESC, achieved_at DESC NULLS LAST;
END;
$$;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_comprehensive_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_per_game_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_skill_progression TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_leaderboard_position TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_achievements TO authenticated;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_history_user_created ON public.game_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_user_game ON public.game_history(user_id, game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_game_score ON public.game_history(game_type, score DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_result ON public.game_history(user_id, result);

-- Step 8: Test the functions (example for a random user)
DO $$
DECLARE
    v_test_user_id UUID;
BEGIN
    -- Get first user from game_history for testing
    SELECT DISTINCT user_id INTO v_test_user_id
    FROM public.game_history
    LIMIT 1;
    
    IF v_test_user_id IS NOT NULL THEN
        RAISE NOTICE '📊 Testing analytics for user: %', v_test_user_id;
        
        -- Test comprehensive stats
        PERFORM * FROM public.get_user_comprehensive_stats(v_test_user_id);
        RAISE NOTICE '✅ Comprehensive stats function works';
        
        -- Test per-game analytics
        PERFORM * FROM public.get_user_per_game_analytics(v_test_user_id);
        RAISE NOTICE '✅ Per-game analytics function works';
        
        -- Test skill progression
        PERFORM * FROM public.get_user_skill_progression(v_test_user_id, NULL);
        RAISE NOTICE '✅ Skill progression function works';
        
        -- Test achievements
        PERFORM * FROM public.get_user_achievements(v_test_user_id);
        RAISE NOTICE '✅ Achievements function works';
    ELSE
        RAISE NOTICE '⚠️ No users in game_history yet - functions created but not tested';
    END IF;
END $$;

-- Success message
SELECT '✅ Analytics system created! Dashboard will show:
- Real-time stats (Total/Practice/Competition games)
- Per-game averages and skill trends
- Skill progression charts
- Win rates and token earnings
- Achievements and milestones
- Leaderboard positions' as status;

-- Display sample output
SELECT '📊 Sample Analytics Output:' as info;
SELECT * FROM public.get_user_comprehensive_stats(
    (SELECT DISTINCT user_id FROM public.game_history LIMIT 1)
) LIMIT 1;

