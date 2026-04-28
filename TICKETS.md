

| Kanban | To Do | In Progress | Done |
| :---- | :---- | :---- | :---- |
| **Ticket** |  |  | AF-B01 |
| **Ticket** | AF-B02 |  |  |
| **Ticket** |  |  |  |
| **Ticket** | AF-B03 |  |  |
| **Ticket** | AF-B04 |  |  |
| **Ticket** | AF-B05 |  |  |
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

## AF-B02 · Guest-to-account promotion

**User story:** As a guest who saw my Game Card and wants to keep it, I want to sign up and have everything I did as a guest carry over.

**Acceptance criteria:**

* [ ] A guest can be promoted to a full account in a single flow without re-entering data
* [ ] The guest's commander registrations, votes, game participation, and any earned badges transfer to the new account
* [ ] The promotion is safe to retry — calling it twice produces the same result as calling it once
* [ ] After promotion, the guest record is no longer queryable but is retained for audit

**Blocked by:** AF-B01 ✅ **Enables:** Game Card guest preview flow

---

## AF-B03 · Commander registration

**Acceptance criteria:**

* [ ] A user can register a commander on their account
* [ ] Each registration produces a distinct deck record, even if the commander name is repeated
* [ ] A registration captures the commander's identity, the user who owns it, and a timestamp
* [ ] A user can read all of their own registered commanders; other users cannot see them

**Blocked by:** AF-B01 ✅ **Enables:** AF-B04, AF-B05, AF-B12

---

## AF-B04 · Commander validation against the card database

**Acceptance criteria:**

* [ ] A commander name resolves to a real card in the Scryfall database before registration completes
* [ ] Only cards eligible to be commanders under the rules of the format are accepted
* [ ] Card details (art URL, full name, color identity) are cached locally
* [ ] If Scryfall is unreachable, registration falls back to cached data

**Blocked by:** AF-B03 **Enables:** Commander picker UI

---

## AF-B05 · Bracket declaration

**Acceptance criteria:**

* [ ] Bracket is required at commander registration time and defaults to Bracket 2
* [ ] A bracket is one of five values defined by the official bracket system
* [ ] AURA score is initialised at 50 the moment a bracket is declared
* [ ] The bracket can be changed later (see AF-B21)
* [ ] The system records when the current bracket was set

**Blocked by:** AF-B03 **Enables:** AF-B12, AF-B21

---

## AF-B06 · Pod creation and lifecycle

**Acceptance criteria:**

* [ ] A host can create a pod and receive both a short code and a QR code
* [ ] A pod accepts between 2 and 5 members
* [ ] A pod has a clearly defined state at all times: waiting, active, in questionnaire, completed, or abandoned
* [ ] State transitions are recorded with timestamps
* [ ] A pod that hasn't seen activity in 6 hours is automatically moved to abandoned

**Blocked by:** AF-B03 **Enables:** AF-B07, AF-B09, AF-B11

---

## AF-B07 · Game records

* [ ] Each game is recorded with: unique ID, pod, participating commanders, timestamps, pod size, winner
* [ ] A game progresses through states: active, in questionnaire, completed, or abandoned
* [ ] Game records persist forever
* [ ] Games with fewer than 2 voting players don't produce AURA/badge changes but still produce a record

**Blocked by:** AF-B06 **Enables:** AF-B08, AF-B12, AF-B17
