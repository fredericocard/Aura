-- ============================================
-- AF-B18 · Chronic archenemy detection
-- AF-B17 · AURA delta computation
-- Adds chronic flag to decks + AURA history table.
-- ============================================

-- 1. Add chronic archenemy flag to decks (B18)
alter table public.decks
  add column if not exists is_chronic_archenemy boolean not null default false,
  add column if not exists chronic_updated_at timestamptz;

-- 2. AURA delta history table (B17)
-- One row per commander per game — full audit trail for trend visualisation
create table public.aura_history (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  -- Snapshot at time of computation
  score_before numeric(6,2) not null,
  score_after numeric(6,2) not null,
  delta numeric(6,2) not null,
  -- Breakdown for transparency
  badge_deltas jsonb not null default '{}',   -- {"fun": 1.8, "rivalry": -0.4, ...}
  bracket_delta numeric(6,2) not null default 0,
  pod_size smallint not null,
  scaling_factor numeric(4,2) not null default 1.0,
  was_chronic_archenemy boolean not null default false,
  -- Metadata
  created_at timestamptz not null default now(),
  -- One entry per commander per game
  unique(deck_id, game_id)
);

create index idx_aura_history_deck on public.aura_history(deck_id);
create index idx_aura_history_game on public.aura_history(game_id);
create index idx_aura_history_deck_time on public.aura_history(deck_id, created_at);

-- ============================================
-- RLS policies
-- ============================================
alter table public.aura_history enable row level security;

-- Deck owners can read their own AURA history
create policy "Users can read own AURA history"
  on public.aura_history for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = aura_history.deck_id
      and decks.user_id = auth.uid()
    )
  );

-- Game participants can read AURA history for commanders in their games
create policy "Game participants can read AURA history"
  on public.aura_history for select
  using (
    exists (
      select 1 from public.game_players
      where game_players.game_id = aura_history.game_id
      and game_players.user_id = auth.uid()
    )
  );

-- Insert: any game participant can trigger AURA computation
create policy "Game participants can insert AURA history"
  on public.aura_history for insert
  with check (
    exists (
      select 1 from public.game_players
      where game_players.game_id = aura_history.game_id
      and game_players.user_id = auth.uid()
    )
  );
