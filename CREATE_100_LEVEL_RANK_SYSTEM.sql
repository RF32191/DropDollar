-- ============================================================================
-- 100 LEVEL RANK SYSTEM WITH UNIQUE UNICODE SYMBOLS (NOT EMOJIS)
-- ============================================================================
-- Creates comprehensive ranking system for levels 1-100 with unique Unicode symbols
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
    symbol TEXT NOT NULL, -- Unique Unicode symbol (not emoji)
    color_hex TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 100 levels with unique Unicode symbols (mathematical, geometric, alchemical, etc.)
INSERT INTO public.ranking_tiers (tier, level_range, min_level, max_level, title, symbol, color_hex, description) VALUES
-- Levels 1-10: Basic Geometric (Simple shapes)
(1, '1-1', 1, 1, 'Stardust', '◉', '#60A5FA', 'Tiny particles'),
(2, '2-2', 2, 2, 'Nebula Seed', '◈', '#60A5FA', 'Star forming'),
(3, '3-3', 3, 3, 'Cosmic Spark', '◊', '#34D399', 'Bright flash'),
(4, '4-4', 4, 4, 'Stellar Core', '◆', '#34D399', 'Star heart'),
(5, '5-5', 5, 5, 'Star Cluster', '◇', '#FBBF24', 'Star group'),

(6, '6-6', 6, 6, 'Constellation', '◐', '#FBBF24', 'Star pattern'),
(7, '7-7', 7, 7, 'Galaxy Seed', '◑', '#FBBF24', 'Galaxy birth'),
(8, '8-8', 8, 8, 'Nebula', '◒', '#F87171', 'Star nursery'),
(9, '9-9', 9, 9, 'Stellar', '◓', '#F87171', 'Star power'),
(10, '10-10', 10, 10, 'Luminous', '◔', '#A78BFA', 'Radiant light'),

-- Levels 11-20: Advanced Geometric (Complex shapes)
(11, '11-11', 11, 11, 'Planetoid', '◕', '#A78BFA', 'Small planet'),
(12, '12-12', 12, 12, 'Moon', '◖', '#A78BFA', 'Lunar body'),
(13, '13-13', 13, 13, 'Planet', '◗', '#A78BFA', 'World'),
(14, '14-14', 14, 14, 'Gas Giant', '◘', '#FB7185', 'Massive planet'),
(15, '15-15', 15, 15, 'Star System', '◙', '#FB7185', 'Solar system'),

(16, '16-16', 16, 16, 'Binary Star', '◚', '#FB7185', 'Twin stars'),
(17, '17-17', 17, 17, 'Trinary', '◛', '#FCD34D', 'Triple stars'),
(18, '18-18', 18, 18, 'Quasar', '◜', '#FCD34D', 'Brightest object'),
(19, '19-19', 19, 19, 'Pulsar', '◝', '#FCD34D', 'Radiating'),
(20, '20-20', 20, 20, 'Supernova', '◞', '#EC4899', 'Star explosion'),

-- Levels 21-30: Mathematical Symbols (Math and science)
(21, '21-21', 21, 21, 'Spiral Galaxy', '◟', '#EC4899', 'Spiral arms'),
(22, '22-22', 22, 22, 'Elliptical', '◠', '#EC4899', 'Oval galaxy'),
(23, '23-23', 23, 23, 'Galactic Core', '◡', '#8B5CF6', 'Center'),
(24, '24-24', 24, 24, 'Galaxy Cluster', '☀', '#8B5CF6', 'Many galaxies'),
(25, '25-25', 25, 25, 'Supercluster', '☁', '#8B5CF6', 'Galaxy groups'),

(26, '26-26', 26, 26, 'Cosmic Web', '☂', '#06B6D4', 'Universe structure'),
(27, '27-27', 27, 27, 'Void', '☃', '#06B6D4', 'Empty space'),
(28, '28-28', 28, 28, 'Dark Matter', '☄', '#3B82F6', 'Invisible mass'),
(29, '29-29', 29, 29, 'Dark Energy', '★', '#3B82F6', 'Cosmic force'),
(30, '30-30', 30, 30, 'Universe', '☆', '#3B82F6', 'All space'),

-- Levels 31-40: Alchemical Symbols (Mystical)
(31, '31-31', 31, 31, 'Quantum', '☇', '#F59E0B', 'Quantum power'),
(32, '32-32', 32, 32, 'Plasma', '☈', '#F59E0B', 'Ionized matter'),
(33, '33-33', 33, 33, 'Magnetic', '☉', '#F59E0B', 'Field force'),
(34, '34-34', 34, 34, 'Gravitational', '☊', '#8B5CF6', 'Gravity well'),
(35, '35-35', 35, 35, 'Electromagnetic', '☋', '#8B5CF6', 'EM field'),

(36, '36-36', 36, 36, 'Singularity', '☌', '#EC4899', 'Point of infinity'),
(37, '37-37', 37, 37, 'Black Hole', '☍', '#EC4899', 'Event horizon'),
(38, '38-38', 38, 38, 'Wormhole', '☎', '#EC4899', 'Space tunnel'),
(39, '39-39', 39, 39, 'White Hole', '☏', '#EC4899', 'Reverse black hole'),
(40, '40-40', 40, 40, 'Einstein Ring', '☐', '#6366F1', 'Gravitational lens'),

-- Levels 41-50: Technical Symbols (Advanced)
(41, '41-41', 41, 41, 'Asteroid', '☑', '#6366F1', 'Space rock'),
(42, '42-42', 42, 42, 'Comet', '☒', '#6366F1', 'Icy body'),
(43, '43-43', 43, 43, 'Meteor', '☓', '#A855F7', 'Shooting star'),
(44, '44-44', 44, 44, 'Meteorite', '☔', '#A855F7', 'Impact body'),
(45, '45-45', 45, 45, 'Asteroid Belt', '☕', '#A855F7', 'Rock field'),

(46, '46-46', 46, 46, 'Kuiper Belt', '☖', '#10B981', 'Ice field'),
(47, '47-47', 47, 47, 'Oort Cloud', '☗', '#10B981', 'Distant cloud'),
(48, '48-48', 48, 48, 'Protoplanet', '☘', '#F59E0B', 'Planet forming'),
(49, '49-49', 49, 49, 'Exoplanet', '☙', '#F59E0B', 'Alien world'),
(50, '50-50', 50, 50, 'Rogue Planet', '☚', '#F59E0B', 'Orphan planet'),

-- Levels 51-60: Astrological Symbols (Celestial)
(51, '51-51', 51, 51, 'Solar Flare', '☛', '#EF4444', 'Star burst'),
(52, '52-52', 52, 52, 'Corona', '☜', '#EF4444', 'Star atmosphere'),
(53, '53-53', 53, 53, 'Solar Wind', '☝', '#EF4444', 'Particle stream'),
(54, '54-54', 54, 54, 'Magnetosphere', '☞', '#EF4444', 'Magnetic field'),
(55, '55-55', 55, 55, 'Heliosphere', '☟', '#DC2626', 'Solar bubble'),

(56, '56-56', 56, 56, 'Aurora', '☠', '#DC2626', 'Northern lights'),
(57, '57-57', 57, 57, 'Cosmic Ray', '☡', '#DC2626', 'High energy'),
(58, '58-58', 58, 58, 'Gamma Burst', '☢', '#DC2626', 'Explosive energy'),
(59, '59-59', 59, 59, 'X-Ray Binary', '☣', '#DC2626', 'X-ray source'),
(60, '60-60', 60, 60, 'Gamma Source', '☤', '#991B1B', 'Gamma emitter'),

-- Levels 61-70: Currency & Symbol Mix (Unique combinations)
(61, '61-61', 61, 61, 'Parallel', '☥', '#991B1B', 'Alternate reality'),
(62, '62-62', 62, 62, 'Multiverse', '☦', '#991B1B', 'Many realities'),
(63, '63-63', 63, 63, 'Megaverse', '☧', '#991B1B', 'Reality cluster'),
(64, '64-64', 64, 64, 'Omniverse', '☨', '#7C2D12', 'All realities'),
(65, '65-65', 65, 65, 'Hyperverse', '☩', '#7C2D12', 'Beyond multiverse'),

(66, '66-66', 66, 66, 'Dimension', '☪', '#7C2D12', 'Spatial dimension'),
(67, '67-67', 67, 67, 'Hyperspace', '☫', '#7C2D12', 'Higher dimension'),
(68, '68-68', 68, 68, 'Brane', '☬', '#7C2D12', 'Membrane theory'),
(69, '69-69', 69, 69, 'Bulk', '☭', '#78350F', 'Higher space'),
(70, '70-70', 70, 70, 'Bulk Space', '☮', '#78350F', 'Ultimate dimension'),

-- Levels 71-80: Special Symbols (Rare Unicode)
(71, '71-71', 71, 71, 'Star Forge', '☯', '#78350F', 'Star creator'),
(72, '72-72', 72, 72, 'Galaxy Forge', '☰', '#78350F', 'Galaxy creator'),
(73, '73-73', 73, 73, 'Universe Forge', '☱', '#92400E', 'Universe creator'),
(74, '74-74', 74, 74, 'Cosmic Forge', '☲', '#92400E', 'Cosmos creator'),
(75, '75-75', 75, 75, 'Reality Forge', '☳', '#92400E', 'Reality creator'),

(76, '76-76', 76, 76, 'Star Eater', '☴', '#92400E', 'Consumes stars'),
(77, '77-77', 77, 77, 'Galaxy Eater', '☵', '#92400E', 'Consumes galaxies'),
(78, '78-78', 78, 78, 'Universe Eater', '☶', '#92400E', 'Consumes universes'),
(79, '79-79', 79, 79, 'Void Eater', '☷', '#92400E', 'Consumes void'),
(80, '80-80', 80, 80, 'Reality Eater', '☸', '#92400E', 'Consumes reality'),

-- Levels 81-90: Mathematical Operators (Advanced math)
(81, '81-81', 81, 81, 'Big Bang', '☹', '#78350F', 'Origin point'),
(82, '82-82', 82, 82, 'Inflation', '☺', '#78350F', 'Rapid expansion'),
(83, '83-83', 83, 83, 'Recombination', '☻', '#78350F', 'Matter formation'),
(84, '84-84', 84, 84, 'Structure', '☼', '#78350F', 'Cosmic structure'),
(85, '85-85', 85, 85, 'Formation', '☽', '#78350F', 'Everything forms'),

(86, '86-86', 86, 86, 'Primordial', '☾', '#92400E', 'First being'),
(87, '87-87', 87, 87, 'Alpha', '☿', '#92400E', 'First letter'),
(88, '88-88', 88, 88, 'Omega', '♀', '#92400E', 'Last letter'),
(89, '89-89', 89, 89, 'Infinity', '♁', '#92400E', 'Endless'),
(90, '90-90', 90, 90, 'Eternity', '♂', '#92400E', 'Forever'),

-- Levels 91-100: Ultimate Symbols (Rare and powerful)
(91, '91-91', 91, 91, 'Cosmic', '♃', '#F59E0B', 'Universe power'),
(92, '92-92', 92, 92, 'Stellar', '♄', '#F59E0B', 'Star power'),
(93, '93-93', 93, 93, 'Galactic', '♅', '#F59E0B', 'Galaxy power'),
(94, '94-94', 94, 94, 'Universal', '♆', '#F59E0B', 'Universe power'),
(95, '95-95', 95, 95, 'Multiversal', '♇', '#F59E0B', 'Multiverse power'),

(96, '96-96', 96, 96, 'Omniversal', '♈', '#EF4444', 'All universes'),
(97, '97-97', 97, 97, 'Omnipotent', '♉', '#EF4444', 'All powerful'),
(98, '98-98', 98, 98, 'Omniscient', '♊', '#EF4444', 'All knowing'),
(99, '99-99', 99, 99, 'Omnipresent', '♋', '#EF4444', 'Everywhere'),
(100, '100-100', 100, 100, 'Omniverse', '♌', '#EF4444', 'All that exists');

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
    RAISE NOTICE '✨ Unique Unicode symbols (not emojis)';
    RAISE NOTICE '🌈 Color-coded progression system';
    RAISE NOTICE '';
END $$;

SELECT '✅ 100 Level Rank System with Unique Unicode Symbols Created Successfully!' as status;
