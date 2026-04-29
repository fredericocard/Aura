

| Kanban | To Do | In Progress | Done |
| :---- | :---- | :---- | :---- |
| **Ticket** |  |  | AF-B01 |
| **Ticket** |  |  | AF-B02 |
| **Ticket** |  |  | AF-B03 |
| **Ticket** |  |  | AF-B04 |
| **Ticket** |  |  | AF-B05 |
| **Ticket** |  |  | AF-B06 |
| **Ticket** |  |  | AF-B07 |
| **Ticket** |  |  | AF-B08 |
| **Ticket** |  |  | AF-B09 |
| **Ticket** |  |  | AF-B10 |
| **Ticket** |  |  | AF-B11 |
| **Ticket** |  |  | AF-B12 |
| **Ticket** |  |  | AF-B13 |
| **Ticket** |  |  | AF-B14 |
| **Ticket** |  |  | AF-B26 |
| **Ticket** |  |  | AF-B18 |
| **Ticket** |  |  | AF-B17 |
| **Ticket** |  |  | AF-B19 |
| **Ticket** |  |  | AF-B20 |
| **Ticket** |  |  | AF-B21 |
| **Ticket** |  |  | AF-B22 |
| **Ticket** |  |  | AF-B23 |
| **Ticket** |  |  | AF-B24 |
| **Ticket** |  |  | AF-B25 |
| **Ticket** |  |  |  |

---

## AF-B01 · User accounts ✅

**Acceptance criteria:**

* [x] A user can sign up with Google SSO or as an email-verified guest
* [x] A guest can later sign in with Google and have their guest history merged into the full account — *promotion logic ready, will activate with game data*
* [x] A user record persists their email, display name, and creation date
* [x] Each user can only read or modify their own profile data
* [x] Guest accounts that are never promoted are retained for 30 days then archived — *cleanup index ready, job is Phase 5*

**What was built:**
- Supabase profiles table with RLS policies
- Auto-create trigger (profile row on sign-up)
- Auth context (useAuth hook for all pages)
- Email sign-up/sign-in wired to Supabase
- Google SSO wired to Supabase OAuth
- Apple SSO — skipped (requires $99/yr Apple Developer account)
- Guest anonymous sign-in ready (signInAsGuest) — activates at Join Pod commander pick
- Logout wired on Profile page
- Guest retention changed from 90 to 30 days

---

## AF-B02 · Guest-to-account promotion ✅

**User story:** As a guest who saw my Game Card and wants to keep it, I want to sign up and have everything I did as a guest carry over.

**Acceptance criteria:**

* [x] A guest can be promoted to a full account in a single flow without re-entering data
* [x] The guest's commander registrations, votes, game participation, and any earned badges transfer to the new account — *Supabase updateUser keeps same user ID, no data migration needed*
* [x] The promotion is safe to retry — calling it twice produces the same result as calling it once
* [x] After promotion, the guest record is no longer queryable but is retained for audit — *profile row updated to account_type="full"*

**What was built:**
- GuestPromotionOverlay on review page (sign-up gate before Game Card)
- promoteGuest() — email/password promotion via supabase.auth.updateUser()
- promoteGuestWithGoogle() — Google SSO via supabase.auth.linkIdentity()
- Profile row auto-updates to account_type="full" on promotion
- Skip option lets guests view Game Card without signing up
- Overlay triggers for all non-logged-in users (guest or no session)

**Blocked by:** AF-B01 ✅ **Enables:** Game Card guest preview flow

---

## AF-B03 · Commander registration ✅

**Acceptance criteria:**

* [x] A user can register a commander on their account
* [x] Each registration produces a distinct deck record, even if the commander name is repeated
* [x] A registration captures the commander's identity, the user who owns it, and a timestamp
* [x] A user can read all of their own registered commanders; other users cannot see them

**What was built:**
- Supabase decks table with RLS policies (select/insert/update/delete own only)
- lib/commanders.ts — registerCommander(), getMyCommanders(), deleteCommander()
- Decks page wired to real Supabase data (no more hardcoded sample decks)
- Scryfall search popup registers to database with art URL + color identity

**Blocked by:** AF-B01 ✅ **Enables:** AF-B04, AF-B05, AF-B12

---

## AF-B04 · Commander validation against the card database ✅

**Acceptance criteria:**

* [x] A commander name resolves to a real card in the Scryfall database before registration completes
* [x] Only cards eligible to be commanders under the rules of the format are accepted
* [x] Card details (art URL, full name, color identity) are cached locally
* [x] If Scryfall is unreachable, registration falls back to cached data

**What was built:**
- Supabase scryfall_cache table (public read, authenticated write)
- lib/scryfall.ts — validateCommander(), searchCommanders(), checkCommanderEligibility()
- Cache-first lookup with 7-day freshness window
- Fallback to stale cache if Scryfall is unreachable
- Canonical Scryfall name stored (not user input)
- Commander eligibility check: legendary creature OR "can be your commander" oracle text

**Blocked by:** AF-B03 ✅ **Enables:** Commander picker UI

---

## AF-B05 · Bracket declaration ✅

**Acceptance criteria:**

* [x] Bracket is required at commander registration time and defaults to Bracket 2
* [x] A bracket is one of five values defined by the official bracket system
* [x] AURA score is initialised at 50 the moment a bracket is declared
* [x] The bracket can be changed later (see AF-B21) — *updateBracket() ready*
* [x] The system records when the current bracket was set

**What was built:**
- SQL migration: bracket defaults to 2, constrained 1–5, trigger auto-sets bracket_set_at
- Bracket picker overlay UI on Decks page (two-step flow: pick commander → pick bracket)
- BRACKETS array with labels and descriptions for all 5 values
- updateBracket() function ready for AF-B21
- Backfill of existing null-bracket decks to 2

**Blocked by:** AF-B03 ✅ **Enables:** AF-B12, AF-B21

---

## AF-B06 · Pod creation and lifecycle ✅

**Acceptance criteria:**

* [x] A host can create a pod and receive both a short code and a QR code
* [x] A pod accepts between 2 and 5 members
* [x] A pod has a clearly defined state at all times: waiting, active, in questionnaire, completed, or abandoned
* [x] State transitions are recorded with timestamps
* [x] A pod that hasn't seen activity in 6 hours is automatically moved to abandoned — *cleanup index ready, job is Phase 5*

**What was built:**
- Supabase pods, pod_members, pod_state_log tables with RLS policies
- handle_pod_state_change() trigger auto-logs transitions with timestamps
- lib/pods.ts — createPod(), joinPod(), updatePodState(), submitReview(), getPod(), getMyPods()
- 6-char short code generation (no ambiguous chars)
- QR code URL via Google Charts API
- Auto-complete pod when all members submit reviews
- Capacity validation (2–5 members), duplicate join prevention

**Blocked by:** AF-B03 ✅ **Enables:** AF-B07, AF-B09, AF-B11

---

## AF-B07 · Game records ✅

* [x] Each game is recorded with: unique ID, pod, participating commanders, timestamps, pod size, winner
* [x] A game progresses through states: active, in questionnaire, completed, or abandoned
* [x] Game records persist forever — on delete restrict prevents game/pod deletion
* [x] Games with fewer than 2 voting players don't produce AURA/badge changes but still produce a record

**What was built:**
- Supabase games and game_players tables with RLS policies
- Games linked to pods (on delete restrict — games never deleted)
- lib/games.ts — createGame(), declareWinner(), finalizeGame(), updateGameState()
- Game creation snapshots pod members as game_players
- produces_score_changes = false when < 2 voters
- getGamesForDeck(), getMyGames() for history views

**Blocked by:** AF-B06 ✅ **Enables:** AF-B08, AF-B12, AF-B17

---

## AF-B08 · End-of-game questionnaire trigger ✅

* [x] Life totals tracked per player (default 40 for Commander)
* [x] Player eliminated at 0 life or 10+ poison → gets review access
* [x] Last player standing is winner → gets review access, game moves to in_questionnaire
* [x] Draw scenario (all eliminated) → all can review
* [x] Revive mechanic: self-only, sets life to 1, resets review
* [x] Revive blocked after player clicks Accept Review (personal lock)
* [x] Concede button for manual elimination

**What was built:**
- SQL migration adds life_total, poison_counters, experience_counters, energy_counters, is_eliminated, eliminated_at, can_review to game_players
- lib/game-triggers.ts — organic elimination flow:
  - updateLifeTotal(), updatePoisonCounters(), updateExperienceCounters(), updateEnergyCounters()
  - eliminatePlayer() / revivePlayer() (private helpers)
  - checkLastStanding() — auto-detects winner, draw, or ongoing game
  - concedeGame(), reviveSelf() (with personal review lock), canPlayerReview(), getGamePlayerStates()

**Blocked by:** AF-B07 ✅ **Enables:** AF-B09, AF-B12

---

## AF-B09 · Vote capture for the six post-game questions ✅

**Acceptance criteria:**

* [x] Each vote captures: the game it belongs to, the voter, the question, the commander(s) voted for, and a timestamp
* [x] Single-select questions (q1–q4, allegiance) accept exactly one vote per voter per question
* [x] Allegiance is single-select and cannot vote for yourself
* [x] Bracket Check records either a "no flag" answer or one or more flagged commanders
* [x] Votes are mutable until BOTH a winner is declared AND the voter clicks Accept Review
* [x] Once locked, votes cannot be changed or deleted

**What was built:**
- SQL migration: game_votes table with partial unique indexes (single-select vs bracket_check)
- RLS: voters insert/update/delete own votes, all participants read all votes
- lib/votes.ts:
  - castVote() — upsert single-select, checks immutability (winner + review_submitted_at)
  - castBracketCheck() — replaces all bracket flags (no-flag or list of deck IDs)
  - clearVote() — undo a single-select pick
  - getMyVotes(), getGameVotes(), getVoteSummary()
  - isVoteLocked() — checks winner_player_id + review_submitted_at

**Blocked by:** AF-B07 ✅, AF-B08 ✅ **Enables:** AF-B12, AF-B13, AF-B17

---

## AF-B10 · Pod-level questionnaire completion tracking ✅

**Acceptance criteria:**

* [x] The system tracks each player's questionnaire status: in_progress, completed, or auto_completed
* [x] A pod-level summary is queryable: completed, in_progress, auto_completed counts + time remaining
* [x] When all players reach completed or auto_completed, the pod transitions to completed and Game Card locks
* [x] Players who haven't accepted within 30 minutes of the winner being declared are auto-completed
* [x] Auto-completed players: single-select questions skipped, bracket check set to "no flag"

**What was built:**
- SQL migration: adds auto_completed boolean to pod_members
- lib/questionnaire.ts:
  - getQuestionnaireStatus() — per-player status with review details
  - getPodCompletionSummary() — counts + minutes remaining on 30-min timer
  - autoCompleteExpiredReviews() — fills bracket default, marks review submitted
  - checkPodCompletion() — transitions pod + game to completed when all done
  - isGameCardLocked() — true when game state = completed
  - getReviewTimeRemaining() — minutes left on timer

**Blocked by:** AF-B08 ✅, AF-B09 ✅ **Enables:** AF-B17, AF-B22

---

## AF-B11 · Interim acknowledgement for early finishers ✅

**Acceptance criteria:**

* [x] Game Card text area shows interim status message while reviews are in progress
* [x] Message includes completion count ("3 of 4 reviews in")
* [x] Player can see their own vote recap on the interim card
* [x] Once pod completes, interim text is replaced by the commander story/review
* [x] Game Card is marked as locked (immutable) only after pod completion

**What was built:**
- No SQL migration needed — uses existing game/pod state
- lib/card-status.ts:
  - getCardStatus() — returns phase (reviewing / waiting_for_others / complete) + message + counts
  - getCardTextContent() — interim text with progress, or null when complete (UI shows story)
  - getMyVoteRecap() — player's own votes with commander names for display
  - Three phases: reviewing → waiting_for_others → complete

**Blocked by:** AF-B10 ✅ **Enables:** Interim feedback flow

---

## AF-B12 · Per-game vote tally ✅

**Acceptance criteria:**

* [x] For each single-select question, tally returns vote counts per commander ordered by votes received
* [x] For Bracket Check, tally returns "consensus honoured" or list of flagged commanders with flag counts
* [x] Ties surfaced explicitly (tied commanders share the same rank, is_tied=true)
* [x] Tally is deterministic — alphabetical tiebreak for stable ordering
* [x] Tally is read-only — does not modify any state

**What was built:**
- No SQL migration needed — pure computation over game_votes
- lib/vote-tally.ts:
  - computeGameTally() — full results for all 6 questions with ranks, ties, commander names
  - getQuestionWinner() — single question winner (null on tie)
  - getAllWinners() — map of all winners for Game Card composition
  - BracketCheckResult with consensus_honoured flag + per-commander flag counts

**Blocked by:** AF-B09 ✅ **Enables:** AF-B13, AF-B14, AF-B17

---

## AF-B13 · Badge attribution + archetype system ✅

**Acceptance criteria:**

* [x] Every player gets exactly one brewed badge (most voted category) per game
* [x] Players with 0 votes get brewed_badge='none' and archetype 'The Unknown'
* [x] Archetype determined by combination of all badges received (31 total archetypes)
* [x] No two players in the same game receive the same archetype (collision resolved by dropping weakest badge)
* [x] Attribution is deterministic — alphabetical tiebreaks throughout
* [x] Bracket Check never used for badge attribution
* [x] Attributions saved to badge_attributions table for audit

**What was built:**
- SQL migration: renames question keys (q1→fun, q2→rivalry, q3→brilliance, q4→flavor), creates badge_attributions table with RLS
- Updated lib/votes.ts and lib/vote-tally.ts with real badge names
- lib/badge-attribution.ts:
  - ARCHETYPE_MAP — all 31 combinations mapped to names (The Mastermind, The Living Legend, etc.)
  - computeBadgeAttribution() — vote counting, brewed badge, archetype with collision resolution
  - saveGameBadgeAttributions() — idempotent save to database
  - getGameBadgeAttributions(), getPlayerAttribution(), getPlayerArchetypeHistory()

**Blocked by:** AF-B12 ✅ **Enables:** AF-B14, AF-B22

---

## AF-B14 · Badge count persistence ✅

**Acceptance criteria:**

* [x] Two layers tracked: badge VOTES received (for AURA) and brewed BADGE earned (for accomplishments)
* [x] Badge votes = cumulative count of every vote a commander received per category across all games
* [x] Brewed badge = the single badge the player won (most voted category, random tiebreak)
* [x] Both counts never decrease — append-only
* [x] Both persist across bracket changes
* [x] Bracket at time recorded in both history tables

**What was built:**
- SQL migration: adds votes_fun/etc (vote totals) + badge_fun/etc (badge wins) to decks, creates badge_vote_history + badge_history tables
- Updated lib/badge-attribution.ts: random tiebreak for brewed badge when tied
- lib/badge-counts.ts:
  - recordBadgeVotes() — records per-category votes + increments cumulative totals on deck
  - recordBrewedBadge() — records winning badge + increments badge count
  - processGameBadges() — processes both layers for all players in a game
  - getDeckVoteCounts() — cumulative vote totals (for AURA)
  - getDeckBadgeCounts() — brewed badge wins (for accomplishments)
  - getDeckVotesByBracket() — vote breakdown by bracket

**Blocked by:** AF-B13 ✅ **Enables:** AF-B22, AF-B24

---

## AF-B26 · Scoring configuration ✅

**Acceptance criteria:**

* [x] All scoring values stored in configuration, not in code
* [x] Per-vote weights: brilliance +0.5, flavour +0.7, rivalry +0.2, allegiance +0.4, fun +0.9, bracket flag −3.0
* [x] Tier boundaries: Exiled ≤20, Sideboard ≤40, Brewed ≤60, Beloved ≤80, Mythic ≤100
* [x] Chronic archenemy: 3 consecutive rivalry badges → −1.5 AURA penalty
* [x] Pod size scaling: 2→×3.0, 3→×1.5, 4→×1.0, 5→×0.75
* [x] Changes apply only to future games — historical games never recomputed
* [x] Configuration changes are auditable (scoring_config_log with trigger)
* [x] Only admin users can modify configuration (is_admin RLS check)

**What was built:**
- SQL migration 013: scoring_config + scoring_config_log tables, audit trigger, is_admin on profiles
- All defaults seeded from design spec image
- lib/scoring-config.ts:
  - getScoringWeights() — per-badge vote weights
  - getChronicConfig() — consecutive games + penalty
  - getPodSizeScaling(), getAuraRange(), getTierBoundaries()
  - updateConfigValue() — admin-only writer
  - getConfigHistory(), getFullConfigHistory() — audit trail

**Blocked by:** — **Enables:** AF-B17, AF-B19, AF-B20

---

## AF-B18 · Chronic archenemy detection ✅

**Acceptance criteria:**

* [x] A commander becomes chronic after earning the rivalry brewed badge in 3 consecutive games
* [x] Status re-evaluated after every game; commanders can enter and exit chronic state
* [x] When chronic, a flat −1.5 AURA penalty is applied to the delta
* [x] The chronic flag is internal — not displayed to the user
* [x] Consecutive streak breaks when a different badge is brewed

**What was built:**
- SQL migration 014: adds is_chronic_archenemy + chronic_updated_at to decks
- lib/chronic-archenemy.ts:
  - evaluateChronicStatus() — checks last N brewed badges from badge_history
  - updateChronicStatus() — persists flag on deck
  - isChronicArchenemy() — quick read of persisted flag
  - updateChronicStatusForGame() — batch update all commanders in a game

**Blocked by:** AF-B12 ✅ **Enables:** AF-B17, AF-B20

---

## AF-B17 · AURA delta computation ✅

**Acceptance criteria:**

* [x] For each commander in a completed game, AURA delta computed from tally and applied
* [x] Per-vote weights read from scoring_config (not hardcoded)
* [x] Pod size scaling applied: 2-player and 5-player produce comparable max movement
* [x] Bracket Check flag carries much larger negative weight (−3.0 vs max +0.9 positive)
* [x] AURA clamped to range 1–100 after each update
* [x] One game produces exactly one update per commander, applied atomically (idempotent)
* [x] Full delta history recorded in aura_history for audit and trend visualisation

**What was built:**
- SQL migration 014: aura_history table with full breakdown columns + RLS
- lib/aura-scoring.ts:
  - computeGameAura() — compute deltas without persisting (preview)
  - applyGameAura() — compute + persist atomically (idempotent)
  - getAuraHistory() — per-deck trend data
  - getGameAuraHistory() — all deltas for one game
  - getAuraScore() — current score reader

**Blocked by:** AF-B12 ✅, AF-B18 ✅, AF-B26 ✅ **Enables:** AF-B19, AF-B22

---

## AF-B19 · AURA tier classification ✅

**Acceptance criteria:**

* [x] AURA score maps to exactly one of five tiers: Exiled, Sideboard, Brewed, Beloved, Mythic
* [x] Tier boundaries configurable via scoring_config
* [x] Tier computed on demand from current score — no separate tier field
* [x] Commander with < 5 completed games shown as "Developing" (threshold configurable)

**What was built:**
- No SQL migration needed — pure computation from score + config
- lib/aura-tiers.ts:
  - computeTier() — pure function: score + boundaries → tier name
  - getDeckTier() — full tier info with games count and developing check
  - getDeckTiers() — batch lookup for deck collection view
  - getTierFromScore() — when you already have score + games in memory
  - TIER_INFO — labels and descriptions for UI display
  - getTierRange() — min/max score range for each tier

**Blocked by:** AF-B17 ✅, AF-B26 ✅ **Enables:** AF-B22

---

## AF-B20 · Bracket change nudge (in-app) ✅

**Acceptance criteria:**

* [x] After min games played, system evaluates whether bracket flags exceed configurable proportion (default 50%)
* [x] If triggered, nudge suggests the next bracket up (never down)
* [x] Nudge shown to player at most once per session (getPendingNudge / getUserPendingNudges)
* [x] Dismissed nudge respects cooloff period (configurable games before re-evaluation)
* [x] Never suggests moving down a bracket
* [x] Already at bracket 5 → no nudge possible

**What was built:**
- SQL migration 015: bracket_nudges table with status tracking + RLS
- Config keys: bracket_nudge_min_games (5), bracket_nudge_flag_ratio (0.5), bracket_nudge_cooloff_games (5)
- lib/bracket-nudge.ts:
  - evaluateNudge() — checks flag ratio, cooloff, max bracket
  - createNudgeIfWarranted() — evaluate + create in one call (post-game hook)
  - getPendingNudge() — single deck pending nudge for UI
  - getUserPendingNudges() — all pending nudges for user (app open)
  - dismissNudge() — dismiss with cooloff period
  - getNudgeHistory() — full audit trail per deck

**Blocked by:** AF-B12 ✅, AF-B18 ✅ **Enables:** AF-B21

---

## AF-B21 · Bracket change handler ✅

**Acceptance criteria:**

* [x] Bracket change triggered by accepting a nudge or manual action on deck profile
* [x] On change: AURA resets to 50
* [x] Chronic archenemy status cleared
* [x] All earned badge counts preserved unchanged (snapshot in log)
* [x] Confirmation summary returned explaining what was reset and kept
* [x] Bracket changes logged for audit (bracket_change_log)

**What was built:**
- SQL migration 015: bracket_change_log table with full snapshot + RLS
- lib/bracket-change.ts:
  - changeBracket() — core handler: update bracket, reset AURA, clear chronic, preserve badges, log
  - acceptNudge() — one-tap nudge acceptance
  - manualBracketChange() — player-initiated from deck profile
  - getConfirmationSummary() — human-readable reset summary for UI
  - getBracketChangeHistory() — audit trail per deck

**Blocked by:** AF-B17 ✅, AF-B20 ✅ **Enables:** Manual bracket change UI

---

## AF-B22 · Game Card composition ✅

**Acceptance criteria:**

* [x] Game Card composed once pod reaches completed state (all questionnaires done)
* [x] Each commander displays art + nickname (archetype from B13)
* [x] "In this chapter" narrative sentence generated from tally (template-based)
* [x] Card includes date, winner, key votes (Brilliance, Flavour, Archenemy, Allegiance, Fan Favourite)
* [x] Explicitly does NOT include linear placements (1st/2nd/3rd) or AURA score changes
* [x] Card metadata stored against game record (game_cards table)
* [x] Allegiance relationships + bracket check consensus included

**What was built:**
- SQL migration 016: game_cards table + game_card_players link table with RLS
- lib/game-card.ts:
  - composeGameCard() — assembles all data from votes, tally, badges, archetypes
  - composeNarrative() — template-based "in this chapter" from winner/archenemy/flavour/fun
  - createGameCard() — compose + save (idempotent)
  - getGameCard(), getCardByShareCode() — single card retrieval
  - getCardsForDeck() — deck profile history
  - getCardsForUser() — user game log

**Blocked by:** AF-B10 ✅, AF-B12 ✅, AF-B13 ✅ **Enables:** AF-B23, AF-B24, AF-B25

---

## AF-B23 · Game Card storage ✅

**Acceptance criteria:**

* [x] Every generated Game Card persisted with stable, retrievable URL
* [x] Cards are never automatically deleted (on delete restrict)
* [x] Each card linked to game record + participating players (game_card_players)
* [x] Card images accessible via short URLs (8-char share_code, public RLS policy)
* [x] Image URL field ready for Supabase Storage integration

**What was built:**
- SQL migration 016 (shared with B22): share_code, image_url, image_generated_at columns
- Public RLS policy: anyone can read cards with a share_code
- lib/game-card.ts:
  - setCardImage() — update card with generated image URL
  - getCardByShareCode() — public access via short code
  - getShareUrl() — construct share link from code
  - 8-char share code generation (no ambiguous chars)

**Blocked by:** AF-B22 ✅ **Enables:** AF-B24, AF-B25

---

## AF-B24 · Commander profile aggregation ✅

**Acceptance criteria:**

* [x] Single endpoint returns: AURA, tier, confidence band (Developing/Tracking/Stable), every badge with earned count, total games, recent Game Cards
* [x] "Developing" shown for < 5 games, "Tracking" for 5–14, "Stable" for 15+
* [x] Each badge count broken down by bracket at which it was earned
* [x] Endpoint designed for speed — parallel queries, minimal round trips
* [x] Data always consistent — reads from same source of truth

**What was built:**
- No SQL migration needed — pure aggregation over existing tables
- lib/commander-profile.ts:
  - getCommanderProfile() — full profile: AURA, tier, confidence, 5 badges with counts + bracket breakdown, AURA trend (last 10), recent cards (last 5)
  - getUserCommanderSummaries() — lightweight list view for all user's commanders
  - ConfidenceBand type: Developing / Tracking / Stable

**Blocked by:** AF-B07 ✅, AF-B14 ✅, AF-B19 ✅, AF-B23 ✅ **Enables:** Deck profile UI

---

## AF-B25 · Game log aggregation ✅

**Acceptance criteria:**

* [x] Endpoint returns games in reverse chronological order, paginated (default 20/page)
* [x] Each entry: date, pod composition, player's commander, winner, Game Card link
* [x] Filterable by specific commander (deckId filter)
* [x] Efficient for large histories — batch queries, indexed lookups
* [x] Includes quick player stats (total games, wins, win rate, unique commanders)

**What was built:**
- No SQL migration needed — pure aggregation
- lib/game-log.ts:
  - getGameLog() — paginated, filterable, with pod composition + card links
  - getPlayerStats() — quick stats: totalGames, totalWins, winRate, uniqueCommanders, totalCards
  - GameLogPage type with hasMore for infinite scroll

**Blocked by:** AF-B07 ✅, AF-B22 ✅ **Enables:** Game log UI
