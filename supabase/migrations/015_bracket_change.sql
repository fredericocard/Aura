-- ============================================
-- AF-B20 · Bracket change nudge
-- AF-B21 · Bracket change handler
-- Nudge table + bracket change audit log.
-- ============================================

-- 1. Bracket nudges — tracks suggestions to move up
create table public.bracket_nudges (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  current_bracket smallint not null,
  suggested_bracket smallint not null,
  flag_ratio numeric(4,2) not null,       -- snapshot of ratio that triggered nudge
  games_evaluated smallint not null,       -- how many games were checked
  status text not null default 'pending'
    check (status in ('pending', 'dismissed', 'accepted')),
  created_at timestamptz not null default now(),
  dismissed_at timestamptz,
  accepted_at timestamptz,
  cooloff_until timestamptz               -- set on dismiss, no new nudge until this date
);

create index idx_bracket_nudges_deck on public.bracket_nudges(deck_id);
create index idx_bracket_nudges_pending on public.bracket_nudges(deck_id)
  where status = 'pending';

-- 2. Bracket change log — audit trail for all bracket changes
create table public.bracket_change_log (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  old_bracket smallint not null,
  new_bracket smallint not null,
  old_aura numeric(6,2) not null,
  new_aura numeric(6,2) not null default 50.00,
  trigger_type text not null check (trigger_type in ('nudge', 'manual')),
  nudge_id uuid references public.bracket_nudges(id),
  chronic_was_cleared boolean not null default false,
  badge_counts_snapshot jsonb,             -- preserved badge counts at time of change
  created_at timestamptz not null default now()
);

create index idx_bracket_change_log_deck on public.bracket_change_log(deck_id);

-- ============================================
-- RLS policies
-- ============================================

-- Bracket nudges: deck owner can read and update (dismiss/accept)
alter table public.bracket_nudges enable row level security;

create policy "Users can read own nudges"
  on public.bracket_nudges for select
  using (
    exists (
      select 1 from public.decks
      where decks.id = bracket_nudges.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "System can insert nudges"
  on public.bracket_nudges for insert
  with check (
    exists (
      select 1 from public.decks
      where decks.id = bracket_nudges.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "Users can update own nudges"
  on public.bracket_nudges for update
  using (
    exists (
      select 1 from public.decks
      where decks.id = bracket_nudges.deck_id
      and decks.user_id = auth.uid()
    )
  );

-- Bracket change log: deck owner can read, system inserts
alter table public.bracket_change_log enable row level security;

create policy "Users can read own bracket changes"
  on public.bracket_change_log for select
  using (user_id = auth.uid());

create policy "Users can insert own bracket changes"
  on public.bracket_change_log for insert
  with check (user_id = auth.uid());
