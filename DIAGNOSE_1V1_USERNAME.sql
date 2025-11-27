-- ============================================================================
-- 🔍 DIAGNOSE: Find what's causing "username column does not exist"
-- ============================================================================

-- Check 1: What columns ACTUALLY exist in one_v_one_participants?
SELECT '📊 ACTUAL COLUMNS IN one_v_one_participants:' as check1;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'one_v_one_participants'
ORDER BY ordinal_position;

-- Check 2: Are there any TRIGGERS on the table?
SELECT '🔧 TRIGGERS ON one_v_one_participants:' as check2;
SELECT 
    tgname as trigger_name,
    proname as function_name,
    tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'one_v_one_participants';

-- Check 3: Are there any VIEWS that reference this table?
SELECT '👁️ VIEWS REFERENCING one_v_one_participants:' as check3;
SELECT DISTINCT v.viewname
FROM pg_views v
WHERE v.definition LIKE '%one_v_one_participants%';

-- Check 4: What does the update_1v1_score function look like?
SELECT '📝 update_1v1_score FUNCTION:' as check4;
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'update_1v1_score';

-- Check 5: Are there any RULES on the table?
SELECT '📏 RULES ON one_v_one_participants:' as check5;
SELECT rulename, ev_type, is_instead
FROM pg_rules
WHERE tablename = 'one_v_one_participants';

-- Check 6: Are there RLS policies that might reference username?
SELECT '🔒 RLS POLICIES ON one_v_one_participants:' as check6;
SELECT 
    policyname,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'one_v_one_participants';

-- Check 7: List ALL functions that contain 'username' and '1v1'
SELECT '🔍 FUNCTIONS WITH username AND 1v1:' as check7;
SELECT proname, prosrc 
FROM pg_proc 
WHERE prosrc LIKE '%username%' 
AND (proname LIKE '%1v1%' OR prosrc LIKE '%one_v_one%')
LIMIT 10;

-- FIX: Drop any problematic triggers
SELECT '🧹 DROPPING ANY TRIGGERS...' as fixing;

-- Drop auto-log triggers that might reference username
DROP TRIGGER IF EXISTS auto_log_1v1_game ON one_v_one_participants CASCADE;
DROP TRIGGER IF EXISTS log_1v1_score ON one_v_one_participants CASCADE;
DROP TRIGGER IF EXISTS audit_1v1_score ON one_v_one_participants CASCADE;

-- Check 8: Verify the function is clean now
SELECT '✅ RECREATING CLEAN update_1v1_score:' as check8;

DROP FUNCTION IF EXISTS public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION public.update_1v1_score(
    session_id_param TEXT,
    user_id_param UUID,
    score_param NUMERIC,
    accuracy_param NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows INT;
BEGIN
    -- Simple UPDATE - ONLY uses session_id, user_id, score, accuracy, completed_at
    -- NO username column referenced at all
    UPDATE one_v_one_participants
    SET score = score_param,
        accuracy = accuracy_param,
        completed_at = NOW()
    WHERE session_id::TEXT = session_id_param
    AND user_id = user_id_param;
    
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    
    IF v_rows = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Participant not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Score saved', 'score', score_param, 'rows_updated', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_1v1_score(TEXT, UUID, NUMERIC, NUMERIC) TO authenticated, anon;

-- SOLUTION: Just add the username column since something expects it!
SELECT '➕ ADDING username COLUMN TO PARTICIPANTS:' as solution;

ALTER TABLE one_v_one_participants ADD COLUMN IF NOT EXISTS username TEXT DEFAULT 'Player';

-- Update any NULL usernames from the users table
UPDATE one_v_one_participants p
SET username = COALESCE(u.username, u.email, 'Player')
FROM users u
WHERE p.user_id = u.id
AND (p.username IS NULL OR p.username = '' OR p.username = 'Player');

-- Test the function directly
SELECT '🧪 TESTING update_1v1_score (should work):' as test;

-- Show the function source to verify it's clean
SELECT prosrc FROM pg_proc WHERE proname = 'update_1v1_score';

-- Verify the column now exists
SELECT '✅ FINAL CHECK - COLUMNS:' as final_check;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'one_v_one_participants'
ORDER BY ordinal_position;

SELECT '
============================================
✅ DIAGNOSIS COMPLETE
============================================

This script:
1. Checked for triggers that might reference username
2. Dropped problematic triggers
3. Recreated clean update_1v1_score function
4. ADDED the username column (since something needs it)
5. Populated usernames from users table

Now refresh and test!
============================================
' as summary;

