-- ============================================================================
-- UPDATE LISTING TIMER NOW - Fix your 3-minute listing
-- ============================================================================

-- Update your most recent listing to 3 minutes (180 seconds)
UPDATE public.marketplace_listings
SET timer_duration = 180
WHERE seller_id = (SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com')
AND created_at > NOW() - INTERVAL '5 minutes';

-- Verify
SELECT 
    id,
    title,
    timer_duration,
    timer_duration / 60 as minutes,
    created_at
FROM public.marketplace_listings
WHERE seller_id = (SELECT id FROM auth.users WHERE email = 'rf32191@gmail.com')
ORDER BY created_at DESC
LIMIT 3;

SELECT '✅ Timer updated to 3 minutes (180 seconds)' as status;

