-- ============================================
-- AF-B08 · End-of-game questionnaire trigger
-- Life totals tracked per player. When a player
-- hits 0 life (or 10+ poison), they're eliminated
-- and can access the review. Last player standing
-- is the winner and also gets review access.
-- Reviving (un-eliminating) resets that player's review.
-- ============================================

-- Add life tracking + counters to game_players
alter table public.game_players
  add column life_total integer not null default 40,
  add column poison_counters integer not null default 0,
  add column experience_counters integer not null default 0,
  add column energy_counters integer not null default 0,
  add column is_eliminated boolean not null default false,
  add column eliminated_at timestamptz,
  add column can_review boolean not null default false;
