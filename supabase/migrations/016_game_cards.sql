-- ============================================
-- AF-B22 · Game Card composition
-- AF-B23 · Game Card storage
-- Stores composed card data + image references.
-- Cards are NEVER deleted — permanent record.
-- ============================================

-- 1. Game cards table (metadata + composition)
create table public.game_cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete restrict,
  pod_id uuid not null references public.pods(id) on delete restrict,
  -- Composition data
  narrative text not null,                    -- "In this chapter..." sentence
  game_date date not null,
  pod_size smallint not null,
  -- Winner info
  winner_user_id uuid references auth.users(id),
  winner_deck_id uuid references public.decks(id),
  winner_commander_name text,
  winner_archetype text,
  -- Key vote winners (commander names for display)
  archenemy_commander text,                   -- rivalry winner
  flavour_winner_commander text,              -- flavour winner
  fun_winner_commander text,                  -- fun winner (fan favourite)
  brilliance_winner_commander text,           -- brilliance winner
  -- Allegiance data
  allegiance_data jsonb default '[]',         -- [{voter, target, commander_name}]
  -- Bracket check summary
  bracket_consensus boolean not null default true,  -- true = all played in bracket
  bracket_flagged_commanders jsonb default '[]',    -- ["Commander A", "Commander B"]
  -- Per-commander card data (nickname = archetype)
  commanders jsonb not null default '[]',     -- [{deck_id, user_id, commander_name, art_url, archetype, brewed_badge, is_winner}]
  -- Image storage (B23)
  image_url text,                             -- Supabase Storage URL (set when image generated)
  image_generated_at timestamptz,
  share_code text unique,                     -- short code for sharing URLs
  -- Metadata
  created_at timestamptz not null default now(),
  -- One card per game
  unique(game_id)
);

create index idx_game_cards_game on public.game_cards(game_id);
create index idx_game_cards_pod on public.game_cards(pod_id);
create index idx_game_cards_share on public.game_cards(share_code)
  where share_code is not null;
create index idx_game_cards_winner on public.game_cards(winner_user_id);

-- 2. Player-to-card link (so players can find their cards)
create table public.game_card_players (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.game_cards(id) on delete restrict,
  user_id uuid not null references auth.users(id),
  deck_id uuid not null references public.decks(id),
  commander_name text not null,
  archetype text,
  brewed_badge text,
  is_winner boolean not null default false,
  -- One entry per player per card
  unique(card_id, user_id)
);

create index idx_game_card_players_user on public.game_card_players(user_id);
create index idx_game_card_players_deck on public.game_card_players(deck_id);
create index idx_game_card_players_card on public.game_card_players(card_id);

-- ============================================
-- RLS policies
-- ============================================

-- Game cards: participants can read, any participant can create (on pod completion)
alter table public.game_cards enable row level security;

-- Anyone who played in the game can read the card
create policy "Game participants can read cards"
  on public.game_cards for select
  using (
    exists (
      select 1 from public.game_players
      where game_players.game_id = game_cards.game_id
      and game_players.user_id = auth.uid()
    )
  );

-- Public read via share code (for social sharing)
create policy "Anyone can read shared cards"
  on public.game_cards for select
  using (share_code is not null);

-- Participants can create the card
create policy "Participants can create cards"
  on public.game_cards for insert
  with check (
    exists (
      select 1 from public.game_players
      where game_players.game_id = game_cards.game_id
      and game_players.user_id = auth.uid()
    )
  );

-- Participants can update (set image URL after generation)
create policy "Participants can update cards"
  on public.game_cards for update
  using (
    exists (
      select 1 from public.game_players
      where game_players.game_id = game_cards.game_id
      and game_players.user_id = auth.uid()
    )
  );

-- Player links: readable by the player, insertable by game participants
alter table public.game_card_players enable row level security;

create policy "Users can read own card links"
  on public.game_card_players for select
  using (user_id = auth.uid());

-- Any game participant can read all player links for their cards
create policy "Participants can read card player links"
  on public.game_card_players for select
  using (
    exists (
      select 1 from public.game_cards gc
      join public.game_players gp on gp.game_id = gc.game_id
      where gc.id = game_card_players.card_id
      and gp.user_id = auth.uid()
    )
  );

create policy "Participants can insert card player links"
  on public.game_card_players for insert
  with check (
    exists (
      select 1 from public.game_cards gc
      join public.game_players gp on gp.game_id = gc.game_id
      where gc.id = game_card_players.card_id
      and gp.user_id = auth.uid()
    )
  );
