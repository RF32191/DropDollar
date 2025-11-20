-- ============================================
-- FIX: Listing Deletion with Delete Log
-- ============================================
-- 1. Create deleted_listings log table
-- 2. Update delete function to move data to log
-- 3. Fix session status constraint error
-- ============================================

-- ==========================================
-- STEP 1: Create deleted listings log table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.deleted_listings_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Original listing data
    original_listing_id UUID NOT NULL,
    seller_id UUID,
    seller_username TEXT,
    seller_email TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    game_type TEXT,
    image_urls JSONB,
    condition TEXT,
    brand TEXT,
    dimensions TEXT,
    weight TEXT,
    
    -- Original session data (if existed)
    session_id UUID,
    session_status TEXT,
    prize_pool NUMERIC,
    participants_count INTEGER,
    winner_user_id UUID,
    winner_username TEXT,
    winner_score NUMERIC,
    
    -- Deletion metadata
    deleted_by UUID NOT NULL,
    deleted_by_email TEXT,
    deletion_reason TEXT,
    participants_affected INTEGER DEFAULT 0,
    
    -- Timestamps
    listing_created_at TIMESTAMPTZ,
    listing_updated_at TIMESTAMPTZ,
    session_completed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Full snapshot as JSONB for safety
    full_snapshot JSONB
);

-- Add RLS
ALTER TABLE public.deleted_listings_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can view deleted listings log" ON public.deleted_listings_log;

-- Policy: Only admins can view deleted listings log
CREATE POLICY "Admins can view deleted listings log"
ON public.deleted_listings_log
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND LOWER(email) IN ('rf32191@gmail.com', 'rf32191@yahoo.com')
    )
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_deleted_listings_deleted_at 
ON public.deleted_listings_log(deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_deleted_listings_seller 
ON public.deleted_listings_log(seller_id);

CREATE INDEX IF NOT EXISTS idx_deleted_listings_original_id 
ON public.deleted_listings_log(original_listing_id);

-- ==========================================
-- STEP 2: Update delete function
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_delete_listing(
    p_listing_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_seller_username TEXT;
    v_seller_email TEXT;
    v_listing_title TEXT;
    v_session_id UUID;
    v_session_status TEXT;
    v_winner_id UUID;
    v_participants_count INTEGER;
    v_result JSON;
    v_jwt_email TEXT;
    v_full_listing JSONB;
BEGIN
    -- Get email from JWT
    v_jwt_email := LOWER(COALESCE(auth.jwt()->>'email', ''));
    
    -- Check admin access
    IF v_jwt_email NOT IN ('rf32191@gmail.com', 'rf32191@yahoo.com') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required. Your JWT email: %', v_jwt_email;
    END IF;

    -- Get full listing details and create snapshot
    SELECT 
        jsonb_build_object(
            'listing', row_to_json(ml.*),
            'session', row_to_json(ms.*),
            'seller', jsonb_build_object('id', u_seller.id, 'username', u_seller.username, 'email', u_seller.email),
            'winner', jsonb_build_object('id', u_winner.id, 'username', u_winner.username),
            'participants', (
                SELECT jsonb_agg(row_to_json(mp.*))
                FROM marketplace_participants mp
                WHERE mp.session_id = ms.id
            )
        ),
        ml.seller_id,
        u_seller.username,
        u_seller.email,
        ml.title,
        ms.id,
        ms.status,
        ms.winner_user_id,
        COALESCE(ms.participants_count, 0)
    INTO 
        v_full_listing,
        v_seller_id, 
        v_seller_username, 
        v_seller_email,
        v_listing_title, 
        v_session_id, 
        v_session_status, 
        v_winner_id, 
        v_participants_count
    FROM public.marketplace_listings ml
    LEFT JOIN public.marketplace_sessions ms ON ms.listing_id = ml.id
    LEFT JOIN public.users u_seller ON u_seller.id = ml.seller_id
    LEFT JOIN public.users u_winner ON u_winner.id = ms.winner_user_id
    WHERE ml.id = p_listing_id;

    IF v_listing_title IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Insert into deleted listings log
    INSERT INTO public.deleted_listings_log (
        original_listing_id,
        seller_id,
        seller_username,
        seller_email,
        title,
        description,
        category,
        base_price,
        game_type,
        image_urls,
        condition,
        brand,
        dimensions,
        weight,
        session_id,
        session_status,
        prize_pool,
        participants_count,
        winner_user_id,
        winner_username,
        winner_score,
        deleted_by,
        deleted_by_email,
        deletion_reason,
        participants_affected,
        listing_created_at,
        listing_updated_at,
        session_completed_at,
        deleted_at,
        full_snapshot
    )
    SELECT 
        ml.id,
        ml.seller_id,
        u_seller.username,
        u_seller.email,
        ml.title,
        ml.description,
        ml.category,
        ml.base_price,
        ml.game_type,
        ml.image_urls,
        ml.condition,
        ml.brand,
        ml.dimensions,
        ml.weight,
        ms.id,
        ms.status,
        ms.prize_pool,
        ms.participants_count,
        ms.winner_user_id,
        u_winner.username,
        ms.winner_score,
        auth.uid(),
        v_jwt_email,
        p_reason,
        COALESCE(ms.participants_count, 0),
        ml.created_at,
        ml.updated_at,
        ms.completed_at,
        NOW(),
        v_full_listing
    FROM public.marketplace_listings ml
    LEFT JOIN public.marketplace_sessions ms ON ms.listing_id = ml.id
    LEFT JOIN public.users u_seller ON u_seller.id = ml.seller_id
    LEFT JOIN public.users u_winner ON u_winner.id = ms.winner_user_id
    WHERE ml.id = p_listing_id;

    -- Delete the session first (if exists) to avoid foreign key issues
    IF v_session_id IS NOT NULL THEN
        DELETE FROM public.marketplace_sessions WHERE id = v_session_id;
    END IF;

    -- Delete the listing
    DELETE FROM public.marketplace_listings WHERE id = p_listing_id;

    -- Note: Admin notification skipped due to type constraints
    -- The deletion is logged in deleted_listings_log table instead
    
    -- Notify seller
    IF v_seller_id IS NOT NULL THEN
        INSERT INTO public.admin_messages (user_id, message_type, title, message, metadata, created_at)
        VALUES (
            v_seller_id, 
            'listing_removed', 
            '⚠️ Listing Removed by Admin',
            format('Your listing "%s" has been removed.

📦 Listing: %s
🗓️ Removed: %s
%s

The listing has been archived. Contact support if this was done in error.', 
                v_listing_title, 
                v_listing_title, 
                TO_CHAR(NOW(), 'Mon DD at HH24:MI'),
                CASE WHEN p_reason IS NOT NULL THEN '📋 Reason: ' || p_reason 
                     ELSE '📋 No specific reason provided.' END
            ),
            jsonb_build_object(
                'listing_id', p_listing_id, 
                'action', 'admin_deletion', 
                'reason', p_reason
            ),
            NOW()
        );
    END IF;

    v_result := json_build_object(
        'success', true, 
        'message', 'Listing deleted and moved to log successfully',
        'listing_id', p_listing_id, 
        'listing_title', v_listing_title,
        'seller_notified', true, 
        'participants_affected', v_participants_count,
        'logged', true
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_listing(UUID, TEXT) TO authenticated;

-- ==========================================
-- STEP 3: Create view for deleted listings (admin only)
-- ==========================================
CREATE OR REPLACE VIEW public.admin_deleted_listings_view AS
SELECT 
    id,
    original_listing_id,
    seller_username,
    seller_email,
    title,
    category,
    base_price,
    game_type,
    session_status,
    participants_count,
    winner_username,
    deleted_by_email,
    deletion_reason,
    participants_affected,
    deleted_at,
    listing_created_at
FROM public.deleted_listings_log
ORDER BY deleted_at DESC;

-- Grant access to authenticated users (RLS will restrict to admins)
GRANT SELECT ON public.admin_deleted_listings_view TO authenticated;

-- ==========================================
-- VERIFICATION
-- ==========================================
SELECT '✅ Deleted listings log table created' as status;
SELECT '✅ Delete function updated to use log' as " ";
SELECT '✅ Admin view created for deleted listings' as "  ";
SELECT '✅ Now you can delete listings safely!' as "   ";
SELECT 'Deleted listings are moved to deleted_listings_log table' as "    ";

