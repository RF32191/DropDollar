-- ============================================================================
-- 100 LEVEL RANK SYSTEM WITH HALO/COD STYLE MILITARY SYMBOLS
-- ============================================================================
-- Creates comprehensive ranking system for levels 1-100 with military-style symbols
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
    symbol TEXT NOT NULL, -- Military-style symbol
    color_hex TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 100 levels with Halo 3 / Call of Duty style military rank symbols
-- Using Unicode characters that look like military insignia
INSERT INTO public.ranking_tiers (tier, level_range, min_level, max_level, title, symbol, color_hex, description) VALUES
-- Levels 1-10: Recruit to Private (Basic ranks)
(1, '1-1', 1, 1, 'Recruit', '▱', '#9CA3AF', 'Just enlisted'),
(2, '2-2', 2, 2, 'Private', '▰', '#9CA3AF', 'Basic training complete'),
(3, '3-3', 3, 3, 'Private First Class', '▱▱', '#9CA3AF', 'First promotion'),
(4, '4-4', 4, 4, 'Specialist', '▰▰', '#9CA3AF', 'Specialized training'),
(5, '5-5', 5, 5, 'Corporal', '▱▱▱', '#60A5FA', 'Junior NCO'),

(6, '6-6', 6, 6, 'Sergeant', '▲', '#60A5FA', 'First NCO rank'),
(7, '7-7', 7, 7, 'Staff Sergeant', '▲▲', '#60A5FA', 'Experienced NCO'),
(8, '8-8', 8, 8, 'Sergeant First Class', '▲▲▲', '#60A5FA', 'Senior NCO'),
(9, '9-9', 9, 9, 'Master Sergeant', '▲▲▲▲', '#34D399', 'Master NCO'),
(10, '10-10', 10, 10, 'First Sergeant', '▲▲▲▲▲', '#34D399', 'Top NCO'),

-- Levels 11-20: Officer Ranks (Warrant Officers and Lieutenants)
(11, '11-11', 11, 11, 'Warrant Officer', '◄', '#34D399', 'Technical expert'),
(12, '12-12', 12, 12, 'Chief Warrant Officer', '◄◄', '#34D399', 'Senior technical'),
(13, '13-13', 13, 13, 'Second Lieutenant', '▬', '#34D399', 'Junior officer'),
(14, '14-14', 14, 14, 'First Lieutenant', '▬▬', '#FBBF24', 'Experienced officer'),
(15, '15-15', 15, 15, 'Captain', '▬▬▬', '#FBBF24', 'Company commander'),

(16, '16-16', 16, 16, 'Major', '■', '#FBBF24', 'Battalion officer'),
(17, '17-17', 17, 17, 'Lieutenant Colonel', '■■', '#FBBF24', 'Regiment officer'),
(18, '18-18', 18, 18, 'Colonel', '■■■', '#FBBF24', 'Regiment commander'),
(19, '19-19', 19, 19, 'Brigadier General', '★', '#F87171', 'Brigade commander'),
(20, '20-20', 20, 20, 'Major General', '★★', '#F87171', 'Division commander'),

-- Levels 21-30: High Command (Generals and Admirals)
(21, '21-21', 21, 21, 'Lieutenant General', '★★★', '#F87171', 'Corps commander'),
(22, '22-22', 22, 22, 'General', '★★★★', '#F87171', 'Army commander'),
(23, '23-23', 23, 23, 'General of the Army', '★★★★★', '#A78BFA', 'Supreme commander'),
(24, '24-24', 24, 24, 'Field Marshal', '⚡', '#A78BFA', 'Battlefield master'),
(25, '25-25', 25, 25, 'War Hero', '⚡⚡', '#A78BFA', 'Legendary warrior'),

(26, '26-26', 26, 26, 'Elite', '◆', '#A78BFA', 'Elite forces'),
(27, '27-27', 27, 27, 'Spartan', '◆◆', '#A78BFA', 'Spartan warrior'),
(28, '28-28', 28, 28, 'Legend', '◆◆◆', '#FB7185', 'Living legend'),
(29, '29-29', 29, 29, 'Mythic', '◆◆◆◆', '#FB7185', 'Mythical status'),
(30, '30-30', 30, 30, 'Immortal', '◆◆◆◆◆', '#FB7185', 'Immortal warrior'),

-- Levels 31-40: Special Forces (Advanced military symbols)
(31, '31-31', 31, 31, 'Ghost', '◈', '#FB7185', 'Unseen operative'),
(32, '32-32', 32, 32, 'Spectre', '◈◈', '#FCD34D', 'Shadow warrior'),
(33, '33-33', 33, 33, 'Phantom', '◈◈◈', '#FCD34D', 'Elite operative'),
(34, '34-34', 34, 34, 'Reaper', '◈◈◈◈', '#FCD34D', 'Death dealer'),
(35, '35-35', 35, 35, 'Wraith', '◈◈◈◈◈', '#FCD34D', 'Unstoppable force'),

(36, '36-36', 36, 36, 'Demon', '◉', '#EC4899', 'Hellish warrior'),
(37, '37-37', 37, 37, 'Titan', '◉◉', '#EC4899', 'Colossal power'),
(38, '38-38', 38, 38, 'Behemoth', '◉◉◉', '#EC4899', 'Massive force'),
(39, '39-39', 39, 39, 'Leviathan', '◉◉◉◉', '#EC4899', 'Ocean ruler'),
(40, '40-40', 40, 40, 'Colossus', '◉◉◉◉◉', '#8B5CF6', 'Giant warrior'),

-- Levels 41-50: Advanced Combat (Shield and Cross symbols)
(41, '41-41', 41, 41, 'Guardian', '◊', '#8B5CF6', 'Protector'),
(42, '42-42', 42, 42, 'Sentinel', '◊◊', '#8B5CF6', 'Watchful guard'),
(43, '43-43', 43, 43, 'Defender', '◊◊◊', '#8B5CF6', 'Fortress defender'),
(44, '44-44', 44, 44, 'Protector', '◊◊◊◊', '#8B5CF6', 'Shield bearer'),
(45, '45-45', 45, 45, 'Aegis', '◊◊◊◊◊', '#06B6D4', 'Divine shield'),

(46, '46-46', 46, 46, 'Crusader', '✚', '#06B6D4', 'Holy warrior'),
(47, '47-47', 47, 47, 'Paladin', '✚✚', '#06B6D4', 'Righteous fighter'),
(48, '48-48', 48, 48, 'Templar', '✚✚✚', '#3B82F6', 'Order member'),
(49, '49-49', 49, 49, 'Inquisitor', '✚✚✚✚', '#3B82F6', 'Truth seeker'),
(50, '50-50', 50, 50, 'Archon', '✚✚✚✚✚', '#3B82F6', 'Ruling power'),

-- Levels 51-60: Elite Specialists (Diamond and Star patterns)
(51, '51-51', 51, 51, 'Vanguard', '◐', '#F59E0B', 'Front line'),
(52, '52-52', 52, 52, 'Veteran', '◐◐', '#F59E0B', 'Battle tested'),
(53, '53-53', 53, 53, 'Champion', '◐◐◐', '#F59E0B', 'Victory seeker'),
(54, '54-54', 54, 54, 'Hero', '◐◐◐◐', '#F59E0B', 'Heroic warrior'),
(55, '55-55', 55, 55, 'Legend', '◐◐◐◐◐', '#8B5CF6', 'Legendary hero'),

(56, '56-56', 56, 56, 'Master', '◑', '#8B5CF6', 'Master warrior'),
(57, '57-57', 57, 57, 'Grandmaster', '◑◑', '#8B5CF6', 'Ultimate master'),
(58, '58-58', 58, 58, 'Elite', '◑◑◑', '#EC4899', 'Elite forces'),
(59, '59-59', 59, 59, 'Apex', '◑◑◑◑', '#EC4899', 'Peak warrior'),
(60, '60-60', 60, 60, 'Supreme', '◑◑◑◑◑', '#EC4899', 'Supreme warrior'),

-- Levels 61-70: Command Structure (Complex geometric patterns)
(61, '61-61', 61, 61, 'Commander', '◒', '#6366F1', 'Field commander'),
(62, '62-62', 62, 62, 'General', '◒◒', '#6366F1', 'Army general'),
(63, '63-63', 63, 63, 'Marshal', '◒◒◒', '#A855F7', 'Battle marshal'),
(64, '64-64', 64, 64, 'Admiral', '◒◒◒◒', '#A855F7', 'Fleet admiral'),
(65, '65-65', 65, 65, 'Fleet Admiral', '◒◒◒◒◒', '#A855F7', 'Supreme admiral'),

(66, '66-66', 66, 66, 'Warlord', '◓', '#10B981', 'War leader'),
(67, '67-67', 67, 67, 'Overlord', '◓◓', '#10B981', 'Domain ruler'),
(68, '68-68', 68, 68, 'Conqueror', '◓◓◓', '#F59E0B', 'World conqueror'),
(69, '69-69', 69, 69, 'Emperor', '◓◓◓◓', '#F59E0B', 'Empire ruler'),
(70, '70-70', 70, 70, 'Imperator', '◓◓◓◓◓', '#F59E0B', 'Supreme emperor'),

-- Levels 71-80: Mythical Ranks (Advanced symbols)
(71, '71-71', 71, 71, 'Titan', '◔', '#EF4444', 'Primordial force'),
(72, '72-72', 72, 72, 'Deity', '◔◔', '#EF4444', 'Divine being'),
(73, '73-73', 73, 73, 'God', '◔◔◔', '#EF4444', 'Divine entity'),
(74, '74-74', 74, 74, 'Celestial', '◔◔◔◔', '#EF4444', 'Heavenly being'),
(75, '75-75', 75, 75, 'Divine', '◔◔◔◔◔', '#EF4444', 'Godlike power'),

(76, '76-76', 76, 76, 'Eternal', '◕', '#DC2626', 'Never ending'),
(77, '77-77', 77, 77, 'Infinite', '◕◕', '#DC2626', 'Without limit'),
(78, '78-78', 78, 78, 'Transcendent', '◕◕◕', '#DC2626', 'Beyond reality'),
(79, '79-79', 79, 79, 'Omnipotent', '◕◕◕◕', '#DC2626', 'All powerful'),
(80, '80-80', 80, 80, 'Absolute', '◕◕◕◕◕', '#DC2626', 'Without limit'),

-- Levels 81-90: Cosmic Ranks (Space and universal symbols)
(81, '81-81', 81, 81, 'Stellar', '◖', '#991B1B', 'Star power'),
(82, '82-82', 82, 82, 'Nebular', '◖◖', '#991B1B', 'Star birth'),
(83, '83-83', 83, 83, 'Galactic', '◖◖◖', '#991B1B', 'Galaxy ruler'),
(84, '84-84', 84, 84, 'Universal', '◖◖◖◖', '#991B1B', 'All encompassing'),
(85, '85-85', 85, 85, 'Cosmic', '◖◖◖◖◖', '#991B1B', 'Universe power'),

(86, '86-86', 86, 86, 'Multiversal', '◗', '#7C2D12', 'Multiple realities'),
(87, '87-87', 87, 87, 'Omniversal', '◗◗', '#7C2D12', 'All universes'),
(88, '88-88', 88, 88, 'Singularity', '◗◗◗', '#7C2D12', 'Point of infinity'),
(89, '89-89', 89, 89, 'Nexus', '◗◗◗◗', '#7C2D12', 'Connection point'),
(90, '90-90', 90, 90, 'Convergence', '◗◗◗◗◗', '#7C2D12', 'All paths meet'),

-- Levels 91-100: Ultimate Ranks (Final military symbols)
(91, '91-91', 91, 91, 'Paragon', '◘', '#78350F', 'Perfect example'),
(92, '92-92', 92, 92, 'Apex', '◘◘', '#78350F', 'Highest point'),
(93, '93-93', 93, 93, 'Zenith', '◘◘◘', '#78350F', 'Peak achievement'),
(94, '94-94', 94, 94, 'Pinnacle', '◘◘◘◘', '#78350F', 'Ultimate height'),
(95, '95-95', 95, 95, 'Summit', '◘◘◘◘◘', '#78350F', 'Mountain top'),

(96, '96-96', 96, 96, 'Crown', '◙', '#92400E', 'Royalty'),
(97, '97-97', 97, 97, 'Throne', '◙◙', '#92400E', 'Ruler seat'),
(98, '98-98', 98, 98, 'Empire', '◙◙◙', '#92400E', 'Vast domain'),
(99, '99-99', 99, 99, 'Realm', '◙◙◙◙', '#92400E', 'Complete domain'),
(100, '100-100', 100, 100, 'Omniverse', '◙◙◙◙◙', '#92400E', 'All that exists');

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
    RAISE NOTICE '🎖️ Military-style symbols (Halo/COD inspired)';
    RAISE NOTICE '🌈 Color-coded progression system';
    RAISE NOTICE '';
END $$;

SELECT '✅ 100 Level Rank System with Military Symbols Created Successfully!' as status;
