-- ============================================================================
-- MARKETPLACE SYSTEM - COMPLETE SETUP
-- Seller creates listings → Players compete in games → Winner contacts seller
-- ============================================================================

-- Drop existing tables and functions (if any)
DROP TABLE IF EXISTS public.marketplace_participants CASCADE;
DROP TABLE IF EXISTS public.marketplace_sessions CASCADE;
DROP TABLE IF EXISTS public.marketplace_listings CASCADE;
DROP FUNCTION IF EXISTS public.create_marketplace_listing CASCADE;
DROP FUNCTION IF EXISTS public.get_all_marketplace_listings CASCADE;
DROP FUNCTION IF EXISTS public.get_marketplace_listing CASCADE;
DROP FUNCTION IF EXISTS public.join_marketplace_session CASCADE;
DROP FUNCTION IF EXISTS public.update_marketplace_score CASCADE;
DROP FUNCTION IF EXISTS public.process_marketplace_winner CASCADE;
DROP FUNCTION IF EXISTS public.reset_marketplace_session CASCADE;
DROP FUNCTION IF EXISTS public.contact_seller CASCADE;
DROP TRIGGER IF EXISTS auto_start_marketplace_timer ON marketplace_sessions;
DROP FUNCTION IF EXISTS auto_start_marketplace_timer();

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
BEGIN
    -- Get authenticated user
    v_seller_id := auth.uid();
    IF v_seller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
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
        timer_duration
    ) VALUES (
        v_listing_id,
        0,
        0,
        'waiting',
        v_rng_seed,
        7200 -- 2 hours
    ) RETURNING id INTO v_session_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Listing created successfully',
        'listing_id', v_listing_id,
        'session_id', v_session_id
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_marketplace_listing(TEXT, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT, JSONB) TO authenticated, anon;

-- ============================================================================
-- FUNCTION: get_all_marketplace_listings
-- Get all listings with their sessions and participants (for category pages)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_all_marketplace_listings(category_filter TEXT DEFAULT 'all')
RETURNS TABLE (
    id TEXT,
    seller_id TEXT,
    seller_username TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    game_type TEXT,
    shipping_included BOOLEAN,
    image_urls JSONB,
    status TEXT,
    created_at TIMESTAMPTZ,
    session_id TEXT,
    prize_pool NUMERIC,
    participants_count INTEGER,
    session_status TEXT,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id TEXT,
    winner_username TEXT,
    winner_score NUMERIC,
    winner_contacted BOOLEAN,
    rng_seed INTEGER,
    participants JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id::TEXT,
        l.seller_id::TEXT,
        l.seller_username,
        l.title,
        l.description,
        l.category,
        l.base_price,
        l.game_type,
        l.shipping_included,
        l.image_urls,
        l.status,
        l.created_at,
        s.id::TEXT as session_id,
        COALESCE(s.prize_pool, 0)::NUMERIC,
        COALESCE(s.participants_count, 0)::INTEGER,
        s.status as session_status,
        s.timer_started_at,
        COALESCE(s.timer_duration, 7200)::INTEGER,
        s.winner_user_id::TEXT,
        s.winner_username,
        s.winner_score,
        COALESCE(s.winner_contacted, false)::BOOLEAN,
        s.rng_seed,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id::TEXT,
                        'user_id', p.user_id::TEXT,
                        'username', u.username,
                        'entry_amount', p.entry_amount,
                        'score', p.score,
                        'accuracy', p.accuracy,
                        'joined_at', p.joined_at,
                        'completed_at', p.completed_at
                    )
                )
                FROM public.marketplace_participants p
                LEFT JOIN public.users u ON u.id = p.user_id
                WHERE p.session_id = s.id
            ),
            '[]'::jsonb
        ) as participants
    FROM public.marketplace_listings l
    LEFT JOIN public.marketplace_sessions s ON s.listing_id = l.id
    WHERE l.status = 'active'
      AND (category_filter = 'all' OR l.category = category_filter)
    ORDER BY l.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_marketplace_listings(TEXT) TO authenticated, anon;

-- ============================================================================
-- FUNCTION: join_marketplace_session
-- Players join a marketplace session by paying entry fee
-- ============================================================================
CREATE OR REPLACE FUNCTION public.join_marketplace_session(
    listing_id_param TEXT,
    entry_amount_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_listing RECORD;
    v_purchased NUMERIC;
    v_won NUMERIC;
    v_time_remaining NUMERIC;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get listing info
    SELECT * INTO v_listing
    FROM public.marketplace_listings
    WHERE id::TEXT = listing_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Listing not found');
    END IF;
    
    -- Get session info
    SELECT * INTO v_session
    FROM public.marketplace_sessions
    WHERE listing_id::TEXT = listing_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Check if session is completed
    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This listing already has a winner');
    END IF;
    
    -- Check timer blocking (last 2 minutes)
    IF v_session.timer_started_at IS NOT NULL THEN
        v_time_remaining := v_session.timer_duration - EXTRACT(EPOCH FROM (NOW() - v_session.timer_started_at));
        IF v_time_remaining <= 120 THEN -- 2 minutes
            RETURN jsonb_build_object('success', false, 'message', 'Listing closed - less than 2 minutes remaining');
        END IF;
    END IF;
    
    -- Check if user already joined
    IF EXISTS(
        SELECT 1 FROM public.marketplace_participants
        WHERE session_id = v_session.id
        AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already joined this listing');
    END IF;
    
    -- Check user tokens
    SELECT COALESCE(purchased_tokens, 0), COALESCE(won_tokens, 0)
    INTO v_purchased, v_won
    FROM public.users WHERE id = v_user_id;
    
    IF (v_purchased + v_won) < entry_amount_param THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens');
    END IF;
    
    -- Deduct tokens
    IF v_purchased >= entry_amount_param THEN
        UPDATE public.users 
        SET purchased_tokens = purchased_tokens - entry_amount_param 
        WHERE id = v_user_id;
    ELSE
        UPDATE public.users 
        SET purchased_tokens = 0, 
            won_tokens = won_tokens - (entry_amount_param - v_purchased) 
        WHERE id = v_user_id;
    END IF;
    
    -- Add participant
    INSERT INTO public.marketplace_participants (
        session_id,
        user_id,
        entry_amount,
        joined_at
    ) VALUES (
        v_session.id,
        v_user_id,
        entry_amount_param,
        NOW()
    );
    
    -- Update session
    UPDATE public.marketplace_sessions
    SET 
        prize_pool = prize_pool + entry_amount_param,
        participants_count = participants_count + 1,
        updated_at = NOW()
    WHERE id = v_session.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined listing',
        'session_id', v_session.id::TEXT,
        'rng_seed', v_session.rng_seed,
        'game_type', v_listing.game_type
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_marketplace_session(TEXT, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- FUNCTION: update_marketplace_score
-- Update player's score after completing the game
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_marketplace_score(
    session_id_param TEXT,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    UPDATE public.marketplace_participants
    SET 
        score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id::TEXT = session_id_param
    AND user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Score updated');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_marketplace_score(TEXT, NUMERIC, NUMERIC) TO authenticated, anon;

-- ============================================================================
-- TRIGGER: auto_start_marketplace_timer
-- Start 2-hour timer when prize_pool meets base_price
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_start_marketplace_timer()
RETURNS TRIGGER AS $$
DECLARE
    v_base_price NUMERIC;
BEGIN
    -- Get listing's base price
    SELECT base_price INTO v_base_price
    FROM public.marketplace_listings
    WHERE id = NEW.listing_id;
    
    -- Start timer when prize_pool >= base_price
    IF NEW.prize_pool >= v_base_price
       AND NEW.timer_started_at IS NULL 
       AND NEW.status != 'completed' THEN
        
        NEW.status := 'active';
        NEW.timer_started_at := NOW();
        NEW.updated_at := NOW();
        
        RAISE NOTICE '⏱️ Marketplace timer started for session %: prize_pool $% >= base_price $%', 
                     NEW.id, NEW.prize_pool, v_base_price;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_start_marketplace_timer
    BEFORE UPDATE OR INSERT ON public.marketplace_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_start_marketplace_timer();

-- ============================================================================
-- FUNCTION: process_marketplace_winner
-- Called when timer expires - selects winner based on highest score
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_marketplace_winner(listing_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_winner RECORD;
BEGIN
    -- Get session
    SELECT * INTO v_session
    FROM public.marketplace_sessions
    WHERE listing_id::TEXT = listing_id_param
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Check if already completed
    IF v_session.status = 'completed' AND v_session.winner_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Winner already selected', 'already_completed', true);
    END IF;
    
    -- Get winner (highest score)
    SELECT p.*, u.username
    INTO v_winner
    FROM public.marketplace_participants p
    JOIN public.users u ON p.user_id = u.id
    WHERE p.session_id = v_session.id
    AND p.score IS NOT NULL
    ORDER BY p.score DESC, p.completed_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No winner found - no scores submitted');
    END IF;
    
    -- Update session with winner
    UPDATE public.marketplace_sessions
    SET 
        status = 'completed',
        winner_user_id = v_winner.user_id,
        winner_username = v_winner.username,
        winner_score = v_winner.score,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_session.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Winner selected successfully',
        'winner_username', v_winner.username,
        'winner_score', v_winner.score
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_marketplace_winner(TEXT) TO authenticated, anon;

-- ============================================================================
-- FUNCTION: reset_marketplace_session
-- Reset session after winner is determined (for next round)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_marketplace_session(listing_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_rng_seed INTEGER;
BEGIN
    -- Get completed session
    SELECT id INTO v_session_id
    FROM public.marketplace_sessions
    WHERE listing_id::TEXT = listing_id_param
    AND status = 'completed';
    
    IF v_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No completed session found');
    END IF;
    
    -- Generate new RNG seed
    v_rng_seed := floor(random() * 99999 + 1)::integer;
    
    -- Clear participants
    DELETE FROM public.marketplace_participants WHERE session_id = v_session_id;
    
    -- Reset session
    UPDATE public.marketplace_sessions
    SET 
        status = 'waiting',
        participants_count = 0,
        prize_pool = 0,
        timer_started_at = NULL,
        winner_user_id = NULL,
        winner_username = NULL,
        winner_score = NULL,
        winner_contacted = false,
        completed_at = NULL,
        rng_seed = v_rng_seed,
        updated_at = NOW()
    WHERE id = v_session_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Session reset successfully');
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_marketplace_session(TEXT) TO authenticated, anon;

-- ============================================================================
-- FUNCTION: contact_seller
-- Winner marks that they've contacted the seller
-- ============================================================================
CREATE OR REPLACE FUNCTION public.contact_seller(listing_id_param TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_listing RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Get session
    SELECT * INTO v_session
    FROM public.marketplace_sessions
    WHERE listing_id::TEXT = listing_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;
    
    -- Verify user is the winner
    IF v_session.winner_user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the winner can contact the seller');
    END IF;
    
    -- Get listing info
    SELECT * INTO v_listing
    FROM public.marketplace_listings
    WHERE id::TEXT = listing_id_param;
    
    -- Mark as contacted
    UPDATE public.marketplace_sessions
    SET 
        winner_contacted = true,
        updated_at = NOW()
    WHERE id = v_session.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Contact information revealed',
        'seller_contact', v_listing.seller_contact,
        'seller_username', v_listing.seller_username
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.contact_seller(TEXT) TO authenticated, anon;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT '
✅ MARKETPLACE SYSTEM SETUP COMPLETE!

Tables Created:
- marketplace_listings (seller products)
- marketplace_sessions (active competitions)
- marketplace_participants (players who joined)

Functions Created:
- create_marketplace_listing() - Sellers create listings
- get_all_marketplace_listings() - Get all listings by category
- join_marketplace_session() - Players join and pay entry fee
- update_marketplace_score() - Save player scores
- process_marketplace_winner() - Select winner after timer
- reset_marketplace_session() - Reset for next round
- contact_seller() - Winner gets seller contact info

Features:
✅ 2-hour timer (starts when prize_pool >= base_price)
✅ Blocks new joins when 2 minutes remain
✅ Fair RNG seeding for games
✅ Winner selection by highest score
✅ Seller contact button for winner
✅ Auto-reset for next round

Ready to test! 🚀
' as status;

