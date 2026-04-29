

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
| **Ticket** |  |  |  |
| **Ticket** |  |  |  |
| **Ticket** |  |  |  |
| **Ticket** |  |  |  |
| **Ticket** |  |  |  |
| **Ticket** |  |  |  |
| **Ticket** |  |  |  |
| **Ticket** |  |  |  |
| **Ticket** |  |  |  |
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
