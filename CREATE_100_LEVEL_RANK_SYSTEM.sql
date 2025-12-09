-- ============================================================================
-- 100 LEVEL RANK SYSTEM WITH CUSTOM UNIQUE SYMBOLS
-- ============================================================================
-- Creates comprehensive ranking system for levels 1-100 with custom symbols
-- GitHub: https://github.com/RF32191/DropDollar/blob/main/CREATE_100_LEVEL_RANK_SYSTEM.sql
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎖️ CREATING 100 LEVEL RANK SYSTEM';
    RAISE NOTICE '========================================';
END $$;

-- Drop existing ranking tiers and recreate with 100 levels
DROP TABLE IF EXISTS public.ranking_tiers CASCADE;
CREATE TABLE public.ranking_tiers (
    tier INTEGER PRIMARY KEY CHECK (tier >= 1 AND tier <= 100),
    level_range TEXT NOT NULL,
    min_level INTEGER NOT NULL,
    max_level INTEGER NOT NULL,
    title TEXT NOT NULL,
    symbol TEXT NOT NULL, -- Custom unique symbol
    color_hex TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 100 levels with custom unique symbols
-- Using Unicode symbols, geometric shapes, and special characters
INSERT INTO public.ranking_tiers (tier, level_range, min_level, max_level, title, symbol, color_hex, description) VALUES
-- Levels 1-10: Foundation (Basic shapes and simple symbols)
(1, '1-1', 1, 1, 'Seedling', '◉', '#9CA3AF', 'Just planted'),
(2, '2-2', 2, 2, 'Sprout', '◈', '#9CA3AF', 'Growing strong'),
(3, '3-3', 3, 3, 'Sapling', '◊', '#9CA3AF', 'Taking root'),
(4, '4-4', 4, 4, 'Tree', '◆', '#9CA3AF', 'Standing tall'),
(5, '5-5', 5, 5, 'Forest', '◇', '#60A5FA', 'Forest guardian'),

(6, '6-6', 6, 6, 'Star', '✦', '#60A5FA', 'Shining bright'),
(7, '7-7', 7, 7, 'Constellation', '✧', '#60A5FA', 'Pattern forming'),
(8, '8-8', 8, 8, 'Nebula', '✩', '#60A5FA', 'Star nursery'),
(9, '9-9', 9, 9, 'Galaxy', '✪', '#34D399', 'Galactic core'),
(10, '10-10', 10, 10, 'Universe', '✫', '#34D399', 'Universal force'),

-- Levels 11-20: Warrior Path (Weapons and combat symbols)
(11, '11-11', 11, 11, 'Archer', '➶', '#34D399', 'Precise aim'),
(12, '12-12', 12, 12, 'Hunter', '➹', '#34D399', 'Expert tracker'),
(13, '13-13', 13, 13, 'Ranger', '➺', '#34D399', 'Wild guardian'),
(14, '14-14', 14, 14, 'Scout', '➻', '#FBBF24', 'Eagle eye'),
(15, '15-15', 15, 15, 'Pathfinder', '➼', '#FBBF24', 'Trail blazer'),

(16, '16-16', 16, 16, 'Swordsman', '⚔', '#FBBF24', 'Blade master'),
(17, '17-17', 17, 17, 'Knight', '⚖', '#FBBF24', 'Noble warrior'),
(18, '18-18', 18, 18, 'Paladin', '⚛', '#FBBF24', 'Holy warrior'),
(19, '19-19', 19, 19, 'Crusader', '⚜', '#F87171', 'Righteous fighter'),
(20, '20-20', 20, 20, 'Champion', '⚝', '#F87171', 'Victory seeker'),

-- Levels 21-30: Mastery (Advanced symbols)
(21, '21-21', 21, 21, 'Veteran', '⛤', '#F87171', 'Battle tested'),
(22, '22-22', 22, 22, 'Elite', '⛥', '#F87171', 'Rare gem'),
(23, '23-23', 23, 23, 'Expert', '⛦', '#A78BFA', 'Knowledge master'),
(24, '24-24', 24, 24, 'Specialist', '⛧', '#A78BFA', 'Field expert'),
(25, '25-25', 25, 25, 'Adept', '⛨', '#A78BFA', 'Magic wielder'),

(26, '26-26', 26, 26, 'Master', '⛩', '#A78BFA', 'Crown bearer'),
(27, '27-27', 27, 27, 'Grandmaster', '⛪', '#A78BFA', 'Ultimate master'),
(28, '28-28', 28, 28, 'Legend', '⛫', '#FB7185', 'Storied hero'),
(29, '29-29', 29, 29, 'Myth', '⛬', '#FB7185', 'Legendary tale'),
(30, '30-30', 30, 30, 'Icon', '⛭', '#FB7185', 'Cultural icon'),

-- Levels 31-40: Divine (Sacred symbols)
(31, '31-31', 31, 31, 'Immortal', '⛮', '#FB7185', 'Eternal being'),
(32, '32-32', 32, 32, 'Deity', '⛯', '#FCD34D', 'Worshipped'),
(33, '33-33', 33, 33, 'Titan', '⛰', '#FCD34D', 'Colossal power'),
(34, '34-34', 34, 34, 'God', '⛱', '#FCD34D', 'Divine entity'),
(35, '35-35', 35, 35, 'Archon', '⛲', '#FCD34D', 'Ruling power'),

(36, '36-36', 36, 36, 'Phoenix', '⛳', '#EC4899', 'Reborn from ashes'),
(37, '37-37', 37, 37, 'Dragon', '⛴', '#EC4899', 'Ancient power'),
(38, '38-38', 38, 38, 'Leviathan', '⛵', '#EC4899', 'Ocean ruler'),
(39, '39-39', 39, 39, 'Behemoth', '⛶', '#EC4899', 'Massive force'),
(40, '40-40', 40, 40, 'Colossus', '⛷', '#8B5CF6', 'Giant statue'),

-- Levels 41-50: Transcendent (Geometric and abstract)
(41, '41-41', 41, 41, 'Titan', '⛸', '#8B5CF6', 'Primordial force'),
(42, '42-42', 42, 42, 'Elder', '⛹', '#8B5CF6', 'Ancient wisdom'),
(43, '43-43', 43, 43, 'Sage', '⛺', '#8B5CF6', 'Wise teacher'),
(44, '44-44', 44, 44, 'Oracle', '⛻', '#8B5CF6', 'Future seer'),
(45, '45-45', 45, 45, 'Prophet', '⛼', '#06B6D4', 'Divine messenger'),

(46, '46-46', 46, 46, 'Ascended', '⛽', '#06B6D4', 'Transcended form'),
(47, '47-47', 47, 47, 'Enlightened', '⛾', '#06B6D4', 'Awakened mind'),
(48, '48-48', 48, 48, 'Celestial', '⛿', '#3B82F6', 'Heavenly being'),
(49, '49-49', 49, 49, 'Seraphim', '✁', '#3B82F6', 'Highest angel'),
(50, '50-50', 50, 50, 'Cherubim', '✂', '#3B82F6', 'Divine guardian'),

-- Levels 51-60: Cosmic (Star and space symbols)
(51, '51-51', 51, 51, 'Archangel', '✃', '#F59E0B', 'Heavenly commander'),
(52, '52-52', 52, 52, 'Divine', '✄', '#F59E0B', 'Godlike power'),
(53, '53-53', 53, 53, 'Sacred', '✆', '#F59E0B', 'Holy ground'),
(54, '54-54', 54, 54, 'Hallowed', '✇', '#F59E0B', 'Blessed one'),
(55, '55-55', 55, 55, 'Sanctified', '✈', '#8B5CF6', 'Made holy'),

(56, '56-56', 56, 56, 'Eternal', '✉', '#8B5CF6', 'Never ending'),
(57, '57-57', 57, 57, 'Infinite', '✊', '#8B5CF6', 'Without limit'),
(58, '58-58', 58, 58, 'Timeless', '✋', '#EC4899', 'Beyond time'),
(59, '59-59', 59, 59, 'Transcendent', '✌', '#EC4899', 'Beyond reality'),
(60, '60-60', 60, 60, 'Supreme', '✍', '#EC4899', 'Highest rank'),

-- Levels 61-70: Universal (Planetary and cosmic)
(61, '61-61', 61, 61, 'Cosmic', '✎', '#6366F1', 'Universe power'),
(62, '62-62', 62, 62, 'Stellar', '✏', '#6366F1', 'Star power'),
(63, '63-63', 63, 63, 'Nebular', '✐', '#A855F7', 'Star birth'),
(64, '64-64', 64, 64, 'Quasar', '✑', '#A855F7', 'Brightest object'),
(65, '65-65', 65, 65, 'Pulsar', '✒', '#A855F7', 'Radiating energy'),

(66, '66-66', 66, 66, 'Galactic', '✓', '#10B981', 'Galaxy ruler'),
(67, '67-67', 67, 67, 'Interstellar', '✔', '#10B981', 'Between stars'),
(68, '68-68', 68, 68, 'Universal', '✕', '#F59E0B', 'All encompassing'),
(69, '69-69', 69, 69, 'Multiversal', '✖', '#F59E0B', 'Multiple realities'),
(70, '70-70', 70, 70, 'Omniversal', '✗', '#F59E0B', 'All universes'),

-- Levels 71-80: Omnipotent (Power symbols)
(71, '71-71', 71, 71, 'Omnipotent', '✘', '#EF4444', 'All powerful'),
(72, '72-72', 72, 72, 'Omniscient', '✙', '#EF4444', 'All knowing'),
(73, '73-73', 73, 73, 'Omnipresent', '✚', '#EF4444', 'Everywhere'),
(74, '74-74', 74, 74, 'Absolute', '✛', '#EF4444', 'Without limit'),
(75, '75-75', 75, 75, 'Ultimate', '✜', '#EF4444', 'Final form'),

(76, '76-76', 76, 76, 'Primordial', '✝', '#DC2626', 'First being'),
(77, '77-77', 77, 77, 'Alpha', '✞', '#DC2626', 'First letter'),
(78, '78-78', 78, 78, 'Omega', '✟', '#DC2626', 'Last letter'),
(79, '79-79', 79, 79, 'Infinity', '✠', '#DC2626', 'Endless'),
(80, '80-80', 80, 80, 'Eternity', '✡', '#DC2626', 'Forever'),

-- Levels 81-90: Beyond (Abstract and mystical)
(81, '81-81', 81, 81, 'Void', '✢', '#991B1B', 'Empty space'),
(82, '82-82', 82, 82, 'Abyss', '✣', '#991B1B', 'Bottomless pit'),
(83, '83-83', 83, 83, 'Chaos', '✤', '#991B1B', 'Disorder'),
(84, '84-84', 84, 84, 'Order', '✥', '#991B1B', 'Perfect structure'),
(85, '85-85', 85, 85, 'Balance', '✦', '#991B1B', 'Harmony'),

(86, '86-86', 86, 86, 'Unity', '✧', '#7C2D12', 'One with all'),
(87, '87-87', 87, 87, 'Singularity', '✨', '#7C2D12', 'Point of infinity'),
(88, '88-88', 88, 88, 'Nexus', '✩', '#7C2D12', 'Connection point'),
(89, '89-89', 89, 89, 'Convergence', '✪', '#7C2D12', 'All paths meet'),
(90, '90-90', 90, 90, 'Transcendence', '✫', '#7C2D12', 'Beyond all'),

-- Levels 91-100: Ultimate (Final symbols)
(91, '91-91', 91, 91, 'Paragon', '✬', '#78350F', 'Perfect example'),
(92, '92-92', 92, 92, 'Apex', '✭', '#78350F', 'Highest point'),
(93, '93-93', 93, 93, 'Zenith', '✮', '#78350F', 'Peak achievement'),
(94, '94-94', 94, 94, 'Pinnacle', '✯', '#78350F', 'Ultimate height'),
(95, '95-95', 95, 95, 'Summit', '✰', '#78350F', 'Mountain top'),

(96, '96-96', 96, 96, 'Crown', '✱', '#92400E', 'Royalty'),
(97, '97-97', 97, 97, 'Throne', '✲', '#92400E', 'Ruler seat'),
(98, '98-98', 98, 98, 'Empire', '✳', '#92400E', 'Vast domain'),
(99, '99-99', 99, 99, 'Realm', '✴', '#92400E', 'Complete domain'),
(100, '100-100', 100, 100, 'Omniverse', '✵', '#92400E', 'All that exists');

-- Update the update_user_ranking function to use the new tier system
CREATE OR REPLACE FUNCTION public.update_user_ranking(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_level INTEGER;
    v_total_xp INTEGER;
    v_tier INTEGER;
    v_title TEXT;
    v_symbol TEXT;
    v_image_url TEXT;
BEGIN
    -- Get user's level and XP
    SELECT current_level, total_xp INTO v_level, v_total_xp
    FROM public.user_xp
    WHERE user_id = p_user_id;

    -- Find appropriate tier based on level
    SELECT tier, title, symbol INTO v_tier, v_title, v_symbol
    FROM public.ranking_tiers
    WHERE min_level <= v_level AND max_level >= v_level
    ORDER BY tier DESC
    LIMIT 1;

    -- If no tier found, default to tier 1
    IF v_tier IS NULL THEN
        SELECT tier, title, symbol INTO v_tier, v_title, v_symbol
        FROM public.ranking_tiers
        WHERE tier = 1;
    END IF;

    -- Update or insert ranking with symbol
    INSERT INTO public.user_rankings (user_id, rank_title, rank_tier, rank_image_url)
    VALUES (p_user_id, v_symbol || ' ' || v_title, v_tier, NULL)
    ON CONFLICT (user_id) DO UPDATE SET
        rank_title = EXCLUDED.rank_title,
        rank_tier = EXCLUDED.rank_tier,
        rank_image_url = EXCLUDED.rank_image_url;
END;
$$;

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ 100 LEVEL RANK SYSTEM CREATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Created 100 ranking tiers';
    RAISE NOTICE '🎖️ Each level has unique custom symbol';
    RAISE NOTICE '🌈 Color-coded progression system';
    RAISE NOTICE '';
END $$;

SELECT '✅ 100 Level Rank System with Custom Symbols Created Successfully!' as status;
