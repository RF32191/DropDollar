-- Friends System SQL Schema
-- Run this in your Supabase SQL Editor

-- =====================================================
-- FRIENDS TABLE
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

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can update friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete friendships" ON public.friendships;

-- Users can see their own friendships
CREATE POLICY "Users can view their friendships" ON public.friendships
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can send friend requests
CREATE POLICY "Users can send friend requests" ON public.friendships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they're part of
CREATE POLICY "Users can update friendships" ON public.friendships
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete their own friendships
CREATE POLICY "Users can delete friendships" ON public.friendships
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to send friend request
CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_existing RECORD;
BEGIN
    -- Check if already friends or pending
    SELECT * INTO v_existing FROM public.friendships
    WHERE (user_id = v_current_user AND friend_id = target_user_id)
       OR (user_id = target_user_id AND friend_id = v_current_user);
    
    IF FOUND THEN
        IF v_existing.status = 'accepted' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Already friends');
        ELSIF v_existing.status = 'pending' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Request already pending');
        ELSIF v_existing.status = 'blocked' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Cannot send request');
        END IF;
    END IF;
    
    -- Cannot friend yourself
    IF v_current_user = target_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot add yourself');
    END IF;
    
    -- Send request
    INSERT INTO public.friendships (user_id, friend_id, status)
    VALUES (v_current_user, target_user_id, 'pending');
    
    RETURN jsonb_build_object('success', true, 'message', 'Friend request sent');
END;
$$;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user UUID := auth.uid();
BEGIN
    UPDATE public.friendships
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = request_id 
      AND friend_id = v_current_user 
      AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'message', 'Friend request accepted');
END;
$$;

-- Function to decline/remove friend
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
    
    RETURN jsonb_build_object('success', true, 'message', 'Friendship removed');
END;
$$;

-- Function to get friends list
CREATE OR REPLACE FUNCTION public.get_friends_list()
RETURNS TABLE (
    friendship_id UUID,
    friend_user_id UUID,
    friend_username TEXT,
    friend_avatar TEXT,
    status TEXT,
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
        COALESCE(u.username, u.email, 'Unknown') as friend_username,
        u.avatar_url as friend_avatar,
        f.status,
        COALESCE(f.accepted_at, f.created_at) as since
    FROM public.friendships f
    JOIN public.users u ON u.id = CASE WHEN f.user_id = v_current_user THEN f.friend_id ELSE f.user_id END
    WHERE (f.user_id = v_current_user OR f.friend_id = v_current_user)
      AND f.status = 'accepted'
    ORDER BY u.username;
END;
$$;

-- Function to get pending friend requests (received)
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
        COALESCE(u.username, u.email, 'Unknown') as sender_username,
        u.avatar_url as sender_avatar,
        f.created_at as sent_at
    FROM public.friendships f
    JOIN public.users u ON u.id = f.user_id
    WHERE f.friend_id = v_current_user AND f.status = 'pending'
    ORDER BY f.created_at DESC;
END;
$$;

-- Function to search users for adding friends
-- Searches by username OR email, returns display-friendly names
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
    -- Return all users matching the search, with username or email as display
    RETURN QUERY
    SELECT 
        u.id as user_id,
        COALESCE(
            NULLIF(u.username, ''), 
            SPLIT_PART(u.email, '@', 1),
            'User'
        ) as username,
        u.avatar_url,
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
    LIMIT 30;
END;
$$;

-- Function to get all users (for browsing/discovery)
CREATE OR REPLACE FUNCTION public.get_all_users_for_friends(p_limit INTEGER DEFAULT 50)
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
        u.avatar_url,
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

GRANT EXECUTE ON FUNCTION public.get_all_users_for_friends(INTEGER) TO authenticated;

-- Function to get friends' best scores for leaderboard
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
        COALESCE(u.username, u.email, 'Unknown') as friend_username,
        u.avatar_url as friend_avatar,
        bs.game_type,
        bs.max_score as best_score,
        bs.is_practice,
        bs.latest_at as achieved_at
    FROM best_scores bs
    JOIN public.users u ON u.id = bs.user_id
    ORDER BY bs.max_score DESC, u.username;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.send_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users_for_friends(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends_leaderboard() TO authenticated;

-- Success message
DO $$ BEGIN RAISE NOTICE 'Friends system created successfully!'; END $$;

