-- ============================================
-- AF-B14 · Badge count persistence
-- Two layers of tracking:
--
-- 1. BADGE VOTES RECEIVED — cumulative count of how many times
--    a commander was voted for in each category across all games.
--    These feed into AURA score calculation.
--
-- 2. BREWED BADGE EARNED — the single winning badge per game
--    (most voted category). This shows on deck accomplishments.
--
-- Both never decrease. Bracket at time of earning is recorded.
-- ============================================

-- 1. Cumulative badge VOTES received (for AURA)
alter table public.decks
  add column votes_fun integer not null default 0,
  add column votes_rivalry integer not null default 0,
  add column votes_allegiance integer not null default 0,
  add column votes_brilliance integer not null default 0,
  add column votes_flavor integer not null default 0;

-- 2. Brewed badge count (how many times each badge was WON)
alter table public.decks
  add column badge_fun integer not null default 0,
  add column badge_rivalry integer not null default 0,
  add column badge_allegiance integer not null default 0,
  add column badge_brilliance integer not null default 0,
  add column badge_flavor integer not null default 0;

-- 3. Badge vote history — per game, per commander, per category
--    Records every vote a commander received in each game
create table public.badge_vote_history (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete restrict,
  game_id uuid not null references public.games(id) on delete restrict,
  user_id uuid not null references auth.users(id),
  badge text not null
    check (badge in ('fun','rivalry','allegiance','brilliance','flavor')),
  vote_count smallint not null default 0,   -- votes received in this category this game
  bracket_at_time smallint not null,
  recorded_at timestamptz not null default now(),

  -- One row per deck per game per badge category
  unique(deck_id, game_id, badge)
);

create index idx_badge_vote_hist_deck on public.badge_vote_history(deck_id);
create index idx_badge_vote_hist_game on public.badge_vote_history(game_id);

-- 4. Brewed badge history — one row per game (the single winning badge)
create table public.badge_history (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete restrict,
  game_id uuid not null references public.games(id) on delete restrict,
  user_id uuid not null references auth.users(id),
  badge text not null
    check (badge in ('fun','rivalry','allegiance','brilliance','flavor')),
  bracket_at_time smallint not null,
  earned_at timestamptz not null default now(),

  -- One brewed badge per deck per game
  unique(deck_id, game_id)
);

create index idx_badge_history_deck on public.badge_history(deck_id);
create index idx_badge_history_game on public.badge_history(game_id);
create index idx_badge_history_user on public.badge_history(user_id);

-- ============================================
-- RLS policies
-- ============================================

-- Badge vote history
alter table public.badge_vote_history enable row level security;

create policy "Game participants can read badge vote history"
  on public.badge_vote_history for select
  using (
    exists (
      select 1 from public.game_players
      where game_players.game_id = badge_vote_history.game_id
      and game_players.user_id = auth.uid()
    )
  );

create policy "Deck owner can read own badge vote history"
  on public.badge_vote_history for select
  using (user_id = auth.uid());

create policy "Participants can insert badge vote history"
  on public.badge_vote_history for insert
  with check (user_id = auth.uid());

-- Badge history (brewed)
alter table public.badge_history enable row level security;

create policy "Game participants can read badge history"
  on public.badge_history for select
  using (
    exists (
      select 1 from public.game_players
      where game_players.game_id = badge_history.game_id
      and game_players.user_id = auth.uid()
    )
  );

create policy "Deck owner can read own badge history"
  on public.badge_history for select
  using (user_id = auth.uid());

create policy "Participants can insert badge history"
  on public.badge_history for insert
  with check (user_id = auth.uid());
