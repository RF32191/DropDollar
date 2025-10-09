-- DropPoints System - Simplified Schema for Deployment
-- Run this in your Supabase SQL Editor

-- User Levels Table
CREATE TABLE IF NOT EXISTS user_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    current_level INTEGER DEFAULT 1,
    total_points INTEGER DEFAULT 0,
    spendable_points INTEGER DEFAULT 0,
    games_played_total INTEGER DEFAULT 0,
    highest_game_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Points Transactions Table
CREATE TABLE IF NOT EXISTS points_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    points_change INTEGER NOT NULL,
    points_before INTEGER NOT NULL,
    points_after INTEGER NOT NULL,
    source_reference VARCHAR(200),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own level data" ON user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own level data" ON user_levels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own level data" ON user_levels FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own points transactions" ON points_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own points transactions" ON points_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_level ON user_levels(current_level);
CREATE INDEX IF NOT EXISTS idx_user_levels_points ON user_levels(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id, created_at DESC);

-- Function to create user_levels entry on user registration
CREATE OR REPLACE FUNCTION create_user_level_entry() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_levels (user_id, username)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Player'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create user_levels entry
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_level_entry();

-- Function to calculate level from games played
CREATE OR REPLACE FUNCTION calculate_level_from_games(games_played INTEGER) RETURNS INTEGER AS $$
BEGIN
    -- Level = sqrt(games / 10), max 100
    RETURN LEAST(100, GREATEST(1, FLOOR(SQRT(games_played / 10.0))));
END;
$$ LANGUAGE plpgsql;

-- Function to award points for game completion
CREATE OR REPLACE FUNCTION award_game_points(
    p_user_id UUID,
    p_game_score INTEGER,
    p_game_type VARCHAR(50)
) RETURNS JSON AS $$
DECLARE
    v_points_awarded INTEGER;
    v_current_level user_levels%ROWTYPE;
    v_new_level INTEGER;
    v_new_total_points INTEGER;
    v_new_spendable_points INTEGER;
    v_new_games_total INTEGER;
    v_leveled_up BOOLEAN := FALSE;
BEGIN
    -- Calculate points (10-25 based on score and game type)
    v_points_awarded := 10;
    
    -- Score bonus
    IF p_game_score >= 10000 THEN v_points_awarded := v_points_awarded + 15;
    ELSIF p_game_score >= 5000 THEN v_points_awarded := v_points_awarded + 12;
    ELSIF p_game_score >= 2000 THEN v_points_awarded := v_points_awarded + 8;
    ELSIF p_game_score >= 1000 THEN v_points_awarded := v_points_awarded + 5;
    ELSIF p_game_score >= 500 THEN v_points_awarded := v_points_awarded + 2;
    END IF;
    
    -- Game type multiplier
    IF p_game_type = 'tournament' THEN v_points_awarded := FLOOR(v_points_awarded * 1.5);
    ELSIF p_game_type = 'hot-sell' THEN v_points_awarded := FLOOR(v_points_awarded * 2.0);
    ELSIF p_game_type = 'multi-target' THEN v_points_awarded := FLOOR(v_points_awarded * 1.2);
    ELSIF p_game_type = 'falling-object' THEN v_points_awarded := FLOOR(v_points_awarded * 1.1);
    END IF;
    
    -- Get current user level data
    SELECT * INTO v_current_level FROM user_levels WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- Create user level entry if it doesn't exist
        INSERT INTO user_levels (user_id, username) 
        VALUES (p_user_id, 'Player');
        SELECT * INTO v_current_level FROM user_levels WHERE user_id = p_user_id;
    END IF;
    
    -- Calculate new values
    v_new_total_points := v_current_level.total_points + v_points_awarded;
    v_new_spendable_points := v_current_level.spendable_points + FLOOR(v_points_awarded * 0.5);
    v_new_games_total := v_current_level.games_played_total + 1;
    v_new_level := calculate_level_from_games(v_new_games_total);
    
    -- Check if leveled up
    IF v_new_level > v_current_level.current_level THEN
        v_leveled_up := TRUE;
    END IF;
    
    -- Update user level
    UPDATE user_levels 
    SET 
        total_points = v_new_total_points,
        spendable_points = v_new_spendable_points,
        games_played_total = v_new_games_total,
        current_level = v_new_level,
        highest_game_score = GREATEST(highest_game_score, p_game_score),
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO points_transactions (
        user_id, 
        transaction_type, 
        points_change, 
        points_before, 
        points_after, 
        source_reference, 
        description
    ) VALUES (
        p_user_id,
        'game_score',
        v_points_awarded,
        v_current_level.total_points,
        v_new_total_points,
        p_game_type,
        'Earned ' || v_points_awarded || ' points playing ' || p_game_type || ' (Score: ' || p_game_score || ')'
    );
    
    -- Return result
    RETURN json_build_object(
        'success', true,
        'points_awarded', v_points_awarded,
        'new_level', v_new_level,
        'leveled_up', v_leveled_up,
        'total_points', v_new_total_points,
        'spendable_points', v_new_spendable_points
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
