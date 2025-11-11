-- ============================================================================
-- FIX REALTIME MESSAGES ERROR
-- ============================================================================
-- The "extension" column error is coming from realtime.messages inserts
-- These are non-critical for gameplay, so we'll remove them to fix score saving
-- ============================================================================

BEGIN;

SELECT '🔧 Fixing realtime messages error...' as step;

-- Hot Sell Join Trigger (remove realtime insert)
CREATE OR REPLACE FUNCTION public.log_hot_sell_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Audit log only (no realtime notification)
  INSERT INTO public.game_session_audit (
    session_id, session_type, user_id, action, details
  ) VALUES (
    NEW.session_id, 'hot_sell', NEW.user_id::uuid, 'join',
    jsonb_build_object('participant_id', NEW.id, 'joined_at', NEW.joined_at)
  );
  
  RETURN NEW;
END;
$$;

-- Hot Sell Completion Trigger (remove realtime insert)
CREATE OR REPLACE FUNCTION public.log_hot_sell_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    -- Audit log only (no realtime notification)
    INSERT INTO public.game_session_audit (
      session_id, session_type, user_id, action, details
    ) VALUES (
      NEW.session_id, 'hot_sell', NEW.user_id::uuid, 'complete',
      jsonb_build_object(
        'participant_id', NEW.id,
        'score', NEW.score,
        'accuracy', NEW.accuracy,
        'completed_at', NEW.completed_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Winner Takes All Join Trigger
CREATE OR REPLACE FUNCTION public.log_wta_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.game_session_audit (
    session_id, session_type, user_id, action, details
  ) VALUES (
    NEW.session_id, 'winner_takes_all', NEW.user_id::uuid, 'join',
    jsonb_build_object('participant_id', NEW.id, 'joined_at', NEW.joined_at)
  );
  
  RETURN NEW;
END;
$$;

-- Winner Takes All Completion Trigger
CREATE OR REPLACE FUNCTION public.log_wta_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    INSERT INTO public.game_session_audit (
      session_id, session_type, user_id, action, details
    ) VALUES (
      NEW.session_id, 'winner_takes_all', NEW.user_id::uuid, 'complete',
      jsonb_build_object(
        'participant_id', NEW.id,
        'score', NEW.score,
        'accuracy', NEW.accuracy,
        'completed_at', NEW.completed_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Winner Takes All Winner Announced Trigger
CREATE OR REPLACE FUNCTION public.log_wta_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.winner_user_id IS NOT NULL AND OLD.winner_user_id IS NULL THEN
    INSERT INTO public.game_session_audit (
      session_id, session_type, user_id, action, details
    ) VALUES (
      NEW.id, 'winner_takes_all', NEW.winner_user_id, 'winner_announced',
      jsonb_build_object(
        'prize_amount', NEW.prize_amount,
        'platform_fee', NEW.platform_fee
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- One v One Join Trigger
CREATE OR REPLACE FUNCTION public.log_1v1_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.game_session_audit (
    session_id, session_type, user_id, action, details
  ) VALUES (
    NEW.session_id, 'one_v_one', NEW.user_id::uuid, 'join',
    jsonb_build_object('participant_id', NEW.id, 'joined_at', NEW.joined_at)
  );
  
  RETURN NEW;
END;
$$;

-- One v One Completion Trigger
CREATE OR REPLACE FUNCTION public.log_1v1_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    INSERT INTO public.game_session_audit (
      session_id, session_type, user_id, action, details
    ) VALUES (
      NEW.session_id, 'one_v_one', NEW.user_id::uuid, 'complete',
      jsonb_build_object(
        'participant_id', NEW.id,
        'score', NEW.score,
        'accuracy', NEW.accuracy,
        'completed_at', NEW.completed_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- One v One Winner Announced Trigger
CREATE OR REPLACE FUNCTION public.log_1v1_winner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.winner_user_id IS NOT NULL AND OLD.winner_user_id IS NULL THEN
    INSERT INTO public.game_session_audit (
      session_id, session_type, user_id, action, details
    ) VALUES (
      NEW.id, 'one_v_one', NEW.winner_user_id, 'winner_announced',
      jsonb_build_object(
        'prize_amount', NEW.prize_amount,
        'platform_fee', NEW.platform_fee
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Token Change Notification (remove completely as it's not critical)
DROP FUNCTION IF EXISTS public.notify_token_change() CASCADE;

COMMIT;

SELECT '✅ Realtime message errors fixed!' as result;
SELECT '✅ Removed problematic INSERT INTO realtime.messages calls' as result;
SELECT '✅ Score saving should now work properly' as result;

