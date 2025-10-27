-- Reset all winner takes all listings
DELETE FROM public.winner_takes_all_participants;

UPDATE public.winner_takes_all_sessions
SET 
  status = 'waiting',
  current_pot = 0,
  participants_count = 0,
  timer_started_at = NULL,
  winner_user_id = NULL,
  prize_amount = NULL,
  updated_at = NOW();

