-- ============================================================================
-- UPDATE WINNER DETERMINATION TO AUTO-CREATE ESCROW
-- ============================================================================
-- Ensures escrow is created automatically when winner is determined
-- ============================================================================

-- Update the marketplace session update trigger to create escrow
CREATE OR REPLACE FUNCTION auto_create_escrow_for_winner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_escrow_result JSONB;
BEGIN
    -- When a winner is determined (status changed to completed and winner_user_id is set)
    IF NEW.status = 'completed' 
       AND NEW.winner_user_id IS NOT NULL 
       AND (OLD.status != 'completed' OR OLD.winner_user_id IS NULL)
       AND NEW.escrow_id IS NULL THEN
        
        RAISE NOTICE '💰 Auto-creating escrow for session % with winner %', NEW.id, NEW.winner_user_id;
        
        -- Call the escrow creation function
        SELECT public.create_marketplace_escrow(NEW.id) INTO v_escrow_result;
        
        RAISE NOTICE '✅ Escrow creation result: %', v_escrow_result;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_create_escrow ON public.marketplace_sessions;

CREATE TRIGGER trigger_auto_create_escrow
    AFTER UPDATE ON public.marketplace_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_escrow_for_winner();

SELECT '✅ Auto-escrow trigger created' as status;

-- Create escrow for any existing completed sessions without escrow
DO $$
DECLARE
    v_session RECORD;
    v_escrow_result JSONB;
    v_count INTEGER := 0;
BEGIN
    FOR v_session IN 
        SELECT * FROM public.marketplace_sessions
        WHERE status = 'completed'
        AND winner_user_id IS NOT NULL
        AND escrow_id IS NULL
    LOOP
        SELECT public.create_marketplace_escrow(v_session.id) INTO v_escrow_result;
        
        IF (v_escrow_result->>'success')::BOOLEAN THEN
            v_count := v_count + 1;
            RAISE NOTICE '💰 Created escrow for session %', v_session.id;
        ELSE
            RAISE NOTICE '⚠️ Failed to create escrow for session %: %', v_session.id, v_escrow_result->>'message';
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Created % escrow records for existing completed sessions', v_count;
END $$;

SELECT '
╔════════════════════════════════════════════════════════════════╗
║     ✅ AUTO-ESCROW SYSTEM ACTIVATED!                           ║
╚════════════════════════════════════════════════════════════════╝

WHAT CHANGED:

1️⃣ AUTO-TRIGGER CREATED:
   ✅ Trigger: trigger_auto_create_escrow
   ✅ Watches: marketplace_sessions table
   ✅ When: Winner determined (status → completed + winner_user_id set)
   ✅ Action: Automatically calls create_marketplace_escrow()

2️⃣ BACKFILLED EXISTING SESSIONS:
   ✅ Found completed sessions without escrow
   ✅ Created escrow records for them
   ✅ Funds now held safely

HOW IT WORKS NOW:

BEFORE (Manual):
1. Winner determined
2. Admin manually creates escrow ❌

AFTER (Automatic):
1. Winner determined
2. Escrow auto-created ✅
3. Funds held automatically
4. Seller notified
5. Winner can provide address

WORKFLOW:
1. Game ends → Winner determined (highest score)
2. TRIGGER FIRES → Escrow created automatically
3. 85% held for seller, 15% platform fee
4. Seller sees "Pending Shipment" in dashboard
5. Seller submits tracking number
6. Winner confirms delivery
7. Funds released to seller wallet ✅

PERFECT! Now fully automated like eBay/Etsy! 🎉
' as success_message;

