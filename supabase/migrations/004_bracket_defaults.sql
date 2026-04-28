-- ============================================
-- AF-B05 · Bracket declaration defaults
-- Bracket defaults to 2, aura_score to 50,
-- bracket_set_at auto-sets on insert/update.
-- Bracket constrained to 1-5.
-- ============================================

-- Add default and constraint to bracket column
alter table public.decks
  alter column bracket set default 2;

alter table public.decks
  add constraint chk_bracket_range
  check (bracket >= 1 and bracket <= 5);

-- Auto-set bracket_set_at whenever bracket changes
create or replace function public.handle_bracket_timestamp()
returns trigger as $$
begin
  -- On INSERT: always set bracket_set_at
  if TG_OP = 'INSERT' then
    new.bracket_set_at = now();
    return new;
  end if;
  -- On UPDATE: only set if bracket actually changed
  if TG_OP = 'UPDATE' and (old.bracket is distinct from new.bracket) then
    new.bracket_set_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger decks_bracket_timestamp
  before insert or update on public.decks
  for each row
  execute function public.handle_bracket_timestamp();

-- Backfill any existing decks that have null bracket
update public.decks
  set bracket = 2, bracket_set_at = now()
  where bracket is null;
