-- ============================================
-- AF-B13 · Badge attribution + archetype system
-- Badge attributions table for audit
-- ============================================

-- Badge attributions — permanent record per game per player
create table public.badge_attributions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete restrict,
  user_id uuid not null references auth.users(id),
  deck_id uuid not null references public.decks(id),

  -- Brewed badge: the single top badge for this player
  brewed_badge text not null
    check (brewed_badge in ('fun','rivalry','allegiance','brilliance','flavor','none')),

  -- Archetype: derived from combination of all badges received
  archetype_key text not null,     -- e.g. 'brilliance+rivalry'
  archetype_name text not null,    -- e.g. 'The Grand Tactician'

  -- Raw data snapshot for audit
  badges_received text[] not null default '{}',  -- which badges this player got votes in
  vote_counts jsonb not null default '{}',       -- { "fun": 2, "rivalry": 1, ... }

  created_at timestamptz not null default now(),

  -- One attribution per player per game
  unique(game_id, user_id)
);

create index idx_badge_attr_game on public.badge_attributions(game_id);
create index idx_badge_attr_user on public.badge_attributions(user_id);
create index idx_badge_attr_deck on public.badge_attributions(deck_id);

-- ============================================
-- RLS policies
-- ============================================
alter table public.badge_attributions enable row level security;

-- All game participants can read attributions
create policy "Game participants can read attributions"
  on public.badge_attributions for select
  using (
    exists (
      select 1 from public.game_players
      where game_players.game_id = badge_attributions.game_id
      and game_players.user_id = auth.uid()
    )
  );

-- System inserts (any authenticated participant can trigger attribution)
create policy "Participants can insert attributions"
  on public.badge_attributions for insert
  with check (
    exists (
      select 1 from public.game_players
      where game_players.game_id = badge_attributions.game_id
      and game_players.user_id = auth.uid()
    )
  );
