-- ============================================================================
-- SETUP 1099 NOTIFICATION SYSTEM
-- ============================================================================

-- Create user_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sender_id UUID,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'notification',
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own messages
DROP POLICY IF EXISTS "users_read_own_messages" ON user_messages;
CREATE POLICY "users_read_own_messages" ON user_messages
    FOR SELECT USING (auth.uid() = user_id);

-- Admin can send messages to anyone
DROP POLICY IF EXISTS "admin_send_messages" ON user_messages;
CREATE POLICY "admin_send_messages" ON user_messages
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'rf32191@gmail.com');

-- Function to send 1099 notification to a user
CREATE OR REPLACE FUNCTION send_1099_to_user(
    p_user_id UUID,
    p_full_name TEXT,
    p_amount NUMERIC,
    p_tax_year INTEGER DEFAULT 2024
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id UUID;
BEGIN
    INSERT INTO user_messages (
        user_id,
        title,
        content,
        message_type,
        metadata
    ) VALUES (
        p_user_id,
        '📋 Your 1099-NEC Tax Form for ' || p_tax_year,
        'Hello ' || p_full_name || ',

Your 1099-NEC tax form for the ' || p_tax_year || ' tax year is now available.

💰 Total Earnings: $' || ROUND(p_amount, 2) || '

This form reports your earnings from DropDollar. You will need this for your tax filing.

IMPORTANT DEADLINES:
• File your taxes by April 15, ' || (p_tax_year + 1)

If you have questions about this form, please contact support.

Thank you for using DropDollar!',
        '1099_notification',
        jsonb_build_object(
            'tax_year', p_tax_year,
            'amount', p_amount,
            'generated_at', NOW()
        )
    )
    RETURNING id INTO v_message_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message_id', v_message_id,
        'user_id', p_user_id
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION send_1099_to_user TO authenticated;

-- Function for admin to send 1099s to all W-9 submitters
CREATE OR REPLACE FUNCTION admin_send_all_1099s(p_tax_year INTEGER DEFAULT 2024)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_count INTEGER := 0;
    v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Loop through all tax profiles
    FOR v_user IN 
        SELECT tp.user_id, tp.full_name, 100.00 as amount -- Default $100 for testing
        FROM tax_profiles tp
    LOOP
        BEGIN
            PERFORM send_1099_to_user(v_user.user_id, v_user.full_name, v_user.amount, p_tax_year);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, v_user.user_id::TEXT || ': ' || SQLERRM);
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'sent_count', v_count,
        'errors', v_errors
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_send_all_1099s TO authenticated;

-- Test: Send a test 1099 to the first user in tax_profiles
DO $$
DECLARE
    v_user RECORD;
    v_result JSONB;
BEGIN
    SELECT user_id, full_name INTO v_user FROM tax_profiles LIMIT 1;
    
    IF v_user.user_id IS NOT NULL THEN
        SELECT send_1099_to_user(v_user.user_id, v_user.full_name, 1000.00, 2024) INTO v_result;
        RAISE NOTICE 'Test 1099 sent: %', v_result;
    ELSE
        RAISE NOTICE 'No tax profiles found to test with';
    END IF;
END;
$$;

SELECT '✅ 1099 SYSTEM READY!' as status;
SELECT COUNT(*) as messages_sent FROM user_messages WHERE message_type = '1099_notification';

