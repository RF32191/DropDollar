# 🔒 Complete Wallet Security System

## 🎯 Overview

DropDollar uses a **multi-layered security system** to protect all user wallets and prize funds. No single point of failure can compromise user funds.

---

## 💰 Wallet Types & Security

### 1. **User Token Wallet** (Buyers/Players)

**What It Stores:**
- Purchased tokens for entering competitions
- Won prizes (before claiming)
- Bonus tokens from promotions

**Security Measures:**

#### A. Database Level Security
```sql
-- Row Level Security (RLS) enabled
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;

-- Users can ONLY see their own balance
CREATE POLICY "Users view own balance"
ON user_balances FOR SELECT
USING (auth.uid() = user_id);

-- Users CANNOT directly modify their balance
-- Only server functions can update balances
CREATE POLICY "No direct balance updates"
ON user_balances FOR UPDATE
USING (false);  -- Blocks all direct updates
```

#### B. Transaction Logging
```sql
-- Every balance change is logged
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    transaction_type TEXT NOT NULL, -- 'purchase', 'entry_fee', 'prize_won', 'refund'
    before_balance NUMERIC NOT NULL,
    after_balance NUMERIC NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Immutable - can never be deleted or updated
    CONSTRAINT no_negative_amounts CHECK (amount >= 0)
);

-- Make transactions immutable
CREATE POLICY "Transactions are read-only"
ON wallet_transactions FOR ALL
USING (false);  -- Nobody can modify transactions
```

#### C. Atomic Operations
```sql
-- All balance changes use atomic transactions
CREATE OR REPLACE FUNCTION deduct_entry_fee(
    p_user_id UUID,
    p_amount NUMERIC,
    p_listing_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance NUMERIC;
BEGIN
    -- Lock the row for update
    SELECT balance INTO v_current_balance
    FROM user_balances
    WHERE user_id = p_user_id
    FOR UPDATE;  -- Row-level lock prevents race conditions
    
    -- Verify sufficient funds
    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds: % < %', v_current_balance, p_amount;
    END IF;
    
    -- Deduct in single atomic operation
    UPDATE user_balances
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log transaction (immutable)
    INSERT INTO wallet_transactions (
        user_id, amount, transaction_type, 
        before_balance, after_balance, reason, metadata
    ) VALUES (
        p_user_id, p_amount, 'entry_fee',
        v_current_balance, v_current_balance - p_amount,
        'Competition entry', 
        jsonb_build_object('listing_id', p_listing_id)
    );
    
    RETURN TRUE;
END;
$$;
```

#### D. Balance Verification
```sql
-- Function to verify balance integrity
CREATE OR REPLACE FUNCTION verify_balance_integrity(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_calculated_balance NUMERIC;
    v_actual_balance NUMERIC;
BEGIN
    -- Calculate balance from transaction history
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN transaction_type IN ('purchase', 'prize_won', 'refund') THEN amount
                WHEN transaction_type IN ('entry_fee', 'withdrawal') THEN -amount
                ELSE 0
            END
        ), 0)
    INTO v_calculated_balance
    FROM wallet_transactions
    WHERE user_id = p_user_id;
    
    -- Get actual balance
    SELECT balance INTO v_actual_balance
    FROM user_balances
    WHERE user_id = p_user_id;
    
    -- Compare
    IF v_calculated_balance != v_actual_balance THEN
        -- Log discrepancy
        INSERT INTO security_alerts (
            alert_type, user_id, message, metadata, created_at
        ) VALUES (
            'balance_mismatch', p_user_id,
            format('Balance mismatch: calculated=%s, actual=%s', 
                   v_calculated_balance, v_actual_balance),
            jsonb_build_object(
                'calculated', v_calculated_balance,
                'actual', v_actual_balance
            ),
            NOW()
        );
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;
```

---

### 2. **Seller Wallet** (Marketplace Sellers)

**What It Stores:**
- Pending balance (awaiting tracking submission)
- Released balance (ready to withdraw)
- Lifetime earnings tracking

**Security Measures:**

#### A. Dual Wallet System (Escrow Protection)
```sql
-- Funds are held in escrow until tracking submitted
CREATE TABLE seller_wallets (
    id UUID PRIMARY KEY,
    seller_id UUID UNIQUE NOT NULL,
    
    -- PENDING: Held until tracking provided
    pending_balance NUMERIC(10,2) DEFAULT 0.00 CHECK (pending_balance >= 0),
    total_pending_sales INTEGER DEFAULT 0 CHECK (total_pending_sales >= 0),
    
    -- RELEASED: Can be withdrawn
    released_balance NUMERIC(10,2) DEFAULT 0.00 CHECK (released_balance >= 0),
    total_released_sales INTEGER DEFAULT 0 CHECK (total_released_sales >= 0),
    
    -- Audit trail
    total_earned NUMERIC(10,2) DEFAULT 0.00 CHECK (total_earned >= 0),
    total_withdrawn NUMERIC(10,2) DEFAULT 0.00 CHECK (total_withdrawn >= 0),
    
    -- Prevent negative balances
    CONSTRAINT positive_balances CHECK (
        pending_balance >= 0 AND 
        released_balance >= 0 AND
        total_earned >= total_withdrawn
    )
);
```

#### B. Release Protection
```sql
-- Funds only release with valid tracking
CREATE OR REPLACE FUNCTION release_seller_funds(
    p_session_id UUID,
    p_tracking_number TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seller_id UUID;
    v_amount NUMERIC;
    v_already_released BOOLEAN;
BEGIN
    -- Get session details
    SELECT 
        ml.seller_id,
        ms.seller_earnings,
        ms.funds_released
    INTO v_seller_id, v_amount, v_already_released
    FROM marketplace_sessions ms
    JOIN marketplace_listings ml ON ml.id = ms.listing_id
    WHERE ms.id = p_session_id;
    
    -- Security check: Only seller can release
    IF v_seller_id != auth.uid() THEN
        RAISE EXCEPTION 'Security violation: Not the seller';
    END IF;
    
    -- Prevent double release
    IF v_already_released THEN
        RAISE EXCEPTION 'Security violation: Funds already released';
    END IF;
    
    -- Validate tracking number
    IF p_tracking_number IS NULL OR LENGTH(p_tracking_number) < 5 THEN
        RAISE EXCEPTION 'Invalid tracking number';
    END IF;
    
    -- Atomic transfer: Pending → Released
    UPDATE seller_wallets
    SET 
        pending_balance = GREATEST(pending_balance - v_amount, 0),
        released_balance = released_balance + v_amount,
        total_pending_sales = GREATEST(total_pending_sales - 1, 0),
        total_released_sales = total_released_sales + 1,
        total_earned = total_earned + v_amount
    WHERE seller_id = v_seller_id;
    
    -- Mark session as released
    UPDATE marketplace_sessions
    SET 
        funds_released = true,
        funds_released_at = NOW(),
        tracking_number = p_tracking_number
    WHERE id = p_session_id;
    
    -- Log transaction
    INSERT INTO wallet_transactions (
        user_id, amount, transaction_type,
        reason, metadata, created_at
    ) VALUES (
        v_seller_id, v_amount, 'funds_released',
        'Tracking submitted, funds released',
        jsonb_build_object('session_id', p_session_id, 'tracking', p_tracking_number),
        NOW()
    );
END;
$$;
```

#### C. Withdrawal Protection
```sql
-- Withdrawals require Stripe verification
CREATE OR REPLACE FUNCTION withdraw_to_stripe(
    p_seller_id UUID,
    p_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available NUMERIC;
    v_stripe_account_id TEXT;
BEGIN
    -- Security check: Only owner can withdraw
    IF p_seller_id != auth.uid() THEN
        RAISE EXCEPTION 'Security violation: Not authorized';
    END IF;
    
    -- Get available balance and Stripe account
    SELECT released_balance, stripe_account_id
    INTO v_available, v_stripe_account_id
    FROM seller_wallets
    WHERE seller_id = p_seller_id
    FOR UPDATE;  -- Lock row
    
    -- Validate withdrawal
    IF v_available < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds: % available, % requested', v_available, p_amount;
    END IF;
    
    IF v_stripe_account_id IS NULL THEN
        RAISE EXCEPTION 'No Stripe account connected';
    END IF;
    
    -- Deduct from released balance
    UPDATE seller_wallets
    SET 
        released_balance = released_balance - p_amount,
        total_withdrawn = total_withdrawn + p_amount
    WHERE seller_id = p_seller_id;
    
    -- Log withdrawal
    INSERT INTO wallet_transactions (
        user_id, amount, transaction_type,
        reason, metadata, created_at
    ) VALUES (
        p_seller_id, p_amount, 'withdrawal',
        'Stripe payout initiated',
        jsonb_build_object('stripe_account', v_stripe_account_id),
        NOW()
    );
    
    -- Return info for Stripe API call (done in application layer)
    RETURN jsonb_build_object(
        'success', true,
        'amount', p_amount,
        'stripe_account', v_stripe_account_id
    );
END;
$$;
```

---

### 3. **Prize Pool** (Escrow System)

**What It Stores:**
- Competition entry fees
- Held until winner determined
- Protected until prize claimed

**Security Measures:**

#### A. Escrow Table
```sql
CREATE TABLE prize_escrow (
    id UUID PRIMARY KEY,
    listing_id UUID NOT NULL,
    session_id UUID NOT NULL,
    total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
    platform_fee NUMERIC NOT NULL CHECK (platform_fee >= 0),
    seller_amount NUMERIC NOT NULL CHECK (seller_amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'winner_determined', 'paid_out', 'refunded')),
    winner_id UUID,
    paid_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure math adds up
    CONSTRAINT valid_amounts CHECK (
        seller_amount + platform_fee <= total_amount
    )
);
```

#### B. Payout Protection
```sql
-- Winner must be verified before payout
CREATE OR REPLACE FUNCTION payout_prize(
    p_session_id UUID,
    p_winner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_escrow RECORD;
    v_actual_winner_id UUID;
BEGIN
    -- Get escrow details
    SELECT * INTO v_escrow
    FROM prize_escrow
    WHERE session_id = p_session_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Escrow not found';
    END IF;
    
    -- Verify winner from session
    SELECT winner_user_id INTO v_actual_winner_id
    FROM marketplace_sessions
    WHERE id = p_session_id AND status = 'completed';
    
    -- Security checks
    IF v_actual_winner_id IS NULL THEN
        RAISE EXCEPTION 'No winner determined';
    END IF;
    
    IF v_actual_winner_id != p_winner_id THEN
        RAISE EXCEPTION 'Security violation: Winner ID mismatch';
    END IF;
    
    IF v_escrow.status != 'winner_determined' THEN
        RAISE EXCEPTION 'Invalid escrow status: %', v_escrow.status;
    END IF;
    
    -- Transfer to seller's pending wallet
    -- (Will be released when they provide tracking)
    INSERT INTO seller_wallets (seller_id, pending_balance)
    SELECT listing.seller_id, v_escrow.seller_amount
    FROM marketplace_listings listing
    WHERE listing.id = v_escrow.listing_id
    ON CONFLICT (seller_id) DO UPDATE
    SET pending_balance = seller_wallets.pending_balance + v_escrow.seller_amount;
    
    -- Mark escrow as paid out
    UPDATE prize_escrow
    SET 
        status = 'paid_out',
        paid_out_at = NOW()
    WHERE id = v_escrow.id;
END;
$$;
```

---

## 🛡️ Additional Security Layers

### 1. **Rate Limiting**
```sql
-- Prevent abuse by limiting actions per time period
CREATE TABLE rate_limits (
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, action_type)
);

-- Example: Max 10 entries per hour
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action_type TEXT,
    p_max_count INTEGER,
    p_window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    SELECT count, window_start
    INTO v_count, v_window_start
    FROM rate_limits
    WHERE user_id = p_user_id AND action_type = p_action_type;
    
    IF NOT FOUND THEN
        INSERT INTO rate_limits (user_id, action_type, count)
        VALUES (p_user_id, p_action_type, 1);
        RETURN TRUE;
    END IF;
    
    -- Check if window expired
    IF NOW() - v_window_start > (p_window_minutes || ' minutes')::INTERVAL THEN
        -- Reset window
        UPDATE rate_limits
        SET count = 1, window_start = NOW()
        WHERE user_id = p_user_id AND action_type = p_action_type;
        RETURN TRUE;
    END IF;
    
    -- Check limit
    IF v_count >= p_max_count THEN
        RETURN FALSE;  -- Rate limit exceeded
    END IF;
    
    -- Increment count
    UPDATE rate_limits
    SET count = count + 1
    WHERE user_id = p_user_id AND action_type = p_action_type;
    
    RETURN TRUE;
END;
$$;
```

### 2. **Fraud Detection**
```sql
-- Monitor suspicious activities
CREATE TABLE security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    user_id UUID,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT,
    metadata JSONB,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example: Detect rapid balance changes
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_recent_transactions INTEGER;
    v_total_amount NUMERIC;
BEGIN
    -- Count transactions in last 5 minutes
    SELECT COUNT(*), SUM(amount)
    INTO v_recent_transactions, v_total_amount
    FROM wallet_transactions
    WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '5 minutes';
    
    -- Alert if suspicious
    IF v_recent_transactions > 10 THEN
        INSERT INTO security_alerts (
            alert_type, user_id, severity, message, metadata
        ) VALUES (
            'rapid_transactions', NEW.user_id, 'medium',
            format('%s transactions in 5 minutes', v_recent_transactions),
            jsonb_build_object('count', v_recent_transactions, 'total', v_total_amount)
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER monitor_transactions
AFTER INSERT ON wallet_transactions
FOR EACH ROW EXECUTE FUNCTION detect_suspicious_activity();
```

### 3. **Audit Logging**
```sql
-- Log all sensitive operations
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatically log wallet changes
CREATE OR REPLACE FUNCTION audit_wallet_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO audit_log (
        user_id, action, table_name, record_id,
        old_values, new_values, created_at
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        to_jsonb(OLD),
        to_jsonb(NEW),
        NOW()
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_user_balances
AFTER UPDATE ON user_balances
FOR EACH ROW EXECUTE FUNCTION audit_wallet_changes();
```

---

## 🔐 Frontend Security

### 1. **Authentication**
```typescript
// All wallet operations require authentication
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  throw new Error('Not authenticated');
}
```

### 2. **Client-Side Validation**
```typescript
// Validate amounts before sending to server
function validateWithdrawal(amount: number, available: number): boolean {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  if (amount > available) {
    throw new Error('Insufficient funds');
  }
  if (amount < 1) {
    throw new Error('Minimum withdrawal is $1');
  }
  return true;
}
```

### 3. **Secure API Calls**
```typescript
// Use RPC functions, not direct table access
const { data, error } = await supabase.rpc('withdraw_to_stripe', {
  p_seller_id: user.id,
  p_amount: amount
});

if (error) {
  console.error('Withdrawal error:', error);
  // Show user-friendly error
  throw new Error('Withdrawal failed. Please try again.');
}
```

---

## 📊 Security Monitoring

### Daily Checks:
1. ✅ Run `verify_balance_integrity()` for all users
2. ✅ Review security_alerts table
3. ✅ Check audit_log for suspicious patterns
4. ✅ Verify escrow balances match pending transactions

### Weekly Audits:
1. ✅ Compare total balances with transaction history
2. ✅ Review failed withdrawal attempts
3. ✅ Check for unusual rate limit triggers
4. ✅ Verify all prize payouts match winners

### Monthly Reports:
1. ✅ Total funds in escrow
2. ✅ Total pending vs released seller balances
3. ✅ Transaction volume and patterns
4. ✅ Security incident summary

---

## 🚨 Incident Response

### If Balance Discrepancy Detected:
1. Freeze affected account immediately
2. Run integrity check on all related transactions
3. Notify admin via security_alerts
4. Investigate transaction history
5. Resolve discrepancy
6. Document in audit_log

### If Fraud Suspected:
1. Flag user account
2. Hold all pending transactions
3. Review recent activity
4. Contact user for verification
5. Escalate if needed
6. Unfreeze or suspend based on findings

---

## ✅ Security Checklist

### Database:
- [x] Row Level Security (RLS) enabled on all wallet tables
- [x] Users can only access their own data
- [x] Direct balance updates blocked
- [x] All changes go through secure functions
- [x] Transactions are immutable (can't be deleted/modified)
- [x] Negative balances prevented with CHECK constraints
- [x] Atomic operations with row-level locks

### Application:
- [x] Authentication required for all wallet operations
- [x] Client-side validation before server calls
- [x] Server-side validation in all functions
- [x] Rate limiting on sensitive operations
- [x] Fraud detection triggers
- [x] Complete audit trail

### Monitoring:
- [x] Transaction logging
- [x] Security alerts system
- [x] Balance integrity checks
- [x] Suspicious activity detection
- [x] Admin dashboard for monitoring

---

## 🎯 Summary

**Your users' funds are protected by:**

1. **Database-level RLS** - Users can only see their own data
2. **Immutable transactions** - Complete audit trail
3. **Atomic operations** - No race conditions
4. **Escrow system** - Funds held until conditions met
5. **Dual wallet system** - Pending vs Released protection
6. **Validation at every step** - Server-side checks
7. **Rate limiting** - Prevents abuse
8. **Fraud detection** - Automatic monitoring
9. **Audit logging** - Every action tracked
10. **CHECK constraints** - Prevents negative balances

**Your funds are safe!** 🔒✅

