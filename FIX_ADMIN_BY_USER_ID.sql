-- ============================================
-- QUICK FIX: ADMIN ACCESS BY USER ID
-- ============================================
-- Bypass email check and use user ID directly
-- This will work immediately regardless of email
-- ============================================

-- Step 1: Show your current user ID
SELECT 
    '👤 YOUR USER ID' as info,
    auth.uid() as user_id,
    'Copy this UUID for the whitelist below' as note;

-- Step 2: Create admin function that checks user ID instead of email
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
    v_user_email TEXT;
BEGIN
    -- Get user email if exists
    SELECT email INTO v_user_email FROM public.users WHERE id = auth.uid();
    
    -- Check admin access by EITHER email OR by being logged into admin panel
    -- (If you're seeing this page, you already passed frontend auth)
    IF NOT (
        -- Check by email (case-insensitive)
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND LOWER(COALESCE(email, '')) IN ('rf32191@gmail.com', 'rf32191@yahoo.com')
        )
        OR
        -- OR check by user ID (add your user ID here after running Step 1)
        auth.uid() IN (
            -- TODO: Add your user ID from Step 1 above
            -- Example: 'a68c0750-49f7-4d75-ad93-5d6698ea34f7'::uuid
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required. Email: %, UserID: %', 
            COALESCE(v_user_email, 'NULL'), auth.uid();
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
        ms.funds_released::BOOLEAN
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

-- Step 3: Update delete function similarly
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
    v_user_email TEXT;
BEGIN
    -- Get user email if exists
    SELECT email INTO v_user_email FROM public.users WHERE id = auth.uid();
    
    -- Check admin access
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND LOWER(COALESCE(email, '')) IN ('rf32191@gmail.com', 'rf32191@yahoo.com')
        )
        OR
        auth.uid() IN (
            -- TODO: Add your user ID here
        )
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required. Email: %, UserID: %', 
            COALESCE(v_user_email, 'NULL'), auth.uid();
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
    UPDATE public.marketplace_listings SET status = 'deleted', updated_at = NOW()
    WHERE id = p_listing_id;

    IF v_session_id IS NOT NULL THEN
        UPDATE public.marketplace_sessions 
        SET status = 'cancelled', completed_at = NOW(), updated_at = NOW()
        WHERE id = v_session_id;
    END IF;

    -- Log action
    INSERT INTO public.admin_notifications (type, title, message, severity, metadata, created_at)
    VALUES ('listing_deleted', 'Listing Deleted by Admin',
        format('Listing "%s" by seller %s has been deleted.%s', v_listing_title, v_seller_username,
            CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END),
        'warning', 
        jsonb_build_object('listing_id', p_listing_id, 'seller_id', v_seller_id, 
            'deleted_by', auth.uid(), 'reason', p_reason, 'participants_affected', v_participants_count),
        NOW());

    -- Notify seller
    IF v_seller_id IS NOT NULL THEN
        INSERT INTO public.admin_messages (user_id, message_type, title, message, metadata, created_at)
        VALUES (v_seller_id, 'listing_removed', '⚠️ Listing Removed by Admin',
            format('Your listing "%s" has been removed.

📦 Listing: %s
🗓️ Removed: %s
%s

Contact support if this was done in error.', 
                v_listing_title, v_listing_title, TO_CHAR(NOW(), 'Mon DD at HH24:MI'),
                CASE WHEN p_reason IS NOT NULL THEN '📋 Reason: ' || p_reason 
                     ELSE '📋 No specific reason provided.' END),
            jsonb_build_object('listing_id', p_listing_id, 'action', 'admin_deletion', 'reason', p_reason),
            NOW());
    END IF;

    v_result := json_build_object('success', true, 'message', 'Listing deleted successfully',
        'listing_id', p_listing_id, 'listing_title', v_listing_title,
        'seller_notified', true, 'participants_affected', v_participants_count);

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_listing(UUID, TEXT) TO authenticated;

-- Final instructions
SELECT '
============================================
✅ ADMIN ACCESS FIX - INSTRUCTIONS
============================================

OPTION 1 (RECOMMENDED): Fix User Record
   → Run FIX_NULL_USER_RECORD.sql first
   → This will sync your auth data to users table
   → Then come back and run this if still needed

OPTION 2 (QUICK FIX): Whitelist by User ID
   1. Look at Step 1 output above (YOUR USER ID)
   2. Copy that UUID
   3. Edit this SQL file, find the TODO comments
   4. Replace TODO with your UUID like:
      auth.uid() IN (
        ''a68c0750-49f7-4d75-ad93-5d6698ea34f7''::uuid
      )
   5. Re-run this SQL

🎯 RECOMMENDED APPROACH:
   Run FIX_NULL_USER_RECORD.sql first!
   It will properly sync your user data.

============================================
' as instructions;

