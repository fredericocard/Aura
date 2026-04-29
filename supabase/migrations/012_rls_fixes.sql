-- ============================================
-- Cross-migration RLS policies
-- These policies reference tables from other migrations
-- so they must run AFTER all tables exist.
-- ============================================

-- DECKS (B03): other players can see decks in shared games
-- (for voting, tally, Game Card)
-- Cannot be in 002_decks.sql because game_players doesn't exist yet
create policy "Game participants can read decks in their games"
  on public.decks for select
  using (
    exists (
      select 1 from public.game_players gp
      where gp.deck_id = decks.id
      and exists (
        select 1 from public.game_players gp2
        where gp2.game_id = gp.game_id
        and gp2.user_id = auth.uid()
      )
    )
  );
