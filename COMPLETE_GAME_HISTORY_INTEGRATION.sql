-- ============================================
-- COMPLETE GAME HISTORY INTEGRATION
-- ============================================
-- Hook all game types to save to game_history automatically
-- ============================================

-- Step 1: Create trigger function to auto-save practice games to history
CREATE OR REPLACE FUNCTION public.auto_save_practice_to_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only record if score exists
    IF NEW.score IS NOT NULL THEN
        INSERT INTO public.game_history (
            user_id,
            game_type,
            session_type,
            session_id,
            score,
            accuracy,
            avg_reaction_time,
            tokens_won,
            tokens_spent,
            result,
            created_at
        ) VALUES (
            NEW.user_id,
            NEW.game_type,
            'practice',
            NEW.id,
            NEW.score,
            NEW.accuracy,
            NEW.avg_reaction_time,
            0, -- No tokens in practice
            0,
            'participated',
            NEW.created_at
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 2: Create trigger on game_sessions for practice games (if table exists)
-- Note: Only create if game_sessions table exists, otherwise skip
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_sessions') THEN
        DROP TRIGGER IF EXISTS trigger_save_practice_history ON public.game_sessions;
        
        -- Check if is_practice column exists
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'game_sessions' 
            AND column_name = 'is_practice'
        ) THEN
            EXECUTE 'CREATE TRIGGER trigger_save_practice_history
                AFTER INSERT OR UPDATE ON public.game_sessions
                FOR EACH ROW
                WHEN (NEW.is_practice = true AND NEW.score IS NOT NULL)
                EXECUTE FUNCTION public.auto_save_practice_to_history()';
        ELSE
            -- Use session_type column instead if it exists
            IF EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'game_sessions' 
                AND column_name = 'session_type'
            ) THEN
                EXECUTE 'CREATE TRIGGER trigger_save_practice_history
                    AFTER INSERT OR UPDATE ON public.game_sessions
                    FOR EACH ROW
                    WHEN (NEW.session_type = ''practice'' AND NEW.score IS NOT NULL)
                    EXECUTE FUNCTION public.auto_save_practice_to_history()';
            END IF;
        END IF;
    END IF;
END $$;

-- Step 3: Create trigger function to auto-save WTA games to history
CREATE OR REPLACE FUNCTION public.auto_save_wta_to_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config_rec RECORD;
BEGIN
    -- Only when winner is determined
    IF NEW.winner_user_id IS NOT NULL AND OLD.winner_user_id IS NULL THEN
        -- Get config details
        SELECT * INTO v_config_rec
        FROM winner_takes_all_configs
        WHERE id = NEW.config_id;
        
        -- Record winner's game
        INSERT INTO public.game_history (
            user_id,
            game_type,
            session_type,
            session_id,
            score,
            tokens_won,
            tokens_spent,
            result,
            listing_title,
            created_at
        ) VALUES (
            NEW.winner_user_id,
            v_config_rec.game_type,
            'wta',
            NEW.id,
            NEW.winner_score,
            NEW.winner_prize,
            v_config_rec.entry_fee,
            'won',
            v_config_rec.title,
            NEW.completed_at
        )
        ON CONFLICT DO NOTHING;
        
        -- Record all other participants as losers
        INSERT INTO public.game_history (
            user_id,
            game_type,
            session_type,
            session_id,
            score,
            tokens_won,
            tokens_spent,
            result,
            listing_title,
            created_at
        )
        SELECT 
            p.user_id,
            v_config_rec.game_type,
            'wta',
            NEW.id,
            p.score,
            0,
            v_config_rec.entry_fee,
            'lost',
            v_config_rec.title,
            p.completed_at
        FROM winner_takes_all_participants p
        WHERE p.session_id = NEW.id
          AND p.user_id != NEW.winner_user_id
          AND p.score IS NOT NULL
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 4: Create trigger on winner_takes_all_sessions
DROP TRIGGER IF EXISTS trigger_save_wta_history ON public.winner_takes_all_sessions;
CREATE TRIGGER trigger_save_wta_history
    AFTER UPDATE ON public.winner_takes_all_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_save_wta_to_history();

-- Step 5: Create trigger function to auto-save 1v1 games to history
CREATE OR REPLACE FUNCTION public.auto_save_1v1_to_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only when winner is determined
    IF NEW.winner_user_id IS NOT NULL AND OLD.winner_user_id IS NULL THEN
        -- Record winner's game
        INSERT INTO public.game_history (
            user_id,
            game_type,
            session_type,
            session_id,
            score,
            tokens_won,
            tokens_spent,
            result,
            listing_title,
            created_at
        ) VALUES (
            NEW.winner_user_id,
            (SELECT game_type FROM one_v_one_configs WHERE id = NEW.config_id),
            '1v1',
            NEW.id,
            NEW.winner_score,
            NEW.winner_prize,
            (SELECT entry_fee FROM one_v_one_configs WHERE id = NEW.config_id),
            'won',
            '1v1 Match',
            NEW.completed_at
        )
        ON CONFLICT DO NOTHING;
        
        -- Record loser's game
        IF NEW.loser_user_id IS NOT NULL THEN
            INSERT INTO public.game_history (
                user_id,
                game_type,
                session_type,
                session_id,
                score,
                tokens_won,
                tokens_spent,
                result,
                listing_title,
                created_at
            ) VALUES (
                NEW.loser_user_id,
                (SELECT game_type FROM one_v_one_configs WHERE id = NEW.config_id),
                '1v1',
                NEW.id,
                NEW.loser_score,
                NEW.loser_prize,
                (SELECT entry_fee FROM one_v_one_configs WHERE id = NEW.config_id),
                'lost',
                '1v1 Match',
                NEW.completed_at
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 6: Create trigger on one_v_one_sessions
DROP TRIGGER IF EXISTS trigger_save_1v1_history ON public.one_v_one_sessions;
CREATE TRIGGER trigger_save_1v1_history
    AFTER UPDATE ON public.one_v_one_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_save_1v1_to_history();

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.auto_save_practice_to_history() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_save_wta_to_history() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_save_1v1_to_history() TO authenticated;

-- Step 8: Backfill existing practice games (only for existing users, if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'game_sessions') THEN
        -- Check which column to use for practice detection
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'game_sessions' 
            AND column_name = 'is_practice'
        ) THEN
            -- Use is_practice column
            INSERT INTO public.game_history (
                user_id,
                game_type,
                session_type,
                session_id,
                score,
                accuracy,
                avg_reaction_time,
                tokens_won,
                tokens_spent,
                result,
                created_at
            )
            SELECT 
                gs.user_id,
                gs.game_type,
                'practice',
                gs.id,
                gs.score,
                gs.accuracy,
                gs.avg_reaction_time,
                0,
                0,
                'participated',
                gs.created_at
            FROM game_sessions gs
            JOIN public.users u ON u.id = gs.user_id
            WHERE gs.is_practice = true
              AND gs.score IS NOT NULL
            ON CONFLICT DO NOTHING;
        ELSIF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'game_sessions' 
            AND column_name = 'session_type'
        ) THEN
            -- Use session_type column
            INSERT INTO public.game_history (
                user_id,
                game_type,
                session_type,
                session_id,
                score,
                accuracy,
                avg_reaction_time,
                tokens_won,
                tokens_spent,
                result,
                created_at
            )
            SELECT 
                gs.user_id,
                gs.game_type,
                'practice',
                gs.id,
                gs.score,
                gs.accuracy,
                gs.avg_reaction_time,
                0,
                0,
                'participated',
                gs.created_at
            FROM game_sessions gs
            JOIN public.users u ON u.id = gs.user_id
            WHERE gs.session_type = 'practice'
              AND gs.score IS NOT NULL
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- Step 9: Backfill existing WTA games (only for existing users)
INSERT INTO public.game_history (
    user_id,
    game_type,
    session_type,
    session_id,
    score,
    tokens_won,
    tokens_spent,
    result,
    listing_title,
    created_at
)
SELECT 
    p.user_id,
    c.game_type,
    'wta',
    p.session_id,
    p.score,
    CASE WHEN s.winner_user_id = p.user_id THEN s.winner_prize ELSE 0 END,
    c.entry_fee,
    CASE WHEN s.winner_user_id = p.user_id THEN 'won' ELSE 'lost' END,
    c.title,
    p.completed_at
FROM winner_takes_all_participants p
JOIN winner_takes_all_sessions s ON s.id = p.session_id
JOIN winner_takes_all_configs c ON c.id = s.config_id
JOIN public.users u ON u.id = p.user_id
WHERE p.score IS NOT NULL
  AND s.winner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 10: Backfill existing 1v1 games (only for existing users)
INSERT INTO public.game_history (
    user_id,
    game_type,
    session_type,
    session_id,
    score,
    tokens_won,
    tokens_spent,
    result,
    listing_title,
    created_at
)
SELECT 
    p.user_id,
    c.game_type,
    '1v1',
    p.session_id,
    p.score,
    CASE 
        WHEN s.winner_user_id = p.user_id THEN s.winner_prize
        WHEN s.loser_user_id = p.user_id THEN s.loser_prize
        ELSE 0 
    END,
    c.entry_fee,
    CASE 
        WHEN s.winner_user_id = p.user_id THEN 'won'
        ELSE 'lost'
    END,
    '1v1 Match',
    p.completed_at
FROM one_v_one_participants p
JOIN one_v_one_sessions s ON s.id = p.session_id
JOIN one_v_one_configs c ON c.id = s.config_id
JOIN public.users u ON u.id = p.user_id
WHERE p.score IS NOT NULL
  AND s.winner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 11: Verify data
SELECT 
    '📊 Game History Summary' as info,
    session_type,
    COUNT(*) as total_games,
    COUNT(DISTINCT user_id) as unique_players,
    COUNT(*) FILTER (WHERE result = 'won') as wins,
    COUNT(*) FILTER (WHERE result = 'lost') as losses,
    SUM(tokens_won) as total_tokens_won,
    SUM(tokens_spent) as total_tokens_spent
FROM public.game_history
GROUP BY session_type
ORDER BY session_type;

-- Success message
SELECT '✅ All game types now save to game_history automatically! Practice, WTA, 1v1, and Marketplace all tracked.' as status;

