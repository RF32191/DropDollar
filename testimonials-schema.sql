-- Testimonials/Winners Stories Database Schema
-- This table stores user-submitted victory stories/testimonials

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  game_type VARCHAR(100) NOT NULL,
  game_score INTEGER NOT NULL,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_value DECIMAL(10,2) NOT NULL,
  location VARCHAR(100),
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  verified BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_testimonials_user_id ON testimonials(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON testimonials(approved);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(featured);
CREATE INDEX IF NOT EXISTS idx_testimonials_published_at ON testimonials(published_at);
CREATE INDEX IF NOT EXISTS idx_testimonials_game_type ON testimonials(game_type);

-- RLS (Row Level Security) policies
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Users can view all approved testimonials
CREATE POLICY "Anyone can view approved testimonials" ON testimonials
  FOR SELECT USING (approved = true);

-- Users can insert their own testimonials
CREATE POLICY "Users can insert their own testimonials" ON testimonials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own testimonials (before approval)
CREATE POLICY "Users can update their own testimonials" ON testimonials
  FOR UPDATE USING (auth.uid() = user_id AND approved = false);

-- Users can delete their own testimonials (before approval)
CREATE POLICY "Users can delete their own testimonials" ON testimonials
  FOR DELETE USING (auth.uid() = user_id AND approved = false);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();

-- Function to get testimonials with user information
CREATE OR REPLACE FUNCTION get_testimonials_with_users()
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  content TEXT,
  game_type VARCHAR(100),
  game_score INTEGER,
  entry_fee DECIMAL(10,2),
  prize_value DECIMAL(10,2),
  location VARCHAR(100),
  rating INTEGER,
  verified BOOLEAN,
  featured BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT,
  user_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.content,
    t.game_type,
    t.game_score,
    t.entry_fee,
    t.prize_value,
    t.location,
    t.rating,
    t.verified,
    t.featured,
    t.created_at,
    COALESCE(p.display_name, p.full_name, 'Anonymous Winner') as user_name,
    p.avatar_url as user_avatar_url
  FROM testimonials t
  LEFT JOIN profiles p ON t.user_id = p.id
  WHERE t.approved = true
  ORDER BY t.featured DESC, t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit a testimonial
CREATE OR REPLACE FUNCTION submit_testimonial(
  p_title VARCHAR(255),
  p_content TEXT,
  p_game_type VARCHAR(100),
  p_game_score INTEGER,
  p_entry_fee DECIMAL(10,2),
  p_prize_value DECIMAL(10,2),
  p_location VARCHAR(100)
)
RETURNS UUID AS $$
DECLARE
  testimonial_id UUID;
BEGIN
  INSERT INTO testimonials (
    user_id,
    title,
    content,
    game_type,
    game_score,
    entry_fee,
    prize_value,
    location
  ) VALUES (
    auth.uid(),
    p_title,
    p_content,
    p_game_type,
    p_game_score,
    p_entry_fee,
    p_prize_value,
    p_location
  ) RETURNING id INTO testimonial_id;
  
  RETURN testimonial_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve testimonials (admin only)
CREATE OR REPLACE FUNCTION approve_testimonial(p_testimonial_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE testimonials 
  SET 
    approved = true,
    published_at = NOW()
  WHERE id = p_testimonial_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to feature testimonials (admin only)
CREATE OR REPLACE FUNCTION feature_testimonial(p_testimonial_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE testimonials 
  SET featured = true
  WHERE id = p_testimonial_id AND approved = true;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data (optional - for testing)
-- INSERT INTO testimonials (user_id, title, content, game_type, game_score, entry_fee, prize_value, location, approved, featured)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
--   'Won iPhone 15 Pro with Multi-Target Skills!',
--   'I practiced Multi-Target Reaction for weeks on the games page. When I entered the competition, I scored 47 points and beat 1,200+ other players! Won a $1,200 iPhone for just $1. My reflexes and practice paid off big time!',
--   'Multi-Target Reaction',
--   47,
--   1.00,
--   1200.00,
--   'Seattle, WA',
--   true,
--   true
-- );

-- Comments for documentation
COMMENT ON TABLE testimonials IS 'Stores user-submitted victory stories and testimonials';
COMMENT ON COLUMN testimonials.user_id IS 'Reference to the user who submitted the testimonial';
COMMENT ON COLUMN testimonials.title IS 'Title of the victory story';
COMMENT ON COLUMN testimonials.content IS 'Full testimonial content/story';
COMMENT ON COLUMN testimonials.game_type IS 'Type of game that was won';
COMMENT ON COLUMN testimonials.game_score IS 'Score achieved in the game';
COMMENT ON COLUMN testimonials.entry_fee IS 'Entry fee paid for the competition';
COMMENT ON COLUMN testimonials.prize_value IS 'Value of the prize won';
COMMENT ON COLUMN testimonials.location IS 'User location (optional)';
COMMENT ON COLUMN testimonials.rating IS 'User rating of the experience (1-5 stars)';
COMMENT ON COLUMN testimonials.verified IS 'Whether the win has been verified';
COMMENT ON COLUMN testimonials.approved IS 'Whether the testimonial has been approved for public display';
COMMENT ON COLUMN testimonials.featured IS 'Whether the testimonial should be featured prominently';
COMMENT ON COLUMN testimonials.published_at IS 'When the testimonial was published (approved)';
