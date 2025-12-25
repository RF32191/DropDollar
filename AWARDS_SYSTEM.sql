-- =====================================================
-- AWARDS/ACHIEVEMENTS SYSTEM
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- AWARDS DEFINITIONS TABLE
-- Stores all possible awards/achievements
-- =====================================================
CREATE TABLE IF NOT EXISTS public.award_definitions (
    id TEXT PRIMARY KEY,
    game_type TEXT, -- NULL means applies to all games
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL, -- emoji or icon name
    category TEXT NOT NULL CHECK (category IN ('score', 'streak', 'milestone', 'special', 'mastery')),
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('score', 'kills', 'perfect_parry', 'perfect_draw', 'games_played', 'accuracy', 'combo', 'speed', 'survival', 'collection')),
    requirement_value NUMERIC NOT NULL,
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    rp_reward INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USER AWARDS TABLE
-- Tracks which awards users have earned
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    award_id TEXT NOT NULL REFERENCES public.award_definitions(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    game_session_id UUID, -- Optional reference to the game where it was earned
    score_achieved NUMERIC,
    is_new BOOLEAN DEFAULT TRUE, -- For "new" badge display
    UNIQUE(user_id, award_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_awards_user ON public.user_awards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_awards_earned ON public.user_awards(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_awards_new ON public.user_awards(user_id, is_new) WHERE is_new = TRUE;

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.award_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_awards ENABLE ROW LEVEL SECURITY;

-- Everyone can view award definitions
CREATE POLICY "Anyone can view award definitions" ON public.award_definitions
    FOR SELECT USING (true);

-- Users can view their own awards
CREATE POLICY "Users can view their awards" ON public.user_awards
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert awards (via function)
CREATE POLICY "Service can insert awards" ON public.user_awards
    FOR INSERT WITH CHECK (true);

-- Users can mark awards as seen
CREATE POLICY "Users can update their awards" ON public.user_awards
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- INSERT ALL AWARD DEFINITIONS
-- =====================================================

-- Clear existing definitions first
DELETE FROM public.award_definitions;

-- ===========================================
-- QUICK CLICK AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('qc_first_click', 'quick-click', 'First Click', 'Complete your first Quick Click game', '👆', 'milestone', 'games_played', 1, 'common', 10),
('qc_lightning_reflexes', 'quick-click', 'Lightning Reflexes', 'Score 5,000+ points in Quick Click', '⚡', 'score', 'score', 5000, 'common', 25),
('qc_speed_demon', 'quick-click', 'Speed Demon', 'Score 10,000+ points in Quick Click', '💨', 'score', 'score', 10000, 'uncommon', 50),
('qc_reaction_master', 'quick-click', 'Reaction Master', 'Score 20,000+ points in Quick Click', '🎯', 'score', 'score', 20000, 'rare', 100),
('qc_flash', 'quick-click', 'The Flash', 'Score 35,000+ points in Quick Click', '⚡', 'score', 'score', 35000, 'epic', 200),
('qc_god_tier', 'quick-click', 'Click God', 'Score 50,000+ points in Quick Click', '👑', 'score', 'score', 50000, 'legendary', 500);

-- ===========================================
-- LASER DODGE AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('ld_first_dodge', 'laser-dodge', 'First Dodge', 'Complete your first Laser Dodge game', '🔴', 'milestone', 'games_played', 1, 'common', 10),
('ld_survivor', 'laser-dodge', 'Survivor', 'Score 5,000+ points in Laser Dodge', '🛡️', 'score', 'score', 5000, 'common', 25),
('ld_nimble', 'laser-dodge', 'Nimble Navigator', 'Score 15,000+ points in Laser Dodge', '🏃', 'score', 'score', 15000, 'uncommon', 50),
('ld_untouchable', 'laser-dodge', 'Untouchable', 'Score 30,000+ points in Laser Dodge', '👻', 'score', 'score', 30000, 'rare', 100),
('ld_phantom', 'laser-dodge', 'Phantom', 'Score 50,000+ points in Laser Dodge', '💀', 'score', 'score', 50000, 'epic', 200),
('ld_immortal', 'laser-dodge', 'Immortal', 'Score 75,000+ points in Laser Dodge', '⭐', 'score', 'score', 75000, 'legendary', 500);

-- ===========================================
-- DEAD SHOT AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('ds_first_shot', 'dead-shot', 'First Blood', 'Complete your first Dead Shot game', '🎯', 'milestone', 'games_played', 1, 'common', 10),
('ds_sharpshooter', 'dead-shot', 'Sharpshooter', 'Score 5,000+ points in Dead Shot', '🔫', 'score', 'score', 5000, 'common', 25),
('ds_sniper', 'dead-shot', 'Sniper', 'Score 15,000+ points in Dead Shot', '🎯', 'score', 'score', 15000, 'uncommon', 50),
('ds_headhunter', 'dead-shot', 'Headhunter', 'Score 30,000+ points in Dead Shot', '💀', 'score', 'score', 30000, 'rare', 100),
('ds_terminator', 'dead-shot', 'Terminator', 'Score 50,000+ points in Dead Shot', '🤖', 'score', 'score', 50000, 'epic', 200),
('ds_godslayer', 'dead-shot', 'God Slayer', 'Score 75,000+ points in Dead Shot', '⚔️', 'score', 'score', 75000, 'legendary', 500),
('ds_kill_streak_5', 'dead-shot', 'Killing Spree', 'Get 5 kills in one game', '🔥', 'streak', 'kills', 5, 'common', 30),
('ds_kill_streak_10', 'dead-shot', 'Rampage', 'Get 10 kills in one game', '💥', 'streak', 'kills', 10, 'uncommon', 75),
('ds_kill_streak_20', 'dead-shot', 'Unstoppable', 'Get 20 kills in one game', '☠️', 'streak', 'kills', 20, 'rare', 150),
('ds_kill_streak_50', 'dead-shot', 'Legendary Slayer', 'Get 50 kills in one game', '👑', 'streak', 'kills', 50, 'legendary', 400);

-- ===========================================
-- BLADE BOUNCE (MOUSE BLADE) AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('bb_first_slash', 'blade-bounce', 'First Slash', 'Complete your first Blade Bounce game', '⚔️', 'milestone', 'games_played', 1, 'common', 10),
('bb_swordsman', 'blade-bounce', 'Swordsman', 'Score 5,000+ points in Blade Bounce', '🗡️', 'score', 'score', 5000, 'common', 25),
('bb_knight', 'blade-bounce', 'Knight', 'Score 15,000+ points in Blade Bounce', '🛡️', 'score', 'score', 15000, 'uncommon', 50),
('bb_blademaster', 'blade-bounce', 'Blademaster', 'Score 30,000+ points in Blade Bounce', '⚔️', 'score', 'score', 30000, 'rare', 100),
('bb_samurai', 'blade-bounce', 'Samurai', 'Score 50,000+ points in Blade Bounce', '🎌', 'score', 'score', 50000, 'epic', 200),
('bb_legend', 'blade-bounce', 'Blade Legend', 'Score 75,000+ points in Blade Bounce', '👑', 'score', 'score', 75000, 'legendary', 500);

-- ===========================================
-- PARRY PRO AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('pp_first_parry', 'parry-pro', 'First Parry', 'Complete your first Parry Pro game', '🛡️', 'milestone', 'games_played', 1, 'common', 10),
('pp_defender', 'parry-pro', 'Defender', 'Score 5,000+ points in Parry Pro', '🛡️', 'score', 'score', 5000, 'common', 25),
('pp_guardian', 'parry-pro', 'Guardian', 'Score 15,000+ points in Parry Pro', '⚔️', 'score', 'score', 15000, 'uncommon', 50),
('pp_perfect_3', 'parry-pro', 'Triple Perfect', '3 perfect parries in a row', '✨', 'streak', 'perfect_parry', 3, 'uncommon', 75),
('pp_perfect_5', 'parry-pro', 'Perfect Streak', '5 perfect parries in a row', '🌟', 'streak', 'perfect_parry', 5, 'rare', 150),
('pp_perfect_10', 'parry-pro', 'Parry Master', '10 perfect parries in a row', '👑', 'streak', 'perfect_parry', 10, 'epic', 300),
('pp_flawless', 'parry-pro', 'Flawless', 'Score 50,000+ points in Parry Pro', '💎', 'score', 'score', 50000, 'epic', 200),
('pp_god', 'parry-pro', 'Parry God', 'Score 75,000+ points in Parry Pro', '⚡', 'score', 'score', 75000, 'legendary', 500);

-- ===========================================
-- CLICK DRAW AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('cd_first_draw', 'click-draw', 'First Draw', 'Complete your first Click Draw game', '🤠', 'milestone', 'games_played', 1, 'common', 10),
('cd_outlaw', 'click-draw', 'Outlaw', 'Score 5,000+ points in Click Draw', '🔫', 'score', 'score', 5000, 'common', 25),
('cd_gunslinger', 'click-draw', 'Gunslinger', 'Score 15,000+ points in Click Draw', '🎯', 'score', 'score', 15000, 'uncommon', 50),
('cd_perfect_3', 'click-draw', 'Quick Draw', '3 perfect draws in a row', '⚡', 'streak', 'perfect_draw', 3, 'uncommon', 75),
('cd_perfect_5', 'click-draw', 'Lightning Draw', '5 perfect draws in a row', '⚡', 'streak', 'perfect_draw', 5, 'rare', 150),
('cd_perfect_10', 'click-draw', 'The Fastest', '10 perfect draws in a row', '👑', 'streak', 'perfect_draw', 10, 'epic', 300),
('cd_legend', 'click-draw', 'Western Legend', 'Score 50,000+ points in Click Draw', '🏆', 'score', 'score', 50000, 'epic', 200),
('cd_sheriff', 'click-draw', 'The Sheriff', 'Score 75,000+ points in Click Draw', '⭐', 'score', 'score', 75000, 'legendary', 500);

-- ===========================================
-- CASH STACK AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('cs_first_stack', 'cash-stack', 'First Stack', 'Complete your first Cash Stack game', '💵', 'milestone', 'games_played', 1, 'common', 10),
('cs_stacker', 'cash-stack', 'Money Stacker', 'Score 5,000+ points in Cash Stack', '💵', 'score', 'score', 5000, 'common', 25),
('cs_banker', 'cash-stack', 'Banker', 'Score 15,000+ points in Cash Stack', '💰', 'score', 'score', 15000, 'uncommon', 50),
('cs_millionaire', 'cash-stack', 'Millionaire', 'Score 30,000+ points in Cash Stack', '🏦', 'score', 'score', 30000, 'rare', 100),
('cs_tycoon', 'cash-stack', 'Tycoon', 'Score 50,000+ points in Cash Stack', '💎', 'score', 'score', 50000, 'epic', 200),
('cs_mogul', 'cash-stack', 'Cash Mogul', 'Score 75,000+ points in Cash Stack', '👑', 'score', 'score', 75000, 'legendary', 500);

-- ===========================================
-- PENNY PASSER AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('pps_first_coin', 'penny-passer', 'First Coin', 'Complete your first Penny Passer game', '🪙', 'milestone', 'games_played', 1, 'common', 10),
('pps_collector', 'penny-passer', 'Coin Collector', 'Score 5,000+ points in Penny Passer', '🪙', 'score', 'score', 5000, 'common', 25),
('pps_sorter', 'penny-passer', 'Master Sorter', 'Score 15,000+ points in Penny Passer', '🏆', 'score', 'score', 15000, 'uncommon', 50),
('pps_expert', 'penny-passer', 'Coin Expert', 'Score 30,000+ points in Penny Passer', '💰', 'score', 'score', 30000, 'rare', 100),
('pps_master', 'penny-passer', 'Penny Master', 'Score 50,000+ points in Penny Passer', '👑', 'score', 'score', 50000, 'epic', 200);

-- ===========================================
-- FLIPPY COIN AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('fc_first_flip', 'flippy-coin', 'First Flip', 'Complete your first Flippy Coin game', '🪙', 'milestone', 'games_played', 1, 'common', 10),
('fc_flipper', 'flippy-coin', 'Coin Flipper', 'Score 1,000+ points in Flippy Coin', '🪙', 'score', 'score', 1000, 'common', 25),
('fc_acrobat', 'flippy-coin', 'Acrobat', 'Score 3,000+ points in Flippy Coin', '🎪', 'score', 'score', 3000, 'uncommon', 50),
('fc_master', 'flippy-coin', 'Flip Master', 'Score 5,000+ points in Flippy Coin', '⭐', 'score', 'score', 5000, 'rare', 100),
('fc_legend', 'flippy-coin', 'Flippy Legend', 'Score 10,000+ points in Flippy Coin', '👑', 'score', 'score', 10000, 'legendary', 300);

-- ===========================================
-- CIRCUIT RUNNER (LIGHTNING MAZE) AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('cr_first_run', 'circuit-runner', 'First Circuit', 'Complete your first Circuit Runner game', '⚡', 'milestone', 'games_played', 1, 'common', 10),
('cr_runner', 'circuit-runner', 'Circuit Runner', 'Score 5,000+ points in Circuit Runner', '⚡', 'score', 'score', 5000, 'common', 25),
('cr_speedster', 'circuit-runner', 'Speedster', 'Score 15,000+ points in Circuit Runner', '💨', 'score', 'score', 15000, 'uncommon', 50),
('cr_lightning', 'circuit-runner', 'Lightning Bolt', 'Score 30,000+ points in Circuit Runner', '⚡', 'score', 'score', 30000, 'rare', 100),
('cr_electric', 'circuit-runner', 'Electric', 'Score 50,000+ points in Circuit Runner', '🔌', 'score', 'score', 50000, 'epic', 200);

-- ===========================================
-- NEON STRIKER AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('ns_first_strike', 'neon-striker', 'First Strike', 'Complete your first Neon Striker game', '💫', 'milestone', 'games_played', 1, 'common', 10),
('ns_striker', 'neon-striker', 'Striker', 'Score 2,000+ points in Neon Striker', '🎱', 'score', 'score', 2000, 'common', 25),
('ns_pro', 'neon-striker', 'Pro Striker', 'Score 5,000+ points in Neon Striker', '⭐', 'score', 'score', 5000, 'uncommon', 50),
('ns_champion', 'neon-striker', 'Champion', 'Score 10,000+ points in Neon Striker', '🏆', 'score', 'score', 10000, 'rare', 100),
('ns_legend', 'neon-striker', 'Neon Legend', 'Score 20,000+ points in Neon Striker', '👑', 'score', 'score', 20000, 'legendary', 300);

-- ===========================================
-- WORMHOLE AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('wh_first_portal', 'wormhole', 'First Portal', 'Complete your first Wormhole game', '🌀', 'milestone', 'games_played', 1, 'common', 10),
('wh_explorer', 'wormhole', 'Portal Explorer', 'Score 5,000+ points in Wormhole', '🌀', 'score', 'score', 5000, 'common', 25),
('wh_traveler', 'wormhole', 'Dimension Traveler', 'Score 15,000+ points in Wormhole', '🌌', 'score', 'score', 15000, 'uncommon', 50),
('wh_slayer', 'wormhole', 'Demon Slayer', 'Score 30,000+ points in Wormhole', '⚔️', 'score', 'score', 30000, 'rare', 100),
('wh_master', 'wormhole', 'Wormhole Master', 'Score 50,000+ points in Wormhole', '👑', 'score', 'score', 50000, 'epic', 200),
('wh_titan', 'wormhole', 'Titan Slayer', 'Defeat the Golden Titan boss', '🏆', 'special', 'kills', 1, 'legendary', 500);

-- ===========================================
-- FALLING OBJECTS AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('fo_first_catch', 'falling-objects', 'First Catch', 'Complete your first Falling Objects game', '🍎', 'milestone', 'games_played', 1, 'common', 10),
('fo_catcher', 'falling-objects', 'Catcher', 'Score 5,000+ points in Falling Objects', '🧺', 'score', 'score', 5000, 'common', 25),
('fo_collector', 'falling-objects', 'Collector', 'Score 15,000+ points in Falling Objects', '🎁', 'score', 'score', 15000, 'uncommon', 50),
('fo_master', 'falling-objects', 'Catch Master', 'Score 30,000+ points in Falling Objects', '⭐', 'score', 'score', 30000, 'rare', 100);

-- ===========================================
-- COLOR SEQUENCE AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('csq_first_seq', 'color-sequence', 'First Sequence', 'Complete your first Color Sequence game', '🎨', 'milestone', 'games_played', 1, 'common', 10),
('csq_colorful', 'color-sequence', 'Colorful', 'Score 5,000+ points in Color Sequence', '🎨', 'score', 'score', 5000, 'common', 25),
('csq_artist', 'color-sequence', 'Color Artist', 'Score 15,000+ points in Color Sequence', '🖌️', 'score', 'score', 15000, 'uncommon', 50),
('csq_rainbow', 'color-sequence', 'Rainbow Master', 'Score 30,000+ points in Color Sequence', '🌈', 'score', 'score', 30000, 'rare', 100);

-- ===========================================
-- GLOBAL/MASTERY AWARDS
-- ===========================================
INSERT INTO public.award_definitions (id, game_type, name, description, icon, category, requirement_type, requirement_value, rarity, rp_reward) VALUES
('g_first_game', NULL, 'Welcome!', 'Complete your first game on Drop Dollar', '🎮', 'milestone', 'games_played', 1, 'common', 25),
('g_10_games', NULL, 'Getting Started', 'Play 10 games total', '🎯', 'milestone', 'games_played', 10, 'common', 50),
('g_50_games', NULL, 'Regular Player', 'Play 50 games total', '⭐', 'milestone', 'games_played', 50, 'uncommon', 100),
('g_100_games', NULL, 'Dedicated Gamer', 'Play 100 games total', '🏅', 'milestone', 'games_played', 100, 'rare', 200),
('g_500_games', NULL, 'Elite Player', 'Play 500 games total', '💎', 'milestone', 'games_played', 500, 'epic', 500),
('g_1000_games', NULL, 'Legendary Gamer', 'Play 1,000 games total', '👑', 'milestone', 'games_played', 1000, 'legendary', 1000),
('g_all_games', NULL, 'Well Rounded', 'Play every game at least once', '🎮', 'mastery', 'games_played', 12, 'rare', 250),
('g_master_all', NULL, 'Jack of All Trades', 'Score 10,000+ in every game', '🏆', 'mastery', 'score', 10000, 'legendary', 1000);

-- =====================================================
-- FUNCTION: Check and award achievements
-- Call this after each game ends
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
    p_user_id UUID,
    p_game_type TEXT,
    p_score NUMERIC,
    p_kills INTEGER DEFAULT 0,
    p_perfect_parrys INTEGER DEFAULT 0,
    p_perfect_draws INTEGER DEFAULT 0,
    p_accuracy NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_award RECORD;
    v_awards_earned TEXT[] := '{}';
    v_total_games INTEGER;
    v_total_rp INTEGER := 0;
BEGIN
    -- Get total games played
    SELECT COUNT(*) INTO v_total_games
    FROM public.game_history
    WHERE user_id = p_user_id;
    
    -- Check each applicable award
    FOR v_award IN 
        SELECT * FROM public.award_definitions
        WHERE (game_type = p_game_type OR game_type IS NULL)
        AND id NOT IN (SELECT award_id FROM public.user_awards WHERE user_id = p_user_id)
    LOOP
        -- Check if requirement is met
        IF (
            (v_award.requirement_type = 'score' AND p_score >= v_award.requirement_value) OR
            (v_award.requirement_type = 'kills' AND p_kills >= v_award.requirement_value) OR
            (v_award.requirement_type = 'perfect_parry' AND p_perfect_parrys >= v_award.requirement_value) OR
            (v_award.requirement_type = 'perfect_draw' AND p_perfect_draws >= v_award.requirement_value) OR
            (v_award.requirement_type = 'games_played' AND v_total_games >= v_award.requirement_value) OR
            (v_award.requirement_type = 'accuracy' AND p_accuracy >= v_award.requirement_value)
        ) THEN
            -- Award the achievement
            INSERT INTO public.user_awards (user_id, award_id, score_achieved)
            VALUES (p_user_id, v_award.id, p_score)
            ON CONFLICT (user_id, award_id) DO NOTHING;
            
            IF FOUND THEN
                v_awards_earned := array_append(v_awards_earned, v_award.id);
                v_total_rp := v_total_rp + v_award.rp_reward;
                
                -- Award RP
                IF v_award.rp_reward > 0 THEN
                    UPDATE public.users
                    SET reward_points = COALESCE(reward_points, 0) + v_award.rp_reward
                    WHERE id = p_user_id;
                END IF;
            END IF;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'awards_earned', v_awards_earned,
        'total_rp_earned', v_total_rp,
        'total_awards', array_length(v_awards_earned, 1)
    );
END;
$$;

-- =====================================================
-- FUNCTION: Get user awards with details
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_awards(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    award_id TEXT,
    name TEXT,
    description TEXT,
    icon TEXT,
    category TEXT,
    rarity TEXT,
    game_type TEXT,
    earned_at TIMESTAMPTZ,
    score_achieved NUMERIC,
    is_new BOOLEAN,
    rp_reward INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.award_id,
        ad.name,
        ad.description,
        ad.icon,
        ad.category,
        ad.rarity,
        ad.game_type,
        ua.earned_at,
        ua.score_achieved,
        ua.is_new,
        ad.rp_reward
    FROM public.user_awards ua
    JOIN public.award_definitions ad ON ad.id = ua.award_id
    WHERE ua.user_id = COALESCE(p_user_id, auth.uid())
    ORDER BY ua.earned_at DESC;
END;
$$;

-- =====================================================
-- FUNCTION: Get recent awards
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_recent_awards(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    award_id TEXT,
    name TEXT,
    icon TEXT,
    rarity TEXT,
    earned_at TIMESTAMPTZ,
    is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ua.award_id,
        ad.name,
        ad.icon,
        ad.rarity,
        ua.earned_at,
        ua.is_new
    FROM public.user_awards ua
    JOIN public.award_definitions ad ON ad.id = ua.award_id
    WHERE ua.user_id = auth.uid()
    ORDER BY ua.earned_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- FUNCTION: Mark awards as seen
-- =====================================================
CREATE OR REPLACE FUNCTION public.mark_awards_seen()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_awards
    SET is_new = FALSE
    WHERE user_id = auth.uid() AND is_new = TRUE;
END;
$$;

-- =====================================================
-- FUNCTION: Get award statistics
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_award_stats()
RETURNS TABLE (
    total_earned INTEGER,
    total_available INTEGER,
    rp_from_awards INTEGER,
    rarity_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM public.user_awards WHERE user_id = auth.uid()),
        (SELECT COUNT(*)::INTEGER FROM public.award_definitions),
        (SELECT COALESCE(SUM(ad.rp_reward), 0)::INTEGER 
         FROM public.user_awards ua 
         JOIN public.award_definitions ad ON ad.id = ua.award_id 
         WHERE ua.user_id = auth.uid()),
        (SELECT jsonb_object_agg(rarity, cnt)
         FROM (
             SELECT ad.rarity, COUNT(*)::INTEGER as cnt
             FROM public.user_awards ua
             JOIN public.award_definitions ad ON ad.id = ua.award_id
             WHERE ua.user_id = auth.uid()
             GROUP BY ad.rarity
         ) sub);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_and_award_achievements(UUID, TEXT, NUMERIC, INTEGER, INTEGER, INTEGER, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_awards(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_awards(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_awards_seen() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_award_stats() TO authenticated;

-- Success
DO $$ BEGIN RAISE NOTICE '✅ Awards system created successfully!'; END $$;

