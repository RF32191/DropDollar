-- SIMPLE DIRECT UPDATE - Just run this one line:

UPDATE public.user_xp 
SET reward_points = reward_points + 40000
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com');
