-- Check what data we actually have in game_history
SELECT 
    id,
    game_type,
    tokens_wagered,
    tokens_won,
    metadata->>'session_type' as session_type,
    metadata->>'competition_type' as competition_type,
    metadata->>'mode' as mode,
    metadata->>'isCompetition' as is_competition,
    metadata,
    created_at
FROM public.game_history
WHERE user_id = '52c0b177-e93f-4b4d-bedc-8ccd89044b4f'
ORDER BY created_at DESC
LIMIT 20;

