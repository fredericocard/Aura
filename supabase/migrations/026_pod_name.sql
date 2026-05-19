-- 026_pod_name.sql
-- Adds an optional name to pods and stores it on game_cards for the keepsake display.

ALTER TABLE pods
  ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE game_cards
  ADD COLUMN IF NOT EXISTS pod_name TEXT;
