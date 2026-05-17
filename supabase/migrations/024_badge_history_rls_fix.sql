-- ============================================
-- AF-B14 fix · Badge history RLS insert policies
--
-- The original insert policies on badge_vote_history
-- and badge_history used:
--   with check (user_id = auth.uid())
--
-- This blocks the pipeline from inserting rows for
-- OTHER players when the last reviewer triggers
-- onGameCompleted. Only their own rows could be written.
--
-- Fix: replace with game-participant check so any
-- participant can insert for any player in their game.
-- ============================================

-- badge_vote_history ─────────────────────────────────

drop policy if exists "Participants can insert badge vote history"
  on public.badge_vote_history;

create policy "Participants can insert badge vote history"
  on public.badge_vote_history for insert
  with check (
    exists (
      select 1 from public.game_players
      where game_players.game_id = badge_vote_history.game_id
      and game_players.user_id = auth.uid()
    )
  );

-- badge_history ──────────────────────────────────────

drop policy if exists "Participants can insert badge history"
  on public.badge_history;

create policy "Participants can insert badge history"
  on public.badge_history for insert
  with check (
    exists (
      select 1 from public.game_players
      where game_players.game_id = badge_history.game_id
      and game_players.user_id = auth.uid()
    )
  );
