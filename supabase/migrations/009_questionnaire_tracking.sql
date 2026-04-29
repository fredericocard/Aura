-- ============================================
-- AF-B10 · Pod-level questionnaire completion tracking
-- Tracks whether each player completed their review
-- manually or was auto-completed after the 30-min window.
-- Timer starts from games.ended_at (when winner declared).
-- ============================================

-- Add auto_completed flag to pod_members
-- false = player clicked Accept Review manually
-- true  = 30-min timer expired, system auto-filled defaults
alter table public.pod_members
  add column auto_completed boolean not null default false;
