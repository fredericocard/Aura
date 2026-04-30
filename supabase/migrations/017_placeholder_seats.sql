-- ============================================
-- 017 · Placeholder seats for game_players
-- Allow empty seats and guest players in games.
-- Three player types:
--   1. Logged-in user: user_id + deck_id set
--   2. Guest (commander only): user_id NULL, commander_name set
--   3. Empty seat: user_id NULL, deck_id NULL, commander_name NULL
-- ============================================

-- 1. Make user_id and deck_id nullable
ALTER TABLE public.game_players ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.game_players ALTER COLUMN deck_id DROP NOT NULL;

-- 2. Add commander_name for guest players (who pick a commander without logging in)
ALTER TABLE public.game_players ADD COLUMN IF NOT EXISTS commander_name TEXT;

-- 3. Add seat_number for ordering (1-based)
ALTER TABLE public.game_players ADD COLUMN IF NOT EXISTS seat_number SMALLINT NOT NULL DEFAULT 1;

-- 4. Drop old unique constraint (game_id, user_id) — can't have unique on nullable user_id
--    with multiple NULL rows
ALTER TABLE public.game_players DROP CONSTRAINT IF EXISTS game_players_game_id_user_id_key;

-- 5. Add new unique constraint on seat_number per game
ALTER TABLE public.game_players ADD CONSTRAINT game_players_game_seat_unique UNIQUE(game_id, seat_number);

-- 6. Update RLS: placeholder rows (user_id IS NULL) should be readable by any game participant
--    The existing SELECT policy already handles this via the host check, but let's also allow
--    any authenticated user who is a participant in the game to read placeholder rows.
--    The existing policies already cover this case because they check game_players.game_id
--    against the user's own game_players rows.

-- 7. Update RLS: allow participants to update placeholder rows (e.g., when a guest claims a seat)
--    The existing "Participants can update game players in their game" policy already allows this
--    because it checks if the user has ANY row in the same game.

-- 8. Allow host to update any row in their game's game_players (for managing placeholder seats)
CREATE POLICY "Host can update game players in their pods"
  ON public.game_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.pods p ON p.id = g.pod_id
      WHERE g.id = game_players.game_id
      AND p.host_id = auth.uid()
    )
  );
