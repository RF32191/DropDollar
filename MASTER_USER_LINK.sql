-- ============================================
-- MASTER USER LINK - Connect all user tables
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Ensure user_phones has proper foreign key
-- ============================================
DO $$
BEGIN
    -- Try to add foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_phones_user_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE user_phones 
            ADD CONSTRAINT user_phones_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Foreign key already exists or cannot be added';
        END;
    END IF;
END $$;

-- ============================================
-- STEP 2: Create master lookup function
-- This is THE function for login/password reset
-- ============================================
CREATE OR REPLACE FUNCTION get_user_by_identifier(identifier TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    username TEXT,
    phone_number TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    clean_identifier TEXT;
    phone_digits TEXT;
BEGIN
    clean_identifier := TRIM(LOWER(identifier));
    
    -- First try: Email match
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.username,
        p.phone_number
    FROM users u
    LEFT JOIN user_phones p ON u.id = p.user_id
    WHERE LOWER(u.email) = clean_identifier
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Second try: Username match (case insensitive)
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.username,
        p.phone_number
    FROM users u
    LEFT JOIN user_phones p ON u.id = p.user_id
    WHERE LOWER(u.username) = clean_identifier
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Third try: Phone number match (by last 10 digits)
    phone_digits := RIGHT(REGEXP_REPLACE(identifier, '[^0-9]', '', 'g'), 10);
    
    IF LENGTH(phone_digits) >= 10 THEN
        RETURN QUERY
        SELECT 
            u.id as user_id,
            u.email,
            u.username,
            p.phone_number
        FROM users u
        INNER JOIN user_phones p ON u.id = p.user_id
        WHERE RIGHT(REGEXP_REPLACE(p.phone_number, '[^0-9]', '', 'g'), 10) = phone_digits
        LIMIT 1;
    END IF;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_user_by_identifier(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_by_identifier(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_identifier(TEXT) TO service_role;

-- ============================================
-- STEP 3: Create complete user profile view
-- Only include columns that exist
-- ============================================
DROP VIEW IF EXISTS user_login_profile;

CREATE VIEW user_login_profile AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.full_name,
    u.tokens,
    u.created_at,
    p.phone_number,
    p.is_verified as phone_verified,
    COALESCE(u.email, '') as login_email,
    COALESCE(u.username, '') as login_username,
    COALESCE(p.phone_number, '') as login_phone
FROM users u
LEFT JOIN user_phones p ON u.id = p.user_id;

-- Grant access to view
GRANT SELECT ON user_login_profile TO anon;
GRANT SELECT ON user_login_profile TO authenticated;
GRANT SELECT ON user_login_profile TO service_role;

-- ============================================
-- STEP 4: Create password reset token table if missing
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Service role full access to reset tokens" ON password_reset_tokens;

-- Create policy for service role
CREATE POLICY "Service role full access to reset tokens"
ON password_reset_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- STEP 5: Function to get user for password reset
-- ============================================
CREATE OR REPLACE FUNCTION get_user_for_password_reset(identifier TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    phone_number TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    phone_digits TEXT;
BEGIN
    -- Try email first
    RETURN QUERY
    SELECT u.id, u.email, p.phone_number
    FROM users u
    LEFT JOIN user_phones p ON u.id = p.user_id
    WHERE LOWER(u.email) = LOWER(TRIM(identifier))
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Try username
    RETURN QUERY
    SELECT u.id, u.email, p.phone_number
    FROM users u
    LEFT JOIN user_phones p ON u.id = p.user_id
    WHERE LOWER(u.username) = LOWER(TRIM(identifier))
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Try phone (last 10 digits)
    phone_digits := RIGHT(REGEXP_REPLACE(identifier, '[^0-9]', '', 'g'), 10);
    
    IF LENGTH(phone_digits) >= 10 THEN
        RETURN QUERY
        SELECT u.id, u.email, p.phone_number
        FROM users u
        INNER JOIN user_phones p ON u.id = p.user_id
        WHERE RIGHT(REGEXP_REPLACE(p.phone_number, '[^0-9]', '', 'g'), 10) = phone_digits
        LIMIT 1;
    END IF;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_user_for_password_reset(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_for_password_reset(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_for_password_reset(TEXT) TO service_role;

-- ============================================
-- STEP 6: Create indexes for fast lookups
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));

-- ============================================
-- STEP 7: Verification message
-- ============================================
DO $$
DECLARE
    user_count INTEGER;
    phone_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO phone_count FROM user_phones;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'USER TABLE LINKING COMPLETE';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Stats:';
    RAISE NOTICE '  Users: %', user_count;
    RAISE NOTICE '  Phone records: %', phone_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  ✅ get_user_by_identifier() - Master lookup';
    RAISE NOTICE '  ✅ get_user_for_password_reset() - Reset lookup';
    RAISE NOTICE '  ✅ user_login_profile view';
    RAISE NOTICE '  ✅ password_reset_tokens table';
    RAISE NOTICE '  ✅ Fast lookup indexes';
    RAISE NOTICE '';
    RAISE NOTICE 'Login works with: email, username, or phone';
    RAISE NOTICE 'Password reset works with: email, username, or phone';
    RAISE NOTICE '============================================';
END $$;
