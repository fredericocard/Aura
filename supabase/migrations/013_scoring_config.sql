-- ============================================
-- AF-B26 · Scoring configuration
-- Central config store for all tunable AURA values.
-- Key-value with JSONB so any shape of data can be stored.
-- Audit log tracks every change for compliance.
-- ============================================

-- 1. Add is_admin flag to profiles (needed for config write access)
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Scoring config table (key → jsonb value)
create table public.scoring_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Reuse updated_at trigger
create trigger scoring_config_updated_at
  before update on public.scoring_config
  for each row
  execute function public.handle_updated_at();

-- 3. Audit log for config changes
create table public.scoring_config_log (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  old_value jsonb,
  new_value jsonb not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index idx_scoring_config_log_key on public.scoring_config_log(key);
create index idx_scoring_config_log_time on public.scoring_config_log(changed_at);

-- Auto-log config changes via trigger
create or replace function public.handle_config_change()
returns trigger as $$
begin
  if TG_OP = 'UPDATE' then
    insert into public.scoring_config_log(key, old_value, new_value, changed_by)
    values (new.key, old.value, new.value, auth.uid());
  elsif TG_OP = 'INSERT' then
    insert into public.scoring_config_log(key, old_value, new_value, changed_by)
    values (new.key, null, new.value, auth.uid());
  end if;
  new.updated_by = auth.uid();
  return new;
end;
$$ language plpgsql security definer;

create trigger scoring_config_audit
  before insert or update on public.scoring_config
  for each row
  execute function public.handle_config_change();

-- ============================================
-- RLS policies
-- ============================================
alter table public.scoring_config enable row level security;

-- All authenticated users can read config (needed for scoring computation)
create policy "Authenticated users can read config"
  on public.scoring_config for select
  using (auth.uid() is not null);

-- Only admins can insert config
create policy "Admins can insert config"
  on public.scoring_config for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Only admins can update config
create policy "Admins can update config"
  on public.scoring_config for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Only admins can delete config
create policy "Admins can delete config"
  on public.scoring_config for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Audit log: authenticated can read, no direct writes (trigger only)
alter table public.scoring_config_log enable row level security;

create policy "Authenticated users can read config log"
  on public.scoring_config_log for select
  using (auth.uid() is not null);

-- ============================================
-- Seed default values (from design spec)
-- ============================================

-- Per-vote weights (per badge category)
insert into public.scoring_config (key, value, description) values
  ('brilliance_vote_weight', '0.5', 'AURA points per brilliance vote received'),
  ('flavour_vote_weight', '0.7', 'AURA points per flavour vote received'),
  ('rivalry_vote_weight', '0.2', 'AURA points per rivalry vote received (positive when not chronic)'),
  ('allegiance_vote_weight', '0.4', 'AURA points per allegiance vote received'),
  ('fun_vote_weight', '0.9', 'AURA points per fun vote received'),
  ('bracket_flag_weight', '-3.0', 'AURA points per bracket flag received (always negative)');

-- Chronic archenemy settings
insert into public.scoring_config (key, value, description) values
  ('chronic_archenemy_consecutive', '3', 'Consecutive games earning rivalry brewed badge to trigger chronic'),
  ('chronic_archenemy_penalty', '-1.5', 'Flat AURA penalty applied when chronic archenemy triggers');

-- Pod size scaling factors (baseline = 4-player pod with 3 voters)
insert into public.scoring_config (key, value, description) values
  ('pod_size_scaling', '{"2": 3.0, "3": 1.5, "4": 1.0, "5": 0.75}', 'Multiplier per pod size to equalise max movement');

-- AURA range and default
insert into public.scoring_config (key, value, description) values
  ('aura_min', '1', 'Minimum AURA score (floor clamp)'),
  ('aura_max', '100', 'Maximum AURA score (ceiling clamp)'),
  ('aura_default', '50', 'Starting AURA score for new commanders');

-- Tier boundaries (upper bound inclusive)
insert into public.scoring_config (key, value, description) values
  ('tier_boundaries', '{"exiled": 20, "sideboard": 40, "brewed": 60, "beloved": 80, "mythic": 100}', 'Upper bound of each AURA tier'),
  ('developing_min_games', '5', 'Games required before showing tier instead of Developing');

-- Bracket nudge settings (B20)
insert into public.scoring_config (key, value, description) values
  ('bracket_nudge_min_games', '5', 'Minimum completed games before nudge evaluation'),
  ('bracket_nudge_flag_ratio', '0.5', 'Proportion of games with bracket flags to trigger nudge'),
  ('bracket_nudge_cooloff_games', '5', 'Games after dismissing a nudge before another can fire');

-- Game Card (future)
insert into public.scoring_config (key, value, description) values
  ('game_card_nicknames', '{}', 'Nickname dictionary for Game Card composition (future)');
