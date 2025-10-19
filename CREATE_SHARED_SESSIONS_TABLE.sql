-- Create shared sessions table for Winner Takes It All
-- This table allows all users to see the same session data

CREATE TABLE IF NOT EXISTS public.winner_takes_all_shared_sessions (
    id TEXT PRIMARY KEY,
    config_id TEXT NOT NULL,
    current_pot INTEGER DEFAULT 0 NOT NULL,
    base_price INTEGER NOT NULL,
    participants_count INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'waiting' NOT NULL CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
    timer_started_at TIMESTAMP WITH TIME ZONE,
    participants JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.winner_takes_all_shared_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for shared access
DROP POLICY IF EXISTS "Anyone can view shared winner takes all sessions" ON public.winner_takes_all_shared_sessions;
CREATE POLICY "Anyone can view shared winner takes all sessions" ON public.winner_takes_all_shared_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert shared winner takes all sessions" ON public.winner_takes_all_shared_sessions;
CREATE POLICY "Anyone can insert shared winner takes all sessions" ON public.winner_takes_all_shared_sessions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update shared winner takes all sessions" ON public.winner_takes_all_shared_sessions;
CREATE POLICY "Anyone can update shared winner takes all sessions" ON public.winner_takes_all_shared_sessions
  FOR UPDATE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_sessions_config ON public.winner_takes_all_shared_sessions(config_id);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_status ON public.winner_takes_all_shared_sessions(status);

-- Grant permissions
GRANT ALL ON public.winner_takes_all_shared_sessions TO authenticated;
GRANT ALL ON public.winner_takes_all_shared_sessions TO anon;

COMMIT;
