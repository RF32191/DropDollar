-- ============================================
-- LINK USER TABLES - Make all user data accessible
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create a unified view that links users, phones, and auth
CREATE OR REPLACE VIEW user_complete_profile AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.tokens,
    u.is_verified,
    u.created_at,
    u.updated_at,
    p.phone_number,
    p.is_verified as phone_verified
FROM users u
LEFT JOIN user_phones p ON u.id = p.user_id;

-- Grant access to the view
GRANT SELECT ON user_complete_profile TO authenticated;
GRANT SELECT ON user_complete_profile TO service_role;

-- 2. Create function to find user by username (case-insensitive)
CREATE OR REPLACE FUNCTION find_user_by_username(search_username TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    username TEXT,
    phone_number TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.username,
        p.phone_number
    FROM users u
    LEFT JOIN user_phones p ON u.id = p.user_id
    WHERE LOWER(u.username) = LOWER(search_username)
    LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_user_by_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION find_user_by_username(TEXT) TO service_role;

-- 3. Create function to find user by phone
CREATE OR REPLACE FUNCTION find_user_by_phone(search_phone TEXT)
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
    clean_phone TEXT;
BEGIN
    -- Extract last 10 digits
    clean_phone := RIGHT(REGEXP_REPLACE(search_phone, '[^0-9]', '', 'g'), 10);
    
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.username,
        p.phone_number
    FROM users u
    INNER JOIN user_phones p ON u.id = p.user_id
    WHERE RIGHT(REGEXP_REPLACE(p.phone_number, '[^0-9]', '', 'g'), 10) = clean_phone
    LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_user_by_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION find_user_by_phone(TEXT) TO service_role;

-- 4. Create function to find user by email
CREATE OR REPLACE FUNCTION find_user_by_email(search_email TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    username TEXT,
    phone_number TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.username,
        p.phone_number
    FROM users u
    LEFT JOIN user_phones p ON u.id = p.user_id
    WHERE LOWER(u.email) = LOWER(search_email)
    LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO service_role;

-- 5. Create index for faster username lookups (case-insensitive)
DROP INDEX IF EXISTS idx_users_username_lower;
CREATE INDEX idx_users_username_lower ON users (LOWER(username));

-- 6. Create index for faster email lookups
DROP INDEX IF EXISTS idx_users_email_lower;
CREATE INDEX idx_users_email_lower ON users (LOWER(email));

-- 7. Create function to update user email in all tables
CREATE OR REPLACE FUNCTION update_user_email(
    p_user_id UUID,
    p_new_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update users table
    UPDATE users 
    SET email = LOWER(p_new_email), updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_email(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_email(UUID, TEXT) TO service_role;

-- 8. Verification message
DO $$
BEGIN
    RAISE NOTICE '✅ User table linking complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - user_complete_profile view (links users + phones)';
    RAISE NOTICE '  - find_user_by_username() function';
    RAISE NOTICE '  - find_user_by_phone() function';
    RAISE NOTICE '  - find_user_by_email() function';
    RAISE NOTICE '  - update_user_email() function';
    RAISE NOTICE '  - Indexes for faster lookups';
    RAISE NOTICE '';
    RAISE NOTICE 'Users can now sign in with email, username, or phone!';
END $$;

