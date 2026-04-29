-- ============================================
-- AF-B06 · Pod creation and lifecycle
-- Pods, members, and state transition log
-- ============================================

-- 1. Pods table
create table public.pods (
  id uuid primary key default gen_random_uuid(),
  short_code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  state text not null default 'waiting'
    check (state in ('waiting', 'active', 'in_questionnaire', 'completed', 'abandoned')),
  min_players smallint not null default 2,
  max_players smallint not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,          -- when state moved to 'active'
  completed_at timestamptz,        -- when state moved to 'completed'
  abandoned_at timestamptz         -- when state moved to 'abandoned'
);

-- Index for short_code lookups (join by code)
create index idx_pods_short_code on public.pods(short_code);

-- Index for finding stale pods to abandon
create index idx_pods_stale on public.pods(updated_at)
  where state in ('waiting', 'active', 'in_questionnaire');

-- Reuse updated_at trigger
create trigger pods_updated_at
  before update on public.pods
  for each row
  execute function public.handle_updated_at();

-- 2. Pod members table
create table public.pod_members (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references public.pods(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  joined_at timestamptz not null default now(),
  review_submitted_at timestamptz,  -- null until this player submits their review
  -- Prevent same user joining same pod twice
  unique(pod_id, user_id)
);

create index idx_pod_members_pod on public.pod_members(pod_id);
create index idx_pod_members_user on public.pod_members(user_id);

-- 3. Pod state log (audit trail for state transitions)
create table public.pod_state_log (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references public.pods(id) on delete cascade,
  from_state text,
  to_state text not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index idx_pod_state_log_pod on public.pod_state_log(pod_id);

-- Auto-log state transitions via trigger
create or replace function public.handle_pod_state_change()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.pod_state_log(pod_id, from_state, to_state, changed_by)
    values (new.id, null, new.state, new.host_id);
    return new;
  end if;

  if old.state is distinct from new.state then
    -- Set timestamp fields based on new state
    if new.state = 'active' then
      new.started_at = now();
    elsif new.state = 'completed' then
      new.completed_at = now();
    elsif new.state = 'abandoned' then
      new.abandoned_at = now();
    end if;

    insert into public.pod_state_log(pod_id, from_state, to_state, changed_by)
    values (new.id, old.state, new.state, auth.uid());
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger pods_state_change
  before insert or update on public.pods
  for each row
  execute function public.handle_pod_state_change();

-- ============================================
-- RLS policies
-- ============================================

-- Pods: members can read, host can modify
alter table public.pods enable row level security;

create policy "Pod members can read pod"
  on public.pods for select
  using (
    auth.uid() = host_id
    or exists (
      select 1 from public.pod_members
      where pod_members.pod_id = pods.id
      and pod_members.user_id = auth.uid()
    )
  );

-- Anyone authenticated can read a pod by short_code (for joining)
create policy "Anyone can read pod by short code"
  on public.pods for select
  using (auth.uid() is not null);

create policy "Authenticated users can create pods"
  on public.pods for insert
  with check (auth.uid() = host_id);

create policy "Host can update pod"
  on public.pods for update
  using (auth.uid() = host_id);

-- Allow any member to transition pod to 'completed'
-- (triggered automatically when all reviews are in)
create policy "Members can complete pod"
  on public.pods for update
  using (
    exists (
      select 1 from public.pod_members
      where pod_members.pod_id = pods.id
      and pod_members.user_id = auth.uid()
    )
  )
  with check (state = 'completed');

-- Pod members: members can read, authenticated can join
alter table public.pod_members enable row level security;

create policy "Pod participants can read members"
  on public.pod_members for select
  using (
    exists (
      select 1 from public.pod_members pm
      where pm.pod_id = pod_members.pod_id
      and pm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.pods
      where pods.id = pod_members.pod_id
      and pods.host_id = auth.uid()
    )
  );

create policy "Authenticated users can join pods"
  on public.pod_members for insert
  with check (auth.uid() = user_id);

create policy "Members can update own membership"
  on public.pod_members for update
  using (auth.uid() = user_id);

-- Any pod member can update others for auto-complete (B10: expired review timeout)
create policy "Pod members can update others for auto-complete"
  on public.pod_members for update
  using (
    exists (
      select 1 from public.pod_members pm
      where pm.pod_id = pod_members.pod_id
      and pm.user_id = auth.uid()
    )
  );

-- State log: pod members can read
alter table public.pod_state_log enable row level security;

create policy "Pod participants can read state log"
  on public.pod_state_log for select
  using (
    exists (
      select 1 from public.pod_members
      where pod_members.pod_id = pod_state_log.pod_id
      and pod_members.user_id = auth.uid()
    )
    or exists (
      select 1 from public.pods
      where pods.id = pod_state_log.pod_id
      and pods.host_id = auth.uid()
    )
  );
