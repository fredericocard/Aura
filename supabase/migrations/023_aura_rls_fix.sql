-- ============================================
-- AF-B17 · RLS fix for AURA scoring pipeline
-- The client-side pipeline (applyGameAura) runs
-- authenticated as the last player who accepts
-- their review. Without this policy, it can only
-- update that player's own deck — all other players'
-- aura_score updates silently fail (0 rows affected).
--
-- This policy allows any game participant to update
-- aura scores on all decks in their completed games.
-- ============================================

create policy "Game participants can update aura scores in completed games"
  on public.decks for update
  using (
    exists (
      select 1
      from public.game_players gp1
      join public.game_players gp2 on gp1.game_id = gp2.game_id
      join public.games g on g.id = gp1.game_id
      where gp1.user_id = auth.uid()
        and gp2.deck_id = decks.id
        and g.state = 'completed'
    )
  );
