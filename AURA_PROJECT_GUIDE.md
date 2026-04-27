# Aura — Project Guide

> Read this file at the start of every working session. It is the single source of truth for what Aura is, how the project is organized, and how the workflow operates.
>
> Owner: Frederico
> Created: 2026-04-25

---

## 1. What is Aura

Aura is a mobile app for Magic: The Gathering Commander players. After a game ends, the pod (group of players) opens Aura and does a short post-game review together: voting on who made the smartest play, who brought the most flavor, who was the archenemy, and so on. Each player earns trait badges across five categories (Brilliance, Flavour, Rivalry, Allegiance, Fun) and the app generates a Memory Card — a keepsake record of that game.

Aura is not a life counter, not a deck builder, not a tournament tracker. It is specifically about the social ceremony of reviewing a game and keeping a record of it.

---

## 2. Aura is the rebrand of PodHub

PodHub was the original name and prototype. All the logic, wireframes, and specifications were built under PodHub. Aura is the rebrand — same app, new identity, new design system.

**The rule is simple:**

- **Aura folder** = the clean, current project. Everything here is active and up to date. No legacy mess, no old styles, no experiments.
- **PodHub folder** = the legacy archive. It holds the original prototype, the old wireframes, the build specs, and the logic documents. We do not edit PodHub files. We only go there to pull something into Aura when Aura genuinely needs it (like a logic doc to feed Claude Design).

Never mix the two. Never dump PodHub files into Aura without purpose. If a PodHub asset is needed, bring only what is needed and adapt it to the Aura design system.

---

## 3. Design system

Aura has its own complete design system, built from scratch with Claude Design. It lives in `design_system/` and is the source of truth for every visual decision.

**Three words that define the design:** Warm, Earned, Quiet.

- Parchment backgrounds, warm ink text, never pure white or pure black
- Forest green (#2F5D3A) for actions, copper (#B06B2C) for accents, gold (#C99B2F) for keepsakes
- Young Serif for ceremony, Instrument Sans for everything else
- Five trait colors that never change: Gold (Brilliance), Plum (Flavour), Crimson (Rivalry), Teal (Allegiance), Coral (Fun)

The full specification is in `design_system/STYLE_GUIDE.md`. Read it before designing anything.

---

## 4. The wireframe workflow

We are building 13 wireframes. Each one goes through this pipeline:

### Step 1 — Logic document (Cowork builds this)

I (Claude in Cowork) write a layout/logic document for the wireframe. It describes the structure, content, data, and interactions — but has zero design, zero colors, zero styling. Pure logic. These live as `.docx` files in `PodHub/build-specs (cowork to claude design)/`.

### Step 2 — Claude Design refines it

Frederico opens a Claude Design chat, pastes the standard prompt (see `design_system/CLAUDE_DESIGN_PROMPT.md`), feeds the design system files, then feeds the logic doc. Claude Design produces a fully styled wireframe as one or more output files.

### Step 3 — Cowork converts to JSX

Frederico brings the Claude Design output files back here. I convert them into a single `.tsx` page file, wire it into the Next.js app under `app/[wireframe-name]/page.tsx`, and we test it live on localhost.

### Step 4 — Iterate and approve

We test on browser and phone, make adjustments, and when it's approved the wireframe stays in its route folder.

---

## 5. Current wireframe status

| # | Wireframe | Logic doc | Claude Design | Next.js route | Status |
|---|-----------|-----------|---------------|---------------|--------|
| 01 | Landing | n/a | Done | `app/landing/` | Live |
| 02 | How to Play | `02-how-to-play.docx` | Not started | `app/howtoplay/` | Live (interim) |
| 03 | Create Pod | `03-create-pod.docx` | Not started | `app/create/` | Live (interim) |
| 04 | Join Pod | `04-join-pod.docx` | Not started | `app/join/` | Live (interim) |
| 05a | Grid View 2P | `05-grid-view.docx` | Not started | `app/gridview-2p/` | Live (interim) |
| 05b | Grid View 3P | `05-grid-view.docx` | Not started | `app/gridview-3p/` | Live (interim) |
| 05c | Grid View 4P | `05-grid-view.docx` | Not started | `app/gridview-4p/` | Live (interim) |
| 05d | Grid View 5P | `05-grid-view.docx` | Not started | `app/gridview-5p/` | Live (interim) |
| 06 | Single View | `06-single-view.docx` | Not started | `app/singleview/` | Live (interim) |
| 07 | Game Review | `07-game-review.docx` | Done | `app/review/` | Live |
| 08 | Profile | `09-profile.docx` | Not started | `app/profile/` | Live (interim) |
| 09 | Decks | `10-decks.docx` | Not started | `app/decks/` | Live (interim) |
| 10 | Deck Accomplishments | `11-deck-accomplishments.docx` | Not started | `app/deck-accomplishments/` | Live (interim) |
| 11 | Edit Deck | `12-edit-deck.docx` | Not started | `app/edit-deck/` | Live (interim) |
| 12 | Recent Games | `13-recent-games.docx` | Not started | `app/recent-games/` | Live (interim) |

> **Note:** Game Summary is not a separate page — it's a popup within Game Review. "Live (interim)" means the screen is converted from the HTML wireframe prototype but has not yet been polished by Claude Design.

---

## 6. Folder structure (Aura)

```
Aura/
  AURA_PROJECT_GUIDE.md        ← this file
  README.md                     ← repo readme + structure guide
  CLAUDE.md                     ← Claude Code instructions
  AGENTS.md                     ← agent behavior rules

  app/                          ← Next.js App Router (all screens)
    layout.tsx                  ← root layout
    globals.css                 ← global styles, font imports
    page.tsx                    ← home: wireframe directory
    placeholder.tsx             ← shared placeholder for unfinished screens
    favicon.ico
    landing/page.tsx            ← 01 Landing (live)
    howtoplay/page.tsx          ← 02 How to Play (live interim)
    create/page.tsx             ← 03 Create a Pod (live interim)
    join/page.tsx               ← 04 Join a Pod (live interim)
    gridview-2p/page.tsx        ← 05a Grid View 2P (live interim)
    gridview-3p/page.tsx        ← 05b Grid View 3P (live interim)
    gridview-4p/page.tsx        ← 05c Grid View 4P (live interim)
    gridview-5p/page.tsx        ← 05d Grid View 5P (live interim)
    singleview/page.tsx         ← 06 Single View (live interim)
    review/page.tsx             ← 07 Game Review (live)
    profile/page.tsx            ← 08 Profile (live interim)
    decks/page.tsx              ← 09 Decks (live interim)
    deck-accomplishments/page.tsx ← 10 Deck Accomplishments (live interim)
    edit-deck/page.tsx          ← 11 Edit Deck (live interim)
    recent-games/page.tsx       ← 12 Recent Games (live interim)

  design_system/                ← design language (read-only reference)
    STYLE_GUIDE.md              ← full design specification
    WIREFRAME_TRANSLATION.md    ← how to translate wireframes
    CLAUDE_DESIGN_PROMPT.md     ← prompt template for Claude Design
    README.md                   ← design system overview
    tokens/colors_and_type.css  ← CSS variables
    components/                 ← reference JSX components (not imported by app)
    assets/                     ← source design assets
      glyphs/                   ← trait badge PNGs
      commanders/               ← sample commander art

  public/assets/                ← static assets served by Next.js
    commanders/                 ← commander art (referenced as /assets/commanders/)
    glyphs/                     ← badge icons (referenced as /assets/glyphs/)

  [config files]                ← next.config.ts, tsconfig.json, eslint, postcss, etc.
```

---

## 7. File hygiene rules

These are standing rules. I follow them every session without being asked.

1. **Aura folder stays clean.** No scratch files, no experiments, no duplicates. If I need to experiment, I use the session scratchpad (`/sessions/hopeful-modest-pasteur/`), not the Aura folder.

2. **No versioned copies.** Never create `page-v2.tsx` or `landing-backup.tsx`. Edit in place. Git handles history.

3. **One wireframe = one route folder.** Each wireframe lives at `app/[name]/page.tsx`. All components for that wireframe are inline in the single file until we refactor later.

4. **PodHub stays separate.** I do not copy PodHub files into Aura unless Frederico asks or the wireframe pipeline requires it (like pulling a logic doc). Even then, the file is adapted to Aura's style, not pasted raw.

5. **Design system is read-only during wireframe work.** The files in `design_system/` are reference material. I do not modify them unless we are explicitly updating the design system itself.

6. **Update this guide** whenever a wireframe moves to a new status, a new file is added, or the workflow changes.

---

## 8. What lives where (quick reference)

| Need this? | Go here |
|---|---|
| Design tokens, colors, fonts | `design_system/STYLE_GUIDE.md` + `tokens/colors_and_type.css` |
| Component references | `design_system/components/` |
| Logic docs for wireframes | `PodHub/build-specs (cowork to claude design)/` |
| Old HTML wireframes (reference) | `PodHub/test-wireframes/` |
| Active Next.js wireframes | `Aura/app/[name]/page.tsx` |
| Claude Design prompt template | `design_system/CLAUDE_DESIGN_PROMPT.md` |
| Original prototype (frozen) | `PodHub/podhub-app.jsx` |

---

## 9. The big picture — how the app works end to end

This is the full user journey across all 13 screens. When working deep in a single wireframe, come back here to remember how it fits.

### The entry

The user opens Aura and sees the **Landing** screen — the splash animation plays, then the app settles into the main landing with two primary actions: Create a Pod or Join a Pod. There is also a login sheet (SSO/email/sign-up) that gates access, and a "How to Play" link for first-timers.

**How to Play** is a quick intro to Aura — a few cards covering what the app is (a post-game review tool, not a life counter), how pods work, the review ceremony, and how your Aura reputation grows. Takes 10 seconds to scan. The user taps "Ready to Play" and goes back to Landing.

### Starting a game

**Create Pod:** The host names the pod, picks how many players (2–5), selects their deck, and generates a QR code. Other players scan this code to join.

**Join Pod:** The player scans the QR code or enters a pod code manually. Once joined, they land in the game.

### Playing the game (two views of the same thing)

**Grid View:** All players shown as tiles arranged like a real table. Each tile shows life total and commander art. Tiles rotate to face each player — the phone sits in the middle of the table and everyone can read their own tile. Supports 2, 3, 4, and 5 player layouts. This is the communal view.

**Single View:** Your personal dashboard. Your life total is front and center (big number, tap +/- to adjust). Opponents are listed below with their life totals. This is the individual view.

Both views track the same game. Players can switch between them freely via the in-game nav bar. Both views have access to the same modals: Dice Roller (D6/D20/coin) and Counters Sheet (poison/experience/energy). Single View also has a Choose Commander popup (for players joining without login) and a Choose Deck popup (for logged-in players picking from their saved decks).

### Ending the game and reviewing

When your life hits 0, two things happen: a "Revive" button appears (lets you reset to 40 if needed), and a "+ Review" button appears. You can start your review as soon as you die — you do not have to wait for the game to end. You can also go back and edit your answers until a winner is declared. Once there is a winner, all reviews lock and cannot be changed.

Tapping "+ Review" opens the **Game Review** — the heart of the app.

**Game Review:** Six quick peer-voting questions, one per trait category. Each question asks the player to pick who earned that badge (e.g., "Who took the flavour win?" or "Did any deck play above its bracket?"). Players answer by tapping a player's name. After all six are answered, a green "Review complete" confirmation appears, and the player taps "Accept Review."

After accepting, the **Memory Card** is revealed with a ceremonial animation — this is the keepsake. It shows the game date, all players with their commanders, and which badges each player earned. It looks like a sealed wax card you'd want to keep.

### After the game

**Game Summary:** Shows the Memory Card inline, lets the player claim their badges, and provides share/save actions. From here, the player can go to their Profile.

**Profile:** The user's home base. Shows their name, avatar, aura score (reputation built from badges over time), stats overview, and their decks. Has shortcuts to Create Pod and Join Pod for starting a new game. This is where the bottom navigation bar appears.

### The bottom nav world (4 screens)

Once the player reaches Profile, they have a persistent bottom nav with three tabs: Recent Games, Profile, and Decks.

**Decks:** Library of all saved decks. Each deck shows the commander art, deck name, and color identity. Tap to drill into a deck.

**Deck Accomplishments:** The detail page for one deck — its aura rating, win rate, games played, and all badges earned with that deck. Think of it as the deck's own profile card. Has an Edit button.

**Edit Deck:** Manage the deck name, commander, card list. Supports importing from Archidekt (paste URL, auto-parse).

**Recent Games:** Timeline of past games. Each entry shows the date, players, who won, and badges. Tapping a game opens a popup with the Memory Card from that session.

### The loop

The whole app is a loop: play a game → review it → earn badges → check your profile → play another game. The aura score grows over time as players accumulate badges across many games. The Memory Cards are the collectible record of every session.

---

## 10. Screen and modal inventory

### 13 screens

| # | Screen | Purpose |
|---|--------|---------|
| 01 | Landing | Entry point, Create/Join Pod, login |
| 02 | How to Play | Tutorial for new users |
| 03 | Create Pod | Set up a new game session |
| 04 | Join Pod | Scan QR or enter code to join |
| 05 | Grid View | All players as tiles on a shared table |
| 06 | Single View | Personal life counter + opponents list |
| 07 | Game Review | Post-game peer voting (6 questions) |
| 08 | Game Summary | Memory Card reveal + badge claiming |
| 09 | Profile | User home base, stats, aura score |
| 10 | Decks | Deck library |
| 11 | Deck Accomplishments | Per-deck stats and badges |
| 12 | Edit Deck | Create/edit deck, import from Archidekt |
| 13 | Recent Games | Game history timeline |

### 9 modals/overlays

| # | Modal | Lives in | Purpose |
|---|-------|----------|---------|
| M1 | Login Sheet | Landing | SSO + email + sign-up |
| M2 | QR Code | Create Pod | Share pod code |
| M3 | QR Code (per tile) | Grid View | Player joins simulation |
| M4 | Choose Commander | Single View | Pick commander when joining without login |
| M5 | Dice Roller | Single/Grid View | D6, D20, coin flip |
| M6 | Counters Sheet | Single/Grid View | Poison, experience, energy |
| M7 | Choose Deck | Single View | Pick deck from saved decks when logged in |
| M8 | Login Popup | Game Review | Gate before accepting review |
| M9 | Game View Popup | Recent Games | Past game Memory Card |

### Navigation flow

```
Landing → Create Pod → Grid View → (play game) → Game Review → Game Summary → Profile
Landing → Join Pod → Single View → (play game) → Game Review → Game Summary → Profile
Profile ↔ Decks ↔ Deck Accomplishments ↔ Edit Deck
Profile ↔ Recent Games
Single View ↔ Grid View (switch anytime during game)
```

### Bottom nav

**Hub nav (5 screens):** Profile, Decks, Deck Accomplishments, Edit Deck, Recent Games — three tabs: Recent Games | Profile | Decks.

**In-game nav (2 screens):** Single View and Grid View share their own nav bar with: Dice | Counters | Grid View/Single View toggle.

---

*This guide is the memory of the Aura project. Keep it updated.*
