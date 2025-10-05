-- ========================================
-- FIXED AUTHENTICATION SCHEMA FOR DROPDOLLAR
-- Fixes RLS policies for user registration
-- ========================================

-- Force schema refresh
NOTIFY pgrst, 'reload schema';

-- ========================================
-- FIX RLS POLICIES FOR USER REGISTRATION
-- ========================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Public can view basic user info" ON public.users;

-- Create more permissive policies for registration
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public can view basic user info" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow user registration" ON public.users FOR INSERT WITH CHECK (true); -- Allow all inserts during registration

-- Fix user_balances policies
DROP POLICY IF EXISTS "Users can view own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can update own balance" ON public.user_balances;
CREATE POLICY "Users can view own balance" ON public.user_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own balance" ON public.user_balances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow balance creation" ON public.user_balances FOR INSERT WITH CHECK (true); -- Allow balance creation

-- Fix user_levels policies  
DROP POLICY IF EXISTS "Users can view own level" ON public.user_levels;
DROP POLICY IF EXISTS "Users can update own level" ON public.user_levels;
DROP POLICY IF EXISTS "Public can view user levels" ON public.user_levels;
CREATE POLICY "Users can view own level" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own level" ON public.user_levels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can view user levels" ON public.user_levels FOR SELECT USING (true);
CREATE POLICY "Allow level creation" ON public.user_levels FOR INSERT WITH CHECK (true); -- Allow level creation

-- Fix user_skill_ratings policies
DROP POLICY IF EXISTS "Users can view own skill ratings" ON public.user_skill_ratings;
DROP POLICY IF EXISTS "Users can update own skill ratings" ON public.user_skill_ratings;
DROP POLICY IF EXISTS "Public can view skill ratings" ON public.user_skill_ratings;
CREATE POLICY "Users can view own skill ratings" ON public.user_skill_ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own skill ratings" ON public.user_skill_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can view skill ratings" ON public.user_skill_ratings FOR SELECT USING (true);
CREATE POLICY "Allow skill ratings creation" ON public.user_skill_ratings FOR INSERT WITH CHECK (true); -- Allow skill ratings creation

-- Fix user_daily_wins policies
DROP POLICY IF EXISTS "Users can view own daily wins" ON public.user_daily_wins;
DROP POLICY IF EXISTS "Users can update own daily wins" ON public.user_daily_wins;
CREATE POLICY "Users can view own daily wins" ON public.user_daily_wins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own daily wins" ON public.user_daily_wins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow daily wins creation" ON public.user_daily_wins FOR INSERT WITH CHECK (true); -- Allow daily wins creation

-- Final schema refresh
NOTIFY pgrst, 'reload schema';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
SELECT 'AUTHENTICATION POLICIES FIXED! 🔧✅' as status, 'User registration should now work properly' as message;
