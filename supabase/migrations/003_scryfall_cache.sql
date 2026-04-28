-- ============================================
-- AF-B04 · Scryfall card cache
-- Stores validated commander card details locally
-- so we don't re-query Scryfall on every view.
-- Public read access (card data is public info),
-- only the app inserts/updates via service or anon.
-- ============================================

create table public.scryfall_cache (
  -- Use the canonical lowercased card name as primary key
  card_name_lower text primary key,
  card_name text not null,              -- exact Scryfall name (proper casing)
  art_url text,                         -- art_crop URL
  color_identity text,                  -- e.g. "WUBRG", "RG", "U", ""
  is_valid_commander boolean not null default false,
  scryfall_id text,                     -- Scryfall's own card UUID
  cached_at timestamptz not null default now()
);

-- Index for quick lookups by scryfall_id (for future use)
create index idx_scryfall_cache_id on public.scryfall_cache(scryfall_id);

-- RLS: everyone can read (card data is public), authenticated users can insert/update
alter table public.scryfall_cache enable row level security;

create policy "Anyone can read card cache"
  on public.scryfall_cache for select
  using (true);

create policy "Authenticated users can insert card cache"
  on public.scryfall_cache for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update card cache"
  on public.scryfall_cache for update
  using (auth.uid() is not null);
