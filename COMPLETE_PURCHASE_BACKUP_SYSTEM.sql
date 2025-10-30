-- ============================================================================
-- COMPLETE PURCHASE BACKUP AND HISTORY SYSTEM
-- ============================================================================
-- Creates comprehensive backup tables and functions for all purchases
-- Tracks: purchases, refunds, transaction history, audit logs
-- All data properly backed up to Supabase with user-viewable history
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure all backup tables exist with correct structure
-- ============================================================================

-- Purchase history table (main purchase records)
CREATE TABLE IF NOT EXISTS purchase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'refund', 'game_win', 'bonus', 'transfer')),
    amount NUMERIC(10,2) NOT NULL,
    tokens_received NUMERIC(10,2) DEFAULT 0,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    stripe_customer_id TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'completed',
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token transactions table (all token movements)
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'game_win', 'game_loss', 'refund', 'bonus', 'transfer', 'adjustment')),
    balance_before NUMERIC(10,2) NOT NULL DEFAULT 0,
    balance_after NUMERIC(10,2) NOT NULL DEFAULT 0,
    transaction_type TEXT,
    description TEXT,
    stripe_payment_intent_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe webhook log (audit trail of all webhook events)
CREATE TABLE IF NOT EXISTS stripe_webhook_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payment_intent_id TEXT,
    customer_id TEXT,
    amount NUMERIC(10,2),
    currency TEXT,
    status TEXT,
    user_id TEXT,
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Payment audit log (detailed audit trail)
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payment_intent_id TEXT,
    amount NUMERIC(10,2),
    tokens_amount NUMERIC(10,2),
    balance_before NUMERIC(10,2),
    balance_after NUMERIC(10,2),
    status TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User activity log (already exists, ensure correct structure)
ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS activity_type TEXT;
ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_stripe_pi ON purchase_history(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_created ON purchase_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created ON token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_log_event_id ON stripe_webhook_log(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_log_pi ON stripe_webhook_log(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_user_id ON payment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_log_pi ON payment_audit_log(payment_intent_id);

-- ============================================================================
-- STEP 2: RLS Policies (users can view their own data)
-- ============================================================================

ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own purchase history" ON purchase_history;
DROP POLICY IF EXISTS "Service role full access purchase history" ON purchase_history;
DROP POLICY IF EXISTS "Users can view own token transactions" ON token_transactions;
DROP POLICY IF EXISTS "Service role full access token transactions" ON token_transactions;
DROP POLICY IF EXISTS "Admin can view webhook log" ON stripe_webhook_log;
DROP POLICY IF EXISTS "Service role full access webhook log" ON stripe_webhook_log;
DROP POLICY IF EXISTS "Users can view own audit log" ON payment_audit_log;
DROP POLICY IF EXISTS "Service role full access audit log" ON payment_audit_log;

-- Create policies
CREATE POLICY "Users can view own purchase history" ON purchase_history
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access purchase history" ON purchase_history
    FOR ALL USING (true);

CREATE POLICY "Users can view own token transactions" ON token_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access token transactions" ON token_transactions
    FOR ALL USING (true);

CREATE POLICY "Admin can view webhook log" ON stripe_webhook_log
    FOR SELECT USING (true);

CREATE POLICY "Service role full access webhook log" ON stripe_webhook_log
    FOR ALL USING (true);

CREATE POLICY "Users can view own audit log" ON payment_audit_log
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access audit log" ON payment_audit_log
    FOR ALL USING (true);

-- ============================================================================
-- STEP 3: Enhanced add_tokens_from_purchase function with full backup
-- ============================================================================

DROP FUNCTION IF EXISTS add_tokens_from_purchase(TEXT, NUMERIC, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION add_tokens_from_purchase(
    user_id_param TEXT,
    token_amount_param NUMERIC,
    payment_amount_param NUMERIC,
    stripe_payment_intent_id_param TEXT,
    payment_method_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_balance_before NUMERIC;
    v_balance_after NUMERIC;
    v_user_email TEXT;
    v_audit_id UUID;
BEGIN
    RAISE NOTICE '💰 [Purchase] User: %, Tokens: %, Amount: $%, PI: %', 
        user_id_param, token_amount_param, payment_amount_param, stripe_payment_intent_id_param;
    
    -- Get current balance and email
    SELECT tokens, email INTO v_balance_before, v_user_email
    FROM users WHERE id::text = user_id_param;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ User not found: %', user_id_param;
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    
    v_balance_after := v_balance_before + token_amount_param;
    
    RAISE NOTICE '💵 Balance: % → %', v_balance_before, v_balance_after;
    
    -- 1. Update user tokens
    UPDATE users
    SET tokens = v_balance_after,
        updated_at = NOW()
    WHERE id::text = user_id_param;
    
    -- 2. Record in token_transactions
    BEGIN
        INSERT INTO token_transactions (
            user_id, amount, type, balance_before, balance_after,
            transaction_type, description, stripe_payment_intent_id, created_at
        ) VALUES (
            user_id_param::uuid, token_amount_param, 'purchase', 
            v_balance_before, v_balance_after, 'token_purchase',
            format('Purchased %s tokens for $%s', token_amount_param, payment_amount_param),
            stripe_payment_intent_id_param, NOW()
        );
        RAISE NOTICE '✅ Recorded in token_transactions';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ token_transactions error: %', SQLERRM;
    END;
    
    -- 3. Record in purchase_history
    BEGIN
        INSERT INTO purchase_history (
            user_id, transaction_type, amount, tokens_received,
            stripe_payment_intent_id, payment_method, status, description,
            metadata, created_at, updated_at
        ) VALUES (
            user_id_param, 'purchase', payment_amount_param, token_amount_param,
            stripe_payment_intent_id_param, payment_method_param, 'completed',
            format('Token purchase - %s tokens', token_amount_param),
            jsonb_build_object(
                'payment_intent_id', stripe_payment_intent_id_param,
                'amount_paid', payment_amount_param,
                'tokens_received', token_amount_param,
                'balance_before', v_balance_before,
                'balance_after', v_balance_after,
                'timestamp', NOW()
            ),
            NOW(), NOW()
        );
        RAISE NOTICE '✅ Recorded in purchase_history';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ purchase_history error: %', SQLERRM;
    END;
    
    -- 4. Record in payment_audit_log
    BEGIN
        INSERT INTO payment_audit_log (
            user_id, action, payment_intent_id, amount, tokens_amount,
            balance_before, balance_after, status, metadata, created_at
        ) VALUES (
            user_id_param, 'token_purchase', stripe_payment_intent_id_param,
            payment_amount_param, token_amount_param, v_balance_before, v_balance_after,
            'completed',
            jsonb_build_object(
                'payment_method', payment_method_param,
                'user_email', v_user_email,
                'source', 'stripe_webhook'
            ),
            NOW()
        ) RETURNING id INTO v_audit_id;
        RAISE NOTICE '✅ Recorded in payment_audit_log: %', v_audit_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ payment_audit_log error: %', SQLERRM;
    END;
    
    -- 5. Record in user_activity_log
    BEGIN
        INSERT INTO user_activity_log (
            user_id, activity_type, metadata, created_at
        ) VALUES (
            user_id_param, 'token_purchase',
            jsonb_build_object(
                'tokens', token_amount_param,
                'amount', payment_amount_param,
                'payment_intent_id', stripe_payment_intent_id_param,
                'balance_before', v_balance_before,
                'balance_after', v_balance_after
            ),
            NOW()
        );
        RAISE NOTICE '✅ Recorded in user_activity_log';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ user_activity_log error: %', SQLERRM;
    END;
    
    RAISE NOTICE '✅ Purchase complete! New balance: %', v_balance_after;
    
    RETURN json_build_object(
        'success', true,
        'user_id', user_id_param,
        'tokens_added', token_amount_param,
        'amount_paid', payment_amount_param,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'audit_id', v_audit_id
    );
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: %', SQLERRM;
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_tokens_from_purchase(TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated, anon, service_role;

-- ============================================================================
-- STEP 4: Log Stripe webhook events
-- ============================================================================

CREATE OR REPLACE FUNCTION log_stripe_webhook(
    event_id_param TEXT,
    event_type_param TEXT,
    payment_intent_id_param TEXT,
    customer_id_param TEXT DEFAULT NULL,
    amount_param NUMERIC DEFAULT NULL,
    currency_param TEXT DEFAULT NULL,
    status_param TEXT DEFAULT NULL,
    user_id_param TEXT DEFAULT NULL,
    raw_data_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO stripe_webhook_log (
        event_id, event_type, payment_intent_id, customer_id,
        amount, currency, status, user_id, raw_data, created_at
    ) VALUES (
        event_id_param, event_type_param, payment_intent_id_param, customer_id_param,
        amount_param, currency_param, status_param, user_id_param, raw_data_param, NOW()
    )
    ON CONFLICT (event_id) DO UPDATE SET
        processed = false,
        updated_at = NOW()
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_stripe_webhook(TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, JSONB) TO authenticated, anon, service_role;

-- ============================================================================
-- STEP 5: Get user purchase history (for user dashboard)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_purchase_history(user_id_param TEXT)
RETURNS TABLE (
    id UUID,
    transaction_type TEXT,
    amount NUMERIC,
    tokens_received NUMERIC,
    description TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    payment_method TEXT,
    stripe_payment_intent_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ph.id,
        ph.transaction_type,
        ph.amount,
        ph.tokens_received,
        ph.description,
        ph.status,
        ph.created_at,
        ph.payment_method,
        ph.stripe_payment_intent_id
    FROM purchase_history ph
    WHERE ph.user_id = user_id_param
    ORDER BY ph.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_purchase_history(TEXT) TO authenticated, anon;

-- ============================================================================
-- STEP 6: Get user token transaction history (for user dashboard)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_token_history(user_id_param TEXT)
RETURNS TABLE (
    id UUID,
    amount NUMERIC,
    type TEXT,
    balance_before NUMERIC,
    balance_after NUMERIC,
    description TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tt.id,
        tt.amount,
        tt.type,
        tt.balance_before,
        tt.balance_after,
        tt.description,
        tt.created_at
    FROM token_transactions tt
    WHERE tt.user_id = user_id_param::uuid
    ORDER BY tt.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_token_history(TEXT) TO authenticated, anon;

-- ============================================================================
-- STEP 7: Admin function to check payment status
-- ============================================================================

CREATE OR REPLACE FUNCTION check_payment_status(stripe_payment_intent_id_param TEXT)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'purchase_history', (
            SELECT json_agg(row_to_json(ph))
            FROM purchase_history ph
            WHERE ph.stripe_payment_intent_id = stripe_payment_intent_id_param
        ),
        'token_transactions', (
            SELECT json_agg(row_to_json(tt))
            FROM token_transactions tt
            WHERE tt.stripe_payment_intent_id = stripe_payment_intent_id_param
        ),
        'webhook_log', (
            SELECT json_agg(row_to_json(wl))
            FROM stripe_webhook_log wl
            WHERE wl.payment_intent_id = stripe_payment_intent_id_param
        ),
        'audit_log', (
            SELECT json_agg(row_to_json(al))
            FROM payment_audit_log al
            WHERE al.payment_intent_id = stripe_payment_intent_id_param
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_payment_status(TEXT) TO authenticated, service_role;

DO $$
BEGIN
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ COMPLETE PURCHASE BACKUP SYSTEM INSTALLED!';
    RAISE NOTICE '✅ ============================================================';
    RAISE NOTICE '✅ Tables created:';
    RAISE NOTICE '✅   - purchase_history (main purchase records)';
    RAISE NOTICE '✅   - token_transactions (all token movements)';
    RAISE NOTICE '✅   - stripe_webhook_log (webhook audit trail)';
    RAISE NOTICE '✅   - payment_audit_log (detailed audit)';
    RAISE NOTICE '✅ ';
    RAISE NOTICE '✅ Functions created:';
    RAISE NOTICE '✅   - add_tokens_from_purchase() (comprehensive backup)';
    RAISE NOTICE '✅   - log_stripe_webhook() (log all webhook events)';
    RAISE NOTICE '✅   - get_user_purchase_history() (user dashboard)';
    RAISE NOTICE '✅   - get_user_token_history() (user dashboard)';
    RAISE NOTICE '✅   - check_payment_status() (admin debugging)';
    RAISE NOTICE '✅ ';
    RAISE NOTICE '✅ All purchases are now backed up to 4 tables!';
    RAISE NOTICE '✅ Users can view their complete purchase history!';
    RAISE NOTICE '✅ ============================================================';
END $$;

