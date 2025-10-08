-- DropPoints System Schema
-- Comprehensive leveling system for user progression

-- User Points and Levels
CREATE TABLE user_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    current_level INTEGER DEFAULT 1,
    total_points INTEGER DEFAULT 0,
    points_to_next_level INTEGER DEFAULT 100,
    level_progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    highest_game_score INTEGER DEFAULT 0,
    games_played_today INTEGER DEFAULT 0,
    games_played_total INTEGER DEFAULT 0,
    consecutive_days_played INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    achievements JSONB DEFAULT '[]'::jsonb,
    level_rewards_claimed JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Daily Activity Tracking
CREATE TABLE daily_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE DEFAULT CURRENT_DATE,
    games_played INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    highest_score INTEGER DEFAULT 0,
    time_played_minutes INTEGER DEFAULT 0,
    tournaments_entered INTEGER DEFAULT 0,
    achievements_unlocked INTEGER DEFAULT 0,
    daily_bonus_claimed BOOLEAN DEFAULT FALSE,
    streak_bonus_earned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- Points Transaction History
CREATE TABLE points_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'game_score', 'daily_bonus', 'level_up', 'achievement', 'tournament_win'
    points_change INTEGER NOT NULL,
    points_before INTEGER NOT NULL,
    points_after INTEGER NOT NULL,
    source_reference VARCHAR(200), -- game_id, tournament_id, achievement_id, etc.
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Level Definitions and Requirements
CREATE TABLE level_definitions (
    level INTEGER PRIMARY KEY,
    level_name VARCHAR(100) NOT NULL,
    points_required INTEGER NOT NULL,
    level_color VARCHAR(20) DEFAULT '#gray',
    level_icon VARCHAR(50) DEFAULT '🎮',
    rewards JSONB DEFAULT '{}'::jsonb, -- tokens, badges, special access
    requirements JSONB DEFAULT '{}'::jsonb, -- games_played, min_score, etc.
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Achievements
CREATE TABLE user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    achievement_description TEXT,
    points_awarded INTEGER DEFAULT 0,
    rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary
    icon VARCHAR(50) DEFAULT '🏆',
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, achievement_id)
);

-- Achievement Definitions
CREATE TABLE achievement_definitions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- gaming, social, progression, special
    rarity VARCHAR(20) DEFAULT 'common',
    points_reward INTEGER DEFAULT 0,
    icon VARCHAR(50) DEFAULT '🏆',
    requirements JSONB NOT NULL, -- conditions to unlock
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboards
CREATE TABLE leaderboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    leaderboard_type VARCHAR(50) NOT NULL, -- 'global_points', 'weekly_points', 'game_scores', 'level_rankings'
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    score_value INTEGER NOT NULL,
    rank_position INTEGER,
    period_start DATE,
    period_end DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view and update their own data
CREATE POLICY "Users can view own level data" ON user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own level data" ON user_levels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own level data" ON user_levels FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own daily activity" ON daily_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily activity" ON daily_activity FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own daily activity" ON daily_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own points transactions" ON points_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own points transactions" ON points_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view level definitions" ON level_definitions FOR SELECT USING (true);

CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view achievement definitions" ON achievement_definitions FOR SELECT USING (true);

CREATE POLICY "Anyone can view leaderboards" ON leaderboards FOR SELECT USING (true);
CREATE POLICY "Users can insert own leaderboard entries" ON leaderboards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX idx_user_levels_level ON user_levels(current_level);
CREATE INDEX idx_user_levels_points ON user_levels(total_points DESC);

CREATE INDEX idx_daily_activity_user_date ON daily_activity(user_id, activity_date);
CREATE INDEX idx_daily_activity_date ON daily_activity(activity_date DESC);

CREATE INDEX idx_points_transactions_user ON points_transactions(user_id, created_at DESC);
CREATE INDEX idx_points_transactions_type ON points_transactions(transaction_type);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(unlocked_at DESC);

CREATE INDEX idx_leaderboards_type_rank ON leaderboards(leaderboard_type, rank_position);
CREATE INDEX idx_leaderboards_period ON leaderboards(period_start, period_end);

-- Insert default level definitions
INSERT INTO level_definitions (level, level_name, points_required, level_color, level_icon, rewards, requirements, description) VALUES
(1, 'Rookie', 0, '#gray', '🎮', '{"tokens": 0, "badge": "rookie"}', '{"games_played": 0}', 'Welcome to DropDollar! Start your journey here.'),
(2, 'Player', 100, '#green', '🎯', '{"tokens": 10, "badge": "player"}', '{"games_played": 5}', 'You''re getting the hang of it!'),
(3, 'Gamer', 250, '#blue', '🎲', '{"tokens": 25, "badge": "gamer"}', '{"games_played": 15, "min_score": 100}', 'A true gaming enthusiast!'),
(4, 'Skilled', 500, '#purple', '⚡', '{"tokens": 50, "badge": "skilled"}', '{"games_played": 30, "min_score": 250}', 'Your skills are impressive!'),
(5, 'Expert', 1000, '#orange', '🔥', '{"tokens": 100, "badge": "expert"}', '{"games_played": 50, "min_score": 500}', 'You''ve mastered the basics!'),
(6, 'Master', 2000, '#red', '💎', '{"tokens": 200, "badge": "master"}', '{"games_played": 100, "min_score": 1000}', 'A true master of the games!'),
(7, 'Champion', 4000, '#gold', '👑', '{"tokens": 400, "badge": "champion"}', '{"games_played": 200, "min_score": 2000}', 'You''re among the elite!'),
(8, 'Legend', 8000, '#platinum', '🏆', '{"tokens": 800, "badge": "legend"}', '{"games_played": 400, "min_score": 4000}', 'Legendary status achieved!'),
(9, 'Mythic', 16000, '#rainbow', '⭐', '{"tokens": 1600, "badge": "mythic"}', '{"games_played": 800, "min_score": 8000}', 'You''ve reached mythic status!'),
(10, 'God Tier', 32000, '#cosmic', '🌟', '{"tokens": 3200, "badge": "god_tier"}', '{"games_played": 1600, "min_score": 16000}', 'The ultimate DropDollar player!');

-- Insert achievement definitions
INSERT INTO achievement_definitions (id, name, description, category, rarity, points_reward, icon, requirements) VALUES
('first_game', 'First Steps', 'Play your first game', 'gaming', 'common', 10, '🎮', '{"games_played": 1}'),
('daily_player', 'Daily Grind', 'Play games for 7 consecutive days', 'progression', 'rare', 50, '📅', '{"consecutive_days": 7}'),
('score_hunter', 'Score Hunter', 'Achieve a score of 1000+ in any game', 'gaming', 'rare', 100, '🎯', '{"min_score": 1000}'),
('tournament_winner', 'Tournament Victor', 'Win your first tournament', 'gaming', 'epic', 200, '🏆', '{"tournaments_won": 1}'),
('level_5', 'Rising Star', 'Reach level 5', 'progression', 'rare', 75, '⭐', '{"level": 5}'),
('level_10', 'God Tier', 'Reach the maximum level', 'progression', 'legendary', 500, '🌟', '{"level": 10}'),
('perfect_score', 'Perfectionist', 'Achieve a perfect score in Color Sequence', 'gaming', 'epic', 150, '💯', '{"perfect_game": true}'),
('speed_demon', 'Speed Demon', 'Complete Multi-Target in under 10 seconds', 'gaming', 'epic', 125, '⚡', '{"completion_time": 10}'),
('coin_collector', 'Coin Collector', 'Catch 100 coins in Falling Object', 'gaming', 'rare', 80, '🪙', '{"coins_caught": 100}'),
('social_butterfly', 'Social Butterfly', 'Play 10 multiplayer games', 'social', 'rare', 60, '🦋', '{"multiplayer_games": 10}');

-- Function to calculate points for game completion
CREATE OR REPLACE FUNCTION calculate_game_points(
    game_score INTEGER,
    game_type VARCHAR(50),
    completion_time INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    base_points INTEGER := 0;
    time_bonus INTEGER := 0;
    score_multiplier DECIMAL := 1.0;
BEGIN
    -- Base points based on game type
    CASE game_type
        WHEN 'color-sequence' THEN base_points := 10;
        WHEN 'multi-target' THEN base_points := 15;
        WHEN 'falling-object' THEN base_points := 12;
        ELSE base_points := 10;
    END CASE;
    
    -- Score multiplier (higher scores = more points)
    IF game_score >= 5000 THEN score_multiplier := 3.0;
    ELSIF game_score >= 2000 THEN score_multiplier := 2.5;
    ELSIF game_score >= 1000 THEN score_multiplier := 2.0;
    ELSIF game_score >= 500 THEN score_multiplier := 1.5;
    END IF;
    
    -- Time bonus for quick completion (Multi-Target only)
    IF game_type = 'multi-target' AND completion_time IS NOT NULL THEN
        IF completion_time <= 10 THEN time_bonus := 20;
        ELSIF completion_time <= 20 THEN time_bonus := 10;
        ELSIF completion_time <= 30 THEN time_bonus := 5;
        END IF;
    END IF;
    
    RETURN FLOOR(base_points * score_multiplier) + time_bonus;
END;
$$ LANGUAGE plpgsql;

-- Function to update user level based on points
CREATE OR REPLACE FUNCTION update_user_level(user_uuid UUID) RETURNS VOID AS $$
DECLARE
    current_points INTEGER;
    new_level INTEGER;
    next_level_points INTEGER;
    progress_percentage DECIMAL;
BEGIN
    -- Get current points
    SELECT total_points INTO current_points FROM user_levels WHERE user_id = user_uuid;
    
    -- Calculate new level
    SELECT MAX(level) INTO new_level 
    FROM level_definitions 
    WHERE points_required <= current_points AND is_active = true;
    
    -- Get points required for next level
    SELECT COALESCE(points_required, current_points) INTO next_level_points
    FROM level_definitions 
    WHERE level = new_level + 1 AND is_active = true;
    
    -- Calculate progress percentage
    IF next_level_points > current_points THEN
        SELECT points_required INTO next_level_points FROM level_definitions WHERE level = new_level;
        progress_percentage := ((current_points - next_level_points)::DECIMAL / 
                               (next_level_points - next_level_points)::DECIMAL) * 100;
    ELSE
        progress_percentage := 100.0;
    END IF;
    
    -- Update user level
    UPDATE user_levels 
    SET 
        current_level = new_level,
        points_to_next_level = GREATEST(0, next_level_points - current_points),
        level_progress_percentage = LEAST(100.0, progress_percentage),
        updated_at = NOW()
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create user_levels entry on user registration
CREATE OR REPLACE FUNCTION create_user_level_entry() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_levels (user_id, username)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Player'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_level_entry();
