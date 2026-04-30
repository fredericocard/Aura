-- ============================================================
-- AURA · Complete Database Schema
-- Paste this into the Supabase SQL Editor and hit "Run"
-- ============================================================
-- Prerequisites: Supabase project with Auth enabled
-- This creates all tables, indexes, RLS policies, triggers,
-- and default scoring configuration.
-- Safe to re-run: drops existing objects first.
-- ============================================================

-- ── CLEAN SLATE ──────────────────────────────────────────
-- Drop tables in reverse dependency order so foreign keys don't block
DROP TABLE IF EXISTS scoring_config_log CASCADE;
DROP TABLE IF EXISTS scoring_config CASCADE;
DROP TABLE IF EXISTS bracket_change_log CASCADE;
DROP TABLE IF EXISTS bracket_nudges CASCADE;
DROP TABLE IF EXISTS game_card_players CASCADE;
DROP TABLE IF EXISTS game_cards CASCADE;
DROP TABLE IF EXISTS aura_history CASCADE;
DROP TABLE IF EXISTS badge_vote_history CASCADE;
DROP TABLE IF EXISTS badge_history CASCADE;
DROP TABLE IF EXISTS badge_attributions CASCADE;
DROP TABLE IF EXISTS game_votes CASCADE;
DROP TABLE IF EXISTS game_players CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS pod_members CASCADE;
DROP TABLE IF EXISTS pods CASCADE;
DROP TABLE IF EXISTS decks CASCADE;
DROP TABLE IF EXISTS scryfall_cache CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop triggers on auth.users (safe even if they don't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS log_config_change();

-- ── 1. PROFILES ───────────────────────────────────────────
-- Mirrors auth.users for app-level data

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  account_type TEXT NOT NULL DEFAULT 'full' CHECK (account_type IN ('guest', 'full')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.is_anonymous THEN 'guest' ELSE 'full' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. DECKS (Commanders) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commander_name TEXT NOT NULL,
  commander_art_url TEXT,
  color_identity TEXT,
  bracket INTEGER NOT NULL DEFAULT 2 CHECK (bracket BETWEEN 1 AND 5),
  aura_score NUMERIC(6,2) NOT NULL DEFAULT 50.00,
  bracket_set_at TIMESTAMPTZ,
  -- Badge counts (accumulated)
  badge_fun INTEGER NOT NULL DEFAULT 0,
  badge_rivalry INTEGER NOT NULL DEFAULT 0,
  badge_allegiance INTEGER NOT NULL DEFAULT 0,
  badge_brilliance INTEGER NOT NULL DEFAULT 0,
  badge_flavor INTEGER NOT NULL DEFAULT 0,
  -- Vote counts (accumulated)
  votes_fun INTEGER NOT NULL DEFAULT 0,
  votes_rivalry INTEGER NOT NULL DEFAULT 0,
  votes_allegiance INTEGER NOT NULL DEFAULT 0,
  votes_brilliance INTEGER NOT NULL DEFAULT 0,
  votes_flavor INTEGER NOT NULL DEFAULT 0,
  -- Chronic archenemy
  is_chronic_archenemy BOOLEAN NOT NULL DEFAULT FALSE,
  chronic_updated_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_decks_user_id ON decks(user_id);

ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own decks"
  ON decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own decks"
  ON decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own decks"
  ON decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own decks"
  ON decks FOR DELETE USING (auth.uid() = user_id);
-- NOTE: Cross-table policy "Players can read decks in their games" is created
-- after the game_players table exists (see below section 6).

-- ── 3. PODS ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  state TEXT NOT NULL DEFAULT 'waiting'
    CHECK (state IN ('waiting', 'active', 'in_questionnaire', 'completed', 'abandoned')),
  min_players INTEGER NOT NULL DEFAULT 2,
  max_players INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ
);

CREATE INDEX idx_pods_short_code ON pods(short_code);
CREATE INDEX idx_pods_host_id ON pods(host_id);

ALTER TABLE pods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pods by short code"
  ON pods FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can create pods"
  ON pods FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update pods"
  ON pods FOR UPDATE USING (host_id = auth.uid());
-- NOTE: Two pod policies that reference pod_members are deferred to after
-- pod_members is created (see below section 4).

-- ── 4. POD_MEMBERS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  deck_id UUID REFERENCES decks(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_submitted_at TIMESTAMPTZ,
  auto_completed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(pod_id, user_id)
);

CREATE INDEX idx_pod_members_pod_id ON pod_members(pod_id);
CREATE INDEX idx_pod_members_user_id ON pod_members(user_id);

ALTER TABLE pod_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pod members can read their pod members"
  ON pod_members FOR SELECT USING (TRUE);
CREATE POLICY "Users can join pods"
  ON pod_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own membership"
  ON pod_members FOR UPDATE USING (auth.uid() = user_id);

-- Deferred pod policies (need pod_members to exist)
CREATE POLICY "Pod members can read their pods"
  ON pods FOR SELECT USING (
    host_id = auth.uid() OR
    id IN (SELECT pod_id FROM pod_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can complete pods"
  ON pods FOR UPDATE USING (
    id IN (SELECT pod_id FROM pod_members WHERE user_id = auth.uid())
  );

-- ── 5. GAMES ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'active'
    CHECK (state IN ('active', 'in_questionnaire', 'completed', 'abandoned')),
  pod_size INTEGER NOT NULL DEFAULT 4,
  winner_player_id UUID REFERENCES auth.users(id),
  winner_deck_id UUID REFERENCES decks(id),
  voting_player_count INTEGER NOT NULL DEFAULT 0,
  produces_score_changes BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_games_pod_id ON games(pod_id);
CREATE INDEX idx_games_state ON games(state);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game players can read their games"
  ON games FOR SELECT USING (
    pod_id IN (SELECT pod_id FROM pod_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Pod hosts can create games"
  ON games FOR INSERT WITH CHECK (
    pod_id IN (SELECT id FROM pods WHERE host_id = auth.uid())
  );
CREATE POLICY "Game participants can update games"
  ON games FOR UPDATE USING (
    pod_id IN (SELECT pod_id FROM pod_members WHERE user_id = auth.uid())
  );

-- ── 6. GAME_PLAYERS ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),          -- NULL for guests / empty seats
  deck_id UUID REFERENCES decks(id),               -- NULL for guests / empty seats
  commander_name TEXT,                               -- set when guest picks a commander
  seat_number SMALLINT NOT NULL DEFAULT 1,           -- 1-based seat position
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  life_total INTEGER NOT NULL DEFAULT 40,
  poison_counters INTEGER NOT NULL DEFAULT 0,
  experience_counters INTEGER NOT NULL DEFAULT 0,
  energy_counters INTEGER NOT NULL DEFAULT 0,
  is_eliminated BOOLEAN NOT NULL DEFAULT FALSE,
  eliminated_at TIMESTAMPTZ,
  can_review BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, seat_number)
);

CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_user_id ON game_players(user_id);
CREATE INDEX idx_game_players_deck_id ON game_players(deck_id);

ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game players can read game data"
  ON game_players FOR SELECT USING (TRUE);
CREATE POLICY "Pod hosts can insert game players"
  ON game_players FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Game players can update their own row"
  ON game_players FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Deferred policy: decks readable by co-players (needs game_players to exist)
CREATE POLICY "Players can read decks in their games"
  ON decks FOR SELECT USING (
    id IN (
      SELECT gp.deck_id FROM game_players gp
      WHERE gp.game_id IN (
        SELECT gp2.game_id FROM game_players gp2 WHERE gp2.user_id = auth.uid()
      )
    )
  );

-- ── 7. GAME_VOTES ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id),
  question_key TEXT NOT NULL
    CHECK (question_key IN ('fun', 'rivalry', 'allegiance', 'brilliance', 'flavor', 'bracket_check')),
  target_deck_id UUID REFERENCES decks(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_votes_game_id ON game_votes(game_id);
CREATE INDEX idx_game_votes_voter ON game_votes(voter_id);
CREATE INDEX idx_game_votes_question ON game_votes(game_id, question_key);

ALTER TABLE game_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voters can read votes in their games"
  ON game_votes FOR SELECT USING (
    game_id IN (
      SELECT gp.game_id FROM game_players gp WHERE gp.user_id = auth.uid()
    )
  );
CREATE POLICY "Players can cast votes"
  ON game_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);
CREATE POLICY "Players can update own votes"
  ON game_votes FOR UPDATE USING (auth.uid() = voter_id);

-- ── 8. BADGE_ATTRIBUTIONS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS badge_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  deck_id UUID NOT NULL REFERENCES decks(id),
  brewed_badge TEXT,
  archetype_key TEXT,
  archetype_name TEXT,
  badges_received JSONB NOT NULL DEFAULT '{}',
  vote_counts JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, deck_id)
);

CREATE INDEX idx_badge_attributions_game ON badge_attributions(game_id);
CREATE INDEX idx_badge_attributions_deck ON badge_attributions(deck_id);

ALTER TABLE badge_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read badge attributions in their games"
  ON badge_attributions FOR SELECT USING (
    game_id IN (
      SELECT gp.game_id FROM game_players gp WHERE gp.user_id = auth.uid()
    )
  );
CREATE POLICY "System can insert badge attributions"
  ON badge_attributions FOR INSERT WITH CHECK (TRUE);

-- ── 9. BADGE_HISTORY ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS badge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  badge TEXT NOT NULL CHECK (badge IN ('fun', 'rivalry', 'allegiance', 'brilliance', 'flavor')),
  bracket_at_time INTEGER NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_badge_history_deck ON badge_history(deck_id);
CREATE INDEX idx_badge_history_deck_badge ON badge_history(deck_id, badge);

ALTER TABLE badge_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badge history"
  ON badge_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert badge history"
  ON badge_history FOR INSERT WITH CHECK (TRUE);

-- ── 10. BADGE_VOTE_HISTORY ────────────────────────────────

CREATE TABLE IF NOT EXISTS badge_vote_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  badge TEXT NOT NULL CHECK (badge IN ('fun', 'rivalry', 'allegiance', 'brilliance', 'flavor')),
  vote_count INTEGER NOT NULL DEFAULT 0,
  bracket_at_time INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_badge_vote_history_deck ON badge_vote_history(deck_id);
CREATE INDEX idx_badge_vote_history_deck_bracket ON badge_vote_history(deck_id, bracket_at_time);

ALTER TABLE badge_vote_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badge vote history"
  ON badge_vote_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert badge vote history"
  ON badge_vote_history FOR INSERT WITH CHECK (TRUE);

-- ── 11. AURA_HISTORY ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS aura_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id),
  score_before NUMERIC(6,2) NOT NULL,
  score_after NUMERIC(6,2) NOT NULL,
  delta NUMERIC(6,2) NOT NULL,
  badge_deltas JSONB NOT NULL DEFAULT '{}',
  bracket_delta NUMERIC(6,2) NOT NULL DEFAULT 0,
  pod_size INTEGER NOT NULL,
  scaling_factor NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  was_chronic_archenemy BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aura_history_deck ON aura_history(deck_id);
CREATE INDEX idx_aura_history_deck_date ON aura_history(deck_id, created_at DESC);

ALTER TABLE aura_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read aura history for own decks"
  ON aura_history FOR SELECT USING (
    deck_id IN (SELECT id FROM decks WHERE user_id = auth.uid())
  );
CREATE POLICY "System can insert aura history"
  ON aura_history FOR INSERT WITH CHECK (TRUE);

-- ── 12. GAME_CARDS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL UNIQUE REFERENCES games(id) ON DELETE CASCADE,
  pod_id UUID NOT NULL REFERENCES pods(id),
  narrative TEXT NOT NULL DEFAULT '',
  game_date TEXT NOT NULL,
  pod_size INTEGER NOT NULL,
  winner_user_id UUID REFERENCES auth.users(id),
  winner_deck_id UUID REFERENCES decks(id),
  winner_commander_name TEXT,
  winner_archetype TEXT,
  archenemy_commander TEXT,
  flavour_winner_commander TEXT,
  fun_winner_commander TEXT,
  brilliance_winner_commander TEXT,
  allegiance_data JSONB NOT NULL DEFAULT '[]',
  bracket_consensus BOOLEAN NOT NULL DEFAULT TRUE,
  bracket_flagged_commanders JSONB NOT NULL DEFAULT '[]',
  commanders JSONB NOT NULL DEFAULT '[]',
  share_code TEXT UNIQUE,
  image_url TEXT,
  image_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_cards_game ON game_cards(game_id);
CREATE INDEX idx_game_cards_share ON game_cards(share_code);

ALTER TABLE game_cards ENABLE ROW LEVEL SECURITY;

-- Game cards are readable by participants and by share code (public)
CREATE POLICY "Game participants can read cards"
  ON game_cards FOR SELECT USING (
    pod_id IN (SELECT pod_id FROM pod_members WHERE user_id = auth.uid())
    OR share_code IS NOT NULL
  );
CREATE POLICY "System can insert game cards"
  ON game_cards FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "System can update game cards"
  ON game_cards FOR UPDATE USING (TRUE);

-- ── 13. GAME_CARD_PLAYERS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS game_card_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES game_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  deck_id UUID NOT NULL REFERENCES decks(id),
  commander_name TEXT NOT NULL,
  archetype TEXT,
  brewed_badge TEXT,
  is_winner BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_game_card_players_card ON game_card_players(card_id);
CREATE INDEX idx_game_card_players_user ON game_card_players(user_id);
CREATE INDEX idx_game_card_players_deck ON game_card_players(deck_id);

ALTER TABLE game_card_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read game card players"
  ON game_card_players FOR SELECT USING (TRUE);
CREATE POLICY "System can insert game card players"
  ON game_card_players FOR INSERT WITH CHECK (TRUE);

-- ── 14. BRACKET_NUDGES ────────────────────────────────────

CREATE TABLE IF NOT EXISTS bracket_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  current_bracket INTEGER NOT NULL,
  suggested_bracket INTEGER NOT NULL,
  flag_ratio NUMERIC(4,3) NOT NULL DEFAULT 0,
  games_evaluated INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  cooloff_until TIMESTAMPTZ
);

CREATE INDEX idx_bracket_nudges_deck ON bracket_nudges(deck_id);
CREATE INDEX idx_bracket_nudges_status ON bracket_nudges(deck_id, status);

ALTER TABLE bracket_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read nudges for own decks"
  ON bracket_nudges FOR SELECT USING (
    deck_id IN (SELECT id FROM decks WHERE user_id = auth.uid())
  );
CREATE POLICY "System can insert nudges"
  ON bracket_nudges FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users can update nudges for own decks"
  ON bracket_nudges FOR UPDATE USING (
    deck_id IN (SELECT id FROM decks WHERE user_id = auth.uid())
  );

-- ── 15. BRACKET_CHANGE_LOG ────────────────────────────────

CREATE TABLE IF NOT EXISTS bracket_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  old_bracket INTEGER NOT NULL,
  new_bracket INTEGER NOT NULL,
  old_aura NUMERIC(6,2) NOT NULL,
  new_aura NUMERIC(6,2) NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('nudge', 'manual')),
  nudge_id UUID REFERENCES bracket_nudges(id),
  chronic_was_cleared BOOLEAN NOT NULL DEFAULT FALSE,
  badge_counts_snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bracket_change_deck ON bracket_change_log(deck_id);

ALTER TABLE bracket_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bracket change history"
  ON bracket_change_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert bracket change log"
  ON bracket_change_log FOR INSERT WITH CHECK (TRUE);

-- ── 16. SCORING_CONFIG ────────────────────────────────────

CREATE TABLE IF NOT EXISTS scoring_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT
);

ALTER TABLE scoring_config ENABLE ROW LEVEL SECURITY;

-- Config is readable by everyone, writable only by service role
CREATE POLICY "Anyone can read config"
  ON scoring_config FOR SELECT USING (TRUE);

-- ── 17. SCORING_CONFIG_LOG ────────────────────────────────

CREATE TABLE IF NOT EXISTS scoring_config_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE scoring_config_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read config log"
  ON scoring_config_log FOR SELECT USING (TRUE);

-- Auto-log config changes
CREATE OR REPLACE FUNCTION log_config_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO scoring_config_log (key, old_value, new_value, changed_by)
  VALUES (NEW.key, OLD.value, NEW.value, auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_config_update
  AFTER UPDATE ON scoring_config
  FOR EACH ROW EXECUTE FUNCTION log_config_change();

-- ── 18. SCRYFALL_CACHE ────────────────────────────────────

CREATE TABLE IF NOT EXISTS scryfall_cache (
  card_name_lower TEXT PRIMARY KEY,
  card_name TEXT NOT NULL,
  art_url TEXT,
  color_identity TEXT,
  is_valid_commander BOOLEAN NOT NULL DEFAULT FALSE,
  scryfall_id TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE scryfall_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scryfall cache"
  ON scryfall_cache FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can insert scryfall cache"
  ON scryfall_cache FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- DEFAULT SCORING CONFIGURATION
-- These are the tunable values the AURA system reads at runtime
-- ============================================================

INSERT INTO scoring_config (key, value, description) VALUES
  ('brilliance_vote_weight', '0.5', 'AURA points per Brilliance vote received'),
  ('flavour_vote_weight', '0.7', 'AURA points per Flavour vote received'),
  ('rivalry_vote_weight', '0.2', 'AURA points per Rivalry vote received'),
  ('allegiance_vote_weight', '0.4', 'AURA points per Allegiance vote received'),
  ('fun_vote_weight', '0.9', 'AURA points per Fun vote received'),
  ('bracket_flag_weight', '-3.0', 'AURA penalty per bracket flag received'),
  ('chronic_archenemy_consecutive', '3', 'Consecutive rivalry brewed badges to trigger chronic status'),
  ('chronic_archenemy_penalty', '-1.5', 'Flat AURA penalty when chronic archenemy'),
  ('pod_size_scaling', '{"2": 3.0, "3": 1.5, "4": 1.0, "5": 0.75}', 'Vote weight multiplier by pod size'),
  ('aura_min', '1', 'Minimum AURA score (floor)'),
  ('aura_max', '100', 'Maximum AURA score (ceiling)'),
  ('aura_default', '50', 'Starting AURA score for new decks'),
  ('tier_boundaries', '{"exiled": 20, "sideboard": 40, "brewed": 60, "beloved": 80, "mythic": 100}', 'AURA tier thresholds'),
  ('developing_min_games', '5', 'Minimum games before showing tier (Developing band)'),
  ('nudge_flag_threshold', '0.5', 'Flag ratio threshold to trigger a bracket nudge'),
  ('nudge_min_games', '5', 'Minimum games at current bracket before nudge evaluation'),
  ('nudge_cooloff_days', '14', 'Days to wait after dismissing a nudge before showing another')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER decks_updated_at
  BEFORE UPDATE ON decks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER pods_updated_at
  BEFORE UPDATE ON pods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER games_updated_at
  BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER game_votes_updated_at
  BEFORE UPDATE ON game_votes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DONE! Your database is ready for the Aura app.
-- ============================================================
