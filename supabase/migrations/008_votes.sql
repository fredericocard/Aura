-- ============================================
-- AF-B09 · Vote capture for post-game questions
-- Six badge questions per game per voter:
--   fun, rivalry, allegiance, brilliance, flavor: single-select (one commander)
--   bracket_check: "no flag" OR flag one-or-more commanders
--
-- Votes are MUTABLE until both conditions are met:
--   1. A winner has been declared (game.winner_player_id is set)
--   2. The voter has clicked Accept Review (pod_members.review_submitted_at is set)
-- Immutability is enforced in application code, not SQL.
-- ============================================

create table public.game_votes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete restrict,
  voter_id uuid not null references auth.users(id),
  question_key text not null
    check (question_key in ('fun','rivalry','allegiance','brilliance','flavor','bracket_check')),
  target_deck_id uuid references public.decks(id),  -- null only for bracket_check "no flag"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Single-select questions: exactly one vote per voter per question
create unique index idx_game_votes_single
  on public.game_votes(game_id, voter_id, question_key)
  where question_key != 'bracket_check';

-- Bracket check: prevent duplicate flags for same commander by same voter
create unique index idx_game_votes_bracket_flag
  on public.game_votes(game_id, voter_id, target_deck_id)
  where question_key = 'bracket_check' and target_deck_id is not null;

-- Only one "no flag" row per voter per game
create unique index idx_game_votes_bracket_noflag
  on public.game_votes(game_id, voter_id)
  where question_key = 'bracket_check' and target_deck_id is null;

-- Lookup indexes
create index idx_game_votes_game on public.game_votes(game_id);
create index idx_game_votes_voter on public.game_votes(voter_id);

-- Reuse updated_at trigger
create trigger game_votes_updated_at
  before update on public.game_votes
  for each row
  execute function public.handle_updated_at();

-- ============================================
-- RLS policies
-- ============================================
alter table public.game_votes enable row level security;

-- All game participants can read all votes (needed for scoring + Game Card)
create policy "Game participants can read votes"
  on public.game_votes for select
  using (
    exists (
      select 1 from public.game_players
      where game_players.game_id = game_votes.game_id
      and game_players.user_id = auth.uid()
    )
  );

-- Voters can insert their own votes
create policy "Voters can insert own votes"
  on public.game_votes for insert
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.game_players
      where game_players.game_id = game_votes.game_id
      and game_players.user_id = auth.uid()
    )
  );

-- Voters can update their own votes (immutability enforced in app)
create policy "Voters can update own votes"
  on public.game_votes for update
  using (voter_id = auth.uid());

-- Voters can delete their own votes (for bracket_check replacement flow)
create policy "Voters can delete own votes"
  on public.game_votes for delete
  using (voter_id = auth.uid());
