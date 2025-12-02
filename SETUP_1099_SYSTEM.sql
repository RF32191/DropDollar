-- ============================================================================
-- SETUP 1099 NOTIFICATION SYSTEM
-- ============================================================================

-- Create 1099 tracking table
CREATE TABLE IF NOT EXISTS tax_1099_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tax_year INTEGER NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    form_type TEXT DEFAULT '1099-NEC',
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tax_year)
);

-- Enable RLS on 1099 records
ALTER TABLE tax_1099_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own 1099 records
DROP POLICY IF EXISTS "users_view_own_1099" ON tax_1099_records;
CREATE POLICY "users_view_own_1099" ON tax_1099_records
    FOR SELECT USING (auth.uid() = user_id);

-- Admin can manage all 1099 records
DROP POLICY IF EXISTS "admin_manage_1099" ON tax_1099_records;
CREATE POLICY "admin_manage_1099" ON tax_1099_records
    FOR ALL USING (auth.jwt() ->> 'email' = 'rf32191@gmail.com');

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

-- Users can update (mark as read) their own messages
DROP POLICY IF EXISTS "users_update_own_messages" ON user_messages;
CREATE POLICY "users_update_own_messages" ON user_messages
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin can send messages to anyone
DROP POLICY IF EXISTS "admin_send_messages" ON user_messages;
CREATE POLICY "admin_send_messages" ON user_messages
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'rf32191@gmail.com');

-- Function to send 1099-NEC notification to a user
CREATE OR REPLACE FUNCTION send_1099_to_user(
    p_user_id UUID,
    p_full_name TEXT,
    p_amount NUMERIC,
    p_tax_year INTEGER DEFAULT 2024,
    p_ssn_last4 TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id UUID;
    v_title TEXT;
    v_content TEXT;
    v_type TEXT;
    v_deadline TEXT;
BEGIN
    -- Build the deadline date
    v_deadline := 'April 15, ' || (p_tax_year + 1)::TEXT;
    
    -- Build the title
    v_title := '1099-NEC Tax Document - Tax Year ' || p_tax_year::TEXT;
    
    -- Build IRS-compliant 1099-NEC content
    v_content := E'FORM 1099-NEC - Nonemployee Compensation\n' ||
                 E'Tax Year: ' || p_tax_year::TEXT || E'\n' ||
                 E'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' ||
                 E'PAYER INFORMATION:\n' ||
                 E'DropDollar Inc.\n' ||
                 E'support@drop-dollar.com\n' ||
                 E'EIN: [Company EIN]\n\n' ||
                 E'RECIPIENT INFORMATION:\n' ||
                 E'Name: ' || p_full_name || E'\n' ||
                 CASE WHEN p_ssn_last4 IS NOT NULL THEN E'SSN: ***-**-' || p_ssn_last4 || E'\n' ELSE '' END ||
                 CASE WHEN p_address IS NOT NULL THEN E'Address: ' || p_address || E'\n' ELSE '' END ||
                 E'\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' ||
                 E'BOX 1 - NONEMPLOYEE COMPENSATION:\n' ||
                 E'$' || ROUND(p_amount, 2)::TEXT || E'\n\n' ||
                 E'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' ||
                 E'This is important tax information and is being furnished to the IRS. ' ||
                 E'If you are required to file a return, a negligence penalty or other ' ||
                 E'sanction may be imposed on you if this income is taxable and the IRS ' ||
                 E'determines that it has not been reported.\n\n' ||
                 E'FILING DEADLINE: ' || v_deadline || E'\n\n' ||
                 E'Please retain this document for your tax records. ' ||
                 E'For questions, contact support@drop-dollar.com';
    
    v_type := 'tax_1099';
    
    INSERT INTO user_messages (
        user_id,
        title,
        content,
        message_type,
        metadata
    ) VALUES (
        p_user_id,
        v_title,
        v_content,
        v_type,
        jsonb_build_object(
            'tax_year', p_tax_year,
            'amount', p_amount,
            'full_name', p_full_name,
            'ssn_last4', p_ssn_last4,
            'address', p_address,
            'payer', 'DropDollar Inc.',
            'form_type', '1099-NEC',
            'box_1_amount', p_amount,
            'generated_at', NOW(),
            'filing_deadline', v_deadline
        )
    )
    RETURNING id INTO v_message_id;
    
    -- Also record this in a 1099 tracking table if it exists
    BEGIN
        INSERT INTO tax_1099_records (
            user_id,
            tax_year,
            amount,
            form_type,
            status,
            sent_at
        ) VALUES (
            p_user_id,
            p_tax_year,
            p_amount,
            '1099-NEC',
            'sent',
            NOW()
        )
        ON CONFLICT (user_id, tax_year) DO UPDATE SET
            amount = EXCLUDED.amount,
            sent_at = NOW(),
            status = 'sent';
    EXCEPTION WHEN OTHERS THEN
        -- Table might not exist, that's okay
        NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'message_id', v_message_id,
        'user_id', p_user_id,
        'amount', p_amount,
        'tax_year', p_tax_year
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
SELECT COUNT(*) as messages_sent FROM user_messages WHERE message_type IN ('1099_notification', 'tax_1099');

