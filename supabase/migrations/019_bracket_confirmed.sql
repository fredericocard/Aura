-- ── Allow NULL bracket on decks ───────────────────────────────
-- Commanders registered via quick-add (Create Pod flow) get bracket=NULL.
-- Scoring (aura, badges) is deferred until the user picks a bracket
-- on the Decks page. NULL bracket = "not yet chosen".

-- Drop the existing CHECK + NOT NULL so bracket can be NULL
ALTER TABLE decks DROP CONSTRAINT IF EXISTS decks_bracket_check;
ALTER TABLE decks ALTER COLUMN bracket DROP NOT NULL;
ALTER TABLE decks ALTER COLUMN bracket DROP DEFAULT;

-- Re-add the CHECK to allow NULL or 1-5
ALTER TABLE decks ADD CONSTRAINT decks_bracket_check
  CHECK (bracket IS NULL OR (bracket BETWEEN 1 AND 5));
