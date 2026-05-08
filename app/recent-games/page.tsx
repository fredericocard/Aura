'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useId, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getGameLog } from '@/lib/game-log';

// =============================================================================
// Aura — Recent Games screen
// Self-contained React component. Drop into any React 18+ app.
//
// Renders the three states defined in the layout doc as one stateful screen:
//   1. List (collapsed)        — chronological ledger grouped by month
//   2. Filter sheet            — bottom sheet, commander + sort by Aura
//   3. Game expanded inline    — players, badges earned, Open Memory Card CTA
//
// Usage:
//   import RecentGamesScreen from './RecentGamesScreen';
//   <RecentGamesScreen
//     youId="frederico"
//     viewer={{ id: 'frederico', name: 'Frederico' }}
//     players={[...]}
//     myCommanders={[...]}
//     games={[...]}
//     onOpenMemoryCard={(game) => router.push(`/games/${game.id}/memory`)}
//   />
//
// All props are optional — if omitted, the demo data below renders so this
// component runs standalone for review. Replace with real data in production.
//
// Design tokens are injected via a scoped <style> block at mount, so the
// component does not require a global stylesheet. If your app already imports
// `colors_and_type.css`, the duplicate :root vars are harmless (same values).
// =============================================================================

// ── Design tokens ────────────────────────────────────────────────────────────
const TOKEN_CSS = `
.aura-root {
  --parchment: #F5EFE2; --parchment-card: #FAF5EA; --parchment-deep: #EDE4D0;
  --ink: #2B2118; --ink-2: #5C5043; --ink-3: #8A7E6F; --ink-4: #B8AE9E;
  --forest: #2F5D3A; --forest-deep: #22472B; --forest-soft: #E5ECE3;
  --forest-line: rgba(47,93,58,.35);
  --copper: #B06B2C; --copper-deep: #8A5320; --copper-soft: #F3E3D1; --gold: #C99B2F;
  --line: rgba(43,33,24,.08); --line-strong: rgba(43,33,24,.14);
  --cat-brilliance: #C99B2F;       --cat-brilliance-soft: #F6ECD2;
  --cat-flavor:     #7E4E8A;       --cat-flavor-soft:     #EADDEE;
  --cat-rivalry:    #9E2B2B;       --cat-rivalry-soft:    #F1D4CF;
  --cat-allegiance: #2F7A74;       --cat-allegiance-soft: #D6E6E3;
  --cat-fun:        #E07B4A;       --cat-fun-soft:        #F9DFCD;
  --bg: var(--parchment); --fg: var(--ink); --fg-muted: var(--ink-2); --fg-subtle: var(--ink-3);
  --accent: var(--forest); --accent-press: var(--forest-deep); --accent-soft: var(--forest-soft);
  --font-ui: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Young Serif', ui-serif, Georgia, serif;
  --r-card: 20px;
  --shadow-rest:   0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12);
  --shadow-active: 0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22);
  --ease: cubic-bezier(.22,.61,.36,1);
  font-family: var(--font-ui);
  color: var(--ink);
  background: var(--parchment);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.aura-root *, .aura-root *::before, .aura-root *::after { box-sizing: border-box; }
.aura-root button { font: inherit; color: inherit; }
`;

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Young+Serif&display=swap';

// ── Demo data (used only if no props are passed) ─────────────────────────────
const DEMO_PLAYERS = [
  { id: 'frederico', name: 'Frederico', commanderShort: 'Omnath',    art: '/assets/commanders/omnath.jpg' },
  { id: 'manel',     name: 'Manel',     commanderShort: 'Krenko',    art: '/assets/commanders/krenko.jpg' },
  { id: 'sofia',     name: 'Sofia',     commanderShort: 'Atraxa',    art: '/assets/commanders/atraxa.jpg' },
  { id: 'tomas',     name: 'Tomás',     commanderShort: 'Muldrotha', art: '/assets/commanders/muldrotha.jpg' },
];

const DEMO_COMMANDERS = [
  { id: 'omnath',    name: 'Omnath, Locus of Creation', short: 'Omnath',    art: '/assets/commanders/omnath.jpg',    plays: 14 },
  { id: 'atraxa',    name: 'Atraxa, Praetors\u2019 Voice', short: 'Atraxa', art: '/assets/commanders/atraxa.jpg',    plays: 9 },
  { id: 'muldrotha', name: 'Muldrotha, the Gravetide',  short: 'Muldrotha', art: '/assets/commanders/muldrotha.jpg', plays: 6 },
  { id: 'krenko',    name: 'Krenko, Mob Boss',          short: 'Krenko',    art: '/assets/commanders/krenko.jpg',    plays: 4 },
];

const POD = ['frederico', 'manel', 'sofia', 'tomas'];

const DEMO_GAMES = [
  { id: 'g1', pod: 'Friday Night Pod', date: 'May 2',  time: '9:42 PM',  duration: '1h 24m', myCommanderId: 'omnath',    players: POD, winnerId: 'frederico', auraDelta: 18,  myBadges: [{ id: 'brilliance', from: 'manel' }, { id: 'allegiance', from: 'sofia' }] },
  { id: 'g2', pod: 'Friday Night Pod', date: 'Apr 25', time: '10:08 PM', duration: '1h 51m', myCommanderId: 'atraxa',    players: POD, winnerId: 'sofia',     auraDelta: 6,   myBadges: [{ id: 'allegiance', from: 'tomas' }] },
  { id: 'g3', pod: 'Wednesday Brews',  date: 'Apr 18', time: '8:15 PM',  duration: '2h 02m', myCommanderId: 'muldrotha', players: POD, winnerId: 'tomas',     auraDelta: 9,   myBadges: [{ id: 'flavor', from: 'sofia' }] },
  { id: 'g4', pod: 'Game Store FNM',   date: 'Apr 12', time: '7:30 PM',  duration: '1h 12m', myCommanderId: 'krenko',    players: POD, winnerId: 'manel',     auraDelta: 11,  myBadges: [{ id: 'rivalry', from: 'manel' }, { id: 'fun', from: 'tomas' }] },
  { id: 'g5', pod: 'Friday Night Pod', date: 'Apr 5',  time: '9:55 PM',  duration: '1h 34m', myCommanderId: 'omnath',    players: POD, winnerId: 'sofia',     auraDelta: 4,   myBadges: [{ id: 'fun', from: 'manel' }] },
  { id: 'g6', pod: 'Wednesday Brews',  date: 'Mar 29', time: '8:42 PM',  duration: '1h 18m', myCommanderId: 'atraxa',    players: POD, winnerId: 'manel',     auraDelta: -3,  myBadges: [] },
  { id: 'g7', pod: 'Friday Night Pod', date: 'Mar 22', time: '10:14 PM', duration: '1h 46m', myCommanderId: 'muldrotha', players: POD, winnerId: 'frederico', auraDelta: 14,  myBadges: [{ id: 'brilliance', from: 'sofia' }] },
];

// ── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'brilliance', label: 'Brilliance', archetype: 'The Mastermind',  color: 'var(--cat-brilliance)', soft: 'var(--cat-brilliance-soft)' },
  { id: 'flavor',     label: 'Flavour',    archetype: 'The Lore Master', color: 'var(--cat-flavor)',     soft: 'var(--cat-flavor-soft)' },
  { id: 'rivalry',    label: 'Rivalry',    archetype: 'The Archenemy',   color: 'var(--cat-rivalry)',    soft: 'var(--cat-rivalry-soft)' },
  { id: 'allegiance', label: 'Allegiance', archetype: 'The Kingmaker',   color: 'var(--cat-allegiance)', soft: 'var(--cat-allegiance-soft)' },
  { id: 'fun',        label: 'Fun',        archetype: 'The Beloved',     color: 'var(--cat-fun)',        soft: 'var(--cat-fun-soft)' },
];

// ── Brand mark ───────────────────────────────────────────────────────────────
function AuraMark({ size = 22, color = 'var(--forest)' }: any) {
  const id = useId().replace(/[:]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs><clipPath id={`am-${id}`}><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath></defs>
      <circle cx="32" cy="36" r="2.4" fill={color}/>
      <g clipPath={`url(#am-${id})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color}/>
        <polygon points="40,60 33,4 34,4 56,60" fill={color}/>
      </g>
    </svg>
  );
}

// ── Heraldic glyph (inline SVG so the file ships with no asset deps) ─────────
// 64×64 viewBox. If you have PNG marks at /assets/glyphs/<name>.png and want
// to use them instead, pass `glyphBase` to RecentGamesScreen and the component
// will CSS-mask the PNG so it inherits the category color.
function BadgeGlyph({ name, size = 28, stroke = 'currentColor', glyphBase }: any) {
  if (glyphBase) {
    return (
      <span aria-hidden="true" style={{
        display: 'inline-block', width: size, height: size,
        backgroundColor: stroke,
        WebkitMaskImage: `url("${glyphBase}${name}.png")`,
        maskImage: `url("${glyphBase}${name}.png")`,
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        WebkitMaskSize: 'contain', maskSize: 'contain',
      }}/>
    );
  }
  const p: any = { width: size, height: size, viewBox: '0 0 64 64', fill: 'none', stroke,
    strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (name) {
    case 'brilliance': return (
      <svg {...p}>
        <path d="M32 4 C24 6,20 14,24 22 C26 26,30 26,32 24 C34 26,38 26,40 22 C44 14,40 6,32 4 Z"/>
        <path d="M32 9 C28 11,27 16,29 21 M32 9 C36 11,37 16,35 21" opacity="0.75"/>
        <path d="M18 22 C14 18,12 22,14 27 C16 30,20 29,22 26 Z"/>
        <path d="M46 22 C50 18,52 22,50 27 C48 30,44 29,42 26 Z"/>
        <path d="M20 28 C18 34,20 40,24 43 C26 45,28 46,32 46 C36 46,38 45,40 43 C44 40,46 34,44 28 C42 24,38 22,32 22 C26 22,22 24,20 28 Z"/>
        <path d="M32 26 L30 32 L32 30 L34 32 Z" fill={stroke} stroke="none"/>
        <path d="M25 34 C24 36,25 38,28 37 C28 35,27 34,25 34 Z" fill={stroke} stroke="none"/>
        <path d="M39 34 C40 36,39 38,36 37 C36 35,37 34,39 34 Z" fill={stroke} stroke="none"/>
        <path d="M30.5 40 L32 42 L33.5 40 Z" fill={stroke} stroke="none"/>
        <path d="M31 44 L31 46 L31.6 45.4" /><path d="M33 44 L33 46 L32.4 45.4"/>
        <path d="M14 52 C16 51,22 50,28 52 L32 54 L36 52 C42 50,48 51,50 52 L48 60 C42 59,38 59,34 60 L32 61 L30 60 C26 59,22 59,16 60 Z"/>
        <path d="M32 54 L30 57 L32 61 L34 57 Z" fill={stroke} stroke="none"/>
        <path d="M18 54 C22 53.5,26 54,28 55" opacity="0.65"/>
        <path d="M46 54 C42 53.5,38 54,36 55" opacity="0.65"/>
      </svg>
    );
    case 'flavor': return (
      <svg {...p}>
        <path d="M32 6 C28 11,30 14,29 17 C26 15,25 11,25 11 C24 15,22 17,24 21 C28 20,29 19,32 18 C35 19,36 20,40 21 C42 17,40 15,39 11 C39 11,38 15,35 17 C34 14,36 11,32 6 Z"/>
        <path d="M16 22 L48 22"/><path d="M14 22 Q14 19,17 19 L47 19 Q50 19,50 22"/>
        <path d="M16 22 C16 32,22 38,32 38 C42 38,48 32,48 22"/>
        <path d="M24 24 C24 30,26 34,32 35" opacity="0.55"/>
        <path d="M40 24 C40 30,38 34,32 35" opacity="0.55"/>
        <path d="M32 38 L32 44"/><path d="M27 44 Q32 48,37 44 Q32 41,27 44 Z"/>
        <path d="M32 48 L32 52"/><path d="M22 58 L42 58"/>
        <path d="M24 52 L40 52 L44 58 L20 58 Z"/>
      </svg>
    );
    case 'rivalry': return (
      <svg {...p}>
        <path d="M15 26 C8 22,4 16,5 6 C10 10,14 13,18 17 L20 22 Z"/>
        <path d="M49 26 C56 22,60 16,59 6 C54 10,50 13,46 17 L44 22 Z"/>
        <path d="M17 24 C19 16,25 12,32 12 C39 12,45 16,47 24"/>
        <path d="M29 12 L32 6 L35 12"/><path d="M17 24 L47 24"/>
        <path d="M17 24 L17 36 L22 44 L28 46 L32 50 L36 46 L42 44 L47 36 L47 24 Z"/>
        <path d="M22 29 L28 27 L30 31 L23 33 Z" fill={stroke} stroke="none"/>
        <path d="M42 29 L36 27 L34 31 L41 33 Z" fill={stroke} stroke="none"/>
        <path d="M32 25 L30 40 L32 45 L34 40 Z"/>
        <circle cx="22" cy="39" r="1.1" fill={stroke} stroke="none"/>
        <circle cx="42" cy="39" r="1.1" fill={stroke} stroke="none"/>
      </svg>
    );
    case 'allegiance': return (
      <svg {...p}>
        <circle cx="32" cy="32" r="24"/>
        <circle cx="32" cy="32" r="21" strokeDasharray="2 3" opacity="0.55"/>
        <path d="M4 40 L20 34 L30 34 L32 32 L30 30 L20 30 L4 24"/>
        <path d="M10 26 L10 38" opacity="0.7"/><path d="M16 28 L16 36" opacity="0.7"/>
        <circle cx="10" cy="32" r="1" fill={stroke} stroke="none"/>
        <circle cx="16" cy="32" r="1" fill={stroke} stroke="none"/>
        <path d="M60 40 L44 34 L34 34 L32 32 L34 30 L44 30 L60 24"/>
        <path d="M54 26 L54 38" opacity="0.7"/><path d="M48 28 L48 36" opacity="0.7"/>
        <circle cx="54" cy="32" r="1" fill={stroke} stroke="none"/>
        <circle cx="48" cy="32" r="1" fill={stroke} stroke="none"/>
        <path d="M32 22 L42 32 L32 42 L22 32 Z"/>
        <path d="M32 28 L36 32 L32 36 L28 32 Z"/>
        <circle cx="32" cy="32" r="1.5" fill={stroke} stroke="none"/>
      </svg>
    );
    case 'fun': {
      const straight = [0, 45, 90, 135, 180, 225, 270, 315];
      const wavy = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
      return (
        <svg {...p}>
          {straight.map((a: any) => {
            const r = (a * Math.PI) / 180;
            return <path key={a} d={`M${32 + Math.cos(r) * 22} ${32 + Math.sin(r) * 22} L ${32 + Math.cos(r) * 30} ${32 + Math.sin(r) * 30}`}/>;
          })}
          {wavy.map((a: any) => {
            const r = (a * Math.PI) / 180, perp = r + Math.PI / 2;
            const x1 = 32 + Math.cos(r) * 22, y1 = 32 + Math.sin(r) * 22;
            const x2 = 32 + Math.cos(r) * 28, y2 = 32 + Math.sin(r) * 28;
            const mx = 32 + Math.cos(r) * 25 + Math.cos(perp) * 1.6;
            const my = 32 + Math.sin(r) * 25 + Math.sin(perp) * 1.6;
            return <path key={`w${a}`} d={`M${x1} ${y1} L${mx} ${my} L${x2} ${y2}`} opacity="0.85"/>;
          })}
          <circle cx="32" cy="32" r="14"/>
          <circle cx="32" cy="32" r="11" opacity="0.55"/>
          <path d="M24 28 Q27 26,30 28"/><path d="M34 28 Q37 26,40 28"/>
          <circle cx="27" cy="30.5" r="1.4" fill={stroke} stroke="none"/>
          <circle cx="37" cy="30.5" r="1.4" fill={stroke} stroke="none"/>
          <path d="M25 36 Q32 42,39 36"/>
        </svg>
      );
    }
    default: return null;
  }
}

// ── Tiny stroke icons ────────────────────────────────────────────────────────
function Icon({ name, size = 20, stroke = 'currentColor', width = 1.75 }: any) {
  const p: any = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke,
    strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (name) {
    case 'chevron-down':  return <svg {...p}><polyline points="6 9 12 15 18 9"/></svg>;
    case 'check':         return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
    case 'filter':        return <svg {...p}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case 'card':          return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>;
    case 'profile':       return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>;
    case 'decks':         return <svg {...p}><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2"/></svg>;
    case 'recent':        return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    default: return null;
  }
}

// ── Helpers (closures over data-providing props) ─────────────────────────────
const findById = (list: any[], id: string) => list.find((x: any) => x.id === id);
const categoryById = (id: string) => findById(CATEGORIES, id);

function groupByMonth(games: any[]) {
  const seen = new Map<string, { label: string; items: any[] }>();
  const out: { label: string; items: any[] }[] = [];
  games.forEach((g: any) => {
    const month = (g.date || '').split(' ')[0];
    const label = month || 'Other';
    if (!seen.has(label)) { const o = { label, items: [] as any[] }; seen.set(label, o); out.push(o); }
    seen.get(label)!.items.push(g);
  });
  return out;
}

// ── Top app bar ──────────────────────────────────────────────────────────────
function TopBar({ title, right }: any) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px 12px',
      background: 'rgba(245,239,226,0.88)',
      backdropFilter: 'blur(14px) saturate(120%)',
      WebkitBackdropFilter: 'blur(14px) saturate(120%)',
      borderBottom: '1px solid var(--line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AuraMark size={20}/>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400,
          fontSize: 22, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>{right}</div>
    </div>
  );
}

// ── Filter pill ──────────────────────────────────────────────────────────────
function FilterButton({ active, count, onClick }: any) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: 34, padding: '0 12px',
      background: active ? 'var(--forest-soft)' : 'var(--parchment-card)',
      border: `1px solid ${active ? 'var(--forest-line)' : 'var(--line-strong)'}`,
      color: active ? 'var(--forest-deep)' : 'var(--ink)',
      borderRadius: 999, cursor: 'pointer',
      fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
    }}>
      <Icon name="filter" size={14} width={2}/>
      Filter
      {count > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 16, height: 16, borderRadius: 999, padding: '0 5px',
          background: 'var(--forest)', color: 'var(--parchment)',
          fontSize: 10, fontWeight: 700,
        }}>{count}</span>
      )}
    </button>
  );
}

// ── Earned-badge row (expanded view) ─────────────────────────────────────────
function EarnedRow({ badge, players, glyphBase }: any) {
  const cat = categoryById(badge.id);
  const giver = findById(players, badge.from);
  if (!cat || !giver) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px',
      background: 'var(--parchment)',
      border: '1px solid var(--line)',
      borderRadius: 14,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 999, flexShrink: 0,
        background: cat.soft, color: cat.color,
        border: `1.5px solid ${cat.color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <BadgeGlyph name={badge.id} size={22} stroke={cat.color} glyphBase={glyphBase}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: cat.color }}>Earned · {cat.label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', marginTop: 2 }}>
          From <span style={{ fontWeight: 700 }}>{giver.name}</span>
          <span style={{ color: 'var(--fg-subtle)' }}> · {cat.archetype}</span>
        </div>
      </div>
    </div>
  );
}

// ── Player seat (expanded view) ──────────────────────────────────────────────
function TableSeat({ playerId, isYou, isWinner, players }: any) {
  const p = findById(players, playerId);
  if (!p) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 6, flex: 1, minWidth: 0 }}>
      <div style={{ position: 'relative' }}>
        {isWinner && (
          <div style={{ position: 'absolute', top: -13, left: '50%',
            transform: 'translateX(-50%)', color: 'var(--ink)', zIndex: 2, lineHeight: 0 }}>
            <svg width="22" height="15" viewBox="0 0 24 18" fill="currentColor"
              stroke="var(--ink)" strokeWidth="0.8" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 4 L6 12 L9 6 L12 13 L15 6 L18 12 L22 4 L21 16 L3 16 Z"/>
              <circle cx="2" cy="4" r="1.2" fill="var(--ink)" stroke="none"/>
              <circle cx="22" cy="4" r="1.2" fill="var(--ink)" stroke="none"/>
              <circle cx="12" cy="13" r="1.1" fill="var(--ink)" stroke="none"/>
            </svg>
          </div>
        )}
        <div style={{
          width: 52, height: 52, borderRadius: 999, overflow: 'hidden',
          border: `2px solid ${isYou ? 'var(--forest)' : 'var(--parchment-card)'}`,
          boxShadow: isYou ? '0 0 0 1px var(--forest-line)' : '0 0 0 1px var(--line)',
          background: 'var(--parchment-deep)',
        }}>
          <img src={p.art} alt="" style={{ width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: '50% 25%', display: 'block' }}/>
        </div>
        {isYou && (
          <div style={{
            position: 'absolute', bottom: -3, right: -3,
            background: 'var(--forest)', color: 'var(--parchment)',
            fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '2px 5px', borderRadius: 999,
            border: '1.5px solid var(--parchment-card)',
          }}>You</div>
        )}
      </div>
      <div style={{ textAlign: 'center', lineHeight: 1.2, maxWidth: '100%' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
        <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.commanderShort}</div>
      </div>
    </div>
  );
}

// ── Game row (collapsed + expanded) ──────────────────────────────────────────
function GameRow({ game, expanded, onToggle, onOpenMemoryCard, players, commanders, youId, glyphBase }: any) {
  const cmd = findById(commanders, game.myCommanderId);
  const primary = game.myBadges[0];
  const cat = primary ? categoryById(primary.id) : null;
  const extra = Math.max(0, game.myBadges.length - 1);

  return (
    <div style={{
      background: 'var(--parchment-card)',
      border: '1px solid var(--line)',
      borderLeft: `4px solid ${cat ? cat.color : 'var(--line-strong)'}`,
      borderRadius: 'var(--r-card)',
      boxShadow: expanded ? 'var(--shadow-active)' : 'var(--shadow-rest)',
      overflow: 'hidden',
      transition: 'box-shadow 200ms var(--ease)',
    }}>
      <button onClick={onToggle} style={{
        width: '100%', padding: 14,
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        {/* Commander art tile */}
        <div style={{
          width: 54, height: 70, borderRadius: 10, flexShrink: 0,
          overflow: 'hidden', position: 'relative',
          background: 'var(--parchment-deep)',
          boxShadow: 'inset 0 0 0 1px var(--line-strong)',
        }}>
          {cmd && (
            <img src={cmd.art} alt="" style={{ width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: '50% 18%', display: 'block',
              filter: 'saturate(0.95) contrast(1.02)' }}/>
          )}
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 60%, rgba(10,6,4,0.55) 100%)' }}/>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--fg-subtle)' }}>
            <span style={{ color: cat ? cat.color : 'var(--ink-3)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {game.pod}
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ color: 'var(--fg-subtle)', fontWeight: 600 }}>{game.date}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 400,
            fontSize: 18, lineHeight: 1.15, color: 'var(--ink)',
            letterSpacing: '-0.01em', marginTop: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cmd ? cmd.short : game.myCommanderId}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
            fontSize: 12, color: 'var(--fg-muted)', fontWeight: 500,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {primary ? (
              <>
                <span style={{ color: cat.color, fontWeight: 700 }}>{cat.label}</span>
                {extra > 0 && <span style={{ color: 'var(--fg-subtle)' }}>+{extra}</span>}
              </>
            ) : (
              <span style={{ color: 'var(--fg-subtle)', fontStyle: 'italic' }}>No badges earned</span>
            )}
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ color: 'var(--fg-subtle)' }}>{game.duration}</span>
          </div>
        </div>

        {/* Right cluster — primary glyph + chevron */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          {primary ? (
            <div style={{
              width: 44, height: 44, borderRadius: 999,
              background: cat.soft, color: cat.color,
              border: `1.5px solid ${cat.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <BadgeGlyph name={primary.id} size={26} stroke={cat.color} glyphBase={glyphBase}/>
              {extra > 0 && (
                <div style={{
                  position: 'absolute', bottom: -4, right: -4,
                  minWidth: 18, height: 18, borderRadius: 999,
                  background: 'var(--ink)', color: 'var(--parchment)',
                  fontSize: 10, fontWeight: 700, padding: '0 5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid var(--parchment-card)',
                }}>+{extra}</div>
              )}
            </div>
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 999,
              border: '1.5px dashed var(--line-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--fg-subtle)',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>—</span>
            </div>
          )}
          <div style={{ color: 'var(--fg-subtle)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms var(--ease)' }}>
            <Icon name="chevron-down" size={16}/>
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 16px', borderTop: '1px solid var(--line)' }}>
          {/* Meta strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0 14px', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-subtle)' }}>
            <span>{game.time} · {game.duration}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <AuraMark size={11} color={game.auraDelta >= 0 ? 'var(--forest)' : 'var(--cat-rivalry)'}/>
              <span style={{
                color: game.auraDelta >= 0 ? 'var(--forest-deep)' : 'var(--cat-rivalry)',
                fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 16,
                letterSpacing: '-0.01em', textTransform: 'none',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {game.auraDelta >= 0 ? '+' : '−'}{Math.abs(game.auraDelta)}
              </span>
              <span style={{ color: 'var(--fg-subtle)', fontWeight: 700,
                fontSize: 10, letterSpacing: '0.14em' }}>AURA</span>
            </span>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 10 }}>
            At the table
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, paddingTop: 8 }}>
            {game.players.map((pid: any) => (
              <TableSeat key={pid} playerId={pid} isYou={pid === youId}
                isWinner={pid === game.winnerId} players={players}/>
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 10 }}>
            Badges you earned
          </div>
          {game.myBadges.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {game.myBadges.map((b: any, i: any) => (
                <EarnedRow key={i} badge={b} players={players} glyphBase={glyphBase}/>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '14px 12px',
              border: '1px dashed var(--line-strong)',
              borderRadius: 14, fontSize: 13, color: 'var(--fg-subtle)',
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              textAlign: 'center',
            }}>The pod left this one unsigned.</div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onOpenMemoryCard?.(game); }}
            style={{
              width: '100%', marginTop: 18, padding: '14px 16px',
              background: 'var(--ink)', color: 'var(--parchment)',
              border: 'none', borderRadius: 14,
              fontSize: 14, fontWeight: 600, letterSpacing: '0.04em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: 'pointer', boxShadow: 'var(--shadow-rest)',
            }}>
            <Icon name="card" size={16} width={2}/>
            Open Memory Card
          </button>
        </div>
      )}
    </div>
  );
}

// ── Bottom navigation (matches profile/decks pages) ──────────────────────────
function BottomNav({ active = 'recent' }: { active?: 'profile' | 'decks' | 'recent' }) {
  const items: { id: 'profile' | 'decks' | 'recent'; label: string; href: string; icon?: string }[] = [
    { id: 'profile', label: 'Profile', href: '/profile', icon: 'profile' },
    { id: 'decks',   label: 'Decks',   href: '/decks' },
    { id: 'recent',  label: 'Recent',  href: '/recent-games', icon: 'layers' },
  ];

  const navIcon = (name: string, color: string) => {
    const p: any = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' };
    if (name === 'profile') return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>;
    if (name === 'layers')  return <svg {...p}><path d="M3 6h18M3 12h18M3 18h12"/></svg>;
    return null;
  };

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      borderTop: '1px solid rgba(43,33,24,0.14)',
      background: 'rgba(250,245,234,0.92)',
      backdropFilter: 'blur(14px) saturate(120%)',
      WebkitBackdropFilter: 'blur(14px) saturate(120%)',
      display: 'flex',
      padding: '8px 8px calc(22px + env(safe-area-inset-bottom, 0px))',
      fontFamily: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
      zIndex: 50,
    }}>
      {items.map((item) => {
        const isActive = item.id === active;
        const color = isActive ? '#2F5D3A' : '#8A7E6F';
        return (
          <a key={item.id} href={item.href} style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '6px 0',
            color,
            textDecoration: 'none',
          }}>
            {item.id === 'decks' ? (
              <AuraMark size={22} color={color}/>
            ) : item.icon ? (
              navIcon(item.icon, color)
            ) : null}
            <span style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase' as const,
              color,
            }}>{item.label}</span>
          </a>
        );
      })}
    </div>
  );
}

// ── Month divider ────────────────────────────────────────────────────────────
function MonthDivider({ label, count }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 10px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: 'var(--fg-subtle)' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)',
        fontVariantNumeric: 'tabular-nums' }}>{count}</div>
    </div>
  );
}

// ── Filter sheet ─────────────────────────────────────────────────────────────
function FilterSheet({ open, filter, onChange, onClose, onClear, commanders }: any) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30,
      pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: open ? 'rgba(43,33,24,0.4)' : 'transparent',
        backdropFilter: open ? 'blur(4px)' : 'none',
        WebkitBackdropFilter: open ? 'blur(4px)' : 'none',
        transition: 'background 200ms var(--ease)',
      }}/>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--parchment-card)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        boxShadow: '0 -12px 40px -8px rgba(43,33,24,0.25)',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 240ms var(--ease)',
        maxHeight: '80%',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--line-strong)' }}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 18px 14px' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 400,
            fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.01em' }}>Filter games</h2>
          <button onClick={onClear} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--fg-muted)', fontSize: 13, fontWeight: 600,
            letterSpacing: '0.04em', padding: 4,
          }}>Clear</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 8 }}>
            Commander
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            <CommanderRow
              label="All commanders"
              caption="Show every game"
              isAll
              selected={!filter.commanderId}
              onSelect={() => onChange({ ...filter, commanderId: null })}
            />
            {commanders.map((c: any) => (
              <CommanderRow
                key={c.id}
                label={c.short}
                caption={`${c.plays} ${c.plays === 1 ? 'game' : 'games'}`}
                art={c.art}
                selected={filter.commanderId === c.id}
                onSelect={() => onChange({ ...filter, commanderId: c.id })}
              />
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 8 }}>
            Sort by Aura
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { id: 'recent',    label: 'Most recent' },
              { id: 'aura-desc', label: 'Aura — high to low' },
              { id: 'aura-asc',  label: 'Aura — low to high' },
            ].map((o: any) => {
              const active = filter.sort === o.id;
              return (
                <button key={o.id} onClick={() => onChange({ ...filter, sort: o.id })} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: active ? 'var(--forest-soft)' : 'var(--parchment)',
                  border: `1px solid ${active ? 'var(--forest-line)' : 'var(--line)'}`,
                  borderRadius: 12, cursor: 'pointer',
                  fontSize: 14, fontWeight: 600,
                  color: active ? 'var(--forest-deep)' : 'var(--ink)',
                  textAlign: 'left',
                }}>
                  <span>{o.label}</span>
                  <span style={{
                    width: 18, height: 18, borderRadius: 999,
                    border: `1.5px solid ${active ? 'var(--forest)' : 'var(--line-strong)'}`,
                    background: active ? 'var(--forest)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && <span style={{ width: 8, height: 8, borderRadius: 999,
                      background: 'var(--parchment)' }}/>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '12px 18px 22px', borderTop: '1px solid var(--line)',
          background: 'var(--parchment-card)' }}>
          <button onClick={onClose} style={{
            width: '100%',
            background: 'var(--forest)', color: 'var(--parchment)',
            border: 'none', borderRadius: 14,
            padding: '14px 16px',
            fontSize: 15, fontWeight: 600, letterSpacing: '0.02em',
            cursor: 'pointer', boxShadow: 'var(--shadow-rest)',
          }}>Show games</button>
        </div>
      </div>
    </div>
  );
}

function CommanderRow({ label, caption, art, isAll, selected, onSelect }: any) {
  return (
    <button onClick={onSelect} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px',
      background: selected ? 'var(--forest-soft)' : 'transparent',
      border: `1px solid ${selected ? 'var(--forest-line)' : 'var(--line)'}`,
      borderRadius: 14, cursor: 'pointer', textAlign: 'left',
    }}>
      {isAll ? (
        <div style={{
          width: 40, height: 50, borderRadius: 8, flexShrink: 0,
          background: 'var(--parchment-deep)',
          border: '1px dashed var(--line-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg-subtle)',
          fontFamily: 'var(--font-display)', fontSize: 18,
        }}>∞</div>
      ) : (
        <div style={{
          width: 40, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
          background: 'var(--parchment-deep)', boxShadow: 'inset 0 0 0 1px var(--line-strong)',
        }}>
          <img src={art} alt="" style={{ width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: '50% 20%' }}/>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 400,
          fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--fg-subtle)',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{caption}</div>
      </div>
      <div style={{
        width: 22, height: 22, borderRadius: 999,
        border: `1.5px solid ${selected ? 'var(--forest)' : 'var(--line-strong)'}`,
        background: selected ? 'var(--forest)' : 'transparent',
        color: 'var(--parchment)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {selected && <Icon name="check" size={12} width={3} stroke="currentColor"/>}
      </div>
    </button>
  );
}

// ── Top-level screen ─────────────────────────────────────────────────────────
function RecentGamesScreen({
  games        = DEMO_GAMES,
  players      = DEMO_PLAYERS,
  myCommanders = DEMO_COMMANDERS,
  youId        = 'frederico',
  glyphBase,
  onOpenMemoryCard,
  onNavigate,
}: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState({ commanderId: null, sort: 'recent' });
  const [filterOpen, setFilterOpen] = useState(false);

  // One-time token + font injection.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('aura-tokens')) {
      const s = document.createElement('style'); s.id = 'aura-tokens';
      s.textContent = TOKEN_CSS; document.head.appendChild(s);
    }
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = FONT_HREF; document.head.appendChild(l);
    }
  }, []);

  const visible = games
    .filter((g: any) => !filter.commanderId || g.myCommanderId === filter.commanderId)
    .slice()
    .sort((a: any, b: any) => {
      if (filter.sort === 'aura-asc')  return a.auraDelta - b.auraDelta;
      if (filter.sort === 'aura-desc') return b.auraDelta - a.auraDelta;
      return 0;
    });

  const groups = groupByMonth(visible);
  const filterCount = (filter.commanderId ? 1 : 0) + (filter.sort !== 'recent' ? 1 : 0);
  const activeCommander = filter.commanderId ? findById(myCommanders, filter.commanderId) : null;

  return (
    <div className="aura-root" style={{
      position: 'relative', width: '100%', minHeight: '100vh',
      background: 'var(--parchment)',
      display: 'flex', flexDirection: 'column',
    }}>
      <TopBar
        title="Recent Games"
        right={<FilterButton active={filterCount > 0} count={filterCount}
          onClick={() => setFilterOpen(true)}/>}
      />

      <div style={{ padding: '10px 18px 6px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--fg-subtle)' }}>
          {visible.length} {visible.length === 1 ? 'game' : 'games'}
          {activeCommander && (
            <span style={{ color: 'var(--forest)', marginLeft: 8 }}>· {activeCommander.short}</span>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 110px' }}>
        {groups.map((group: any) => (
          <div key={group.label}>
            <MonthDivider label={group.label} count={group.items.length}/>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {group.items.map((g: any) => (
                <GameRow
                  key={g.id}
                  game={g}
                  expanded={expandedId === g.id}
                  onToggle={() => setExpandedId(expandedId === g.id ? null : g.id)}
                  onOpenMemoryCard={onOpenMemoryCard}
                  players={players}
                  commanders={myCommanders}
                  youId={youId}
                  glyphBase={glyphBase}
                />
              ))}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div style={{ padding: '36px 16px', textAlign: 'center',
            color: 'var(--fg-subtle)', fontFamily: 'var(--font-display)',
            fontSize: 16, fontStyle: 'italic' }}>
            No games match this filter.
          </div>
        )}
      </div>

      <BottomNav active="recent" onNavigate={onNavigate}/>

      <FilterSheet
        open={filterOpen}
        filter={filter}
        commanders={myCommanders}
        onChange={setFilter}
        onClose={() => setFilterOpen(false)}
        onClear={() => setFilter({ commanderId: null, sort: 'recent' })}
      />
    </div>
  );
}


/* ── Real-data wrapper ───────────────────────────────────────────── */

type Game = {
  id: string;
  pod: string;
  date: string;
  time: string;
  duration: string;
  myCommanderId: string;
  players: string[];
  winnerId: string | null;
  auraDelta: number;
  myBadges: { id: string; from: string }[];
  shareCode: string | null;
};

type Player = { id: string; name: string; commanderShort: string; art: string };
type CommanderItem = { id: string; name: string; short: string; art: string; plays: number };

function shortName(full: string | null | undefined): string {
  if (!full) return 'Unknown';
  return full.split(',')[0].trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RecentGamesPageInner() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [commanders, setCommanders] = useState<CommanderItem[]>([]);
  const [youId, setYouId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setYouId(user.id);

      const log = await getGameLog(user.id, { pageSize: 50 });

      // Build players and commanders maps from podCommanders
      const playerMap = new Map<string, Player>();
      const commanderMap = new Map<string, CommanderItem>();
      const commanderPlays = new Map<string, number>();

      for (const e of log.entries) {
        for (const p of e.podCommanders) {
          if (!playerMap.has(p.userId)) {
            playerMap.set(p.userId, {
              id: p.userId,
              name: shortName(p.commanderName),  // best-effort: use commander short as display name
              commanderShort: shortName(p.commanderName),
              art: p.artUrl ?? '',
            });
          }
        }
        // Track plays per deck (for the filter sheet)
        const cmdId = e.deckId;
        commanderPlays.set(cmdId, (commanderPlays.get(cmdId) ?? 0) + 1);
        if (!commanderMap.has(cmdId)) {
          commanderMap.set(cmdId, {
            id: cmdId,
            name: e.commanderName,
            short: shortName(e.commanderName),
            art: e.commanderArtUrl ?? '',
            plays: 1,
          });
        }
      }
      // Apply final play counts
      commanderMap.forEach((c: any, id: any) => {
        c.plays = commanderPlays.get(id) ?? 0;
      });

      // Fetch real player names from auth users via a single batch query
      const userIds = Array.from(playerMap.keys());
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds) as any;
        for (const prof of profiles ?? []) {
          const p = playerMap.get(prof.id);
          if (p && prof.display_name) p.name = prof.display_name as string;
        }
      }

      // Fetch badge attributions for all games at once
      const gameIds = log.entries.map((e: any) => e.gameId);
      let badgeRows: any[] = [];
      if (gameIds.length > 0) {
        const { data } = await supabase
          .from('badge_attributions')
          .select('game_id, user_id, badges_received')
          .in('game_id', gameIds) as any;
        badgeRows = data ?? [];
      }

      // Map: gameId → user's badges_received
      const myBadgesByGame = new Map<string, string[]>();
      for (const row of badgeRows) {
        if (row.user_id === user.id) {
          myBadgesByGame.set(row.game_id, (row.badges_received as string[]) ?? []);
        }
      }

      // Map game entries to the Game shape RecentGamesScreen expects
      const mapped: Game[] = log.entries.map((e: any) => {
        const myBadgeIds = myBadgesByGame.get(e.gameId) ?? [];
        const myBadges = myBadgeIds.map((id: string) => ({ id, from: '' }));  // 'from' wired later from votes table
        const winner = e.podCommanders.find((p: any) => p.isWinner);
        return {
          id: e.gameId,
          pod: `${e.podSize}-player game`,
          date: formatDate(e.gameDate),
          time: '',
          duration: '',
          myCommanderId: e.deckId,
          players: e.podCommanders.map((p: any) => p.userId),
          winnerId: winner?.userId ?? null,
          auraDelta: e.isWinner ? 8 : (myBadgeIds.length > 0 ? 4 : 0),
          myBadges,
          shareCode: e.shareCode,
        };
      });

      setGames(mapped);
      setPlayers(Array.from(playerMap.values()));
      setCommanders(Array.from(commanderMap.values()));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="aura-root" style={{
        position: 'relative', width: '100%', minHeight: '100vh',
        background: 'var(--parchment, #F5EFE2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-3, #8A7E6F)', fontFamily: '\'Instrument Sans\', sans-serif', fontSize: 14,
      }}>Loading recent games…</div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="aura-root" style={{
        position: 'relative', width: '100%', minHeight: '100vh',
        background: 'var(--parchment, #F5EFE2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12,
        color: 'var(--ink-3, #8A7E6F)', fontFamily: '\'Young Serif\', serif', fontSize: 18, fontStyle: 'italic',
        padding: 24, textAlign: 'center',
      }}>
        <div>No games yet.</div>
        <div style={{ fontSize: 13, fontStyle: 'normal', fontFamily: '\'Instrument Sans\', sans-serif' }}>
          When your pod finishes a game, it shows up here.
        </div>
      </div>
    );
  }

  return (
    <RecentGamesScreen
      games={games}
      players={players}
      myCommanders={commanders}
      youId={youId}
      onOpenMemoryCard={(game: any) => {
        if (game.shareCode) router.push(`/c/${game.shareCode}`);
      }}
      onNavigate={(tabId: string) => {
        if (tabId === 'profile') router.push('/profile');
        else if (tabId === 'decks') router.push('/decks');
        // 'recent' is already this page
      }}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24, fontFamily: 'sans-serif' }}>Loading…</div>}>
      <RecentGamesPageInner/>
    </Suspense>
  );
}
