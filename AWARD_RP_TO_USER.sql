-- Award 40,000 RP to rf32191@gmail.com
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    target_email TEXT := 'rf32191@gmail.com';
    target_user_id UUID;
    rp_amount INTEGER := 40000;
    current_rp INTEGER;
    new_rp INTEGER;
BEGIN
    -- Find user ID from auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', target_email;
    END IF;
    
    -- Get current RP
    SELECT COALESCE(reward_points, 0) INTO current_rp
    FROM public.user_xp
    WHERE user_id = target_user_id;
    
    IF current_rp IS NULL THEN
        -- User doesn't have XP record, create one
        INSERT INTO public.user_xp (user_id, total_xp, reward_points, current_level)
        VALUES (target_user_id, 0, rp_amount, 1);
        new_rp := rp_amount;
        RAISE NOTICE 'Created new XP record for user with % RP', rp_amount;
    ELSE
        -- Update existing RP
        UPDATE public.user_xp
        SET reward_points = reward_points + rp_amount
        WHERE user_id = target_user_id
        RETURNING reward_points INTO new_rp;
    END IF;
    
    -- Log the transaction
    INSERT INTO public.xp_transactions (user_id, amount, transaction_type, description, created_at)
    VALUES (
        target_user_id,
        rp_amount,
        'admin_grant',
        'Admin awarded 40,000 RP',
        NOW()
    );
    
    RAISE NOTICE '✅ Successfully awarded % RP to %', rp_amount, target_email;
    RAISE NOTICE '📊 Previous RP: %, New RP: %', COALESCE(current_rp, 0), new_rp;
END $$;

-- Verify the result
SELECT 
    u.email,
    ux.reward_points as current_rp,
    ux.total_xp,
    ux.current_level
FROM auth.users u
JOIN public.user_xp ux ON u.id = ux.user_id
WHERE u.email = 'rf32191@gmail.com';

