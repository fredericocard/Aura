-- ============================================
-- RLS fixes for B01–B14 functionality
-- Fixes permissions that later tickets exposed as too restrictive.
-- ============================================

-- ─── DECKS (B03) ────────────────────────────────────────────
-- Other players need to read deck names/art for voting, Game Card, tally.
-- Current RLS only allows owner to read own decks.
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

-- ─── GAMES (B07) ────────────────────────────────────────────
-- checkLastStanding can revert game state to 'active' on revive.
-- Existing policy only allows participants to set 'completed' or 'in_questionnaire'.
-- Need broader update for any participant.
create policy "Participants can update game state"
  on public.games for update
  using (
    exists (
      select 1 from public.game_players
      where game_players.game_id = games.id
      and game_players.user_id = auth.uid()
    )
  );

-- ─── GAME PLAYERS (B07/B08) ─────────────────────────────────
-- Any player needs to update their own row (life, counters, concede).
-- checkLastStanding updates other players' can_review.
create policy "Players can update own game_player row"
  on public.game_players for update
  using (user_id = auth.uid());

create policy "Participants can update game players in their game"
  on public.game_players for update
  using (
    exists (
      select 1 from public.game_players gp
      where gp.game_id = game_players.game_id
      and gp.user_id = auth.uid()
    )
  );

-- ─── GAME VOTES (B09/B10) ───────────────────────────────────
-- autoCompleteExpiredReviews inserts bracket_check votes for expired players.
-- Existing policy requires voter_id = auth.uid().
create policy "Participants can insert votes for auto-complete"
  on public.game_votes for insert
  with check (
    exists (
      select 1 from public.game_players
      where game_players.game_id = game_votes.game_id
      and game_players.user_id = auth.uid()
    )
  );

-- ─── POD MEMBERS (B06/B10) ──────────────────────────────────
-- autoCompleteExpiredReviews sets review_submitted_at on other players.
-- Existing policy only allows self-update.
create policy "Pod members can update others for auto-complete"
  on public.pod_members for update
  using (
    exists (
      select 1 from public.pod_members pm
      where pm.pod_id = pod_members.pod_id
      and pm.user_id = auth.uid()
    )
  );
