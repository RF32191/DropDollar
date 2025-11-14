-- ============================================================================
-- MARKETPLACE SYSTEM - COMPLETE SETUP (FIXED)
-- Seller creates listings → Players compete in games → Winner contacts seller
-- ============================================================================

-- Drop functions first (they don't depend on tables)
DROP FUNCTION IF EXISTS public.create_marketplace_listing CASCADE;
DROP FUNCTION IF EXISTS public.get_all_marketplace_listings CASCADE;
DROP FUNCTION IF EXISTS public.get_marketplace_listing CASCADE;
DROP FUNCTION IF EXISTS public.join_marketplace_session CASCADE;
DROP FUNCTION IF EXISTS public.update_marketplace_score CASCADE;
DROP FUNCTION IF EXISTS public.process_marketplace_winner CASCADE;
DROP FUNCTION IF EXISTS public.reset_marketplace_session CASCADE;
DROP FUNCTION IF EXISTS public.contact_seller CASCADE;
DROP FUNCTION IF EXISTS auto_start_marketplace_timer() CASCADE;

-- Drop tables (CASCADE will drop triggers automatically)
DROP TABLE IF EXISTS public.marketplace_participants CASCADE;
DROP TABLE IF EXISTS public.marketplace_sessions CASCADE;
DROP TABLE IF EXISTS public.marketplace_listings CASCADE;

-- ============================================================================
-- TABLE: marketplace_listings
-- Stores seller-created listings with product info and game selection
-- ============================================================================
CREATE TABLE public.marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Product Information
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- electronics, dropafund, fun, etc.
    base_price NUMERIC NOT NULL CHECK (base_price > 0),
    
    -- Game Selection
    game_type TEXT NOT NULL CHECK (game_type IN ('crypto_match', 'laser_dodge', 'alien_shooter', 'brain_freeze')),
    
    -- Shipping & Contact
    shipping_included BOOLEAN DEFAULT true,
    seller_contact TEXT, -- Email or phone (encrypted)
    seller_username TEXT,
    
    -- Image URLs (JSON array)
    image_urls JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    
    -- Timer Configuration (like WTA)
    timer_duration INTEGER DEFAULT 7200, -- 2 hours in seconds
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_category CHECK (category IN ('electronics', 'dropafund', 'fun', 'tools', 'music', 'books', 'art', 'cars', 'photos', 'sports', 'home', 'fashion', 'collectibles', 'automotive', 'all'))
);

-- ============================================================================
-- TABLE: marketplace_sessions
-- Active gaming sessions for each listing (like WTA sessions)
-- ============================================================================
CREATE TABLE public.marketplace_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
    
    -- Session Stats
    prize_pool NUMERIC DEFAULT 0, -- Total amount collected
    participants_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
    
    -- Timer (starts when prize_pool >= base_price)
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER DEFAULT 7200, -- 2 hours
    
    -- Winner Information
    winner_user_id UUID REFERENCES public.users(id),
    winner_username TEXT,
    winner_score NUMERIC,
    winner_contacted BOOLEAN DEFAULT false,
    
    -- RNG Seed for fair gaming
    rng_seed INTEGER NOT NULL,
    
    -- Payout tracking
    completed_at TIMESTAMPTZ,
    
    -- Base price (copied from listing for reference)
    base_price NUMERIC NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(listing_id) -- One active session per listing
);

-- ============================================================================
-- TABLE: marketplace_participants
-- Players who joined a marketplace session
-- ============================================================================
CREATE TABLE public.marketplace_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.marketplace_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Entry Information
    entry_amount NUMERIC NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Game Results
    score NUMERIC,
    accuracy NUMERIC,
    completed_at TIMESTAMPTZ,
    
    -- Unique constraint: one entry per user per session
    UNIQUE(session_id, user_id)
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX idx_marketplace_listings_category ON public.marketplace_listings(category);
CREATE INDEX idx_marketplace_listings_seller ON public.marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX idx_marketplace_sessions_listing ON public.marketplace_sessions(listing_id);
CREATE INDEX idx_marketplace_sessions_status ON public.marketplace_sessions(status);
CREATE INDEX idx_marketplace_participants_session ON public.marketplace_participants(session_id);
CREATE INDEX idx_marketplace_participants_user ON public.marketplace_participants(user_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_participants ENABLE ROW LEVEL SECURITY;

-- Everyone can view active listings
CREATE POLICY "Anyone can view active marketplace listings"
    ON public.marketplace_listings FOR SELECT
    USING (status = 'active');

-- Sellers can insert their own listings
CREATE POLICY "Users can create marketplace listings"
    ON public.marketplace_listings FOR INSERT
    WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own listings
CREATE POLICY "Sellers can update their own listings"
    ON public.marketplace_listings FOR UPDATE
    USING (auth.uid() = seller_id);

-- Everyone can view active/waiting sessions
CREATE POLICY "Anyone can view marketplace sessions"
    ON public.marketplace_sessions FOR SELECT
    USING (status IN ('waiting', 'active', 'completed'));

-- Everyone can view participants (for leaderboards)
CREATE POLICY "Anyone can view marketplace participants"
    ON public.marketplace_participants FOR SELECT
    USING (true);

-- ============================================================================
-- FUNCTION: create_marketplace_listing
-- Sellers create new listings
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_marketplace_listing(
    title_param TEXT,
    description_param TEXT,
    category_param TEXT,
    base_price_param NUMERIC,
    game_type_param TEXT,
    shipping_included_param BOOLEAN DEFAULT true,
    seller_contact_param TEXT DEFAULT NULL,
    image_urls_param JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_seller_username TEXT;
    v_listing_id UUID;
    v_session_id UUID;
    v_rng_seed INTEGER;
    v_is_seller BOOLEAN := false;
BEGIN
    -- Get authenticated user
    v_seller_id := auth.uid();
    IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Check if user is a registered seller
    SELECT EXISTS(
        SELECT 1 FROM public.seller_profiles 
        WHERE user_id = v_seller_id AND verified = true
    ) INTO v_is_seller;
    
    IF NOT v_is_seller THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be a registered seller to create listings');
    END IF;
    
    -- Get seller username
    SELECT username INTO v_seller_username FROM public.users WHERE id = v_seller_id;
    
    -- Generate RNG seed for fair gaming
    v_rng_seed := floor(random() * 99999 + 1)::integer;
    
    -- Create listing
    INSERT INTO public.marketplace_listings (
        seller_id,
        title,
        description,
        category,
        base_price,
        game_type,
        shipping_included,
        seller_contact,
        seller_username,
        image_urls,
        status
    ) VALUES (
        v_seller_id,
        title_param,
        description_param,
        category_param,
        base_price_param,
        game_type_param,
        shipping_included_param,
        seller_contact_param,
        v_seller_username,
        image_urls_param,
        'active'
    ) RETURNING id INTO v_listing_id;
    
    -- Create initial session for this listing
    INSERT INTO public.marketplace_sessions (
        listing_id,
        prize_pool,
        participants_count,
        status,
        rng_seed,
        timer_duration,
        base_price
    ) VALUES (
        v_listing_id,
        0,
        0,
        'waiting',
        v_rng_seed,
        7200, -- 2 hours
        base_price_param
    ) RETURNING id INTO v_session_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'listing_id', v_listing_id,
        'session_id', v_session_id,
        'message', 'Listing created successfully'
    );
END;
$$;

-- ============================================================================
-- FUNCTION: get_all_marketplace_listings
-- Get all active listings with session data
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_all_marketplace_listings(
    category_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
    id UUID,
    seller_id UUID,
    seller_username TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    game_type TEXT,
    shipping_included BOOLEAN,
    seller_contact TEXT,
    image_urls JSONB,
    status TEXT,
    created_at TIMESTAMPTZ,
    session_id UUID,
    prize_pool NUMERIC,
    participants_count INTEGER,
    session_status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    rng_seed INTEGER,
    winner_user_id UUID,
    winner_username TEXT,
    winner_score NUMERIC,
    winner_contacted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.seller_id,
        l.seller_username,
        l.title,
        l.description,
        l.category,
        l.base_price,
        l.game_type,
        l.shipping_included,
        l.seller_contact,
        l.image_urls,
        l.status,
        l.created_at,
        s.id as session_id,
        COALESCE(s.prize_pool, 0) as prize_pool,
        COALESCE(s.participants_count, 0) as participants_count,
        s.status as session_status,
        s.timer_started_at,
        COALESCE(s.timer_duration, 7200) as timer_duration,
        s.rng_seed,
        s.winner_user_id,
        s.winner_username,
        s.winner_score,
        COALESCE(s.winner_contacted, false) as winner_contacted
    FROM public.marketplace_listings l
    LEFT JOIN public.marketplace_sessions s ON s.listing_id = l.id
    WHERE 
        l.status = 'active'
        AND (category_filter = 'all' OR l.category = category_filter)
    ORDER BY l.created_at DESC;
END;
$$;

-- ============================================================================
-- FUNCTION: join_marketplace_session
-- Player joins a marketplace competition
-- ============================================================================
CREATE OR REPLACE FUNCTION public.join_marketplace_session(
    session_id_param UUID,
    entry_amount_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_session_record RECORD;
    v_purchased_tokens NUMERIC;
    v_time_remaining INTEGER;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get session details
    SELECT * INTO v_session_record
    FROM public.marketplace_sessions
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Check if session is accepting entries
    IF v_session_record.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session has ended');
    END IF;
    
    -- Check if timer has started and calculate remaining time
    IF v_session_record.timer_started_at IS NOT NULL THEN
        v_time_remaining := v_session_record.timer_duration - 
            EXTRACT(EPOCH FROM (NOW() - v_session_record.timer_started_at))::INTEGER;
        
        -- Block entries if less than 2 minutes (120 seconds) remain
        IF v_time_remaining <= 120 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Session locked - less than 2 minutes remaining');
        END IF;
    END IF;
    
    -- Check if user already joined
    IF EXISTS (
        SELECT 1 FROM public.marketplace_participants
        WHERE session_id = session_id_param AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined this session');
    END IF;
    
    -- Check user's token balance
    SELECT purchased_tokens INTO v_purchased_tokens
    FROM public.users
    WHERE id = v_user_id;
    
    IF v_purchased_tokens < entry_amount_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Deduct tokens from user
    UPDATE public.users
    SET 
        purchased_tokens = purchased_tokens - entry_amount_param,
        updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Add participant
    INSERT INTO public.marketplace_participants (
        session_id,
        user_id,
        entry_amount
    ) VALUES (
        session_id_param,
        v_user_id,
        entry_amount_param
    );
    
    -- Update session prize pool and participant count
    UPDATE public.marketplace_sessions
    SET 
        prize_pool = prize_pool + entry_amount_param,
        participants_count = participants_count + 1,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Joined session successfully',
        'rng_seed', v_session_record.rng_seed
    );
END;
$$;

-- ============================================================================
-- FUNCTION: update_marketplace_score
-- Player submits their game score
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_marketplace_score(
    session_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Update participant score
    UPDATE public.marketplace_participants
    SET 
        score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id = session_id_param AND user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found in session');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Score updated successfully'
    );
END;
$$;

-- ============================================================================
-- FUNCTION: process_marketplace_winner
-- Select winner when timer expires
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_marketplace_winner(
    session_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_record RECORD;
    v_winner_record RECORD;
    v_platform_fee NUMERIC;
BEGIN
    -- Get session details
    SELECT * INTO v_session_record
    FROM public.marketplace_sessions
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    IF v_session_record.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session already completed');
    END IF;
    
    -- Find winner (highest score)
    SELECT p.user_id, p.score, u.username
    INTO v_winner_record
    FROM public.marketplace_participants p
    JOIN public.users u ON u.id = p.user_id
    WHERE p.session_id = session_id_param
        AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- No scores, reset session
        PERFORM reset_marketplace_session(v_session_record.listing_id::TEXT);
        RETURN jsonb_build_object('success', false, 'message', 'No participants with scores, session reset');
    END IF;
    
    -- Calculate platform fee (15%)
    v_platform_fee := v_session_record.prize_pool * 0.15;
    
    -- Mark session as completed with winner info
    UPDATE public.marketplace_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner_record.user_id,
        winner_username = v_winner_record.username,
        winner_score = v_winner_record.score,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = session_id_param;
    
    -- Winner doesn't get tokens, they get to contact seller for the product
    
    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner_record.user_id,
        'winner_username', v_winner_record.username,
        'winner_score', v_winner_record.score,
        'message', 'Winner selected successfully'
    );
END;
$$;

-- ============================================================================
-- FUNCTION: contact_seller
-- Winner contacts seller to arrange shipping
-- ============================================================================
CREATE OR REPLACE FUNCTION public.contact_seller(
    session_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_session_record RECORD;
    v_listing_record RECORD;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get session
    SELECT * INTO v_session_record
    FROM public.marketplace_sessions
    WHERE id = session_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Check if user is the winner
    IF v_session_record.winner_user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the winner can contact the seller');
    END IF;
    
    -- Get listing/seller info
    SELECT * INTO v_listing_record
    FROM public.marketplace_listings
    WHERE id = v_session_record.listing_id;
    
    -- Mark as contacted
    UPDATE public.marketplace_sessions
    SET 
        winner_contacted = true,
        updated_at = NOW()
    WHERE id = session_id_param;
    
    RETURN jsonb_build_object(
        'success', true,
        'seller_contact', v_listing_record.seller_contact,
        'seller_username', v_listing_record.seller_username,
        'shipping_included', v_listing_record.shipping_included,
        'message', 'Seller contact information retrieved'
    );
END;
$$;

-- ============================================================================
-- FUNCTION: reset_marketplace_session
-- Reset session after winner is determined or timeout
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_marketplace_session(
    listing_id_param TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing_id UUID;
    v_old_session_id UUID;
    v_new_rng_seed INTEGER;
    v_base_price NUMERIC;
BEGIN
    v_listing_id := listing_id_param::UUID;
    
    -- Get the old session ID and base price
    SELECT s.id, l.base_price INTO v_old_session_id, v_base_price
    FROM public.marketplace_sessions s
    JOIN public.marketplace_listings l ON l.id = s.listing_id
    WHERE s.listing_id = v_listing_id;
    
    IF v_old_session_id IS NOT NULL THEN
        -- Delete old participants
        DELETE FROM public.marketplace_participants
        WHERE session_id = v_old_session_id;
        
        -- Generate new RNG seed
        v_new_rng_seed := floor(random() * 99999 + 1)::integer;
        
        -- Reset session
        UPDATE public.marketplace_sessions
        SET 
            prize_pool = 0,
            participants_count = 0,
            status = 'waiting',
            timer_started_at = NULL,
            winner_user_id = NULL,
            winner_username = NULL,
            winner_score = NULL,
            winner_contacted = false,
            completed_at = NULL,
            rng_seed = v_new_rng_seed,
            updated_at = NOW()
        WHERE id = v_old_session_id;
    END IF;
END;
$$;

-- ============================================================================
-- TRIGGER: auto_start_marketplace_timer
-- Automatically start timer when prize_pool >= base_price
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_start_marketplace_timer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_time_remaining INTEGER;
BEGIN
    -- Only trigger if prize_pool just reached or exceeded base_price
    IF NEW.prize_pool >= NEW.base_price 
       AND (OLD.prize_pool IS NULL OR OLD.prize_pool < NEW.base_price)
       AND NEW.timer_started_at IS NULL 
       AND NEW.status = 'waiting' THEN
        
        -- Start the timer
        NEW.timer_started_at := NOW();
        NEW.status := 'active';
        NEW.updated_at := NOW();
        
        RAISE NOTICE 'Marketplace timer started for session %. Prize pool: %, Base price: %', 
            NEW.id, NEW.prize_pool, NEW.base_price;
    END IF;
    
    -- Check if timer has expired
    IF NEW.timer_started_at IS NOT NULL AND NEW.status = 'active' THEN
        v_time_remaining := NEW.timer_duration - 
            EXTRACT(EPOCH FROM (NOW() - NEW.timer_started_at))::INTEGER;
        
        IF v_time_remaining <= 0 THEN
            -- Timer expired, process winner
            -- Note: Actual winner processing should be called by frontend
            RAISE NOTICE 'Marketplace timer expired for session %. Time remaining: %s', 
                NEW.id, v_time_remaining;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER auto_start_marketplace_timer
    BEFORE UPDATE ON public.marketplace_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_start_marketplace_timer();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ MARKETPLACE SYSTEM SETUP COMPLETE!';
    RAISE NOTICE '   - Tables created: marketplace_listings, marketplace_sessions, marketplace_participants';
    RAISE NOTICE '   - Functions created: create_listing, join_session, update_score, process_winner, reset_session, contact_seller';
    RAISE NOTICE '   - Timer trigger: Starts when prize_pool >= base_price (2 hour duration)';
    RAISE NOTICE '   - 2-minute blocking: No new joins when < 2 minutes remain';
    RAISE NOTICE '   - Next step: Run SELLER_REGISTRATION_SETUP.sql';
END $$;

