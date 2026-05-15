-- ============================================
-- 021 · Pod members can read games & game_players
--
-- Previously, only game participants (users who already claimed a seat)
-- or the pod host could SELECT from `games` and `game_players`.
-- This meant Player 2 joining via QR code couldn't even find the game
-- or see the seats — they had to claim a seat to become visible, but
-- they couldn't claim without seeing the seats first.
--
-- Fix: let any pod member read games and game_players for their pod.
-- ============================================

-- 1. Pod members can read games for their pod
CREATE POLICY "Pod members can read games in their pod"
  ON public.games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pod_members pm
      WHERE pm.pod_id = games.pod_id
      AND pm.user_id = auth.uid()
    )
  );

-- 2. Pod members can read game_players for games in their pod
CREATE POLICY "Pod members can read game players in their pod"
  ON public.game_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.pod_members pm ON pm.pod_id = g.pod_id
      WHERE g.id = game_players.game_id
      AND pm.user_id = auth.uid()
    )
  );
