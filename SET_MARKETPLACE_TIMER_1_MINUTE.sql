-- ============================================================================
-- SET MARKETPLACE TIMER TO 1 MINUTE FOR TESTING
-- ============================================================================
-- Changes marketplace timer from 2 hours (7200s) to 1 minute (60s)
-- ============================================================================

-- Update all existing sessions to 1 minute timer
UPDATE public.marketplace_sessions
SET 
    timer_duration = 60, -- 1 minute
    updated_at = NOW()
WHERE timer_duration != 60;

SELECT '✅ Updated existing sessions to 1-minute timer' as status;

-- Update the join_marketplace_session function to use 1 minute
CREATE OR REPLACE FUNCTION public.join_marketplace_session(
    listing_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_listing_record RECORD;
    v_session_record RECORD;
    v_participant_exists BOOLEAN;
    v_new_session_id UUID;
    v_user_tokens RECORD;
    v_rng_seed INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ Not authenticated';
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    RAISE NOTICE '🎮 Join marketplace: user_id=%, listing_id=%', v_user_id, listing_id_param;
    
    -- Get listing details
    SELECT * INTO v_listing_record
    FROM public.marketplace_listings
    WHERE id = listing_id_param
    AND status = 'active';
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Listing not found or inactive';
        RETURN jsonb_build_object('success', false, 'message', 'Listing not found or inactive');
    END IF;
    
    -- Get user token balance
    SELECT purchased_tokens, won_tokens INTO v_user_tokens
    FROM public.users
    WHERE id = v_user_id;
    
    -- Calculate total available tokens
    IF (COALESCE(v_user_tokens.purchased_tokens, 0) + COALESCE(v_user_tokens.won_tokens, 0)) < 1 THEN
        RAISE NOTICE '❌ Insufficient tokens: purchased=%, won=%', 
            v_user_tokens.purchased_tokens, v_user_tokens.won_tokens;
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient tokens (need 1 token)');
    END IF;
    
    -- Check for existing session
    SELECT * INTO v_session_record
    FROM public.marketplace_sessions
    WHERE listing_id = listing_id_param
    AND status IN ('waiting', 'active')
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Create new session if none exists
    IF NOT FOUND THEN
        v_rng_seed := floor(random() * 99999 + 1)::integer;
        v_new_session_id := gen_random_uuid();
        
        INSERT INTO public.marketplace_sessions (
            id,
            listing_id,
            prize_pool,
            participants_count,
            status,
            rng_seed,
            timer_duration, -- 1 MINUTE
            base_price,
            created_at,
            updated_at
        ) VALUES (
            v_new_session_id,
            listing_id_param,
            0,
            0,
            'waiting',
            v_rng_seed,
            60, -- 1 MINUTE FOR TESTING
            v_listing_record.base_price,
            NOW(),
            NOW()
        );
        
        v_session_record.id := v_new_session_id;
        v_session_record.prize_pool := 0;
        v_session_record.status := 'waiting';
        v_session_record.rng_seed := v_rng_seed;
        
        RAISE NOTICE '✅ Created new session: % with RNG seed %', v_new_session_id, v_rng_seed;
    END IF;
    
    -- Check if user already participating
    SELECT EXISTS(
        SELECT 1 FROM public.marketplace_participants
        WHERE session_id = v_session_record.id
        AND user_id = v_user_id
    ) INTO v_participant_exists;
    
    IF v_participant_exists THEN
        RAISE NOTICE '✅ User already in session, returning session ID';
        RETURN jsonb_build_object(
            'success', true,
            'session_id', v_session_record.id,
            'rng_seed', v_session_record.rng_seed,
            'message', 'Already joined - play your game!'
        );
    END IF;
    
    -- Deduct tokens (prefer purchased_tokens first)
    IF v_user_tokens.purchased_tokens >= 1 THEN
        UPDATE public.users
        SET 
            purchased_tokens = purchased_tokens - 1,
            updated_at = NOW()
        WHERE id = v_user_id;
    ELSE
        UPDATE public.users
        SET 
            won_tokens = won_tokens - 1,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;
    
    -- Add participant
    INSERT INTO public.marketplace_participants (
        session_id,
        user_id,
        entry_amount,
        joined_at
    ) VALUES (
        v_session_record.id,
        v_user_id,
        1,
        NOW()
    );
    
    -- Update session counts
    UPDATE public.marketplace_sessions
    SET 
        prize_pool = prize_pool + 1,
        participants_count = participants_count + 1,
        updated_at = NOW()
    WHERE id = v_session_record.id;
    
    RAISE NOTICE '✅ User joined session. Session ID: %, RNG Seed: %', v_session_record.id, v_session_record.rng_seed;
    
    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_record.id,
        'rng_seed', v_session_record.rng_seed,
        'message', 'Successfully joined the competition!'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_marketplace_session(UUID) TO authenticated;

SELECT '✅ Updated join_marketplace_session to use 1-minute timer' as status;

SELECT '
╔════════════════════════════════════════════════════════════════╗
║           ✅ MARKETPLACE TIMER SET TO 1 MINUTE!                ║
╚════════════════════════════════════════════════════════════════╝

WHAT CHANGED:
✅ All existing sessions updated to 60 seconds (1 minute)
✅ New sessions will use 60-second timer
✅ join_marketplace_session function updated

TESTING:
1. Create a new listing
2. Join with required tokens to reach base price
3. Timer will start and run for 1 MINUTE
4. Blocking happens at 2 minutes remaining (N/A for 1-min timer)
5. After 1 minute, winner determined by highest score

PERFECT FOR QUICK TESTING! ⏱️🎮

To change back to 2 hours (7200s), just replace 60 with 7200.
' as success_message;

