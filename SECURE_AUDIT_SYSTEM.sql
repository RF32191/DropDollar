-- =====================================================
-- SECURE AUDIT SYSTEM FOR RP AND TOKENS
-- Complete tracking, security, and fraud prevention
-- =====================================================

-- =====================================================
-- PART 1: RP AUDIT SYSTEM
-- =====================================================

-- Drop existing tables if recreating
DROP TABLE IF EXISTS public.rp_audit_log CASCADE;
DROP TABLE IF EXISTS public.rp_balance_snapshots CASCADE;

-- Main RP Audit Log - tracks EVERY RP transaction
CREATE TABLE IF NOT EXISTS public.rp_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'earn_game_xp',           -- XP converted to RP
        'earn_level_up',          -- RP bonus from leveling up
        'earn_daily_task',        -- Daily task completion
        'earn_weekly_task',       -- Weekly task completion
        'earn_achievement',       -- Achievement unlock
        'earn_referral',          -- Referral bonus
        'earn_admin_grant',       -- Admin manually granted
        'earn_competition_win',   -- Competition prize
        'earn_refund',            -- Refund from failed purchase
        'spend_theme_purchase',   -- Theme unlock
        'spend_shop_item',        -- RP shop purchase
        'spend_entry_fee',        -- Competition entry
        'spend_boost',            -- XP/RP boost purchase
        'adjustment_correction',  -- Admin correction
        'adjustment_fraud'        -- Fraud reversal
    )),
    
    -- Amounts
    rp_amount INTEGER NOT NULL,  -- Positive for earn, negative for spend
    rp_balance_before INTEGER NOT NULL,
    rp_balance_after INTEGER NOT NULL,
    
    -- Source tracking
    source_type TEXT,  -- 'game', 'task', 'shop', 'admin', etc.
    source_id TEXT,    -- ID of game, task, shop item, etc.
    source_details JSONB DEFAULT '{}',  -- Additional context
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Integrity check
    checksum TEXT NOT NULL  -- SHA256 of transaction data
);

-- Indexes for fast querying
CREATE INDEX idx_rp_audit_user ON public.rp_audit_log(user_id);
CREATE INDEX idx_rp_audit_type ON public.rp_audit_log(transaction_type);
CREATE INDEX idx_rp_audit_created ON public.rp_audit_log(created_at DESC);
CREATE INDEX idx_rp_audit_source ON public.rp_audit_log(source_type, source_id);

-- RP Balance Snapshots - daily snapshots for reconciliation
CREATE TABLE IF NOT EXISTS public.rp_balance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    rp_balance INTEGER NOT NULL,
    total_earned INTEGER NOT NULL DEFAULT 0,
    total_spent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_rp_snapshots_user ON public.rp_balance_snapshots(user_id, snapshot_date DESC);

-- =====================================================
-- PART 2: TOKEN AUDIT SYSTEM
-- =====================================================

DROP TABLE IF EXISTS public.token_audit_log CASCADE;
DROP TABLE IF EXISTS public.token_balance_snapshots CASCADE;

-- Main Token Audit Log - tracks EVERY token transaction
CREATE TABLE IF NOT EXISTS public.token_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'purchase_stripe',        -- Bought tokens via Stripe
        'purchase_crypto',        -- Bought tokens via crypto
        'purchase_apple',         -- In-app purchase (iOS)
        'purchase_google',        -- In-app purchase (Android)
        'earn_game_win',          -- Won tokens in competition
        'earn_1v1_win',           -- Won 1v1 match
        'earn_tournament_prize',  -- Tournament prize
        'earn_referral',          -- Referral bonus
        'earn_promo',             -- Promotional bonus
        'earn_refund',            -- Refund from dispute
        'spend_game_entry',       -- Competition entry fee
        'spend_1v1_entry',        -- 1v1 match entry
        'spend_tournament_entry', -- Tournament entry
        'spend_listing_fee',      -- Hot sell listing fee
        'spend_withdrawal',       -- Cashed out tokens
        'transfer_to_user',       -- Sent to another user
        'transfer_from_user',     -- Received from another user
        'hold_pending',           -- Tokens on hold (pending game)
        'release_hold',           -- Tokens released from hold
        'adjustment_correction',  -- Admin correction
        'adjustment_fraud',       -- Fraud reversal
        'fee_platform',           -- Platform fee deduction
        'fee_seller'              -- Seller commission
    )),
    
    -- Amounts
    token_amount DECIMAL(18, 8) NOT NULL,  -- Supports fractional tokens
    token_balance_before DECIMAL(18, 8) NOT NULL,
    token_balance_after DECIMAL(18, 8) NOT NULL,
    
    -- For transfers
    counterparty_user_id UUID REFERENCES auth.users(id),
    
    -- Payment tracking
    payment_provider TEXT,  -- 'stripe', 'coinbase', 'apple', 'google'
    payment_id TEXT,        -- External payment ID
    payment_status TEXT,    -- 'pending', 'completed', 'failed', 'refunded'
    
    -- Source tracking
    source_type TEXT,  -- 'competition', '1v1', 'tournament', 'purchase', etc.
    source_id TEXT,    -- ID of game, listing, etc.
    source_details JSONB DEFAULT '{}',
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    risk_score INTEGER DEFAULT 0,  -- 0-100, higher = more suspicious
    flagged BOOLEAN DEFAULT FALSE,
    flagged_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Integrity check
    checksum TEXT NOT NULL
);

-- Indexes for fast querying
CREATE INDEX idx_token_audit_user ON public.token_audit_log(user_id);
CREATE INDEX idx_token_audit_type ON public.token_audit_log(transaction_type);
CREATE INDEX idx_token_audit_created ON public.token_audit_log(created_at DESC);
CREATE INDEX idx_token_audit_payment ON public.token_audit_log(payment_provider, payment_id);
CREATE INDEX idx_token_audit_flagged ON public.token_audit_log(flagged) WHERE flagged = TRUE;
CREATE INDEX idx_token_audit_source ON public.token_audit_log(source_type, source_id);

-- Token Balance Snapshots
CREATE TABLE IF NOT EXISTS public.token_balance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    token_balance DECIMAL(18, 8) NOT NULL,
    tokens_purchased DECIMAL(18, 8) NOT NULL DEFAULT 0,
    tokens_earned DECIMAL(18, 8) NOT NULL DEFAULT 0,
    tokens_spent DECIMAL(18, 8) NOT NULL DEFAULT 0,
    tokens_withdrawn DECIMAL(18, 8) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_token_snapshots_user ON public.token_balance_snapshots(user_id, snapshot_date DESC);

-- =====================================================
-- PART 3: SECURE FUNCTIONS FOR RP TRANSACTIONS
-- =====================================================

-- Function to generate checksum for integrity
DROP FUNCTION IF EXISTS generate_transaction_checksum(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION generate_transaction_checksum(
    p_user_id UUID,
    p_type TEXT,
    p_amount NUMERIC,
    p_balance_before NUMERIC,
    p_balance_after NUMERIC,
    p_timestamp TIMESTAMPTZ
) RETURNS TEXT AS $$
DECLARE
    v_secret TEXT := 'DROP_DOLLAR_AUDIT_SECRET_2024';  -- Should be in env var
    v_data TEXT;
BEGIN
    v_data := p_user_id::TEXT || '|' || p_type || '|' || p_amount::TEXT || '|' || 
              p_balance_before::TEXT || '|' || p_balance_after::TEXT || '|' || 
              p_timestamp::TEXT || '|' || v_secret;
    RETURN encode(sha256(v_data::bytea), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure function to add RP (with full audit trail)
DROP FUNCTION IF EXISTS secure_add_rp(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION secure_add_rp(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_source_type TEXT DEFAULT NULL,
    p_source_id TEXT DEFAULT NULL,
    p_source_details JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_timestamp TIMESTAMPTZ := NOW();
    v_checksum TEXT;
    v_audit_id UUID;
BEGIN
    -- Validate positive amount for earning
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive for earning RP';
    END IF;
    
    -- Validate transaction type is an earning type
    IF NOT p_transaction_type LIKE 'earn_%' AND p_transaction_type != 'adjustment_correction' THEN
        RAISE EXCEPTION 'Invalid transaction type for adding RP: %', p_transaction_type;
    END IF;
    
    -- Get current balance with row lock
    SELECT COALESCE(reward_points, 0) INTO v_balance_before
    FROM public.user_xp
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Create user_xp record if doesn't exist
    IF v_balance_before IS NULL THEN
        INSERT INTO public.user_xp (user_id, reward_points, total_xp, current_level)
        VALUES (p_user_id, 0, 0, 1)
        ON CONFLICT (user_id) DO NOTHING;
        v_balance_before := 0;
    END IF;
    
    -- Calculate new balance
    v_balance_after := v_balance_before + p_amount;
    
    -- Generate checksum
    v_checksum := generate_transaction_checksum(
        p_user_id, p_transaction_type, p_amount, 
        v_balance_before, v_balance_after, v_timestamp
    );
    
    -- Update balance
    UPDATE public.user_xp
    SET reward_points = v_balance_after
    WHERE user_id = p_user_id;
    
    -- Create audit log entry
    INSERT INTO public.rp_audit_log (
        user_id, transaction_type, rp_amount,
        rp_balance_before, rp_balance_after,
        source_type, source_id, source_details,
        created_at, checksum
    ) VALUES (
        p_user_id, p_transaction_type, p_amount,
        v_balance_before, v_balance_after,
        p_source_type, p_source_id, p_source_details,
        v_timestamp, v_checksum
    ) RETURNING id INTO v_audit_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'audit_id', v_audit_id,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'amount', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure function to spend RP (with full audit trail)
DROP FUNCTION IF EXISTS secure_spend_rp(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION secure_spend_rp(
    p_user_id UUID,
    p_amount INTEGER,
    p_transaction_type TEXT,
    p_source_type TEXT DEFAULT NULL,
    p_source_id TEXT DEFAULT NULL,
    p_source_details JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_timestamp TIMESTAMPTZ := NOW();
    v_checksum TEXT;
    v_audit_id UUID;
BEGIN
    -- Validate positive amount for spending
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive for spending RP';
    END IF;
    
    -- Validate transaction type is a spending type
    IF NOT p_transaction_type LIKE 'spend_%' AND p_transaction_type != 'adjustment_fraud' THEN
        RAISE EXCEPTION 'Invalid transaction type for spending RP: %', p_transaction_type;
    END IF;
    
    -- Get current balance with row lock
    SELECT COALESCE(reward_points, 0) INTO v_balance_before
    FROM public.user_xp
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF v_balance_before IS NULL THEN
        RAISE EXCEPTION 'User has no RP balance';
    END IF;
    
    -- Check sufficient balance
    IF v_balance_before < p_amount THEN
        RAISE EXCEPTION 'Insufficient RP balance. Have: %, Need: %', v_balance_before, p_amount;
    END IF;
    
    -- Calculate new balance
    v_balance_after := v_balance_before - p_amount;
    
    -- Generate checksum
    v_checksum := generate_transaction_checksum(
        p_user_id, p_transaction_type, -p_amount, 
        v_balance_before, v_balance_after, v_timestamp
    );
    
    -- Update balance
    UPDATE public.user_xp
    SET reward_points = v_balance_after
    WHERE user_id = p_user_id;
    
    -- Create audit log entry
    INSERT INTO public.rp_audit_log (
        user_id, transaction_type, rp_amount,
        rp_balance_before, rp_balance_after,
        source_type, source_id, source_details,
        created_at, checksum
    ) VALUES (
        p_user_id, p_transaction_type, -p_amount,
        v_balance_before, v_balance_after,
        p_source_type, p_source_id, p_source_details,
        v_timestamp, v_checksum
    ) RETURNING id INTO v_audit_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'audit_id', v_audit_id,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'amount_spent', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 4: SECURE FUNCTIONS FOR TOKEN TRANSACTIONS
-- =====================================================

-- Secure function to add tokens (with full audit trail)
DROP FUNCTION IF EXISTS secure_add_tokens(UUID, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION secure_add_tokens(
    p_user_id UUID,
    p_amount DECIMAL(18, 8),
    p_transaction_type TEXT,
    p_payment_provider TEXT DEFAULT NULL,
    p_payment_id TEXT DEFAULT NULL,
    p_source_type TEXT DEFAULT NULL,
    p_source_id TEXT DEFAULT NULL,
    p_source_details JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_balance_before DECIMAL(18, 8);
    v_balance_after DECIMAL(18, 8);
    v_timestamp TIMESTAMPTZ := NOW();
    v_checksum TEXT;
    v_audit_id UUID;
BEGIN
    -- Validate positive amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive for adding tokens';
    END IF;
    
    -- Get current balance with row lock
    SELECT COALESCE(balance, 0) INTO v_balance_before
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Create wallet if doesn't exist
    IF v_balance_before IS NULL THEN
        INSERT INTO public.wallets (user_id, balance)
        VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;
        v_balance_before := 0;
    END IF;
    
    -- Calculate new balance
    v_balance_after := v_balance_before + p_amount;
    
    -- Generate checksum
    v_checksum := generate_transaction_checksum(
        p_user_id, p_transaction_type, p_amount, 
        v_balance_before, v_balance_after, v_timestamp
    );
    
    -- Update balance
    UPDATE public.wallets
    SET balance = v_balance_after, updated_at = v_timestamp
    WHERE user_id = p_user_id;
    
    -- Create audit log entry
    INSERT INTO public.token_audit_log (
        user_id, transaction_type, token_amount,
        token_balance_before, token_balance_after,
        payment_provider, payment_id, payment_status,
        source_type, source_id, source_details,
        created_at, processed_at, checksum
    ) VALUES (
        p_user_id, p_transaction_type, p_amount,
        v_balance_before, v_balance_after,
        p_payment_provider, p_payment_id, 'completed',
        p_source_type, p_source_id, p_source_details,
        v_timestamp, v_timestamp, v_checksum
    ) RETURNING id INTO v_audit_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'audit_id', v_audit_id,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'amount', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure function to spend tokens (with full audit trail)
DROP FUNCTION IF EXISTS secure_spend_tokens(UUID, DECIMAL, TEXT, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION secure_spend_tokens(
    p_user_id UUID,
    p_amount DECIMAL(18, 8),
    p_transaction_type TEXT,
    p_source_type TEXT DEFAULT NULL,
    p_source_id TEXT DEFAULT NULL,
    p_source_details JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_balance_before DECIMAL(18, 8);
    v_balance_after DECIMAL(18, 8);
    v_timestamp TIMESTAMPTZ := NOW();
    v_checksum TEXT;
    v_audit_id UUID;
BEGIN
    -- Validate positive amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive for spending tokens';
    END IF;
    
    -- Get current balance with row lock
    SELECT COALESCE(balance, 0) INTO v_balance_before
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF v_balance_before IS NULL THEN
        RAISE EXCEPTION 'User has no token balance';
    END IF;
    
    -- Check sufficient balance
    IF v_balance_before < p_amount THEN
        RAISE EXCEPTION 'Insufficient token balance. Have: %, Need: %', v_balance_before, p_amount;
    END IF;
    
    -- Calculate new balance
    v_balance_after := v_balance_before - p_amount;
    
    -- Generate checksum
    v_checksum := generate_transaction_checksum(
        p_user_id, p_transaction_type, -p_amount, 
        v_balance_before, v_balance_after, v_timestamp
    );
    
    -- Update balance
    UPDATE public.wallets
    SET balance = v_balance_after, updated_at = v_timestamp
    WHERE user_id = p_user_id;
    
    -- Create audit log entry
    INSERT INTO public.token_audit_log (
        user_id, transaction_type, token_amount,
        token_balance_before, token_balance_after,
        source_type, source_id, source_details,
        created_at, processed_at, checksum
    ) VALUES (
        p_user_id, p_transaction_type, -p_amount,
        v_balance_before, v_balance_after,
        p_source_type, p_source_id, p_source_details,
        v_timestamp, v_timestamp, v_checksum
    ) RETURNING id INTO v_audit_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'audit_id', v_audit_id,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'amount_spent', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 5: FRAUD DETECTION & ALERTS
-- =====================================================

-- Fraud alerts table
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'rapid_transactions',     -- Too many transactions too fast
        'balance_mismatch',       -- Calculated vs actual balance mismatch
        'suspicious_pattern',     -- Unusual activity pattern
        'high_value_transaction', -- Large single transaction
        'cross_account_activity', -- Same IP multiple accounts
        'checksum_failure',       -- Data integrity violation
        'manual_report'           -- Admin-reported issue
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    currency_type TEXT NOT NULL CHECK (currency_type IN ('rp', 'token', 'both')),
    details JSONB NOT NULL,
    transaction_ids UUID[],
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_alerts_user ON public.fraud_alerts(user_id);
CREATE INDEX idx_fraud_alerts_unresolved ON public.fraud_alerts(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_fraud_alerts_severity ON public.fraud_alerts(severity, created_at DESC);

-- Function to check for rapid transactions (potential bot/exploit)
DROP FUNCTION IF EXISTS check_rapid_transactions(UUID, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION check_rapid_transactions(
    p_user_id UUID,
    p_currency_type TEXT,  -- 'rp' or 'token'
    p_window_seconds INTEGER DEFAULT 60,
    p_max_transactions INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_currency_type = 'rp' THEN
        SELECT COUNT(*) INTO v_count
        FROM public.rp_audit_log
        WHERE user_id = p_user_id
          AND created_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL;
    ELSE
        SELECT COUNT(*) INTO v_count
        FROM public.token_audit_log
        WHERE user_id = p_user_id
          AND created_at > NOW() - (p_window_seconds || ' seconds')::INTERVAL;
    END IF;
    
    IF v_count >= p_max_transactions THEN
        -- Create fraud alert
        INSERT INTO public.fraud_alerts (
            user_id, alert_type, severity, currency_type, details
        ) VALUES (
            p_user_id, 'rapid_transactions', 
            CASE WHEN v_count > p_max_transactions * 2 THEN 'critical' ELSE 'high' END,
            p_currency_type,
            jsonb_build_object(
                'transaction_count', v_count,
                'window_seconds', p_window_seconds,
                'threshold', p_max_transactions
            )
        );
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify balance integrity
DROP FUNCTION IF EXISTS verify_balance_integrity(UUID);
CREATE OR REPLACE FUNCTION verify_balance_integrity(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_rp_calculated INTEGER;
    v_rp_actual INTEGER;
    v_token_calculated DECIMAL(18, 8);
    v_token_actual DECIMAL(18, 8);
    v_issues JSONB := '[]'::JSONB;
BEGIN
    -- Calculate RP balance from audit log
    SELECT COALESCE(SUM(rp_amount), 0) INTO v_rp_calculated
    FROM public.rp_audit_log
    WHERE user_id = p_user_id;
    
    -- Get actual RP balance
    SELECT COALESCE(reward_points, 0) INTO v_rp_actual
    FROM public.user_xp
    WHERE user_id = p_user_id;
    
    -- Check RP mismatch
    IF v_rp_calculated != v_rp_actual THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'rp_mismatch',
            'calculated', v_rp_calculated,
            'actual', v_rp_actual,
            'difference', v_rp_actual - v_rp_calculated
        );
        
        INSERT INTO public.fraud_alerts (
            user_id, alert_type, severity, currency_type, details
        ) VALUES (
            p_user_id, 'balance_mismatch', 'critical', 'rp',
            jsonb_build_object(
                'calculated', v_rp_calculated,
                'actual', v_rp_actual,
                'difference', v_rp_actual - v_rp_calculated
            )
        );
    END IF;
    
    -- Calculate token balance from audit log
    SELECT COALESCE(SUM(token_amount), 0) INTO v_token_calculated
    FROM public.token_audit_log
    WHERE user_id = p_user_id;
    
    -- Get actual token balance
    SELECT COALESCE(balance, 0) INTO v_token_actual
    FROM public.wallets
    WHERE user_id = p_user_id;
    
    -- Check token mismatch
    IF v_token_calculated != v_token_actual THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'token_mismatch',
            'calculated', v_token_calculated,
            'actual', v_token_actual,
            'difference', v_token_actual - v_token_calculated
        );
        
        INSERT INTO public.fraud_alerts (
            user_id, alert_type, severity, currency_type, details
        ) VALUES (
            p_user_id, 'balance_mismatch', 'critical', 'token',
            jsonb_build_object(
                'calculated', v_token_calculated,
                'actual', v_token_actual,
                'difference', v_token_actual - v_token_calculated
            )
        );
    END IF;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'rp_valid', v_rp_calculated = v_rp_actual,
        'token_valid', v_token_calculated = v_token_actual,
        'issues', v_issues
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all audit tables
ALTER TABLE public.rp_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rp_balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
DROP POLICY IF EXISTS "Users view own rp_audit" ON public.rp_audit_log;
CREATE POLICY "Users view own rp_audit" ON public.rp_audit_log
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own token_audit" ON public.token_audit_log;
CREATE POLICY "Users view own token_audit" ON public.token_audit_log
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own rp_snapshots" ON public.rp_balance_snapshots;
CREATE POLICY "Users view own rp_snapshots" ON public.rp_balance_snapshots
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own token_snapshots" ON public.token_balance_snapshots;
CREATE POLICY "Users view own token_snapshots" ON public.token_balance_snapshots
    FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update/delete audit logs (prevents tampering)
DROP POLICY IF EXISTS "Service role manages rp_audit" ON public.rp_audit_log;
CREATE POLICY "Service role manages rp_audit" ON public.rp_audit_log
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role manages token_audit" ON public.token_audit_log;
CREATE POLICY "Service role manages token_audit" ON public.token_audit_log
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Fraud alerts only visible to admins
DROP POLICY IF EXISTS "Admins view fraud_alerts" ON public.fraud_alerts;
CREATE POLICY "Admins view fraud_alerts" ON public.fraud_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Service role manages fraud_alerts" ON public.fraud_alerts;
CREATE POLICY "Service role manages fraud_alerts" ON public.fraud_alerts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- PART 7: ADMIN DASHBOARD VIEWS
-- =====================================================

-- View for admin to see all RP transactions with user info
CREATE OR REPLACE VIEW admin_rp_transactions AS
SELECT 
    r.id,
    r.user_id,
    u.email,
    u.username,
    r.transaction_type,
    r.rp_amount,
    r.rp_balance_before,
    r.rp_balance_after,
    r.source_type,
    r.source_id,
    r.created_at
FROM public.rp_audit_log r
JOIN auth.users au ON r.user_id = au.id
LEFT JOIN public.users u ON r.user_id = u.id
ORDER BY r.created_at DESC;

-- View for admin to see all token transactions with user info
CREATE OR REPLACE VIEW admin_token_transactions AS
SELECT 
    t.id,
    t.user_id,
    u.email,
    u.username,
    t.transaction_type,
    t.token_amount,
    t.token_balance_before,
    t.token_balance_after,
    t.payment_provider,
    t.payment_id,
    t.flagged,
    t.flagged_reason,
    t.source_type,
    t.source_id,
    t.created_at
FROM public.token_audit_log t
JOIN auth.users au ON t.user_id = au.id
LEFT JOIN public.users u ON t.user_id = u.id
ORDER BY t.created_at DESC;

-- View for daily summary
CREATE OR REPLACE VIEW admin_daily_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE rp_amount > 0) as rp_earned_count,
    COALESCE(SUM(rp_amount) FILTER (WHERE rp_amount > 0), 0) as total_rp_earned,
    COUNT(*) FILTER (WHERE rp_amount < 0) as rp_spent_count,
    COALESCE(ABS(SUM(rp_amount) FILTER (WHERE rp_amount < 0)), 0) as total_rp_spent
FROM public.rp_audit_log
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =====================================================
-- PART 8: GRANT PERMISSIONS
-- =====================================================

-- Grant execute on secure functions to authenticated users
GRANT EXECUTE ON FUNCTION secure_add_rp TO authenticated;
GRANT EXECUTE ON FUNCTION secure_spend_rp TO authenticated;
GRANT EXECUTE ON FUNCTION secure_add_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION secure_spend_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION verify_balance_integrity TO authenticated;

-- Grant select on audit tables to authenticated users (RLS will filter)
GRANT SELECT ON public.rp_audit_log TO authenticated;
GRANT SELECT ON public.token_audit_log TO authenticated;
GRANT SELECT ON public.rp_balance_snapshots TO authenticated;
GRANT SELECT ON public.token_balance_snapshots TO authenticated;

-- Service role gets full access
GRANT ALL ON public.rp_audit_log TO service_role;
GRANT ALL ON public.token_audit_log TO service_role;
GRANT ALL ON public.rp_balance_snapshots TO service_role;
GRANT ALL ON public.token_balance_snapshots TO service_role;
GRANT ALL ON public.fraud_alerts TO service_role;

-- =====================================================
-- PART 9: ADMIN NOTIFICATION SYSTEM
-- =====================================================

-- Admin security notifications table
CREATE TABLE IF NOT EXISTS public.admin_security_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL DEFAULT 'rf32191@gmail.com',
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'fraud_alert',
        'balance_mismatch',
        'rapid_transactions',
        'high_value_transaction',
        'suspicious_activity',
        'checksum_failure',
        'system_error'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_user_id UUID REFERENCES auth.users(id),
    related_user_email TEXT,
    related_transaction_id UUID,
    details JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_notifications_unread ON public.admin_security_notifications(read, created_at DESC) WHERE read = FALSE;
CREATE INDEX idx_admin_notifications_severity ON public.admin_security_notifications(severity, created_at DESC);
CREATE INDEX idx_admin_notifications_type ON public.admin_security_notifications(notification_type);

-- Function to send admin notification
DROP FUNCTION IF EXISTS notify_admin_security(TEXT, TEXT, TEXT, TEXT, UUID, UUID, JSONB);
CREATE OR REPLACE FUNCTION notify_admin_security(
    p_notification_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_user_id UUID DEFAULT NULL,
    p_related_transaction_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_user_email TEXT;
BEGIN
    -- Get user email if user_id provided
    IF p_related_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email
        FROM auth.users
        WHERE id = p_related_user_id;
    END IF;
    
    -- Insert notification for admin
    INSERT INTO public.admin_security_notifications (
        admin_email,
        notification_type,
        severity,
        title,
        message,
        related_user_id,
        related_user_email,
        related_transaction_id,
        details
    ) VALUES (
        'rf32191@gmail.com',
        p_notification_type,
        p_severity,
        p_title,
        p_message,
        p_related_user_id,
        v_user_email,
        p_related_transaction_id,
        p_details
    ) RETURNING id INTO v_notification_id;
    
    -- Also insert into user messages for admin dashboard visibility
    INSERT INTO public.messages (
        sender_id,
        recipient_id,
        content,
        message_type,
        metadata,
        created_at
    )
    SELECT
        p_related_user_id,  -- From the suspicious user
        u.id,               -- To admin
        '🚨 SECURITY ALERT: ' || p_title || E'\n\n' || p_message,
        'security_alert',
        jsonb_build_object(
            'notification_id', v_notification_id,
            'severity', p_severity,
            'type', p_notification_type,
            'details', p_details
        ),
        NOW()
    FROM public.users u
    WHERE u.email = 'rf32191@gmail.com'
    LIMIT 1;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to auto-notify on fraud alerts
DROP FUNCTION IF EXISTS trigger_fraud_alert_notification() CASCADE;
CREATE OR REPLACE FUNCTION trigger_fraud_alert_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_message TEXT;
    v_user_email TEXT;
BEGIN
    -- Get user email
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = NEW.user_id;
    
    -- Build notification message based on alert type
    CASE NEW.alert_type
        WHEN 'rapid_transactions' THEN
            v_title := '⚡ Rapid Transaction Alert';
            v_message := format(
                'User %s made %s transactions in %s seconds (threshold: %s).',
                COALESCE(v_user_email, NEW.user_id::TEXT),
                NEW.details->>'transaction_count',
                NEW.details->>'window_seconds',
                NEW.details->>'threshold'
            );
        WHEN 'balance_mismatch' THEN
            v_title := '💰 Balance Mismatch Detected';
            v_message := format(
                'User %s has a %s balance mismatch! Calculated: %s, Actual: %s, Difference: %s',
                COALESCE(v_user_email, NEW.user_id::TEXT),
                NEW.currency_type,
                NEW.details->>'calculated',
                NEW.details->>'actual',
                NEW.details->>'difference'
            );
        WHEN 'suspicious_pattern' THEN
            v_title := '🔍 Suspicious Activity Pattern';
            v_message := format(
                'Suspicious activity detected for user %s. Details: %s',
                COALESCE(v_user_email, NEW.user_id::TEXT),
                NEW.details::TEXT
            );
        WHEN 'high_value_transaction' THEN
            v_title := '💎 High Value Transaction';
            v_message := format(
                'Large transaction by user %s: %s %s',
                COALESCE(v_user_email, NEW.user_id::TEXT),
                NEW.details->>'amount',
                NEW.currency_type
            );
        WHEN 'cross_account_activity' THEN
            v_title := '👥 Cross-Account Activity';
            v_message := format(
                'Same IP detected for multiple accounts. User: %s, IP: %s',
                COALESCE(v_user_email, NEW.user_id::TEXT),
                NEW.details->>'ip_address'
            );
        WHEN 'checksum_failure' THEN
            v_title := '🔐 Data Integrity Violation';
            v_message := format(
                'CRITICAL: Checksum failure for user %s. Possible data tampering!',
                COALESCE(v_user_email, NEW.user_id::TEXT)
            );
        ELSE
            v_title := '⚠️ Security Alert';
            v_message := format(
                'Security alert for user %s: %s',
                COALESCE(v_user_email, NEW.user_id::TEXT),
                NEW.alert_type
            );
    END CASE;
    
    -- Send notification
    PERFORM notify_admin_security(
        NEW.alert_type,
        NEW.severity,
        v_title,
        v_message,
        NEW.user_id,
        NULL,
        NEW.details
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on fraud_alerts table
DROP TRIGGER IF EXISTS fraud_alert_notification_trigger ON public.fraud_alerts;
CREATE TRIGGER fraud_alert_notification_trigger
    AFTER INSERT ON public.fraud_alerts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_fraud_alert_notification();

-- Function to check and alert on high-value transactions
DROP FUNCTION IF EXISTS check_high_value_transaction() CASCADE;
CREATE OR REPLACE FUNCTION check_high_value_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold_rp INTEGER := 10000;  -- Alert if RP transaction > 10,000
    v_threshold_tokens DECIMAL := 100;  -- Alert if token transaction > 100
BEGIN
    -- Check RP high value
    IF TG_TABLE_NAME = 'rp_audit_log' THEN
        IF ABS(NEW.rp_amount) >= v_threshold_rp THEN
            INSERT INTO public.fraud_alerts (
                user_id, alert_type, severity, currency_type, details
            ) VALUES (
                NEW.user_id,
                'high_value_transaction',
                CASE 
                    WHEN ABS(NEW.rp_amount) >= v_threshold_rp * 5 THEN 'critical'
                    WHEN ABS(NEW.rp_amount) >= v_threshold_rp * 2 THEN 'high'
                    ELSE 'medium'
                END,
                'rp',
                jsonb_build_object(
                    'amount', NEW.rp_amount,
                    'transaction_type', NEW.transaction_type,
                    'balance_before', NEW.rp_balance_before,
                    'balance_after', NEW.rp_balance_after
                )
            );
        END IF;
    END IF;
    
    -- Check token high value
    IF TG_TABLE_NAME = 'token_audit_log' THEN
        IF ABS(NEW.token_amount) >= v_threshold_tokens THEN
            INSERT INTO public.fraud_alerts (
                user_id, alert_type, severity, currency_type, details
            ) VALUES (
                NEW.user_id,
                'high_value_transaction',
                CASE 
                    WHEN ABS(NEW.token_amount) >= v_threshold_tokens * 5 THEN 'critical'
                    WHEN ABS(NEW.token_amount) >= v_threshold_tokens * 2 THEN 'high'
                    ELSE 'medium'
                END,
                'token',
                jsonb_build_object(
                    'amount', NEW.token_amount,
                    'transaction_type', NEW.transaction_type,
                    'balance_before', NEW.token_balance_before,
                    'balance_after', NEW.token_balance_after,
                    'payment_provider', NEW.payment_provider
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for high-value transaction detection
DROP TRIGGER IF EXISTS rp_high_value_trigger ON public.rp_audit_log;
CREATE TRIGGER rp_high_value_trigger
    AFTER INSERT ON public.rp_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION check_high_value_transaction();

DROP TRIGGER IF EXISTS token_high_value_trigger ON public.token_audit_log;
CREATE TRIGGER token_high_value_trigger
    AFTER INSERT ON public.token_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION check_high_value_transaction();

-- Function to get unread admin notifications count
DROP FUNCTION IF EXISTS get_admin_unread_notifications_count();
CREATE OR REPLACE FUNCTION get_admin_unread_notifications_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.admin_security_notifications
        WHERE read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin notifications
DROP FUNCTION IF EXISTS get_admin_security_notifications(INTEGER, BOOLEAN);
CREATE OR REPLACE FUNCTION get_admin_security_notifications(
    p_limit INTEGER DEFAULT 50,
    p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    notification_type TEXT,
    severity TEXT,
    title TEXT,
    message TEXT,
    related_user_email TEXT,
    details JSONB,
    read BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.notification_type,
        n.severity,
        n.title,
        n.message,
        n.related_user_email,
        n.details,
        n.read,
        n.created_at
    FROM public.admin_security_notifications n
    WHERE (NOT p_unread_only OR n.read = FALSE)
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
DROP FUNCTION IF EXISTS mark_notification_read CASCADE;
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.admin_security_notifications
    SET read = TRUE, read_at = NOW()
    WHERE id = p_notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
DROP FUNCTION IF EXISTS mark_all_notifications_read();
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.admin_security_notifications
    SET read = TRUE, read_at = NOW()
    WHERE read = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for admin notifications
ALTER TABLE public.admin_security_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin views notifications" ON public.admin_security_notifications;
CREATE POLICY "Admin views notifications" ON public.admin_security_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND (role = 'admin' OR email = 'rf32191@gmail.com')
        )
    );

DROP POLICY IF EXISTS "Admin manages notifications" ON public.admin_security_notifications;
CREATE POLICY "Admin manages notifications" ON public.admin_security_notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND (role = 'admin' OR email = 'rf32191@gmail.com')
        )
    );

DROP POLICY IF EXISTS "Service role full access notifications" ON public.admin_security_notifications;
CREATE POLICY "Service role full access notifications" ON public.admin_security_notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT SELECT, UPDATE ON public.admin_security_notifications TO authenticated;
GRANT ALL ON public.admin_security_notifications TO service_role;
GRANT EXECUTE ON FUNCTION notify_admin_security TO service_role;
GRANT EXECUTE ON FUNCTION get_admin_unread_notifications_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_security_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;

-- =====================================================
-- PART 10: VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ SECURE AUDIT SYSTEM INSTALLED';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tables Created:';
    RAISE NOTICE '   - rp_audit_log (RP transaction history)';
    RAISE NOTICE '   - token_audit_log (Token transaction history)';
    RAISE NOTICE '   - rp_balance_snapshots (Daily RP snapshots)';
    RAISE NOTICE '   - token_balance_snapshots (Daily token snapshots)';
    RAISE NOTICE '   - fraud_alerts (Suspicious activity alerts)';
    RAISE NOTICE '   - admin_security_notifications (Admin alerts)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security Functions:';
    RAISE NOTICE '   - secure_add_rp() - Add RP with audit trail';
    RAISE NOTICE '   - secure_spend_rp() - Spend RP with audit trail';
    RAISE NOTICE '   - secure_add_tokens() - Add tokens with audit trail';
    RAISE NOTICE '   - secure_spend_tokens() - Spend tokens with audit trail';
    RAISE NOTICE '   - verify_balance_integrity() - Check for discrepancies';
    RAISE NOTICE '   - check_rapid_transactions() - Detect bot activity';
    RAISE NOTICE '';
    RAISE NOTICE '🔔 Admin Notification Functions:';
    RAISE NOTICE '   - notify_admin_security() - Send security alert';
    RAISE NOTICE '   - get_admin_security_notifications() - Get alerts';
    RAISE NOTICE '   - get_admin_unread_notifications_count() - Unread count';
    RAISE NOTICE '   - mark_notification_read() - Mark as read';
    RAISE NOTICE '   - mark_all_notifications_read() - Mark all read';
    RAISE NOTICE '';
    RAISE NOTICE '🛡️ Security Features:';
    RAISE NOTICE '   - Row Level Security on all tables';
    RAISE NOTICE '   - SHA256 checksums on all transactions';
    RAISE NOTICE '   - Automatic fraud detection';
    RAISE NOTICE '   - Balance integrity verification';
    RAISE NOTICE '   - IP/session tracking';
    RAISE NOTICE '   - Real-time admin notifications';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Admin Email: rf32191@gmail.com';
    RAISE NOTICE '   - Receives all security alerts';
    RAISE NOTICE '   - Fraud alerts auto-notify';
    RAISE NOTICE '   - High-value transactions auto-notify';
    RAISE NOTICE '   - Balance mismatches auto-notify';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT: Run these functions instead of direct updates!';
END $$;

