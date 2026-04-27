# Aura — Style Guide

*The design language for Aura: a post-game review app for Magic: The Gathering Commander players. Every screen you design should feel like it belongs to this world. This document is the source of truth.*

---

## 1. Philosophy — what Aura is

Aura is a **keepsake**, not a form.

Commander is a long game. Four people, 90+ minutes, one table. The stakes are social: who was clever, who was chaotic, who got dogpiled, who played the deck that made everyone groan and smile. The app's job is to give those moments a ceremony — a short, warm review together, and a card you can keep.

Every design decision flows from that. If something feels like a SaaS dashboard, it's wrong. If something feels like a leather-bound ledger, you're close.

**Three words to hold in your head while designing:**

- **Warm** — parchment, ink, burnished copper. Never cold, never neutral-grey, never pure white.
- **Earned** — badges, sigils, seals, stamps. The UI should feel like it remembers the game you just played.
- **Quiet** — the app gets out of the way. No dopamine hits, no gamification noise. The drama lives in the game itself; the app is the record.

---

## 2. Voice & tone

**Declarative, short, never cute.** The copy should feel like a good game store owner describing what's happening: knows the thing cold, doesn't oversell, respects your time.

### Do
- "Review complete"
- "Everyone was on bracket"
- "Who took the flavour win?"
- "Here's your feedback"
- "Flag a deck that outpaced the table"

### Don't
- "🎉 Awesome! Your epic review is ready!" → too loud
- "You have completed 1 of 6 review items." → too corporate
- "Bestow the laurel of triumph upon thy most cunning adversary." → too Renaissance Faire
- "Tap a player to crown the winner" → too instructional (users know how to tap)

### Rules of thumb
- **Questions end without question marks sometimes.** "Who took the flavour win?" is a real question. "Did any deck play above its bracket?" is a real question. "Choose a player" is an instruction — make it a label, not a sentence.
- **MTG vocabulary is allowed but sparingly.** Commander players know what "bracket," "commander damage," "pod," "archenemy" mean. Don't dumb it down. But don't lean into jargon either — "politicking," "tutor target," "ramp turn" are too insider for general UI copy. Use them inside the game itself, not in app chrome.
- **No exclamation marks.** Ever. If you think you need one, you don't.
- **No emoji.** The visual vocabulary is heraldic — sigils, glyphs, sealed cards. Emoji are from a different universe.
- **Numbers are tabular.** Scores, counts, dates. Always use `font-variant-numeric: tabular-nums`.

---

## 3. Visual DNA

### The parchment world
The default surface is `--parchment` (`#F5EFE2`). Never pure white. Cards sit on this parchment and are themselves `--parchment-card` (`#FAF5EA`) — slightly warmer, slightly brighter. Recessed rows go `--parchment-deep` (`#EDE4D0`).

You can add subtle radial-gradient blooms behind hero content — warm gold or forest at 4-8% opacity, large radius, feathered edge. Never above 10%. They're felt, not seen.

Pure white (`#FFFFFF`) is reserved for **three things only**:
1. Avatar rims (the 2px ring around commander portraits)
2. Foil highlights on the Memory Card
3. Text on the Memory Card's deep-ink background

### The ink world
Text is warm near-black, not true black. The scale:
- `--ink` (`#2B2118`) — primary text
- `--ink-2` (`#5C5043`) — secondary, captions, subheads
- `--ink-3` (`#8A7E6F`) — meta, timestamps, tertiary
- `--ink-4` (`#B8AE9E`) — placeholders, disabled

Backgrounds that use ink (the Memory Card, dark variants) go even deeper: `#1A140E`. That's the "leather cover" tone.

### The brand colors
- **Forest green** (`--forest` `#2F5D3A`) is the **action color**. Primary CTA fills, confirmation states, "success" moments. Use it sparingly — it's the color of "yes, proceed." If everything is forest, nothing is.
- **Copper** (`--copper` `#B06B2C`) is the **accent color**. Used for the ornate card treatment, foil, earned-badge stamps, compass-rose rays. It says "this is special."
- **Gold** (`--gold` `#C99B2F`) is the **keepsake color**. The Memory Card frame. The "brilliance" category. Used when something has value worth preserving.

### Category colors (for trait badges only)
Each trait has exactly one color. They are never reassigned.

| Trait | Color | Hex | Meaning |
|---|---|---|---|
| Brilliance | Gold | `#C99B2F` | Clarity, clever plays |
| Flavour | Plum | `#7E4E8A` | Style, creativity, theatre |
| Rivalry | Crimson | `#9E2B2B` | The target on your back |
| Allegiance | Teal | `#2F7A74` | Politics, alliances |
| Fun | Coral | `#E07B4A` | Joy, vibe |

**Crimson is special**: it signals social friction — "this deck played above bracket," "this player is the archenemy this turn." It should feel a bit weighty. Don't use it for delete buttons or generic errors.

### Typography personality
Two fonts only. They do different jobs and shouldn't blur.

- **Young Serif** (display, 400 weight only) — for moments of ceremony: wordmark, hero numerals, "Review complete," ornate question text on active cards, Memory Card names. Treat it like you'd treat a chapter heading in a beautifully-typeset novel.
- **Instrument Sans** (UI, 400/500/600/700) — for everything else. Labels, buttons, body copy, captions. It's legible at small sizes, which matters in a poorly-lit living room.

**The eyebrow pattern is sacred.** Category/section labels use: 11-12px, 600-700 weight, letter-spacing 0.14-0.18em, uppercase, muted or accent-color. Every card has one. It's the visual rhythm that says "this UI is organized like a grimoire: capital, ornament, body."

Example:
```
FLAVOUR · 2/6                    ← eyebrow (Instrument Sans)
Who took the flavour win?         ← question (Young Serif 26px)
[player options row]
```

### Shape vocabulary
- **Radii** are generous but not bubbly. Cards are 20px (`--r-card`). The Memory Card is 24px (`--r-memory`). Chips are 12px (`--r-chip`). Full circles for avatars and pill buttons.
- **Shadows are always warm-tinted** — never `rgba(0,0,0,*)`. The tokens (`--shadow-rest`, `--shadow-active`, `--shadow-memory`) all use `rgba(43,33,24,*)`. This is non-negotiable; black shadows on parchment look synthetic.
- **Lines are warm too** — `rgba(43,33,24,.08)` for hairlines, `.14` for stronger dividers. If you need a bolder edge, use a category color at reduced alpha, not grey.

### The "left-border accent" pattern
Every list-like card that represents a trait or question gets a **colored left border**, 4-6px wide, in the relevant category or state color. This is a signature pattern — it turns a neutral parchment card into a specific trait card at a glance.

- Done cards: 4px `--forest` (confirmation)
- Active trait card (ornate variant): 6px category color
- Bracket check: 4-6px `--ink-3` (neutral, not a trait)

### The "ornate" variant
Some screens have an `ornate` variant that swaps a few details:
- Question text uses Young Serif instead of Instrument Sans
- Left-border thickens from 4px to 6px
- Accent color shifts from forest to copper
- Padding grows slightly (22/20/24 vs 20/18/22)

Ornate is used for **ceremonial moments**: the Game Review questions themselves, the Memory Card. Not for settings, profile, lists — those stay utilitarian.

---

## 4. Layout & spacing

### Spacing is on a 4px base
Tokens: `--sp-1` 4, `--sp-2` 8, `--sp-3` 12, `--sp-4` 16, `--sp-5` 20, `--sp-6` 24, `--sp-8` 32, `--sp-10` 40, `--sp-14` 56, `--sp-18` 72.

- Screen edge padding on mobile: 16px
- Card internal padding: 20-24px (more in ornate)
- Gap between stacked cards: 10px
- Gap between list rows: 4px
- Gap between a header element and its content: 14-16px

### The mobile frame
Target is 390×844 (iPhone). The status bar is reserved (top 48px) but the app draws underneath it — the status bar text is absolutely positioned over the parchment. The home indicator area (bottom 20-34px) is respected.

### Sticky bottom CTAs
When a screen has a primary action (Accept Review, Save, Continue), it sits pinned to the bottom with a gradient fade above it (`linear-gradient(to top, var(--parchment) 60%, rgba(245,239,226,0))`) so content can scroll underneath cleanly. The button itself is full-width minus 16px side padding, 16-20px vertical padding, `--r-card` radius, disabled state at 40% opacity.

### Card stacks
Most content lives in **stacks of cards**, each card being one item (one question, one memory, one profile section). Cards are not containers for other cards — if you're nesting cards, you've got a layout problem.

---

## 5. Iconography

Two icon systems, kept separate:

**Lucide** (line icons, 1.75px stroke) — for UI affordances. Back chevrons, share, download, check, close. Always `currentColor`, always matched to the surrounding text color. The full set used is inlined in `components/components.jsx` → `Icon`.

**Heraldic glyphs** — for trait badges only. These are dense, symmetric line-art sigils (squirrel with tome = brilliance, plume = flavour, etc). They live in `assets/glyphs/` as PNG silhouettes rendered via CSS mask so they inherit their category color. They are *not* Lucide icons — they're brand assets. Don't mix them.

No emoji. No flat-color "icons" that look like mobile app icons (rounded rectangles with gradients). No abstract geometric shapes trying to be meaningful.

---

## 6. Motion

Motion is brief and purposeful. Cards don't float, buttons don't bounce, icons don't spin.

**Timings**
- `--dur-fast` 80ms — micro-interactions (tap ripple, toggle flip)
- `--dur-base` 160ms — state changes (hover, opacity fade, selection)
- `--dur-slow` 240ms — screen transitions, drawer open
- `--dur-memory` 420ms — Memory Card reveal (the *one* ceremonial moment that earns a longer animation)

**Easing** is always `--ease` (`cubic-bezier(.22,.61,.36,1)`). Don't use linear, don't use cubic-bezier(.68,-.55,.27,1.55) "back-out" elasticity. It breaks the tone.

**What to animate**
- Opacity, translate-Y (small, 4-8px), scale (0.94-1.0). That's it.
- Never animate color, never animate blur, never animate shadow (swap shadow tokens instead if needed).

---

## 7. What you are NOT allowed to do

A short list of things that break the brand. If a wireframe asks for any of these, push back or translate them into something that fits.

- ❌ Pure white backgrounds or pure black text
- ❌ Emoji in UI copy
- ❌ Gradients as fills on buttons, cards, or text (only as whisper-faint background blooms)
- ❌ Drop shadows with black base color
- ❌ Neon/saturated colors outside the declared palette
- ❌ Rounded-rectangle icons trying to be app-icon-style
- ❌ Bouncy/spring motion, confetti, sparkle particle effects
- ❌ "Gamification" dressing: XP bars, level-up dialogs, streak counters. Aura tracks games played over time — it does not reward you for opening the app.
- ❌ Modal alerts styled like iOS native — design a proper sheet in Aura tones
- ❌ Tab bars with filled glyphs. If you must have a tab bar, use Lucide line icons in `--ink-2`.
- ❌ Inventing new category colors. Five traits, five colors, forever.
- ❌ Placeholder content that's obviously Lorem Ipsum or "Lorem card text here" — either write real copy or write `[placeholder: description of the real content]` inline.

---

## 8. Quick recipes

Common patterns you'll reach for. All the exact tokens are in the components reference.

### Standard list row (settings, history, profile section)
- Background: `--parchment-card`
- Border: 1px `--line`
- Radius: `--r-card`
- Padding: 14px vertical, 16px horizontal
- Shadow: `--shadow-rest`
- Hit target: minimum 52px tall

### Primary button (filled)
- Background: `--forest`
- Text: `--parchment`, Instrument Sans 600, 16px
- Radius: `--r-card`
- Padding: 16px/20px
- Shadow (enabled): `--shadow-rest`
- Disabled: opacity 0.4, no shadow, no press state

### Secondary button (outline)
- Background: `--parchment-card`
- Border: 1px `--line-strong`
- Text: `--ink`, Instrument Sans 600, 16px
- Same radius and padding as primary

### Sheet / modal header
- Back chevron (40×40 circular hit target, no fill)
- Title: Instrument Sans 700, 20px, `--ink`, tracking −0.01em
- Trailing icon (optional): 40×40 circular hit target, `--ink-2`
- Bottom: 1px `--line` hairline
- Background: `rgba(245,239,226,0.85)` + `backdrop-filter: blur(14px) saturate(120%)` — parchment feels like it's still there behind

### Avatar stack (commander portraits)
- 2px white (`--paper-white`) inner rim
- 1px `--line` outer ring (via `box-shadow: 0 0 0 1px var(--line)`)
- Sizes: 26px (inline in lists), 36px (rows), 56px (player picker), 120px+ (hero)

### Empty state
- Centered BadgeGlyph (40% opacity) at 64px
- Young Serif 22px headline, 1-sentence
- Instrument Sans 14px `--fg-subtle` body, 1-2 sentences
- Primary CTA if actionable, else nothing
- No cute illustrations, no "Oops!" copy

---

## 9. The spirit check

Before shipping any screen, read it back and ask:

1. **Could a busy Magic store owner describe this screen in one sentence?** If not, it's too busy.
2. **Does it feel warm?** Hold your phone away from your face; does it read parchment-and-ink, or clinical-white?
3. **Is the ceremony where the ceremony should be?** Don't put Young Serif on a settings row, don't put plain Instrument Sans on the Memory Card name.
4. **Does it respect the player's time?** If it takes more than ~15 seconds of tapping to finish a flow, something's wrong.
5. **Would you want to keep this if you printed it on cardstock?** That's the Memory Card test. Not every screen needs to pass, but the shippable ones should at least *feel* like they could.

If those five all feel right, ship it.

---

*Reference files: see `tokens/colors_and_type.css` for all CSS variables, `components/` for working React primitives, `assets/` for badge glyphs and commander art, `preview.html` for everything rendered at once.*
