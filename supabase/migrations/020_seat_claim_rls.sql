-- ============================================
-- 020 · Fix seat claiming + deck visibility RLS
--
-- Two RLS issues:
--
-- 1. game_players UPDATE policy only allows user_id = auth.uid().
--    Empty seats have user_id IS NULL, so non-host players can
--    never claim them. Guest-occupied seats also can't be taken over.
--
-- 2. decks SELECT policies require the user to have a game_players
--    row. A user who just joined a pod but hasn't claimed a seat
--    can't read other players' decks — so commander art is missing
--    in the seat picker.
-- ============================================

-- 1. Allow pod members to claim empty seats or take over guest seats
CREATE POLICY "Pod members can claim empty or guest seats"
  ON public.game_players FOR UPDATE
  USING (
    -- Seat is either empty or occupied by a guest
    (
      user_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = game_players.user_id
        AND p.account_type = 'guest'
      )
    )
    -- And the caller is a member of the pod this game belongs to
    AND EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.pod_members pm ON pm.pod_id = g.pod_id
      WHERE g.id = game_players.game_id
      AND pm.user_id = auth.uid()
    )
  );

-- 2. Allow pod members to read decks used in their pod's games
--    (even before they've claimed a seat)
CREATE POLICY "Pod members can read decks in their pod games"
  ON public.decks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players gp
      JOIN public.games g ON g.id = gp.game_id
      JOIN public.pod_members pm ON pm.pod_id = g.pod_id
      WHERE gp.deck_id = decks.id
      AND pm.user_id = auth.uid()
    )
  );
