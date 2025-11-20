-- ============================================
-- ADMIN FIX: Update Functions to Use JWT Email
-- ============================================
-- Your user record already exists!
-- We just need to update the admin functions
-- to use JWT email which is ALWAYS populated
-- ============================================

-- ==========================================
-- STEP 1: Verify your user exists
-- ==========================================
SELECT 
    '✅ YOUR USER RECORD' as info,
    id,
    email,
    username,
    tokens
FROM public.users
WHERE email = 'rf32191@gmail.com';

-- ==========================================
-- STEP 2: Update admin_get_all_listings to use JWT
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_get_all_listings(
    p_status_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
    listing_id UUID,
    seller_id UUID,
    seller_username TEXT,
    seller_email TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    base_price NUMERIC,
    game_type TEXT,
    status TEXT,
    image_urls JSONB,
    condition TEXT,
    brand TEXT,
    dimensions TEXT,
    weight TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    session_id UUID,
    session_status TEXT,
    prize_pool NUMERIC,
    participants_count INTEGER,
    timer_started_at TIMESTAMPTZ,
    timer_duration INTEGER,
    winner_user_id UUID,
    winner_username TEXT,
    winner_score NUMERIC,
    completed_at TIMESTAMPTZ,
    tracking_number TEXT,
    tracking_provider TEXT,
    shipping_status TEXT,
    funds_released BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_jwt_email TEXT;
BEGIN
    -- Get email from JWT (this is ALWAYS populated from your browser session)
    v_jwt_email := LOWER(COALESCE(auth.jwt()->>'email', ''));
    
    -- Check admin access using JWT email
    IF v_jwt_email NOT IN ('rf32191@gmail.com', 'rf32191@yahoo.com') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required. Your JWT email: %', v_jwt_email;
    END IF;

    RETURN QUERY
    SELECT 
        ml.id::UUID as listing_id,
        ml.seller_id::UUID,
        u_seller.username::TEXT as seller_username,
        u_seller.email::TEXT as seller_email,
        ml.title::TEXT,
        ml.description::TEXT,
        ml.category::TEXT,
        ml.base_price::NUMERIC,
        ml.game_type::TEXT,
        ml.status::TEXT,
        ml.image_urls::JSONB,
        COALESCE(ml.condition, 'new')::TEXT,
        ml.brand::TEXT,
        ml.dimensions::TEXT,
        ml.weight::TEXT,
        ml.created_at::TIMESTAMPTZ,
        ml.updated_at::TIMESTAMPTZ,
        ms.id::UUID as session_id,
        ms.status::TEXT as session_status,
        COALESCE(ms.prize_pool, 0)::NUMERIC,
        COALESCE(ms.participants_count, 0)::INTEGER,
        ms.timer_started_at::TIMESTAMPTZ,
        COALESCE(ms.timer_duration, 7200)::INTEGER,
        ms.winner_user_id::UUID,
        u_winner.username::TEXT as winner_username,
        ms.winner_score::NUMERIC,
        ms.completed_at::TIMESTAMPTZ,
        ms.tracking_number::TEXT,
        ms.tracking_provider::TEXT,
        ms.shipping_status::TEXT,
        COALESCE(ms.funds_released, false)::BOOLEAN
    FROM public.marketplace_listings ml
    LEFT JOIN public.marketplace_sessions ms ON ms.listing_id = ml.id
    LEFT JOIN public.users u_seller ON u_seller.id = ml.seller_id
    LEFT JOIN public.users u_winner ON u_winner.id = ms.winner_user_id
    WHERE 
        (p_status_filter = 'all' OR ml.status = p_status_filter)
        AND ml.status != 'deleted'
    ORDER BY 
        CASE 
            WHEN ml.status = 'completed' THEN 1
            WHEN ml.status = 'active' THEN 2
            WHEN ml.status = 'pending' THEN 3
            ELSE 4
        END,
        ml.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_listings(TEXT) TO authenticated;

-- ==========================================
-- STEP 3: Update admin_delete_listing to use JWT
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
    v_listing_title TEXT;
    v_session_id UUID;
    v_session_status TEXT;
    v_winner_id UUID;
    v_participants_count INTEGER;
    v_result JSON;
    v_jwt_email TEXT;
BEGIN
    -- Get email from JWT
    v_jwt_email := LOWER(COALESCE(auth.jwt()->>'email', ''));
    
    -- Check admin access
    IF v_jwt_email NOT IN ('rf32191@gmail.com', 'rf32191@yahoo.com') THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required. Your JWT email: %', v_jwt_email;
    END IF;

    -- Get listing details
    SELECT 
        ml.seller_id, u.username, ml.title, ms.id, ms.status, ms.winner_user_id,
        COALESCE(ms.participants_count, 0)
    INTO v_seller_id, v_seller_username, v_listing_title, v_session_id, 
         v_session_status, v_winner_id, v_participants_count
    FROM public.marketplace_listings ml
    LEFT JOIN public.marketplace_sessions ms ON ms.listing_id = ml.id
    LEFT JOIN public.users u ON u.id = ml.seller_id
    WHERE ml.id = p_listing_id;

    IF v_listing_title IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    -- Mark as deleted
    UPDATE public.marketplace_listings 
    SET status = 'deleted', updated_at = NOW()
    WHERE id = p_listing_id;

    IF v_session_id IS NOT NULL THEN
        UPDATE public.marketplace_sessions 
        SET status = 'cancelled', completed_at = NOW(), updated_at = NOW()
        WHERE id = v_session_id;
    END IF;

    -- Log action
    INSERT INTO public.admin_notifications (type, title, message, severity, metadata, created_at)
    VALUES (
        'listing_deleted', 
        'Listing Deleted by Admin',
        format('Listing "%s" by seller %s has been deleted.%s', 
            v_listing_title, COALESCE(v_seller_username, 'Unknown'),
            CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END
        ),
        'warning', 
        jsonb_build_object(
            'listing_id', p_listing_id, 
            'seller_id', v_seller_id, 
            'deleted_by', auth.uid(), 
            'reason', p_reason, 
            'participants_affected', v_participants_count
        ),
        NOW()
    );

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

Contact support if this was done in error.', 
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
        'message', 'Listing deleted successfully',
        'listing_id', p_listing_id, 
        'listing_title', v_listing_title,
        'seller_notified', true, 
        'participants_affected', v_participants_count
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_listing(UUID, TEXT) TO authenticated;

-- ==========================================
-- STEP 4: Fix audit logs ambiguous user_id error
-- ==========================================

-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS public.get_unreviewed_audit_logs();

CREATE OR REPLACE FUNCTION public.get_unreviewed_audit_logs()
RETURNS TABLE (
    id UUID,
    game_type TEXT,
    user_id UUID,
    username TEXT,
    session_id UUID,
    issue_type TEXT,
    severity TEXT,
    details JSONB,
    reviewed BOOLEAN,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gal.id,
        gal.game_type,
        gal.user_id,
        u.username,
        gal.session_id,
        gal.issue_type,
        gal.severity,
        gal.details,
        gal.reviewed,
        gal.reviewed_by,
        gal.reviewed_at,
        gal.created_at
    FROM public.game_audit_logs gal
    LEFT JOIN public.users u ON u.id = gal.user_id
    WHERE gal.reviewed = false
    ORDER BY 
        CASE gal.severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
        END,
        gal.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unreviewed_audit_logs() TO authenticated;

-- ==========================================
-- STEP 5: Test that you have admin access
-- ==========================================
DO $$
DECLARE
    v_jwt_email TEXT;
    v_is_admin BOOLEAN;
BEGIN
    v_jwt_email := LOWER(COALESCE(auth.jwt()->>'email', ''));
    v_is_admin := v_jwt_email IN ('rf32191@gmail.com', 'rf32191@yahoo.com');
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ ADMIN ACCESS TEST';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Your JWT Email: %', v_jwt_email;
    RAISE NOTICE 'Is Admin: %', CASE WHEN v_is_admin THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE '==========================================';
    
    IF NOT v_is_admin THEN
        RAISE NOTICE '⚠️  Your JWT email does not match admin emails';
        RAISE NOTICE 'Expected: rf32191@gmail.com OR rf32191@yahoo.com';
        RAISE NOTICE 'Got: %', v_jwt_email;
    ELSE
        RAISE NOTICE '🎉 YOU HAVE ADMIN ACCESS!';
    END IF;
END $$;

-- Final summary
SELECT '============================================' as "ADMIN FUNCTIONS UPDATED";
SELECT '1. Updated admin_get_all_listings() to use JWT email' as "What was done";
SELECT '2. Updated admin_delete_listing() to use JWT email' as " ";
SELECT '3. Fixed audit logs user_id ambiguous error' as "  ";
SELECT '4. Tested your admin access (check NOTICES above)' as "   ";
SELECT '============================================' as "    ";
SELECT 'NEXT: Refresh admin dashboard and try Manage Listings!' as "Next Steps";

