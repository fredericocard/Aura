# Aura

Post-game review app for Magic: The Gathering Commander players. After a game ends, the pod opens Aura and does a short review together: voting on who made the smartest play, who brought the most flavor, who was the archenemy, and so on. Each player earns trait badges and the app generates a Memory Card as a keepsake.

Aura is not a life counter, not a deck builder, not a tournament tracker. It is about the social ceremony of reviewing a game and keeping a record of it.

---

## Repo structure

```
Aura/
│
├── app/                        ← Next.js App Router (all screens live here)
│   ├── layout.tsx              ← Root layout, metadata, font imports
│   ├── globals.css             ← Global styles
│   ├── page.tsx                ← Home: directory of all wireframes
│   ├── placeholder.tsx         ← Shared placeholder component for unfinished screens
│   │
│   ├── landing/page.tsx        ← 01 Landing (live)
│   ├── howtoplay/page.tsx      ← 02 How to Play (placeholder)
│   ├── create/page.tsx         ← 03 Create a Pod (placeholder)
│   ├── join/page.tsx           ← 04 Join a Pod (placeholder)
│   ├── gridview/page.tsx       ← 05 Grid View (placeholder)
│   ├── singleview/page.tsx     ← 06 Single View (placeholder)
│   ├── review/page.tsx         ← 07 Game Review (live)
│   ├── gamesummary/page.tsx    ← 08 Game Summary (placeholder)
│   ├── profile/page.tsx        ← 09 Profile (placeholder)
│   ├── decks/page.tsx          ← 10 Decks (placeholder)
│   ├── deck-accomplishments/page.tsx  ← 11 Deck Accomplishments (placeholder)
│   ├── edit-deck/page.tsx      ← 12 Edit Deck (placeholder)
│   └── recent-games/page.tsx   ← 13 Recent Games (placeholder)
│
├── design_system/              ← Design language (read-only reference)
│   ├── STYLE_GUIDE.md          ← Full design specification
│   ├── WIREFRAME_TRANSLATION.md ← How to convert wireframes to code
│   ├── CLAUDE_DESIGN_PROMPT.md ← Prompt template for Claude Design chats
│   ├── README.md               ← Design system overview
│   ├── tokens/
│   │   └── colors_and_type.css ← CSS variables (colors, fonts, spacing)
│   ├── components/             ← Reference JSX components (not imported by app)
│   │   ├── components.jsx      ← Base primitives
│   │   ├── ios-frame.jsx       ← iPhone frame wrapper
│   │   ├── brand-screens.jsx   ← Splash + onboarding
│   │   ├── review-cards.jsx    ← Game Review cards
│   │   ├── memory-card.jsx     ← Memory Card
│   │   └── game-review-screen.jsx ← Full Game Review
│   └── assets/                 ← Source design assets
│       ├── commanders/         ← Sample commander art (jpg)
│       └── glyphs/             ← Trait badge icons (png)
│
├── public/                     ← Static assets served by Next.js
│   └── assets/
│       ├── commanders/         ← Commander art (referenced by wireframes)
│       └── glyphs/             ← Badge icons (referenced by wireframes)
│
├── AURA_PROJECT_GUIDE.md       ← Project knowledge base (what Aura is, workflow, status)
├── CLAUDE.md                   ← Claude Code instructions
├── AGENTS.md                   ← Agent behavior rules
└── [config files]              ← next.config.ts, tsconfig.json, eslint, postcss, etc.
```

---

## How wireframes work

Each of the 13 screens is a self-contained page file at `app/[name]/page.tsx`. Every component for a wireframe is inline in that single file — no shared component imports between wireframes at this stage.

### Wireframe states

| State | Meaning |
|-------|---------|
| **Live** | Fully designed, converted from Claude Design output |
| **Placeholder** | Route exists with a "coming soon" page, waiting for design |

### Adding a new wireframe

1. Get the styled JSX file from Claude Design
2. Replace the placeholder `page.tsx` with the real content
3. Add `"use client"` at the top
4. Update image paths to use `/assets/commanders/` (served from `public/`)
5. Update the status in `app/page.tsx` from `"coming"` to `"live"`
6. Update the wireframe status table in `AURA_PROJECT_GUIDE.md`

### Current status

| # | Screen | Route | Status |
|---|--------|-------|--------|
| 01 | Landing | `/landing` | Live |
| 02 | How to Play | `/howtoplay` | Placeholder |
| 03 | Create a Pod | `/create` | Placeholder |
| 04 | Join a Pod | `/join` | Placeholder |
| 05 | Grid View | `/gridview` | Placeholder |
| 06 | Single View | `/singleview` | Placeholder |
| 07 | Game Review | `/review` | Live |
| 08 | Game Summary | `/gamesummary` | Placeholder |
| 09 | Profile | `/profile` | Placeholder |
| 10 | Decks | `/decks` | Placeholder |
| 11 | Deck Accomplishments | `/deck-accomplishments` | Placeholder |
| 12 | Edit Deck | `/edit-deck` | Placeholder |
| 13 | Recent Games | `/recent-games` | Placeholder |

---

## Key folders explained

### `app/` — the application

Every screen is one folder with one `page.tsx`. This is where all active code lives. Wireframes are self-contained: all styles, sub-components, and data are inline in each page file. We will refactor shared components later once all wireframes are complete.

`placeholder.tsx` is a shared component used by all unfinished screens. Once a screen is built, it no longer imports this file.

### `design_system/` — reference only

This folder holds the Aura design language: colors, typography, component patterns, and assets. These files are **read-only** during wireframe work — they are reference material for Claude Design, not imported by the app.

The `components/` subfolder contains JSX reference implementations of design primitives. These are not used directly in the Next.js app. They exist so Claude Design can study the patterns and produce consistent output.

### `public/assets/` — served images

Any image referenced by a wireframe (commander art, badge icons) goes here. In code, reference them as `/assets/commanders/omnath.jpg` — Next.js serves everything in `public/` at the root path.

---

## Design identity

Three words: **Warm, Earned, Quiet.**

- Parchment backgrounds, warm ink text, never pure white or pure black
- Forest green (#2F5D3A) for actions, copper (#B06B2C) for accents, gold (#C99B2F) for keepsakes
- Young Serif for ceremony, Instrument Sans for everything else
- Five trait colors: Gold (Brilliance), Plum (Flavour), Crimson (Rivalry), Teal (Allegiance), Coral (Fun)

Full spec in `design_system/STYLE_GUIDE.md`.

---

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to see the wireframe directory. Click any screen to view it.

---

## Deployment

Hosted on Vercel. Every push to `main` triggers an automatic deploy.
