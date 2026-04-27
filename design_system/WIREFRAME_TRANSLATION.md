# How to translate a wireframe into Aura style

This is the playbook. Follow it screen-by-screen.

---

## Step 0 — Before you start

Read `STYLE_GUIDE.md` all the way through, once. If you've already read it in this chat, skim Section 7 (*What you are NOT allowed to do*) again — that's the list of things that most often slip through.

Open `preview.html` in a browser and look at it. Don't skip this. The tokens on paper and the tokens rendered are different experiences; you need to have seen the parchment color to know when a design is drifting into white.

---

## Step 1 — Read the wireframe

When the user hands you a wireframe, don't jump into code. Spend 30 seconds answering these, silently, for yourself:

1. **What is this screen for?** Not the title — the user's goal. "View profile" is a title. "Check my archetype history before showing it to a friend" is a goal.
2. **How often is it seen?** Launched once per install (splash, onboarding) vs every session (home, game flow) vs rarely (settings). Rare screens can be denser; frequent screens must be calm.
3. **Is this a ceremonial moment, a utility moment, or both?** The Memory Card is pure ceremony. Settings is pure utility. The Game Review is mostly ceremony. Edit profile is mostly utility. This drives whether you reach for ornate or plain.
4. **What's the single primary action?** Every screen has one. Everything else is secondary. Identify it; it'll be the forest-green button at the bottom.
5. **What data is live vs placeholder?** If the wireframe has `[player name]`, it should render as `[player name]` in your mock until the user gives you the real data.

If any of those five are unclear after reading the wireframe twice, **ask the user before designing.** One good question beats three rounds of iteration.

---

## Step 2 — Pick the layout archetype

Most Aura screens fall into one of six archetypes. Identify which you're working with and you're 70% done:

| Archetype | Example | Signature elements |
|---|---|---|
| **Ceremony** | Memory Card | Centered, full-bleed, Young Serif hero, gold/copper accents, one primary action |
| **Stacked cards** | Game Review, Profile sections | Scrollable column of self-contained cards, eyebrow+content in each, sticky bottom CTA |
| **Player/item picker** | Pod setup, player select in review | Row of avatar buttons, one selected, optional "Skip" or "Add" |
| **List** | Game history, notifications | Vertical list of rows (not cards), hairline dividers, no heavy chrome |
| **Form** | Edit profile, settings | Labeled fields on parchment-card, grouped in sections, clear submit |
| **Launch / splash** | Splash, onboarding | Centered mark, ornamental SVG, minimal text, no UI chrome |

Most wireframes are a stacked-card screen or a list screen. If you're not sure, default to stacked cards — they degrade better on smaller screens.

---

## Step 3 — Apply the token layer

Don't invent values. Every number in your design should come from:
- `--parchment`, `--parchment-card`, `--parchment-deep` for backgrounds
- `--ink`, `--ink-2`, `--ink-3`, `--ink-4` for text
- `--forest`, `--copper`, `--gold` for brand accents
- `--cat-*` for trait colors (only when the screen references traits)
- `--sp-*` for spacing
- `--r-chip`, `--r-card`, `--r-memory`, `--r-full` for radii
- `--shadow-rest`, `--shadow-active`, `--shadow-memory` for shadows
- `--dur-fast/base/slow/memory` and `--ease` for motion

If you find yourself reaching for a color that isn't in the palette, stop. Either:
- You're trying to solve a problem the palette already solves (re-read Section 3 of the style guide)
- The screen legitimately introduces a new state (error, warning) — ask the user before adding tokens

---

## Step 4 — Choose the type hierarchy

Every screen has at most three text levels that matter. Pick them first, then write the copy to fit:

1. **Hero** — 1 per screen, sometimes none. Young Serif 28-72px. Screen title, hero numeral, ceremonial callout.
2. **Section / eyebrow** — the 11-12px 700 uppercase tracked-out labels. Category names, step counters, meta.
3. **Body** — Instrument Sans 14-16px. Questions, descriptions, list items.

If you find yourself needing a 4th level ("medium-bold subheading"), you usually have a layout problem — split the content into two cards instead.

---

## Step 5 — Pick the card treatment

For any card-like element, decide ornate vs plain **before** you start:

- **Plain**: 1px `--line` border, 4px left-border accent (if it represents a state or category), Instrument Sans question, 20/18/22 padding. Used for Done/Inactive states, settings rows, list cards.
- **Ornate**: 1.5px colored border + 6px left-border accent, Young Serif question, 22/20/24 padding. Used for **active ceremonial moments only** — the current question in Game Review, the Memory Card header, a one-time reveal.

Ornate is expensive. Use it once per screen, max. If two cards on the same screen are both ornate, the hierarchy collapses.

---

## Step 6 — Write the copy

Go back to the wireframe and replace every placeholder with real copy in Aura voice:

- Short sentences. Declarative. No exclamation marks. No emoji.
- Eyebrows are uppercase, tracked-out, and usually have a step counter or category. "FLAVOUR · 2/6". "RECENT · THIS WEEK". "BRACKET CHECK · 6/6".
- Primary CTAs are 1-2 words: "Accept Review", "Save", "Continue", "View Profile". Never "Submit form" or "Click here".
- Empty states are 1 sentence ("No games yet"), not 2 paragraphs of encouragement.
- Error states are specific and blameless: "That invite code doesn't match a pod" beats "Invalid input".

If the real copy doesn't exist yet, write a plausible placeholder in Aura voice — don't leave Lorem Ipsum. "[Placeholder: list of pod names]" is also fine if you need to signal something is dynamic.

---

## Step 7 — Motion pass

Once the static layout works, add motion. Keep it minimal:

- Tap feedback: 80ms fade to `--shadow-press` or background shift to `--parchment-deep`
- State change (card becomes active, selection confirmed): 160ms fade + 2-4px translate-Y
- Card shuffle (Done → active → next active): 240ms, stagger children by 40ms
- Modal reveal (Memory Card): 420ms scale (0.92 → 1) + opacity (0 → 1), `--ease`

If you don't have a motion justification, don't animate.

---

## Step 8 — The spirit check

Before declaring done, read Section 9 of the style guide back. Specifically:

1. Is the ceremony in the right place?
2. Does it feel warm on an actual phone screen (not in your editor)?
3. Is the primary action obvious?
4. Would this feel good to use 3× a week for a year?

If any answer is soft, iterate.

---

## Worked example — a generic "Game History" list screen

**The wireframe (hypothetical, pretend the user hands you this):**

```
┌────────────────────────┐
│ ← Game History         │
├────────────────────────┤
│                        │
│ [avatar] Game vs pod   │
│ Date · Archetype       │
│ Badges: ★★★            │
│ -----------------------│
│ [avatar] Game vs pod   │
│ Date · Archetype       │
│ Badges: ★★             │
│ -----------------------│
│   (8 more rows)        │
│                        │
│ [See more button]      │
└────────────────────────┘
```

### Step 1 — Understand
- **Purpose**: browse past games, tap into one to see the full Memory Card.
- **Frequency**: occasional (maybe weekly). Not every session.
- **Archetype moment**: utility. No ceremony — the ceremony was the Memory Card when the game ended. This is the *index*.
- **Primary action**: tap a row → go to that game's Memory Card.
- **Data**: real game records.

### Step 2 — Layout archetype
**List** (not stacked cards). Rows, hairline dividers, no shadows. Dense but calm.

### Step 3 — Tokens
- Background: `--parchment`
- Row background: `--parchment-card`
- Divider: 1px `--line`
- Winner badge color: `--forest` if this player won, `--ink-4` otherwise
- Archetype name: `--ink`
- Date: `--ink-3`

### Step 4 — Type
- Screen title: Instrument Sans 700, 20px (header, not hero — this isn't ceremonial)
- Eyebrow on each row: 11px 700 tracked 0.14em uppercase `--fg-subtle` — shows "MARCH 2026" grouping labels
- Archetype name: Young Serif 18px (one small ceremonial touch — the archetype is what the user earned, so it gets the display font)
- Pod names / dates: Instrument Sans 14px `--ink-2`
- Badge counters: 12px 700 tabular-nums

### Step 5 — Card treatment
**Plain rows, no cards.** Between games, just hairline dividers. The whole screen is one flat list on `--parchment-card`. Grouped by month with sticky uppercase eyebrow headers.

### Step 6 — Copy
- Screen title: "History"
- Empty state: "No games yet. Finish a review to start your archive."
- Month headers: "MARCH 2026", "FEBRUARY 2026"
- Row content: `[4 avatar stack] [Young Serif archetype] · [date] · [badge row of 5 glyphs, earned ones opaque, rest at 20%]`
- No "See more" button — the list just paginates as you scroll

### Step 7 — Motion
- Tap row: 80ms fade to `--parchment-deep`, then navigate. No other animation on this screen.

### Step 8 — Spirit check
- Utility moment, quietly warm — ✅
- No pure white, no black shadows — ✅
- Primary action (tap row) is obvious — ✅
- Dense enough to be useful but breathable — ✅

That's the translation. A wireframe that said "list of past games, each with avatar, name, date, badges" became a specific Aura screen in 8 steps without any invention beyond what the style guide already permits.

---

## When in doubt

- **Over-designed?** Delete a card. Delete a font weight. Delete a color.
- **Under-designed?** Add an eyebrow, not a gradient.
- **Stuck?** Open `preview.html`, find the closest existing pattern, steal it ruthlessly.
- **Actually stuck?** Ask the user. A 20-second clarifying question is cheaper than an hour of drift.
