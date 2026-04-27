# Aura Design System

Shared brand kit for every Aura screen. Use this folder as a reference at the start of every new design chat.

---

## The one-line prompt

Paste this into a new chat, attach your wireframe:

> Design the **[SCREEN NAME]** screen using `aura_design_system/`. Match the style in `STYLE_GUIDE.md`; use tokens from `tokens/colors_and_type.css` and components/assets already in the folder. Here's the wireframe: [attach image]

That's it. The system loads the style guide, tokens, components, and assets automatically.

---

## What's in here

```
aura_design_system/
├── README.md                    ← this file · the prompt + folder map
├── STYLE_GUIDE.md               ← philosophy, voice, visual DNA, what-not-to-do
├── WIREFRAME_TRANSLATION.md     ← the 8-step playbook (+ worked example)
├── preview.html                 ← open this in a browser · all tokens rendered
│
├── tokens/
│   └── colors_and_type.css      ← single source of truth for every variable
│
├── components/                  ← working React components, copy-pasteable
│   ├── components.jsx           ← core (Icon, Avatar, AvatarStack, CommanderTile, BadgeGlyph, PlayerPicker)
│   ├── brand-screens.jsx        ← SplashScreen, OnboardingScreen
│   ├── review-cards.jsx         ← ReviewCard, BracketCheckCard (plain + ornate)
│   ├── game-review-screen.jsx   ← the full Game Review layout
│   ├── memory-card.jsx          ← the keepsake card
│   └── ios-frame.jsx            ← device frame wrapper (preview only, ignore in production)
│
└── assets/
    ├── commanders/              ← 4 demo commander art crops from Scryfall
    └── glyphs/                  ← 5 trait sigils (PNG, used via CSS mask for color inheritance)
```

---

## How to use it (for Claude — future you)

When the user hands you a new screen:

1. **Read** `STYLE_GUIDE.md` in full (if not already in context).
2. **Open** `preview.html` to see the rendered tokens.
3. **Skim** `components/` — find the closest existing pattern and steal it.
4. **Follow** `WIREFRAME_TRANSLATION.md` step-by-step to translate the wireframe.
5. **Never invent** colors, fonts, or spacing values — if the palette doesn't cover it, stop and ask.

The goal is consistency across 20+ screens designed in different chats. This folder is the spine.

---

## How to use it (for a developer handing off to Claude Code)

At the end of a screen's design chat, a `design_handoff_<screen_name>/` bundle is produced. That bundle's `reference/` already inlines whichever tokens and components the screen uses — so the developer doesn't need this folder. They just need the handoff bundle.

Keep `aura_design_system/` purely as the **author's reference** during design — not as a dependency in the shipped codebase.

---

## Changing the system

If you add a new component or token, put it here first. Then every subsequent chat inherits it automatically. Don't let design drift happen per-screen — changes belong in the system.

A good rule: if you've used a pattern twice on two different screens, promote it. If you've used it once, leave it in that screen.
