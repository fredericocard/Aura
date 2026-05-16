-- ============================================
-- 022 · Fix game_players UPDATE RLS for non-host players
--
-- The existing "Participants can update game players in their game"
-- policy self-references game_players in its subquery. Postgres
-- applies SELECT RLS to that subquery, and the SELECT policy
-- ALSO self-references game_players — creating a circular
-- dependency that silently fails for joiners (returns 0 rows).
--
-- The host is unaffected because migration 017 gave them a
-- separate policy ("Host can update game players in their pods")
-- that routes through pods, not game_players.
--
-- Fix: replace the self-referencing policy with one that routes
-- through pod_members instead, which works for ALL pod members.
-- ============================================

-- Drop the broken self-referencing policy
DROP POLICY IF EXISTS "Participants can update game players in their game" ON public.game_players;

-- New policy: any pod member can update game_players rows in their pod's games
-- Routes through games → pod_members (no self-reference on game_players)
CREATE POLICY "Pod members can update game players in their games"
  ON public.game_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.pod_members pm ON pm.pod_id = g.pod_id
      WHERE g.id = game_players.game_id
      AND pm.user_id = auth.uid()
    )
  );
