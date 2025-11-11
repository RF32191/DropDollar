-- ============================================================================
-- FIX HOT SELL PARTICIPANTS SCHEMA
-- ============================================================================
-- Add missing updated_at column to hot_sell_participants table
-- ============================================================================

BEGIN;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.hot_sell_participants 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_hot_sell_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hot_sell_participants_updated_at_trigger ON public.hot_sell_participants;

CREATE TRIGGER hot_sell_participants_updated_at_trigger
BEFORE UPDATE ON public.hot_sell_participants
FOR EACH ROW
EXECUTE FUNCTION update_hot_sell_participants_updated_at();

-- Verify the column exists
SELECT 
  '✅ Verified hot_sell_participants schema' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'hot_sell_participants'
  AND table_schema = 'public'
ORDER BY ordinal_position;

COMMIT;

SELECT '🎉 Hot Sell Participants schema fixed!' as message;

