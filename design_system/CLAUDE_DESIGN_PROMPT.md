# Aura — Wireframe Design Prompt

Use this prompt at the start of each new Claude Design chat when building a wireframe.

---

## The Prompt

You are going to help me design a wireframe for **[WIREFRAME NAME]** — a screen in my app called **Aura**.

### What is Aura

Aura is a mobile app for Magic: The Gathering Commander players. Commander is a social format — four players, 90+ minutes, one table. After the game ends, the pod (the group of players) opens Aura and does a short post-game review together: voting on who made the smartest play, who brought the most flavor, who was the archenemy, and so on. Each player earns trait badges across five categories — Brilliance, Flavour, Rivalry, Allegiance, and Fun — and the app generates a Memory Card, a keepsake record of that game.

The app is not a life counter, not a deck builder, not a tournament tracker. It is specifically about the social ceremony of reviewing a game you just played together and keeping a record of it.

### How we are going to work

This will happen in two steps:

**Step 1 — Design language (this step).** I am going to feed you our complete design system: style guide, color tokens, typography, component primitives, and asset references. Your job is to absorb all of it. Study the palette, the spacing, the shape vocabulary, the tone of voice, the things we never do. Do not start designing yet. Just confirm you understand the system and are ready for the layout document.

**Step 2 — Layout logic.** I will then give you a document built by our dev team. This document describes the wireframe's structure, content, and behavior — but it has zero design, zero colors, zero positioning, zero styling. It is pure logic: what elements exist, what data they show, what interactions they support, and how the flow works. Your job is to take that raw logic and dress it in our design system, producing a complete, pixel-ready wireframe that looks and feels like it belongs in Aura.

### What I expect from you

- Follow the design system as your foundation. You may introduce new elements, patterns, or subtle color variations if you believe they make the UI better and more attractive — but anything you add must match the existing design style and feel like it belongs in the same world. Do not break the visual identity.
- Use the component primitives I give you (cards, buttons, badges, avatars, etc.) as your building blocks. You may suggest new primitives if the wireframe needs them — but flag them for my approval and make sure they match the same app style.
- The output should be a mobile wireframe at 390x844 (iPhone). Everything should feel warm, parchment-and-ink, like a leather-bound ledger — never like a SaaS dashboard.
- Respect the voice and tone: declarative, short, no emoji, no exclamation marks, no gamification noise.
- If something in the layout document is ambiguous, make a design judgment that fits the system and flag it for me.

Let me know when you are ready and I will start feeding you the design system files.

---

## After pasting this prompt

1. Feed Claude Design all the files from the `design_system/` folder — start with `STYLE_GUIDE.md`, then `tokens/colors_and_type.css`, then the `components/` folder files, then any relevant assets.
2. Wait for confirmation that it has absorbed everything.
3. Feed it the layout/logic document for the specific wireframe you are building.
