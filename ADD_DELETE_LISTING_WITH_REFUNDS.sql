-- ============================================================================
-- ADD DELETE MARKETPLACE LISTING WITH TOKEN REFUNDS
-- ============================================================================
-- Allows sellers to delete their listings
-- Automatically refunds tokens to all participants who joined
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_marketplace_listing_with_refunds(
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
    v_participant RECORD;
    v_refund_count INTEGER := 0;
    v_total_refunded NUMERIC := 0;
BEGIN
    -- Get authenticated user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ Not authenticated';
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    RAISE NOTICE '🗑️ Delete with refunds: user_id=%, listing_id=%', v_user_id, listing_id_param;
    
    -- Get listing details
    SELECT * INTO v_listing_record
    FROM public.marketplace_listings
    WHERE id = listing_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ Listing not found';
        RETURN jsonb_build_object('success', false, 'message', 'Listing not found');
    END IF;
    
    -- Check if user is the seller
    IF v_listing_record.seller_id != v_user_id THEN
        RAISE NOTICE '❌ Not the seller: listing seller=%, requesting user=%', v_listing_record.seller_id, v_user_id;
        RETURN jsonb_build_object('success', false, 'message', 'You can only delete your own listings');
    END IF;
    
    -- Check if there's a session for this listing
    SELECT * INTO v_session_record
    FROM public.marketplace_sessions
    WHERE listing_id = listing_id_param;
    
    IF FOUND THEN
        -- Refund tokens to all participants
        FOR v_participant IN 
            SELECT * FROM public.marketplace_participants
            WHERE session_id = v_session_record.id
        LOOP
            -- Refund the entry amount (return to purchased_tokens)
            UPDATE public.users
            SET 
                purchased_tokens = purchased_tokens + v_participant.entry_amount,
                updated_at = NOW()
            WHERE id = v_participant.user_id;
            
            v_refund_count := v_refund_count + 1;
            v_total_refunded := v_total_refunded + v_participant.entry_amount;
            
            RAISE NOTICE '💰 Refunded % tokens to user %', v_participant.entry_amount, v_participant.user_id;
        END LOOP;
        
        -- Delete all participants
        DELETE FROM public.marketplace_participants
        WHERE session_id = v_session_record.id;
        
        RAISE NOTICE '✅ Deleted % participants', v_refund_count;
        
        -- Delete the session
        DELETE FROM public.marketplace_sessions
        WHERE id = v_session_record.id;
        
        RAISE NOTICE '✅ Deleted session: %', v_session_record.id;
    END IF;
    
    -- Delete the listing
    DELETE FROM public.marketplace_listings
    WHERE id = listing_id_param;
    
    RAISE NOTICE '✅ Listing deleted successfully: %', listing_id_param;
    
    IF v_refund_count > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Listing deleted and ' || v_refund_count || ' player(s) refunded ' || v_total_refunded || ' tokens total',
            'refunds', jsonb_build_object(
                'count', v_refund_count,
                'total_amount', v_total_refunded
            )
        );
    ELSE
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Listing deleted successfully (no participants to refund)'
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_marketplace_listing_with_refunds(UUID) TO authenticated;

SELECT '
╔════════════════════════════════════════════════════════════════╗
║      ✅ DELETE LISTING WITH REFUNDS FUNCTION CREATED!          ║
╚════════════════════════════════════════════════════════════════╝

WHAT IT DOES:
✅ Allows sellers to delete their listings (anytime)
✅ Automatically refunds ALL participants
✅ Returns tokens to each player (to purchased_tokens)
✅ Deletes all participants from database
✅ Deletes the session
✅ Deletes the listing
✅ Returns detailed refund information

REFUND LOGIC:
1. Finds all participants who joined
2. For each participant:
   - Refunds their entry_amount
   - Adds to their purchased_tokens balance
   - Logs the refund
3. Deletes participant records
4. Deletes session
5. Deletes listing

SECURITY:
✅ Requires authentication (auth.uid())
✅ Verifies you are the seller
✅ Safe even with active games
✅ Only authenticated users can call this

RESPONSE FORMAT:
{
  "success": true,
  "message": "Listing deleted and 3 player(s) refunded 3 tokens total",
  "refunds": {
    "count": 3,
    "total_amount": 3
  }
}

EXAMPLE SCENARIOS:

Scenario 1: No participants
→ Listing deleted
→ No refunds needed
→ "Listing deleted successfully (no participants to refund)"

Scenario 2: 3 participants joined (1 token each)
→ Listing deleted
→ 3 players refunded
→ 3 tokens returned total
→ "Listing deleted and 3 player(s) refunded 3 tokens total"

Scenario 3: 2 players joined, 1 completed game
→ Listing deleted
→ 2 players refunded (even if they played!)
→ 2 tokens returned total
→ Fair for everyone!

WHY THIS IS FAIR:
- If seller cancels, players get money back
- Players didnt win (listing cancelled)
- Tokens returned to purchased_tokens
- Players can use them elsewhere
- No one loses money unfairly

USAGE FROM FRONTEND:
await supabase.rpc("delete_marketplace_listing_with_refunds", {
  listing_id_param: listing.id
});

Ready to use! 🗑️💰
' as success_message;

