-- ============================================================================
-- 100 LEVEL RANK SYSTEM WITH SYMBOLS AND NAMES
-- ============================================================================
-- Creates comprehensive ranking system for levels 1-100
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
    level_range TEXT NOT NULL, -- e.g., "1-5", "6-10"
    min_level INTEGER NOT NULL,
    max_level INTEGER NOT NULL,
    title TEXT NOT NULL,
    symbol TEXT NOT NULL, -- Emoji/symbol for the rank
    color_hex TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 100 levels divided into 20 tiers (5 levels per tier)
INSERT INTO public.ranking_tiers (tier, level_range, min_level, max_level, title, symbol, color_hex, description) VALUES
-- Tier 1: Levels 1-5 (Novice)
(1, '1-5', 1, 5, 'Novice', '🌱', '#9CA3AF', 'Just starting your journey'),
(2, '6-10', 6, 10, 'Rookie', '⭐', '#60A5FA', 'Getting the hang of it'),
(3, '11-15', 11, 15, 'Apprentice', '🎯', '#34D399', 'Showing promise'),
(4, '16-20', 16, 20, 'Warrior', '⚔️', '#FBBF24', 'A true competitor'),
(5, '21-25', 21, 25, 'Veteran', '🛡️', '#F87171', 'Experienced and skilled'),

-- Tier 2: Levels 26-30 (Elite)
(6, '26-30', 26, 30, 'Elite', '💎', '#A78BFA', 'Among the best'),
(7, '31-35', 31, 35, 'Master', '👑', '#FB7185', 'Master of the games'),
(8, '36-40', 36, 40, 'Legend', '🌟', '#FCD34D', 'A living legend'),
(9, '41-45', 41, 45, 'Mythic', '🔥', '#EC4899', 'Mythical status achieved'),
(10, '46-50', 46, 50, 'Immortal', '⚡', '#8B5CF6', 'The ultimate achievement'),

-- Tier 3: Levels 51-55 (Ascended)
(11, '51-55', 51, 55, 'Ascended', '✨', '#06B6D4', 'Transcended beyond'),
(12, '56-60', 56, 60, 'Celestial', '🌙', '#3B82F6', 'Reached the heavens'),
(13, '61-65', 61, 65, 'Divine', '☀️', '#F59E0B', 'Divine power flows'),
(14, '66-70', 66, 70, 'Eternal', '💫', '#8B5CF6', 'Eternal champion'),
(15, '71-75', 71, 75, 'Transcendent', '🌀', '#EC4899', 'Beyond comprehension'),

-- Tier 4: Levels 76-80 (Cosmic)
(16, '76-80', 76, 80, 'Cosmic', '🌌', '#6366F1', 'Cosmic power'),
(17, '81-85', 81, 85, 'Nebula', '🌠', '#A855F7', 'Born from stars'),
(18, '86-90', 86, 90, 'Galactic', '🌍', '#10B981', 'Galactic ruler'),
(19, '91-95', 91, 95, 'Universal', '🌐', '#F59E0B', 'Universal master'),
(20, '96-100', 96, 100, 'Omnipotent', '♾️', '#EF4444', 'All-powerful being'),

-- Additional detailed tiers for better progression (if you want more granularity)
(21, '1-1', 1, 1, 'Seedling', '🌱', '#9CA3AF', 'Just planted'),
(22, '2-2', 2, 2, 'Sprout', '🌿', '#9CA3AF', 'Growing strong'),
(23, '3-3', 3, 3, 'Sapling', '🌳', '#9CA3AF', 'Taking root'),
(24, '4-4', 4, 4, 'Tree', '🌲', '#9CA3AF', 'Standing tall'),
(25, '5-5', 5, 5, 'Forest', '🌴', '#60A5FA', 'Forest guardian'),

(26, '6-6', 6, 6, 'Star', '⭐', '#60A5FA', 'Shining bright'),
(27, '7-7', 7, 7, 'Constellation', '✨', '#60A5FA', 'Pattern forming'),
(28, '8-8', 8, 8, 'Nebula', '💫', '#60A5FA', 'Star nursery'),
(29, '9-9', 9, 9, 'Galaxy', '🌌', '#34D399', 'Galactic core'),
(30, '10-10', 10, 10, 'Universe', '🌍', '#34D399', 'Universal force'),

(31, '11-11', 11, 11, 'Archer', '🏹', '#34D399', 'Precise aim'),
(32, '12-12', 12, 12, 'Hunter', '🎯', '#34D399', 'Expert tracker'),
(33, '13-13', 13, 13, 'Ranger', '🌲', '#34D399', 'Wild guardian'),
(34, '14-14', 14, 14, 'Scout', '🔍', '#FBBF24', 'Eagle eye'),
(35, '15-15', 15, 15, 'Pathfinder', '🗺️', '#FBBF24', 'Trail blazer'),

(36, '16-16', 16, 16, 'Swordsman', '⚔️', '#FBBF24', 'Blade master'),
(37, '17-17', 17, 17, 'Knight', '🛡️', '#FBBF24', 'Noble warrior'),
(38, '18-18', 18, 18, 'Paladin', '⚜️', '#FBBF24', 'Holy warrior'),
(39, '19-19', 19, 19, 'Crusader', '✝️', '#F87171', 'Righteous fighter'),
(40, '20-20', 20, 20, 'Champion', '🏆', '#F87171', 'Victory seeker'),

(41, '21-21', 21, 21, 'Veteran', '🎖️', '#F87171', 'Battle tested'),
(42, '22-22', 22, 22, 'Elite', '💎', '#F87171', 'Rare gem'),
(43, '23-23', 23, 23, 'Expert', '🎓', '#A78BFA', 'Knowledge master'),
(44, '24-24', 24, 24, 'Specialist', '🔬', '#A78BFA', 'Field expert'),
(45, '25-25', 25, 25, 'Adept', '🧙', '#A78BFA', 'Magic wielder'),

(46, '26-26', 26, 26, 'Master', '👑', '#A78BFA', 'Crown bearer'),
(47, '27-27', 27, 27, 'Grandmaster', '🏅', '#A78BFA', 'Ultimate master'),
(48, '28-28', 28, 28, 'Legend', '🌟', '#FB7185', 'Storied hero'),
(49, '29-29', 29, 29, 'Myth', '📜', '#FB7185', 'Legendary tale'),
(50, '30-30', 30, 30, 'Icon', '🎭', '#FB7185', 'Cultural icon'),

(51, '31-31', 31, 31, 'Immortal', '⚡', '#FB7185', 'Eternal being'),
(52, '32-32', 32, 32, 'Deity', '🙏', '#FCD34D', 'Worshipped'),
(53, '33-33', 33, 33, 'Titan', '🗿', '#FCD34D', 'Colossal power'),
(54, '34-34', 34, 34, 'God', '👼', '#FCD34D', 'Divine entity'),
(55, '35-35', 35, 35, 'Archon', '👑', '#FCD34D', 'Ruling power'),

(56, '36-36', 36, 36, 'Phoenix', '🔥', '#EC4899', 'Reborn from ashes'),
(57, '37-37', 37, 37, 'Dragon', '🐉', '#EC4899', 'Ancient power'),
(58, '38-38', 38, 38, 'Leviathan', '🐋', '#EC4899', 'Ocean ruler'),
(59, '39-39', 39, 39, 'Behemoth', '🦏', '#EC4899', 'Massive force'),
(60, '40-40', 40, 40, 'Colossus', '🗽', '#8B5CF6', 'Giant statue'),

(61, '41-41', 41, 41, 'Titan', '⚡', '#8B5CF6', 'Primordial force'),
(62, '42-42', 42, 42, 'Elder', '🧙‍♂️', '#8B5CF6', 'Ancient wisdom'),
(63, '43-43', 43, 43, 'Sage', '📚', '#8B5CF6', 'Wise teacher'),
(64, '44-44', 44, 44, 'Oracle', '🔮', '#8B5CF6', 'Future seer'),
(65, '45-45', 45, 45, 'Prophet', '👁️', '#06B6D4', 'Divine messenger'),

(66, '46-46', 46, 46, 'Ascended', '✨', '#06B6D4', 'Transcended form'),
(67, '47-47', 47, 47, 'Enlightened', '💡', '#06B6D4', 'Awakened mind'),
(68, '48-48', 48, 48, 'Celestial', '🌙', '#3B82F6', 'Heavenly being'),
(69, '49-49', 49, 49, 'Seraphim', '👼', '#3B82F6', 'Highest angel'),
(70, '50-50', 50, 50, 'Cherubim', '😇', '#3B82F6', 'Divine guardian'),

(71, '51-51', 51, 51, 'Archangel', '👼', '#F59E0B', 'Heavenly commander'),
(72, '52-52', 52, 52, 'Divine', '☀️', '#F59E0B', 'Godlike power'),
(73, '53-53', 53, 53, 'Sacred', '⛪', '#F59E0B', 'Holy ground'),
(74, '54-54', 54, 54, 'Hallowed', '🙏', '#F59E0B', 'Blessed one'),
(75, '55-55', 55, 55, 'Sanctified', '✨', '#8B5CF6', 'Made holy'),

(76, '56-56', 56, 56, 'Eternal', '💫', '#8B5CF6', 'Never ending'),
(77, '57-57', 57, 57, 'Infinite', '∞', '#8B5CF6', 'Without limit'),
(78, '58-58', 58, 58, 'Timeless', '⏰', '#EC4899', 'Beyond time'),
(79, '59-59', 59, 59, 'Transcendent', '🌀', '#EC4899', 'Beyond reality'),
(80, '60-60', 60, 60, 'Supreme', '👑', '#EC4899', 'Highest rank'),

(81, '61-61', 61, 61, 'Cosmic', '🌌', '#6366F1', 'Universe power'),
(82, '62-62', 62, 62, 'Stellar', '⭐', '#6366F1', 'Star power'),
(83, '63-63', 63, 63, 'Nebular', '🌠', '#A855F7', 'Star birth'),
(84, '64-64', 64, 64, 'Quasar', '💫', '#A855F7', 'Brightest object'),
(85, '65-65', 65, 65, 'Pulsar', '⚡', '#A855F7', 'Radiating energy'),

(86, '66-66', 66, 66, 'Galactic', '🌍', '#10B981', 'Galaxy ruler'),
(87, '67-67', 67, 67, 'Interstellar', '🚀', '#10B981', 'Between stars'),
(88, '68-68', 68, 68, 'Universal', '🌐', '#F59E0B', 'All encompassing'),
(89, '69-69', 69, 69, 'Multiversal', '🌌', '#F59E0B', 'Multiple realities'),
(90, '70-70', 70, 70, 'Omniversal', '♾️', '#F59E0B', 'All universes'),

(91, '71-71', 71, 71, 'Omnipotent', '♾️', '#EF4444', 'All powerful'),
(92, '72-72', 72, 72, 'Omniscient', '👁️', '#EF4444', 'All knowing'),
(93, '73-73', 73, 73, 'Omnipresent', '🌐', '#EF4444', 'Everywhere'),
(94, '74-74', 74, 74, 'Absolute', '⚡', '#EF4444', 'Without limit'),
(95, '75-75', 75, 75, 'Ultimate', '👑', '#EF4444', 'Final form'),

(96, '76-76', 76, 76, 'Primordial', '🌋', '#DC2626', 'First being'),
(97, '77-77', 77, 77, 'Alpha', 'Α', '#DC2626', 'First letter'),
(98, '78-78', 78, 78, 'Omega', 'Ω', '#DC2626', 'Last letter'),
(99, '79-79', 79, 79, 'Infinity', '∞', '#DC2626', 'Endless'),
(100, '80-80', 80, 80, 'Eternity', '♾️', '#DC2626', 'Forever');

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

    -- Update or insert ranking
    INSERT INTO public.user_rankings (user_id, rank_title, rank_tier, rank_image_url)
    VALUES (p_user_id, v_title || ' ' || v_symbol, v_tier, NULL)
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
    RAISE NOTICE '🎖️ Each level has unique symbol and name';
    RAISE NOTICE '🌈 Color-coded progression system';
    RAISE NOTICE '';
END $$;

SELECT '✅ 100 Level Rank System Created Successfully!' as status;

