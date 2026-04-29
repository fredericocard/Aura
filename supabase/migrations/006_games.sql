-- ============================================
-- AF-B07 · Game records
-- Permanent record of every game played.
-- Games are NEVER deleted — downstream artefacts
-- (votes, AURA, badges, Game Cards) depend on them.
-- ============================================

-- 1. Games table
create table public.games (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references public.pods(id) on delete restrict,  -- restrict: can't delete pod with games
  state text not null default 'active'
    check (state in ('active', 'in_questionnaire', 'completed', 'abandoned')),
  pod_size smallint not null,            -- snapshot of how many players were in the pod
  winner_player_id uuid references auth.users(id),
  winner_deck_id uuid references public.decks(id),
  voting_player_count smallint default 0, -- how many players actually voted
  produces_score_changes boolean not null default true,  -- false if < 2 voters
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index idx_games_pod on public.games(pod_id);
create index idx_games_state on public.games(state);

-- Reuse updated_at trigger
create trigger games_updated_at
  before update on public.games
  for each row
  execute function public.handle_updated_at();

-- 2. Game players — which commanders participated in each game
create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete restrict,
  user_id uuid not null references auth.users(id),
  deck_id uuid not null references public.decks(id),
  is_winner boolean not null default false,
  joined_at timestamptz not null default now(),
  -- One entry per user per game
  unique(game_id, user_id)
);

create index idx_game_players_game on public.game_players(game_id);
create index idx_game_players_user on public.game_players(user_id);
create index idx_game_players_deck on public.game_players(deck_id);

-- ============================================
-- RLS policies
-- ============================================

-- Games: participants can read, pod host can insert/update
alter table public.games enable row level security;

create policy "Game participants can read games"
  on public.games for select
  using (
    exists (
      select 1 from public.game_players
      where game_players.game_id = games.id
      and game_players.user_id = auth.uid()
    )
    or exists (
      select 1 from public.pods
      where pods.id = games.pod_id
      and pods.host_id = auth.uid()
    )
  );

create policy "Pod host can create games"
  on public.games for insert
  with check (
    exists (
      select 1 from public.pods
      where pods.id = pod_id
      and pods.host_id = auth.uid()
    )
  );

create policy "Pod host can update games"
  on public.games for update
  using (
    exists (
      select 1 from public.pods
      where pods.id = games.pod_id
      and pods.host_id = auth.uid()
    )
  );

-- Allow any game participant to update the game (for auto-complete on last review)
create policy "Participants can complete games"
  on public.games for update
  using (
    exists (
      select 1 from public.game_players
      where game_players.game_id = games.id
      and game_players.user_id = auth.uid()
    )
  )
  with check (state in ('completed', 'in_questionnaire'));

-- Game players: participants can read, pod members can insert
alter table public.game_players enable row level security;

create policy "Participants can read game players"
  on public.game_players for select
  using (
    exists (
      select 1 from public.game_players gp
      where gp.game_id = game_players.game_id
      and gp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.games g
      join public.pods p on p.id = g.pod_id
      where g.id = game_players.game_id
      and p.host_id = auth.uid()
    )
  );

create policy "Pod members can insert game players"
  on public.game_players for insert
  with check (
    exists (
      select 1 from public.games g
      join public.pods p on p.id = g.pod_id
      where g.id = game_id
      and (
        p.host_id = auth.uid()
        or exists (
          select 1 from public.pod_members pm
          where pm.pod_id = p.id
          and pm.user_id = auth.uid()
        )
      )
    )
  );

-- Game players update (mark winner)
create policy "Pod host can update game players"
  on public.game_players for update
  using (
    exists (
      select 1 from public.games g
      join public.pods p on p.id = g.pod_id
      where g.id = game_players.game_id
      and p.host_id = auth.uid()
    )
  );
