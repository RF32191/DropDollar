-- ============================================================================
-- COMPLETE HOT SELL SYSTEM - ALL GAMES AT MULTIPLE PRICE POINTS
-- ============================================================================
-- This creates individual listings for EACH game at key price tiers
-- Organized by game type with strategic pricing
-- ============================================================================

-- Drop existing tables to ensure clean slate
DROP TABLE IF EXISTS hot_sell_participants CASCADE;
DROP TABLE IF EXISTS hot_sell_sessions CASCADE;
DROP TABLE IF EXISTS hot_sell_configs CASCADE;

-- ============================================================================
-- TABLE DEFINITIONS
-- ============================================================================

CREATE TABLE hot_sell_configs (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entry_fee NUMERIC DEFAULT 1,
  base_price NUMERIC NOT NULL,
  max_participants INTEGER NOT NULL,
  game_duration INTEGER DEFAULT 30,
  rng_seed INTEGER DEFAULT 1,
  first_place_percent NUMERIC DEFAULT 50,
  second_place_percent NUMERIC DEFAULT 20,
  third_place_percent NUMERIC DEFAULT 15,
  platform_fee_percent NUMERIC DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hot_sell_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id TEXT NOT NULL REFERENCES hot_sell_configs(id) ON DELETE CASCADE,
  current_pot NUMERIC DEFAULT 0,
  base_price NUMERIC NOT NULL,
  max_participants INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  first_place_user_id UUID REFERENCES auth.users(id),
  second_place_user_id UUID REFERENCES auth.users(id),
  third_place_user_id UUID REFERENCES auth.users(id),
  first_place_prize NUMERIC DEFAULT 0,
  second_place_prize NUMERIC DEFAULT 0,
  third_place_prize NUMERIC DEFAULT 0,
  platform_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE hot_sell_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES hot_sell_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score NUMERIC,
  accuracy NUMERIC,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(session_id, user_id)
);

-- Create indexes
CREATE INDEX idx_hot_sell_sessions_config ON hot_sell_sessions(config_id);
CREATE INDEX idx_hot_sell_sessions_status ON hot_sell_sessions(status);
CREATE INDEX idx_hot_sell_participants_session ON hot_sell_participants(session_id);
CREATE INDEX idx_hot_sell_participants_user ON hot_sell_participants(user_id);

-- ============================================================================
-- GAME CONFIGURATIONS - ORGANIZED BY GAME TYPE
-- ============================================================================
-- All games: 1st (50%), 2nd (20%), 3rd (15%), Platform (15%)
-- Strategic price tiers: $3, $5, $10, $25, $50, $100, $250, $500, $1000, $2500, $5000, $10000
-- ============================================================================

INSERT INTO hot_sell_configs (id, game_type, title, description, entry_fee, base_price, max_participants, game_duration, rng_seed, first_place_percent, second_place_percent, third_place_percent, platform_fee_percent) VALUES

-- SWORD PARRY (Destroy red attacks with precise slashes) - 7 tiers
('hs-3-sword-parry', 'sword_parry', '$3 Sword Slash', 'Slash & Win • 3 Players', 1, 3, 3, 30, 101, 50, 20, 15, 15),
('hs-10-sword-parry', 'sword_parry', '$10 Sword Slash', 'Slash & Win • 10 Players', 1, 10, 10, 30, 102, 50, 20, 15, 15),
('hs-50-sword-parry', 'sword_parry', '$50 Sword Slash', 'Slash & Win • 50 Players', 1, 50, 50, 30, 103, 50, 20, 15, 15),
('hs-250-sword-parry', 'sword_parry', '$250 Sword Slash', 'Slash & Win • 250 Players', 1, 250, 250, 30, 104, 50, 20, 15, 15),
('hs-1000-sword-parry', 'sword_parry', '$1000 Sword Slash', 'Slash & Win • 1K Players', 1, 1000, 1000, 30, 105, 50, 20, 15, 15),
('hs-10000-sword-parry', 'sword_parry', '$10000 Sword Slash', 'Slash & Win • 10K Players', 1, 10000, 10000, 30, 106, 50, 20, 15, 15),
('hs-25000-sword-parry', 'sword_parry', '$25000 Sword Slash', 'Slash & Win • 25K Players', 1, 25000, 25000, 30, 107, 50, 20, 15, 15),

-- BLADE BOUNCE (Mouse-controlled sword defense) - 7 tiers
('hs-3-blade-bounce', 'blade_bounce', '$3 Blade Bounce', 'Mouse Control • 3 Players', 1, 3, 3, 30, 200, 50, 20, 15, 15),
('hs-5-blade-bounce', 'blade_bounce', '$5 Blade Bounce', 'Mouse Control • 5 Players', 1, 5, 5, 30, 201, 50, 20, 15, 15),
('hs-25-blade-bounce', 'blade_bounce', '$25 Blade Bounce', 'Mouse Control • 25 Players', 1, 25, 25, 30, 202, 50, 20, 15, 15),
('hs-100-blade-bounce', 'blade_bounce', '$100 Blade Bounce', 'Mouse Control • 100 Players', 1, 100, 100, 30, 203, 50, 20, 15, 15),
('hs-500-blade-bounce', 'blade_bounce', '$500 Blade Bounce', 'Mouse Control • 500 Players', 1, 500, 500, 30, 204, 50, 20, 15, 15),
('hs-10000-blade-bounce', 'blade_bounce', '$10000 Blade Bounce', 'Mouse Control • 10K Players', 1, 10000, 10000, 30, 205, 50, 20, 15, 15),
('hs-25000-blade-bounce', 'blade_bounce', '$25000 Blade Bounce', 'Mouse Control • 25K Players', 1, 25000, 25000, 30, 206, 50, 20, 15, 15),

-- LASER DODGE EXTREME (Full-screen laser grids) - 7 tiers
('hs-3-laser-dodge', 'laser_dodge', '$3 Laser Dodge', 'Dodge Lasers • 3 Players', 1, 3, 3, 30, 301, 50, 20, 15, 15),
('hs-10-laser-dodge', 'laser_dodge', '$10 Laser Dodge', 'Dodge Lasers • 10 Players', 1, 10, 10, 30, 302, 50, 20, 15, 15),
('hs-100-laser-dodge', 'laser_dodge', '$100 Laser Dodge', 'Dodge Lasers • 100 Players', 1, 100, 100, 30, 303, 50, 20, 15, 15),
('hs-1000-laser-dodge', 'laser_dodge', '$1000 Laser Dodge', 'Dodge Lasers • 1K Players', 1, 1000, 1000, 30, 304, 50, 20, 15, 15),
('hs-10000-laser-dodge', 'laser_dodge', '$10000 Laser Dodge', 'Dodge Lasers • 10K Players', 1, 10000, 10000, 30, 305, 50, 20, 15, 15),
('hs-25000-laser-dodge', 'laser_dodge', '$25000 Laser Dodge', 'Dodge Lasers • 25K Players', 1, 25000, 25000, 30, 306, 50, 20, 15, 15),

-- MULTI-TARGET REACTION (Click highlighted targets fast) - 7 tiers
('hs-3-multi-target', 'multi_target_reaction', '$3 Multi-Target', 'Speed & Accuracy • 3 Players', 1, 3, 3, 30, 400, 50, 20, 15, 15),
('hs-5-multi-target', 'multi_target_reaction', '$5 Multi-Target', 'Speed & Accuracy • 5 Players', 1, 5, 5, 30, 401, 50, 20, 15, 15),
('hs-25-multi-target', 'multi_target_reaction', '$25 Multi-Target', 'Speed & Accuracy • 25 Players', 1, 25, 25, 30, 402, 50, 20, 15, 15),
('hs-250-multi-target', 'multi_target_reaction', '$250 Multi-Target', 'Speed & Accuracy • 250 Players', 1, 250, 250, 30, 403, 50, 20, 15, 15),
('hs-2500-multi-target', 'multi_target_reaction', '$2500 Multi-Target', 'Speed & Accuracy • 2.5K Players', 1, 2500, 2500, 30, 404, 50, 20, 15, 15),
('hs-10000-multi-target', 'multi_target_reaction', '$10000 Multi-Target', 'Speed & Accuracy • 10K Players', 1, 10000, 10000, 30, 405, 50, 20, 15, 15),
('hs-25000-multi-target', 'multi_target_reaction', '$25000 Multi-Target', 'Speed & Accuracy • 25K Players', 1, 25000, 25000, 30, 406, 50, 20, 15, 15),

-- FALLING OBJECT CATCH (Catch coins with cash case) - 7 tiers
('hs-3-falling-object', 'falling_object', '$3 Coin Catch', 'Catch & Stack • 3 Players', 1, 3, 3, 30, 501, 50, 20, 15, 15),
('hs-10-falling-object', 'falling_object', '$10 Coin Catch', 'Catch & Stack • 10 Players', 1, 10, 10, 30, 502, 50, 20, 15, 15),
('hs-100-falling-object', 'falling_object', '$100 Coin Catch', 'Catch & Stack • 100 Players', 1, 100, 100, 30, 503, 50, 20, 15, 15),
('hs-2500-falling-object', 'falling_object', '$2500 Coin Catch', 'Catch & Stack • 2.5K Players', 1, 2500, 2500, 30, 504, 50, 20, 15, 15),
('hs-10000-falling-object', 'falling_object', '$10000 Coin Catch', 'Catch & Stack • 10K Players', 1, 10000, 10000, 30, 505, 50, 20, 15, 15),
('hs-25000-falling-object', 'falling_object', '$25000 Coin Catch', 'Catch & Stack • 25K Players', 1, 25000, 25000, 30, 506, 50, 20, 15, 15),

-- COLOR SEQUENCE MEMORY (Audio-visual memory game) - 7 tiers
('hs-3-color-sequence', 'color_sequence', '$3 Color Memory', 'Pattern Recall • 3 Players', 1, 3, 3, 30, 600, 50, 20, 15, 15),
('hs-5-color-sequence', 'color_sequence', '$5 Color Memory', 'Pattern Recall • 5 Players', 1, 5, 5, 30, 601, 50, 20, 15, 15),
('hs-50-color-sequence', 'color_sequence', '$50 Color Memory', 'Pattern Recall • 50 Players', 1, 50, 50, 30, 602, 50, 20, 15, 15),
('hs-500-color-sequence', 'color_sequence', '$500 Color Memory', 'Pattern Recall • 500 Players', 1, 500, 500, 30, 603, 50, 20, 15, 15),
('hs-5000-color-sequence', 'color_sequence', '$5000 Color Memory', 'Pattern Recall • 5K Players', 1, 5000, 5000, 30, 604, 50, 20, 15, 15),
('hs-10000-color-sequence', 'color_sequence', '$10000 Color Memory', 'Pattern Recall • 10K Players', 1, 10000, 10000, 30, 605, 50, 20, 15, 15),
('hs-25000-color-sequence', 'color_sequence', '$25000 Color Memory', 'Pattern Recall • 25K Players', 1, 25000, 25000, 30, 606, 50, 20, 15, 15),

-- CASH STACK CHALLENGE (Stack coins on falling 3D cash) - 7 tiers
('hs-3-cash-stack', 'cash_stack', '$3 Cash Stack', 'Perfect Stacking • 3 Players', 1, 3, 3, 30, 700, 50, 20, 15, 15),
('hs-10-cash-stack', 'cash_stack', '$10 Cash Stack', 'Perfect Stacking • 10 Players', 1, 10, 10, 30, 701, 50, 20, 15, 15),
('hs-100-cash-stack', 'cash_stack', '$100 Cash Stack', 'Perfect Stacking • 100 Players', 1, 100, 100, 30, 702, 50, 20, 15, 15),
('hs-1000-cash-stack', 'cash_stack', '$1000 Cash Stack', 'Perfect Stacking • 1K Players', 1, 1000, 1000, 30, 703, 50, 20, 15, 15),
('hs-10000-cash-stack', 'cash_stack', '$10000 Cash Stack', 'Perfect Stacking • 10K Players', 1, 10000, 10000, 30, 704, 50, 20, 15, 15),
('hs-25000-cash-stack', 'cash_stack', '$25000 Cash Stack', 'Perfect Stacking • 25K Players', 1, 25000, 25000, 30, 705, 50, 20, 15, 15),

-- QUICK CLICK (Lightning-fast reaction test) - 7 tiers
('hs-3-quick-click', 'quick_click', '$3 Quick Click', 'Lightning Speed • 3 Players', 1, 3, 3, 30, 801, 50, 20, 15, 15),
('hs-25-quick-click', 'quick_click', '$25 Quick Click', 'Lightning Speed • 25 Players', 1, 25, 25, 30, 802, 50, 20, 15, 15),
('hs-250-quick-click', 'quick_click', '$250 Quick Click', 'Lightning Speed • 250 Players', 1, 250, 250, 30, 803, 50, 20, 15, 15),
('hs-5000-quick-click', 'quick_click', '$5000 Quick Click', 'Lightning Speed • 5K Players', 1, 5000, 5000, 30, 804, 50, 20, 15, 15),
('hs-10000-quick-click', 'quick_click', '$10000 Quick Click', 'Lightning Speed • 10K Players', 1, 10000, 10000, 30, 805, 50, 20, 15, 15),
('hs-25000-quick-click', 'quick_click', '$25000 Quick Click', 'Lightning Speed • 25K Players', 1, 25000, 25000, 30, 806, 50, 20, 15, 15);

-- ============================================================================
-- CREATE INITIAL WAITING SESSIONS FOR ALL CONFIGS
-- ============================================================================

INSERT INTO hot_sell_sessions (config_id, current_pot, base_price, max_participants, status)
SELECT 
  id,
  0,
  base_price,
  max_participants,
  'waiting'
FROM hot_sell_configs;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE hot_sell_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_sell_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_sell_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view configs" ON hot_sell_configs FOR SELECT USING (true);
CREATE POLICY "Anyone can view sessions" ON hot_sell_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can view participants" ON hot_sell_participants FOR SELECT USING (true);
CREATE POLICY "Users can join sessions" ON hot_sell_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SUMMARY
-- ============================================================================

DO $$
DECLARE
  game_count INTEGER;
  total_configs INTEGER;
BEGIN
  SELECT COUNT(DISTINCT game_type) INTO game_count FROM hot_sell_configs;
  SELECT COUNT(*) INTO total_configs FROM hot_sell_configs;
  
  RAISE NOTICE '✅ Hot Sell system created successfully!';
  RAISE NOTICE '🎮 Total game types: %', game_count;
  RAISE NOTICE '📊 Total configurations: %', total_configs;
  RAISE NOTICE '🏆 All games: 3-place prizes (1st: 50%%, 2nd: 20%%, 3rd: 15%%)';
  RAISE NOTICE '💰 Platform fee: 15%% across all games';
  RAISE NOTICE '💵 Price range: $3 to $25,000';
  RAISE NOTICE '⏱️  No timers - games complete when max participants reached';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 All games have 7 tiers each:';
  RAISE NOTICE '  • ⚔️  Sword Slash (7 tiers)';
  RAISE NOTICE '  • 🛡️  Blade Bounce (7 tiers)';
  RAISE NOTICE '  • 🚀 Laser Dodge (7 tiers)';
  RAISE NOTICE '  • 🎯 Multi-Target (7 tiers)';
  RAISE NOTICE '  • 💰 Coin Catch (7 tiers)';
  RAISE NOTICE '  • 🎨 Color Memory (7 tiers)';
  RAISE NOTICE '  • 💵 Cash Stack (7 tiers)';
  RAISE NOTICE '  • ⚡ Quick Click (7 tiers)';
  RAISE NOTICE '';
  RAISE NOTICE '💎 Each game includes: $3, $5-$25, $50-$250, $500-$2500, $5K, $10K, $25K';
END $$;

