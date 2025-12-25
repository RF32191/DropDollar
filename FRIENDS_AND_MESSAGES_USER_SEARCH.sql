-- ============================================================================
-- FRIENDS SYSTEM + MESSAGES USER SEARCH
-- ============================================================================
-- Run this in your Supabase SQL Editor
-- This enables:
-- 1. Friends list functionality (add, accept, remove friends)
-- 2. User search for both Friends and Messages tabs
-- 3. Friends leaderboard
-- ============================================================================

-- =====================================================
-- 1. FRIENDSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(user_id, friend_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- =====================================================
-- 2. ENABLE RLS ON FRIENDSHIPS
-- =====================================================
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (prevents errors on re-run)
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can update friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete friendships" ON public.friendships;

-- Create policies
CREATE POLICY "Users can view their friendships" ON public.friendships
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests" ON public.friendships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships" ON public.friendships
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete friendships" ON public.friendships
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =====================================================
-- 3. SEND FRIEND REQUEST
-- =====================================================
DROP FUNCTION IF EXISTS public.send_friend_request(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_existing RECORD;
    v_target_username TEXT;
BEGIN
    -- Get target username for response
    SELECT COALESCE(username, SPLIT_PART(email, '@', 1), 'User') 
    INTO v_target_username 
    FROM public.users 
    WHERE id = target_user_id;
    
    IF v_target_username IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;
    
    -- Cannot friend yourself
    IF v_current_user = target_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot add yourself as a friend');
    END IF;
    
    -- Check if already friends or pending
    SELECT * INTO v_existing FROM public.friendships
    WHERE (user_id = v_current_user AND friend_id = target_user_id)
       OR (user_id = target_user_id AND friend_id = v_current_user);
    
    IF FOUND THEN
        IF v_existing.status = 'accepted' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Already friends with ' || v_target_username);
        ELSIF v_existing.status = 'pending' THEN
            -- If they sent us a request, accept it
            IF v_existing.user_id = target_user_id THEN
                UPDATE public.friendships SET status = 'accepted', accepted_at = NOW() WHERE id = v_existing.id;
                RETURN jsonb_build_object('success', true, 'message', 'Friend request from ' || v_target_username || ' accepted!');
            END IF;
            RETURN jsonb_build_object('success', false, 'message', 'Friend request already sent to ' || v_target_username);
        ELSIF v_existing.status = 'blocked' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Cannot send friend request');
        END IF;
    END IF;
    
    -- Send request
    INSERT INTO public.friendships (user_id, friend_id, status)
    VALUES (v_current_user, target_user_id, 'pending');
    
    RETURN jsonb_build_object('success', true, 'message', 'Friend request sent to ' || v_target_username || '!');
END;
$$;

-- =====================================================
-- 4. ACCEPT FRIEND REQUEST
-- =====================================================
DROP FUNCTION IF EXISTS public.accept_friend_request(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_sender_username TEXT;
BEGIN
    -- Get sender username
    SELECT COALESCE(u.username, SPLIT_PART(u.email, '@', 1), 'User')
    INTO v_sender_username
    FROM public.friendships f
    JOIN public.users u ON u.id = f.user_id
    WHERE f.id = request_id AND f.friend_id = v_current_user AND f.status = 'pending';
    
    IF v_sender_username IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Friend request not found');
    END IF;
    
    UPDATE public.friendships
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = request_id 
      AND friend_id = v_current_user 
      AND status = 'pending';
    
    RETURN jsonb_build_object('success', true, 'message', 'You are now friends with ' || v_sender_username || '!');
END;
$$;

-- =====================================================
-- 5. REMOVE FRIEND / DECLINE REQUEST
-- =====================================================
DROP FUNCTION IF EXISTS public.remove_friend(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.remove_friend(friendship_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
BEGIN
    DELETE FROM public.friendships
    WHERE id = friendship_id 
      AND (user_id = v_current_user OR friend_id = v_current_user);
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Friendship not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Removed successfully');
END;
$$;

-- =====================================================
-- 6. GET FRIENDS LIST
-- =====================================================
DROP FUNCTION IF EXISTS public.get_friends_list() CASCADE;
CREATE OR REPLACE FUNCTION public.get_friends_list()
RETURNS TABLE (
    friendship_id UUID,
    friend_user_id UUID,
    friend_username TEXT,
    friend_avatar TEXT,
    since TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        f.id as friendship_id,
        CASE WHEN f.user_id = v_current_user THEN f.friend_id ELSE f.user_id END as friend_user_id,
        COALESCE(
            NULLIF(u.username, ''),
            SPLIT_PART(u.email, '@', 1),
            'User'
        ) as friend_username,
        NULL::TEXT as friend_avatar,  -- Avatar column may not exist
        COALESCE(f.accepted_at, f.created_at) as since
    FROM public.friendships f
    JOIN public.users u ON u.id = CASE WHEN f.user_id = v_current_user THEN f.friend_id ELSE f.user_id END
    WHERE (f.user_id = v_current_user OR f.friend_id = v_current_user)
      AND f.status = 'accepted'
    ORDER BY friend_username;
END;
$$;

-- =====================================================
-- 7. GET PENDING FRIEND REQUESTS (Received)
-- =====================================================
DROP FUNCTION IF EXISTS public.get_pending_friend_requests() CASCADE;
CREATE OR REPLACE FUNCTION public.get_pending_friend_requests()
RETURNS TABLE (
    request_id UUID,
    sender_id UUID,
    sender_username TEXT,
    sender_avatar TEXT,
    sent_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        f.id as request_id,
        f.user_id as sender_id,
        COALESCE(
            NULLIF(u.username, ''),
            SPLIT_PART(u.email, '@', 1),
            'User'
        ) as sender_username,
        NULL::TEXT as sender_avatar,  -- Avatar column may not exist
        f.created_at as sent_at
    FROM public.friendships f
    JOIN public.users u ON u.id = f.user_id
    WHERE f.friend_id = v_current_user AND f.status = 'pending'
    ORDER BY f.created_at DESC;
END;
$$;

-- =====================================================
-- 8. SEARCH USERS (For Friends and Messages)
-- =====================================================
-- This function searches ALL users by username or email
-- Used by both Friends tab and Messages tab

DROP FUNCTION IF EXISTS public.search_users_for_friends(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.search_users_for_friends(search_query TEXT)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    friendship_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        COALESCE(
            NULLIF(u.username, ''), 
            SPLIT_PART(u.email, '@', 1),
            'User'
        ) as username,
        NULL::TEXT as avatar_url,  -- Avatar column may not exist, return NULL
        COALESCE(f.status, 'none')::TEXT as friendship_status
    FROM public.users u
    LEFT JOIN public.friendships f ON 
        (f.user_id = v_current_user AND f.friend_id = u.id) OR
        (f.friend_id = v_current_user AND f.user_id = u.id)
    WHERE u.id != v_current_user
      AND u.id IS NOT NULL
      AND (
          LOWER(COALESCE(u.username, '')) LIKE LOWER('%' || search_query || '%')
          OR LOWER(COALESCE(u.email, '')) LIKE LOWER('%' || search_query || '%')
          OR LOWER(SPLIT_PART(COALESCE(u.email, ''), '@', 1)) LIKE LOWER('%' || search_query || '%')
      )
    ORDER BY 
        CASE WHEN f.status = 'accepted' THEN 0
             WHEN f.status = 'pending' THEN 1
             ELSE 2
        END,
        COALESCE(u.username, u.email) NULLS LAST
    LIMIT 50;
END;
$$;

-- =====================================================
-- 9. GET ALL USERS (For Initial Display)
-- =====================================================
-- Returns all users when search is empty
-- Used by both Friends tab and Messages tab

DROP FUNCTION IF EXISTS public.get_all_users_for_friends(INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION public.get_all_users_for_friends(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    friendship_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        COALESCE(
            NULLIF(u.username, ''), 
            SPLIT_PART(u.email, '@', 1),
            'User'
        ) as username,
        NULL::TEXT as avatar_url,  -- Avatar column may not exist, return NULL
        COALESCE(f.status, 'none')::TEXT as friendship_status
    FROM public.users u
    LEFT JOIN public.friendships f ON 
        (f.user_id = v_current_user AND f.friend_id = u.id) OR
        (f.friend_id = v_current_user AND f.user_id = u.id)
    WHERE u.id != v_current_user
      AND u.id IS NOT NULL
    ORDER BY 
        CASE WHEN f.status = 'accepted' THEN 0
             WHEN f.status = 'pending' THEN 1
             ELSE 2
        END,
        u.created_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- 10. SEARCH USERS FOR MESSAGES (Simplified)
-- =====================================================
-- Alternative function specifically for messaging
-- Returns simpler data structure

DROP FUNCTION IF EXISTS public.search_users_for_messages(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.search_users_for_messages(search_query TEXT DEFAULT '')
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    email TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
BEGIN
    IF search_query = '' OR search_query IS NULL THEN
        -- Return all users if no search query
        RETURN QUERY
        SELECT 
            u.id as user_id,
            COALESCE(
                NULLIF(u.username, ''), 
                SPLIT_PART(u.email, '@', 1),
                'User'
            ) as username,
            u.email,
            NULL::TEXT as avatar_url  -- Avatar column may not exist
        FROM public.users u
        WHERE u.id != v_current_user
          AND u.id IS NOT NULL
        ORDER BY u.created_at DESC
        LIMIT 100;
    ELSE
        -- Search by username or email
        RETURN QUERY
        SELECT 
            u.id as user_id,
            COALESCE(
                NULLIF(u.username, ''), 
                SPLIT_PART(u.email, '@', 1),
                'User'
            ) as username,
            u.email,
            NULL::TEXT as avatar_url  -- Avatar column may not exist
        FROM public.users u
        WHERE u.id != v_current_user
          AND u.id IS NOT NULL
          AND (
              LOWER(COALESCE(u.username, '')) LIKE LOWER('%' || search_query || '%')
              OR LOWER(COALESCE(u.email, '')) LIKE LOWER('%' || search_query || '%')
          )
        ORDER BY 
            CASE WHEN LOWER(COALESCE(u.username, '')) = LOWER(search_query) THEN 0
                 WHEN LOWER(COALESCE(u.username, '')) LIKE LOWER(search_query || '%') THEN 1
                 ELSE 2
            END
        LIMIT 50;
    END IF;
END;
$$;

-- =====================================================
-- 11. FRIENDS LEADERBOARD
-- =====================================================
DROP FUNCTION IF EXISTS public.get_friends_leaderboard() CASCADE;
CREATE OR REPLACE FUNCTION public.get_friends_leaderboard()
RETURNS TABLE (
    friend_id UUID,
    friend_username TEXT,
    friend_avatar TEXT,
    game_type TEXT,
    best_score NUMERIC,
    is_practice BOOLEAN,
    achieved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
BEGIN
    RETURN QUERY
    WITH friend_ids AS (
        SELECT CASE WHEN f.user_id = v_current_user THEN f.friend_id ELSE f.user_id END as fid
        FROM public.friendships f
        WHERE (f.user_id = v_current_user OR f.friend_id = v_current_user)
          AND f.status = 'accepted'
        UNION
        SELECT v_current_user -- Include self
    ),
    best_scores AS (
        SELECT 
            gh.user_id,
            gh.game_type,
            gh.is_practice,
            MAX(gh.score) as max_score,
            MAX(gh.created_at) as latest_at
        FROM public.game_history gh
        WHERE gh.user_id IN (SELECT fid FROM friend_ids)
        GROUP BY gh.user_id, gh.game_type, gh.is_practice
    )
    SELECT 
        bs.user_id as friend_id,
        COALESCE(
            NULLIF(u.username, ''),
            SPLIT_PART(u.email, '@', 1),
            'User'
        ) as friend_username,
        NULL::TEXT as friend_avatar,  -- Avatar column may not exist
        bs.game_type,
        bs.max_score as best_score,
        bs.is_practice,
        bs.latest_at as achieved_at
    FROM best_scores bs
    JOIN public.users u ON u.id = bs.user_id
    ORDER BY bs.max_score DESC, friend_username;
END;
$$;

-- =====================================================
-- 12. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.send_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_for_friends(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_for_friends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_for_messages(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends_leaderboard() TO authenticated;

-- =====================================================
-- 13. SUCCESS MESSAGE
-- =====================================================
DO $$ 
BEGIN 
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Friends & Messages User Search READY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '  - search_users_for_friends(search_query)';
    RAISE NOTICE '  - get_all_users_for_friends(limit)';
    RAISE NOTICE '  - search_users_for_messages(search_query)';
    RAISE NOTICE '  - send_friend_request(user_id)';
    RAISE NOTICE '  - accept_friend_request(request_id)';
    RAISE NOTICE '  - remove_friend(friendship_id)';
    RAISE NOTICE '  - get_friends_list()';
    RAISE NOTICE '  - get_pending_friend_requests()';
    RAISE NOTICE '  - get_friends_leaderboard()';
    RAISE NOTICE '============================================';
END $$;

