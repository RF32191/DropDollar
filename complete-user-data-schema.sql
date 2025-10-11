-- Complete User Data Backup Schema
-- Professional Amazon-like user data persistence

-- User Activities Table - Track all user actions
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'logout', 'game_played', 'token_purchase', 'listing_entry', 'prize_won', 'story_submitted', 'page_view')),
  activity_data JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);

-- Game History Table - Complete game records
CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0,
  avg_reaction_time INTEGER,
  game_duration INTEGER DEFAULT 60,
  is_practice BOOLEAN DEFAULT true,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  entry_number INTEGER,
  rank INTEGER,
  is_winner BOOLEAN DEFAULT false,
  prize_claimed BOOLEAN DEFAULT false,
  confirmation_code TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_listing_id ON game_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_game_history_score ON game_history(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_is_winner ON game_history(is_winner);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at DESC);

-- Winners Table - Prize winners with confirmation codes
CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  confirmation_code TEXT UNIQUE NOT NULL,
  prize_claimed BOOLEAN DEFAULT false,
  shipping_address TEXT,
  lister_notified BOOLEAN DEFAULT false,
  lister_id UUID REFERENCES users(id) ON DELETE SET NULL,
  prize_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claimed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_winners_user_id ON winners(user_id);
CREATE INDEX IF NOT EXISTS idx_winners_listing_id ON winners(listing_id);
CREATE INDEX IF NOT EXISTS idx_winners_confirmation_code ON winners(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_winners_prize_claimed ON winners(prize_claimed);
CREATE INDEX IF NOT EXISTS idx_winners_lister_notified ON winners(lister_notified);

-- User Stories Table - Victory testimonials
CREATE TABLE IF NOT EXISTS user_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  story TEXT NOT NULL,
  prize_won TEXT NOT NULL,
  amount_won DECIMAL(10,2) DEFAULT 0,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_stories_user_id ON user_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_approved ON user_stories(is_approved);
CREATE INDEX IF NOT EXISTS idx_user_stories_featured ON user_stories(is_featured);
CREATE INDEX IF NOT EXISTS idx_user_stories_created_at ON user_stories(created_at DESC);

-- User Sessions Table - Professional session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  remember_me BOOLEAN DEFAULT false,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- User Preferences Table - Professional account settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  prize_notifications BOOLEAN DEFAULT true,
  newsletter_subscribed BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'dark',
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  privacy_settings JSONB DEFAULT '{}'::jsonb,
  notification_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- User Statistics Table - Aggregate stats for performance
CREATE TABLE IF NOT EXISTS user_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_games_played INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_prizes_won INTEGER DEFAULT 0,
  total_tokens_purchased INTEGER DEFAULT 0,
  total_tokens_spent INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  favorite_game TEXT,
  win_rate DECIMAL(5,2) DEFAULT 0,
  average_score DECIMAL(10,2) DEFAULT 0,
  total_playtime_minutes INTEGER DEFAULT 0,
  last_game_played_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_total_wins ON user_statistics(total_wins DESC);
CREATE INDEX IF NOT EXISTS idx_user_statistics_highest_score ON user_statistics(highest_score DESC);

-- Functions to update statistics automatically
CREATE OR REPLACE FUNCTION update_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update statistics when game is played
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'game_history' THEN
    INSERT INTO user_statistics (user_id, total_games_played, last_game_played_at, updated_at)
    VALUES (NEW.user_id, 1, NEW.created_at, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      total_games_played = user_statistics.total_games_played + 1,
      last_game_played_at = NEW.created_at,
      updated_at = NOW();
    
    -- Update highest score if applicable
    UPDATE user_statistics
    SET highest_score = GREATEST(highest_score, NEW.score)
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- Update wins when winner record created
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'winners' THEN
    UPDATE user_statistics
    SET 
      total_wins = total_wins + 1,
      total_prizes_won = total_prizes_won + 1,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_stats_on_game ON game_history;
CREATE TRIGGER trigger_update_stats_on_game
  AFTER INSERT ON game_history
  FOR EACH ROW
  EXECUTE FUNCTION update_user_statistics();

DROP TRIGGER IF EXISTS trigger_update_stats_on_win ON winners;
CREATE TRIGGER trigger_update_stats_on_win
  AFTER INSERT ON winners
  FOR EACH ROW
  EXECUTE FUNCTION update_user_statistics();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_activities IS 'Tracks all user actions for analytics and audit';
COMMENT ON TABLE game_history IS 'Complete record of all games played with scores and rankings';
COMMENT ON TABLE winners IS 'Prize winners with confirmation codes and shipping details';
COMMENT ON TABLE user_stories IS 'Victory stories and testimonials from winners';
COMMENT ON TABLE user_sessions IS 'Professional session management like Amazon';
COMMENT ON TABLE user_preferences IS 'User account preferences and settings';
COMMENT ON TABLE user_statistics IS 'Aggregated user statistics for performance';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

