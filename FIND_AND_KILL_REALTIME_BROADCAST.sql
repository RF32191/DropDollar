-- ============================================================================
-- FIND AND ELIMINATE ALL realtime.broadcast() CALLS
-- ============================================================================
-- This script finds all functions calling realtime.broadcast and drops them

-- Step 1: Find all offending functions
DO $$
DECLARE
  func_record RECORD;
  func_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Searching for functions with realtime.broadcast calls...';
  
  FOR func_record IN
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE pg_get_functiondef(p.oid) ILIKE '%realtime.broadcast%'
      AND n.nspname = 'public'
  LOOP
    func_count := func_count + 1;
    RAISE NOTICE '❌ Found: %.%(%) - DROPPING', 
      func_record.schema_name, 
      func_record.function_name,
      func_record.args;
    
    -- Drop the function
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      func_record.schema_name,
      func_record.function_name,
      func_record.args
    );
  END LOOP;
  
  IF func_count = 0 THEN
    RAISE NOTICE '✅ No functions with realtime.broadcast found!';
  ELSE
    RAISE NOTICE '🗑️  Dropped % functions with realtime.broadcast', func_count;
  END IF;
END $$;

-- Step 2: Recreate the 9 correct trigger functions using INSERT INTO realtime.messages

-- Hot Sell Join Trigger
CREATE OR REPLACE FUNCTION public.log_hot_sell_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Audit log
  INSERT INTO public.game_session_audit (
    session_id, session_type, user_id, action, details
  ) VALUES (
    NEW.session_id, 'hot_sell', NEW.user_id::uuid, 'join',
    jsonb_build_object('participant_id', NEW.id, 'joined_at', NEW.joined_at)
  );
  
  -- Realtime notification
  INSERT INTO realtime.messages (topic, event, payload, private, extension)
  VALUES (
    'user:' || NEW.user_id::text || ':results',
    'score_created',
    jsonb_build_object(
      'session_id', NEW.session_id::text,
      'participant_id', NEW.id::text,
      'game_type', 'hot_sell',
      'timestamp', NEW.joined_at
    ),
    true,
    'broadcast'
  );
  
  RETURN NEW;
END;
$$;

-- Hot Sell Completion Trigger
CREATE OR REPLACE FUNCTION public.log_hot_sell_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    -- Audit log
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
    
    -- Realtime notification
    INSERT INTO realtime.messages (topic, event, payload, private, extension)
    VALUES (
      'user:' || NEW.user_id::text || ':results',
      'score_finalized',
      jsonb_build_object(
        'session_id', NEW.session_id::text,
        'participant_id', NEW.id::text,
        'game_type', 'hot_sell',
        'score', NEW.score,
        'accuracy', NEW.accuracy,
        'timestamp', NEW.completed_at
      ),
      true,
      'broadcast'
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
  
  INSERT INTO realtime.messages (topic, event, payload, private, extension)
  VALUES (
    'user:' || NEW.user_id::text || ':results',
    'score_created',
    jsonb_build_object(
      'session_id', NEW.session_id::text,
      'participant_id', NEW.id::text,
      'game_type', 'winner_takes_all',
      'timestamp', NEW.joined_at
    ),
    true,
    'broadcast'
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
    
    INSERT INTO realtime.messages (topic, event, payload, private, extension)
    VALUES (
      'user:' || NEW.user_id::text || ':results',
      'score_finalized',
      jsonb_build_object(
        'session_id', NEW.session_id::text,
        'participant_id', NEW.id::text,
        'game_type', 'winner_takes_all',
        'score', NEW.score,
        'accuracy', NEW.accuracy,
        'timestamp', NEW.completed_at
      ),
      true,
      'broadcast'
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
    
    INSERT INTO realtime.messages (topic, event, payload, private, extension)
    VALUES (
      'user:' || NEW.winner_user_id::text || ':results',
      'session_winner_announced',
      jsonb_build_object(
        'session_id', NEW.id::text,
        'game_type', 'winner_takes_all',
        'prize_amount', NEW.prize_amount,
        'timestamp', NOW()
      ),
      true,
      'broadcast'
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
  
  INSERT INTO realtime.messages (topic, event, payload, private, extension)
  VALUES (
    'user:' || NEW.user_id::text || ':results',
    'score_created',
    jsonb_build_object(
      'session_id', NEW.session_id::text,
      'participant_id', NEW.id::text,
      'game_type', 'one_v_one',
      'timestamp', NEW.joined_at
    ),
    true,
    'broadcast'
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
    
    INSERT INTO realtime.messages (topic, event, payload, private, extension)
    VALUES (
      'user:' || NEW.user_id::text || ':results',
      'score_finalized',
      jsonb_build_object(
        'session_id', NEW.session_id::text,
        'participant_id', NEW.id::text,
        'game_type', 'one_v_one',
        'score', NEW.score,
        'accuracy', NEW.accuracy,
        'timestamp', NEW.completed_at
      ),
      true,
      'broadcast'
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
    
    INSERT INTO realtime.messages (topic, event, payload, private, extension)
    VALUES (
      'user:' || NEW.winner_user_id::text || ':results',
      'session_winner_announced',
      jsonb_build_object(
        'session_id', NEW.id::text,
        'game_type', 'one_v_one',
        'prize_amount', NEW.prize_amount,
        'timestamp', NOW()
      ),
      true,
      'broadcast'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Token Change Notification (realtime only, no audit)
CREATE OR REPLACE FUNCTION public.notify_token_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO realtime.messages (topic, event, payload, private, extension)
  VALUES (
    'user:' || NEW.user_id::text || ':results',
    'token_balance_updated',
    jsonb_build_object(
      'transaction_id', NEW.id::text,
      'type', NEW.type,
      'transaction_type', NEW.transaction_type,
      'amount', NEW.amount,
      'balance_before', NEW.balance_before,
      'balance_after', NEW.balance_after,
      'description', NEW.description,
      'timestamp', NEW.created_at
    ),
    true,
    'broadcast'
  );
  
  RETURN NEW;
END;
$$;

-- Verify all functions were created
DO $$
BEGIN
  RAISE NOTICE '✅ All 9 trigger functions recreated with INSERT INTO realtime.messages';
  RAISE NOTICE '✅ No realtime.broadcast() calls remain';
END $$;

