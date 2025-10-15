-- FIX RPC FUNCTION PARAMETER TYPES
-- This will fix the "Could not choose the best candidate function" error

-- Drop the existing function
DROP FUNCTION IF EXISTS find_or_create_lot(TEXT, DECIMAL(10,2), INTEGER);

-- Recreate with explicit parameter types
CREATE OR REPLACE FUNCTION find_or_create_lot(
    p_game_type TEXT,
    p_entry_fee NUMERIC,
    p_skill_rating INTEGER
) RETURNS TEXT AS $$
DECLARE
    lot_number TEXT;
BEGIN
    -- Generate a unique lot number
    lot_number := p_game_type || '-' || p_entry_fee::TEXT || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER || '-' || substr(md5(random()::text), 1, 4);
    
    RETURN lot_number;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT find_or_create_lot('test-game', 1.00, 1000) as test_result;
