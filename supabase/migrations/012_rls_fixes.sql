-- ============================================
-- RLS fixes for B08–B14 functionality
-- Several operations need broader permissions:
--   1. Any player updates their own game_players row (life, counters)
--   2. Any participant updates game_players for game flow (elimination, winner)
--   3. Any participant can insert votes for auto-complete flow
--   4. Any participant can update pod_members for auto-complete flow
-- ============================================

-- 1. Players can update their own game_players row
--    (life_total, poison, experience, energy, concede)
create policy "Players can update own game_player row"
  on public.game_players for update
  using (user_id = auth.uid());

-- 2. Any game participant can update any game_players row in their game
--    (needed for checkLastStanding: sets can_review on winner, reverts on revive)
create policy "Participants can update game players in their game"
  on public.game_players for update
  using (
    exists (
      select 1 from public.game_players gp
      where gp.game_id = game_players.game_id
      and gp.user_id = auth.uid()
    )
  );

-- 3. Any game participant can insert votes for auto-complete
--    (autoCompleteExpiredReviews inserts bracket_check "no flag" for expired players)
create policy "Participants can insert votes for auto-complete"
  on public.game_votes for insert
  with check (
    exists (
      select 1 from public.game_players
      where game_players.game_id = game_votes.game_id
      and game_players.user_id = auth.uid()
    )
  );

-- 4. Any pod member can update other members for auto-complete
--    (autoCompleteExpiredReviews sets review_submitted_at + auto_completed)
create policy "Pod members can update others for auto-complete"
  on public.pod_members for update
  using (
    exists (
      select 1 from public.pod_members pm
      where pm.pod_id = pod_members.pod_id
      and pm.user_id = auth.uid()
    )
  );
