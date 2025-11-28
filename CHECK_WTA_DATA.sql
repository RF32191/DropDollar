-- ============================================================================
-- 🔍 CHECK WTA DATA - Single Output
-- ============================================================================

SELECT jsonb_build_object(
    'sessions', (
        SELECT jsonb_agg(jsonb_build_object(
            'config_id', config_id,
            'prize_pool', prize_pool,
            'base_price', base_price,
            'participants_count', participants_count,
            'status', status
        ))
        FROM winner_takes_all_sessions
    ),
    'participants', (
        SELECT jsonb_agg(jsonb_build_object(
            'config', s.config_id,
            'username', p.username,
            'joined', p.joined_at
        ))
        FROM winner_takes_all_participants p
        JOIN winner_takes_all_sessions s ON p.session_id = s.id
    ),
    'function_output', (
        SELECT jsonb_agg(jsonb_build_object(
            'config_id', config_id,
            'current_pot', current_pot,
            'participants_count', participants_count
        ))
        FROM get_all_winner_takes_all_sessions()
    )
) as wta_data;

