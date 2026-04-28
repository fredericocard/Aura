-- ============================================
-- AF-B03 · Commander registration (decks)
-- Each registration = one distinct deck record
-- Same commander name can appear multiple times
-- per user (different builds / different lists)
-- ============================================

-- Decks table
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commander_name text not null,
  -- Populated later by AF-B04 (Scryfall validation)
  commander_art_url text,
  color_identity text,       -- e.g. "WUBRG", "RG", "U"
  -- Populated by AF-B05 (Bracket declaration)
  bracket smallint,
  aura_score numeric(6,2) default 50.00,
  bracket_set_at timestamptz,
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookup: "give me all my decks"
create index idx_decks_user_id on public.decks(user_id);

-- Updated-at trigger (reuse the function from 001_profiles)
create trigger decks_updated_at
  before update on public.decks
  for each row
  execute function public.handle_updated_at();

-- ============================================
-- RLS: users can only see/manage their own decks
-- ============================================
alter table public.decks enable row level security;

-- Select: only your own decks
create policy "Users can read own decks"
  on public.decks for select
  using (auth.uid() = user_id);

-- Insert: can only create decks for yourself
create policy "Users can register own decks"
  on public.decks for insert
  with check (auth.uid() = user_id);

-- Update: can only modify your own decks
create policy "Users can update own decks"
  on public.decks for update
  using (auth.uid() = user_id);

-- Delete: can only remove your own decks
create policy "Users can delete own decks"
  on public.decks for delete
  using (auth.uid() = user_id);
