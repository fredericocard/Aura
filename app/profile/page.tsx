'use client';

import Link from 'next/link';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../lib/auth-context';
import { getUserCommanderSummaries, type CommanderSummary } from '@/lib/commander-profile';
import { confirmBracketAndApplyScoring, BRACKETS } from '@/lib/commanders';
import { supabase } from '@/lib/supabase';

/* ──────────────────────────────────────────────────────────────────
   Design tokens (inline — mirrors tokens.css)
   ────────────────────────────────────────────────────────────── */
const T = {
  parchment:      '#F5EFE2',
  parchmentCard:  '#FAF5EA',
  parchmentDeep:  '#EDE4D0',
  ink:            '#2B2118',
  ink2:           '#5C5043',
  ink3:           '#8A7E6F',
  ink4:           '#B8AE9E',
  forest:         '#B06B2C',
  forestDeep:     '#8C5422',
  forestSoft:     '#F3E3D1',
  forestLine:     'rgba(176,107,44,.35)',
  copper:         '#B06B2C',
  copperDeep:     '#8A5320',
  copperSoft:     '#F3E3D1',
  gold:           '#C99B2F',
  rivalry:        '#9E2B2B',
  rivalrySoft:    '#F1D4CF',
  line:           'rgba(43,33,24,.08)',
  lineStrong:     'rgba(43,33,24,.14)',
  fontUI:         "'Instrument Sans', ui-sans-serif, system-ui, sans-serif",
  fontDisplay:    "'Young Serif', ui-serif, Georgia, serif",
  shadowRest:     '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
  shadowActive:   '0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22)',
};

/* Category definitions for commander vibe badges */
const CATEGORIES = [
  { id: 'brilliance', color: '#C99B2F', soft: '#F6ECD2', glyph: '/assets/glyphs/brilliance.png' },
  { id: 'flavor',     color: '#7E4E8A', soft: '#EADDEE', glyph: '/assets/glyphs/flavor.png' },
  { id: 'rivalry',    color: '#9E2B2B', soft: '#F1D4CF', glyph: '/assets/glyphs/rivalry.png' },
  { id: 'allegiance', color: '#2F7A74', soft: '#D6E6E3', glyph: '/assets/glyphs/allegiance.png' },
  { id: 'fun',        color: '#E07B4A', soft: '#F9DFCD', glyph: '/assets/glyphs/fun.png' },
];

/* ──────────────────────────────────────────────────────────────────
   Inline SVG icons
   ────────────────────────────────────────────────────────────── */
function ProfileIcon({ name, size = 22, stroke = 'currentColor', width = 1.75 }: {
  name: string; size?: number; stroke?: string; width?: number;
}) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, React.ReactNode> = {
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    user:     <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    decks:    <><rect x="6" y="4" width="13" height="17" rx="2.5" transform="rotate(-6 12 13)"/><rect x="3" y="6" width="13" height="17" rx="2.5" transform="rotate(6 12 13)"/></>,
    history:  <><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/><path d="M12 8v5l3 2"/></>,
    plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    'log-out':<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    camera:   <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
    pencil:   <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
    'chevron-right': <polyline points="9 18 15 12 9 6"/>,
    'chevron-left':  <polyline points="15 18 9 12 15 6"/>,
    profile:  <><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
    layers:   <><path d="M3 6h18M3 12h18M3 18h12"/></>,
    check:    <polyline points="20 6 9 17 4 12"/>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

/* ──────────────────────────────────────────────────────────────────
   BadgeGlyph — PNG-mask trait emblem
   ────────────────────────────────────────────────────────────── */
function BadgeGlyph({ name, size = 28, stroke = 'currentColor' }: {
  name: string; size?: number; stroke?: string;
}) {
  const cat = CATEGORIES.find(c => c.id === name);
  if (!cat) return null;
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      backgroundColor: stroke,
      WebkitMaskImage: `url("${cat.glyph}")`,
      maskImage: `url("${cat.glyph}")`,
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center', maskPosition: 'center',
      WebkitMaskSize: 'contain', maskSize: 'contain',
    }}/>
  );
}

/* ──────────────────────────────────────────────────────────────────
   AuraMark — brand mark SVG
   ────────────────────────────────────────────────────────────── */
function AuraMark({ size = 22, color = T.forest }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="36" r="2.4" fill={color}/>
      <defs>
        <clipPath id={`aura-clip-${size}`}><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath>
      </defs>
      <g clipPath={`url(#aura-clip-${size})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color}/>
        <polygon points="40,60 33,4 34,4 56,60" fill={color}/>
      </g>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────────
   MonogramAvatar — serif initial, copper rim, compass ticks
   ────────────────────────────────────────────────────────────── */
function MonogramAvatar({ initial, size = 96, ring = true }: {
  initial: string; size?: number; ring?: boolean;
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: T.parchmentDeep,
      boxShadow: ring
        ? `0 0 0 2px ${T.parchmentCard}, 0 0 0 4px ${T.copper}, 0 12px 28px -12px rgba(43,33,24,0.45)`
        : `0 0 0 2px ${T.parchmentCard}, 0 0 0 1px ${T.lineStrong}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {ring && (
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
          <g stroke={T.copperDeep} strokeWidth="0.6" fill="none">
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2;
              const x1 = 50 + Math.cos(a) * 42, y1 = 50 + Math.sin(a) * 42;
              const x2 = 50 + Math.cos(a) * 47, y2 = 50 + Math.sin(a) * 47;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}/>;
            })}
          </g>
        </svg>
      )}
      <span style={{
        fontFamily: T.fontDisplay, fontWeight: 400,
        fontSize: size * 0.46, color: T.ink, letterSpacing: '-0.02em',
        lineHeight: 1, position: 'relative',
      }}>{initial}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   ProfileTopBar — Aura mark + settings gear
   ────────────────────────────────────────────────────────────── */
/* ── Decorative compass rose SVG ────────────────────────────────────────── */
function CompassRose({ size = 200, color = 'rgba(201,155,47,0.07)' }: { size?: number; color?: string }) {
  const n = 32;
  const lines = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const inner = i % 4 === 0 ? 8 : i % 2 === 0 ? 18 : 26;
    const outer = i % 4 === 0 ? 48 : i % 2 === 0 ? 46 : 44;
    return `M${50 + Math.cos(a) * inner} ${50 + Math.sin(a) * inner}L${50 + Math.cos(a) * outer} ${50 + Math.sin(a) * outer}`;
  }).join('');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', opacity: 1, pointerEvents: 'none' }}>
      <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="0.5"/>
      <circle cx="50" cy="50" r="28" fill="none" stroke={color} strokeWidth="0.4"/>
      <circle cx="50" cy="50" r="3" fill={color}/>
      <path d={lines} stroke={color} strokeWidth="0.6" fill="none"/>
    </svg>
  );
}

function ProfileTopBar({ onSettings, name, initial, joined, gameCount }: {
  onSettings: () => void; name: string; initial: string; joined: string; gameCount: number;
}) {
  return (
    <div style={{
      position: 'relative', zIndex: 10, flexShrink: 0, overflow: 'hidden',
      background: T.ink,
      padding: '14px 16px 20px',
    }}>
      {/* Dark radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 30% 60%, rgba(176,107,44,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(201,155,47,0.10) 0%, transparent 50%)',
      }}/>
      {/* Compass rose decoration — behind avatar */}
      <div style={{ position: 'absolute', right: -20, top: -10, pointerEvents: 'none', opacity: 0.8 }}>
        <CompassRose size={180} color="rgba(201,155,47,0.08)"/>
      </div>
      {/* Fine grain texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'1\' cy=\'1\' r=\'0.6\' fill=\'%23C99B2F\'/%3E%3C/svg%3E")',
        backgroundSize: '6px 6px',
      }}/>

      {/* Aura wordmark row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
        <Link href="/landing" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <AuraMark size={20} color={T.gold}/>
          <span style={{
            fontFamily: T.fontDisplay, fontWeight: 400,
            fontSize: 18, color: T.gold, letterSpacing: '-0.01em', lineHeight: 1,
          }}>Aura</span>
        </Link>
        <button onClick={onSettings} aria-label="Settings" style={{
          width: 36, height: 36, borderRadius: 999, border: 'none',
          background: 'rgba(255,255,255,0.06)', color: T.ink4,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <ProfileIcon name="settings" size={20}/>
        </button>
      </div>
      {/* Identity row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 999, flexShrink: 0,
          background: 'rgba(201,155,47,0.12)',
          boxShadow: `0 0 0 2px rgba(201,155,47,0.25), 0 8px 20px -8px rgba(0,0,0,0.5)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: T.fontDisplay, fontWeight: 400,
            fontSize: 24, color: T.gold, letterSpacing: '-0.02em', lineHeight: 1,
          }}>{initial}</span>
        </div>
        <div>
          <h1 style={{
            margin: 0, fontFamily: T.fontDisplay, fontWeight: 400,
            fontSize: 24, color: '#FAF5EA', letterSpacing: '-0.02em', lineHeight: 1,
          }}>{name}</h1>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase' as const, color: T.ink4, marginTop: 4,
          }}>{joined} · {gameCount} games</div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   IdentityHero — avatar + name + meta line
   ────────────────────────────────────────────────────────────── */
function IdentityHero({ name, initial, joined, gameCount }: {
  name: string; initial: string; joined: string; gameCount: number;
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, padding: '0 24px',
    }}>
      <MonogramAvatar initial={initial} size={76}/>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          fontFamily: T.fontDisplay, fontWeight: 400,
          fontSize: 22, lineHeight: 1.1, letterSpacing: '-0.01em',
          color: T.ink,
        }}>{name}</div>
        <div style={{
          fontFamily: T.fontUI, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.14em', textTransform: 'uppercase' as const,
          color: T.ink3,
        }}>{joined} · {gameCount} games</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   PodCard — Create / Join CTA
   ────────────────────────────────────────────────────────────── */
function PodCard() {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '0 16px' }}>
      <Link href="/create" style={{
        flex: 1, border: 'none', cursor: 'pointer', textDecoration: 'none',
        background: T.forest, color: T.parchment,
        fontFamily: T.fontUI, fontWeight: 600, fontSize: 14,
        padding: '12px 14px', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        boxShadow: T.shadowRest,
      }}>
        <ProfileIcon name="plus" size={16} width={2.2} stroke={T.parchment}/>
        Create a pod
      </Link>
      <Link href="/join" style={{
        flex: 1, cursor: 'pointer', textDecoration: 'none',
        background: T.parchmentCard, color: T.ink,
        border: `1px solid ${T.lineStrong}`,
        fontFamily: T.fontUI, fontWeight: 600, fontSize: 14,
        padding: '12px 14px', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>Join a pod</Link>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   CommanderMiniCard — vertical card: art + parchment banner
   ────────────────────────────────────────────────────────────── */
function CommanderMiniCard({ commander }: { commander: CommanderSummary }) {
  // Pick a vibe/category based on the commander's top badge or default
  const vibeId = getTopBadge(commander);
  const cat = CATEGORIES.find(c => c.id === vibeId) || CATEGORIES[0];

  return (
    <Link href={`/deck-accomplishments?deckId=${commander.deckId}`} style={{
      flex: 1, minWidth: 0, padding: 0, textDecoration: 'none',
      borderRadius: 14, overflow: 'hidden',
      boxShadow: `${T.shadowRest}, inset 0 0 0 1px ${T.line}`,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        position: 'relative',
        height: 134,
        background: T.ink,
        overflow: 'hidden',
      }}>
        {commander.commanderArtUrl ? (
          <img src={commander.commanderArtUrl} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: '50% 22%',
            filter: 'saturate(0.95) contrast(1.02)',
          }}/>
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: T.parchmentDeep,
            fontFamily: T.fontDisplay, fontSize: 36, color: T.ink3,
          }}>{commander.commanderName.charAt(0)}</div>
        )}
        {/* gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 40%, rgba(10,6,4,0.55) 100%)',
        }}/>
        {/* vibe sigil top-left */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          width: 22, height: 22, borderRadius: 999,
          background: 'rgba(10,6,4,0.55)',
          border: `1px solid ${cat.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: cat.color,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}>
          <BadgeGlyph name={cat.id} size={13} stroke={cat.color}/>
        </div>
      </div>
      <div style={{
        background: T.parchmentCard,
        padding: '8px 9px 9px',
        textAlign: 'left',
      }}>
        <div style={{
          fontFamily: T.fontDisplay, fontWeight: 400,
          fontSize: 14, lineHeight: 1.1, color: T.ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.005em',
        }}>{commander.commanderName.split(',')[0]}</div>
        <div style={{
          fontFamily: T.fontUI, fontSize: 10, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase' as const,
          color: T.ink3, marginTop: 3,
        }}>{commander.totalGames} games</div>
      </div>
    </Link>
  );
}

/** Pick the strongest badge category for a commander */
function getTopBadge(c: CommanderSummary): string {
  // Commander summary doesn't carry per-badge counts, so default to brilliance
  // This will be refined when we have badge breakdown in the summary
  return 'brilliance';
}

/* ──────────────────────────────────────────────────────────────────
   CommandersSection
   ────────────────────────────────────────────────────────────── */
function CommandersSection({ commanders, loading }: { commanders: CommanderSummary[]; loading: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <div style={{
          fontFamily: T.fontUI, fontWeight: 700, fontSize: 14,
          letterSpacing: '0.14em', textTransform: 'uppercase' as const,
          color: T.ink2,
        }}>Top Commanders</div>
        <Link href="/decks" style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: T.fontUI, fontSize: 12, fontWeight: 600,
          color: T.forest, letterSpacing: '0.04em',
          padding: 0, textDecoration: 'none',
        }}>See all</Link>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '0 16px' }}>
        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: T.ink3, fontSize: 13, fontFamily: T.fontUI, width: '100%' }}>Loading commanders...</div>
        ) : commanders.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: T.ink3, fontSize: 13, fontFamily: T.fontUI, width: '100%' }}>No commanders registered yet</div>
        ) : (
          commanders.slice(0, 3).map(c => <CommanderMiniCard key={c.deckId} commander={c}/>)
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   BottomNav — matches decks page exactly
   ────────────────────────────────────────────────────────────── */
function BottomNav({ active = 'profile' }: { active?: 'profile' | 'decks' | 'recent' }) {
  const items: { id: 'profile' | 'decks' | 'recent'; label: string; href: string; icon?: string }[] = [
    { id: 'profile', label: 'Profile', href: '/profile', icon: 'profile' },
    { id: 'decks',   label: 'Decks',   href: '/decks' },
    { id: 'recent',  label: 'Recent',  href: '/recent-games', icon: 'layers' },
  ];

  return (
    <div style={{
      borderTop: `1px solid ${T.lineStrong}`,
      background: 'rgba(250,245,234,0.9)',
      backdropFilter: 'blur(14px) saturate(120%)',
      WebkitBackdropFilter: 'blur(14px) saturate(120%)',
      display: 'flex',
      padding: '8px 8px 22px',
      fontFamily: T.fontUI,
      flexShrink: 0,
    }}>
      {items.map(item => {
        const isActive = item.id === active;
        const color = isActive ? T.forest : T.ink3;
        return (
          <Link key={item.id} href={item.href} style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '6px 0',
            color,
            textDecoration: 'none',
          }}>
            {item.id === 'decks' ? (
              <AuraMark size={22} color={color}/>
            ) : item.icon ? (
              <ProfileIcon name={item.icon} size={22} stroke={color} width={1.75}/>
            ) : null}
            <span style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase' as const,
              color,
            }}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   SettingsSheet — bottom sheet overlay
   ────────────────────────────────────────────────────────────── */
function SheetRow({ icon, iconColor, iconBg, iconBorder, title, sub, titleColor = T.ink, onClick, chevron = false }: {
  icon: string; iconColor: string; iconBg: string; iconBorder: string;
  title: string; sub: string; titleColor?: string;
  onClick?: () => void; chevron?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      width: '100%', padding: '14px 14px',
      background: 'transparent', border: 'none', cursor: 'pointer',
      borderRadius: 16, textAlign: 'left',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: iconBg,
        border: `1.5px solid ${iconBorder}`,
        color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <ProfileIcon name={icon} size={20}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: T.fontUI, fontSize: 16, fontWeight: 600,
          color: titleColor, lineHeight: 1.2,
        }}>{title}</div>
        <div style={{
          fontFamily: T.fontUI, fontSize: 12, fontWeight: 500,
          color: T.ink3, marginTop: 2,
        }}>{sub}</div>
      </div>
      {chevron && (
        <ProfileIcon name="chevron-right" size={18} stroke={T.ink3} width={2}/>
      )}
    </button>
  );
}


/* ──────────────────────────────────────────────────────────────────
   useSheetDrag — swipe-down-to-dismiss (matches decks pattern)
   ────────────────────────────────────────────────────────────── */
function useSheetDrag(onDismiss: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const dragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
    dragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dy = e.touches[0].clientY - startY.current;
    currentY.current = Math.max(0, dy);
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${currentY.current}px)`;
  }, []);

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
    if (sheetRef.current) sheetRef.current.style.transition = 'transform 0.25s cubic-bezier(.22,.61,.36,1)';
    if (currentY.current > 100) {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(100%)';
      setTimeout(onDismiss, 250);
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }
    currentY.current = 0;
  }, [onDismiss]);

  return { sheetRef, onTouchStart, onTouchMove, onTouchEnd };
}

function SettingsSheet({ onClose, onAccount, onLogout }: {
  onClose: () => void; onAccount: () => void; onLogout: () => void;
}) {
  const drag = useSheetDrag(onClose);
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(43,33,24,0.55)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      fontFamily: T.fontUI,
    }}>
      <div ref={drag.sheetRef} onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 430, maxHeight: '88%',
        background: T.parchment,
        borderRadius: '24px 24px 0 0',
        padding: '14px 16px 0',
        boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
        display: 'flex', flexDirection: 'column',
        borderTop: `1px solid ${T.lineStrong}`,
        animation: 'popIn 240ms cubic-bezier(.22,.61,.36,1)',
      }}>
        {/* Drag handle + header */}
        <div
          onTouchStart={drag.onTouchStart}
          onTouchMove={drag.onTouchMove}
          onTouchEnd={drag.onTouchEnd}
          style={{ cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 999, background: T.ink4, margin: '0 auto 6px' }}/>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0 14px' }}>
            <div>
              <div style={{
                fontFamily: T.fontUI, fontWeight: 700,
                fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' as const,
                color: T.ink3,
              }}>Your account</div>
              <div style={{
                fontFamily: T.fontDisplay, fontWeight: 400, fontSize: 26,
                color: T.ink, letterSpacing: '-0.01em', marginTop: 2,
              }}>Settings</div>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: T.fontUI, fontSize: 13, fontWeight: 600,
              color: T.ink3, padding: 0,
            }}>Done</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            <SheetRow
              icon="user"
              iconColor={T.ink2}
              iconBg={T.parchmentDeep}
              iconBorder={T.lineStrong}
              title="Account"
              sub="Name, email, profile picture"
              onClick={onAccount}
              chevron
            />
          </div>

          <div style={{ paddingTop: 8, borderTop: `1px solid ${T.line}` }}>
            <button onClick={onLogout} style={{
              width: '100%', padding: '14px 14px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderRadius: 12, textAlign: 'center',
              fontFamily: T.fontUI, fontSize: 15, fontWeight: 600,
              color: T.rivalry,
            }}>Log out</button>
          </div>

          <div style={{
            marginTop: 18, paddingTop: 14,
            borderTop: `1px solid ${T.line}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <AuraMark size={16} color={T.ink3}/>
            <div style={{
              fontFamily: T.fontUI, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.22em', textTransform: 'uppercase' as const,
              color: T.ink3,
            }}>Aura · v1.0</div>
          </div>
        </div>
      </div>

      <style>{`@keyframes popIn { from { transform: translateY(20px); opacity: 0.6; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   AccountScreen — edit name, email, avatar
   ────────────────────────────────────────────────────────────── */
function FormField({ label, value, onChange, type = 'text', focused = false, readOnly = false }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; focused?: boolean; readOnly?: boolean;
}) {
  return (
    <div style={{
      background: T.parchmentCard,
      border: focused ? `1.5px solid ${T.forest}` : `1px solid ${T.lineStrong}`,
      borderRadius: 14,
      padding: '10px 14px 12px',
      position: 'relative',
    }}>
      <div style={{
        fontFamily: T.fontUI, fontSize: 11, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase' as const,
        color: focused ? T.forest : T.ink3,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <input
          type={type}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={readOnly}
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: T.fontUI, fontSize: 16, fontWeight: 500,
            color: readOnly ? T.ink3 : T.ink, padding: 0,
            letterSpacing: '-0.005em',
          }}
        />
        {!readOnly && <ProfileIcon name="pencil" size={16} stroke={T.ink3} width={1.8}/>}
      </div>
    </div>
  );
}

function AccountScreen({ initial, nameValue, emailValue, onNameChange, onBack, onSave, onDeleteAccount, onChangePhoto }: {
  initial: string; nameValue: string; emailValue: string;
  onNameChange: (v: string) => void; onBack: () => void;
  onSave: () => void; onDeleteAccount: () => Promise<void>; onChangePhoto: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (<>
    {/* Delete confirmation overlay */}
    {confirmDelete && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(43,33,24,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.fontUI,
      }}>
        <div style={{
          width: 'calc(100% - 48px)', maxWidth: 340,
          background: T.parchmentCard,
          border: `1px solid ${T.line}`,
          borderRadius: 24,
          boxShadow: '0 30px 60px -20px rgba(43,33,24,0.40)',
          padding: 24,
          animation: 'slideUpCard 0.35s cubic-bezier(0.22,1,0.36,1)',
        }}>
          <div style={{
            fontFamily: T.fontDisplay, fontSize: 22, color: T.ink,
            letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 10, textAlign: 'center',
          }}>Delete Account?</div>
          <div style={{
            fontSize: 14, color: T.ink2, lineHeight: 1.5, textAlign: 'center', marginBottom: 20,
          }}>
            This is permanent. All your decks, games, badges, memory cards, and aura scores will be erased forever.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button disabled={deleting} onClick={async () => {
              setDeleting(true);
              await onDeleteAccount();
            }} style={{
              width: '100%', cursor: deleting ? 'default' : 'pointer',
              background: deleting ? T.ink3 : T.rivalry,
              color: T.parchment,
              border: 'none', borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600, fontFamily: T.fontUI,
            }}>{deleting ? 'Deleting...' : 'Delete Everything'}</button>
            <button disabled={deleting} onClick={() => setConfirmDelete(false)} style={{
              width: '100%', cursor: 'pointer',
              background: T.parchment,
              color: T.ink2,
              border: `1px solid ${T.lineStrong}`,
              borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600, fontFamily: T.fontUI,
            }}>Cancel</button>
          </div>
        </div>
      </div>
    )}

    <div style={{
      width: '100%', maxWidth: 430, height: '100%', position: 'fixed',
      top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
      zIndex: 90,
      background: T.parchment,
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(201,155,47,0.06), transparent 40%)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: T.fontUI,
    }}>
      {/* Header */}
      <div style={{ paddingTop: 'env(safe-area-inset-top, 16px)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 12px 14px',
          flexShrink: 0,
        }}>
          <button onClick={onBack} aria-label="Back" style={{
            width: 40, height: 40, borderRadius: 999, border: 'none',
            background: 'transparent', color: T.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <ProfileIcon name="chevron-left" size={24}/>
          </button>
          <h1 style={{
            margin: 0, fontFamily: T.fontUI, fontWeight: 700,
            fontSize: 20, letterSpacing: '-0.01em', color: T.ink,
            flex: 1,
          }}>Account</h1>
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '4px 16px 24px',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {/* Avatar block */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '4px 0 8px' }}>
          <div style={{ position: 'relative' }}>
            <MonogramAvatar initial={initial} size={96}/>
            <button onClick={onChangePhoto} aria-label="Change photo" style={{
              position: 'absolute', right: -2, bottom: -2,
              width: 34, height: 34, borderRadius: 999,
              background: T.ink, color: T.parchment,
              border: `3px solid ${T.parchment}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px -2px rgba(43,33,24,0.35)',
            }}>
              <ProfileIcon name="camera" size={16} width={2} stroke={T.parchment}/>
            </button>
          </div>
          <button onClick={onChangePhoto} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: T.fontUI, fontSize: 13, fontWeight: 600,
            color: T.forest, padding: '4px 8px',
            letterSpacing: '0.04em',
          }}>Change photo</button>
        </div>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FormField label="Display name" value={nameValue} onChange={onNameChange} focused/>
          <FormField label="Email" value={emailValue} type="email" readOnly/>
        </div>

        {/* Save button */}
        <button onClick={onSave} style={{
          marginTop: 4,
          width: '100%', border: 'none', cursor: 'pointer',
          background: T.forest, color: T.parchment,
          fontFamily: T.fontUI, fontWeight: 600, fontSize: 16,
          padding: '16px 20px', borderRadius: 20,
          boxShadow: T.shadowRest,
        }}>Save changes</button>

        <div style={{ flex: 1, minHeight: 12 }}/>

        {/* Danger zone */}
        <div style={{
          paddingTop: 14,
          borderTop: `1px solid ${T.line}`,
          display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
        }}>
          <button onClick={() => setConfirmDelete(true)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: T.fontUI, fontSize: 14, fontWeight: 700,
            color: T.rivalry, padding: '8px 16px',
            letterSpacing: '0.04em',
          }}>Delete account</button>
          <div style={{
            fontFamily: T.fontUI, fontSize: 11, fontWeight: 500,
            color: T.ink3, textAlign: 'center', maxWidth: 240,
            lineHeight: 1.4,
          }}>Permanent. Removes your games, badges, and memory cards.</div>
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ height: 26, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 8, flexShrink: 0 }}>
        <div style={{ width: 134, height: 5, borderRadius: 999, background: 'rgba(43,33,24,0.65)' }}/>
      </div>
    </div>
  </>);
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [nameInputValue, setNameInputValue] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [commanders, setCommanders] = useState<CommanderSummary[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [gameCount, setGameCount] = useState(0);
  const [pendingBracketCommander, setPendingBracketCommander] = useState<CommanderSummary | null>(null);
  const [forcedBracket, setForcedBracket] = useState(2);
  const [confirmingBracket, setConfirmingBracket] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoadingDecks(false); return; }
      setNameInputValue(authUser.user_metadata?.display_name ?? authUser.email?.split('@')[0] ?? '');
      setUserEmail(authUser.email ?? '');

      // Derive join date
      if (authUser.created_at) {
        const d = new Date(authUser.created_at);
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        setJoinDate(`Joined ${months[d.getMonth()]} ${d.getFullYear()}`);
      }

      try {
        const summaries = await getUserCommanderSummaries(authUser.id);
        setCommanders(summaries);
        // Total game count across all commanders
        const total = summaries.reduce((sum, s) => sum + s.totalGames, 0);
        setGameCount(total);
        // Check for any commander with NULL bracket — show forced picker
        const needsBracket = summaries.find(s => s.bracket === null);
        if (needsBracket) {
          setPendingBracketCommander(needsBracket);
          setForcedBracket(2);
        }
      } catch {}
      setLoadingDecks(false);
    }
    load();
  }, []);

  const showToastMsg = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleConfirmForcedBracket = async () => {
    if (!pendingBracketCommander) return;
    setConfirmingBracket(true);

    const { error: confirmError } = await confirmBracketAndApplyScoring(pendingBracketCommander.deckId, forcedBracket);
    if (confirmError) {
      showToastMsg(`Error: ${confirmError}`);
      setConfirmingBracket(false);
      return;
    }

    // Update local state
    setCommanders(prev => prev.map(c =>
      c.deckId === pendingBracketCommander.deckId ? { ...c, bracket: forcedBracket } : c
    ));

    showToastMsg(`${pendingBracketCommander.commanderName} set to Bracket ${forcedBracket}!`);

    // Check for more NULL-bracket commanders
    const remaining = commanders.filter(c => c.bracket === null && c.deckId !== pendingBracketCommander.deckId);
    if (remaining.length > 0) {
      setPendingBracketCommander(remaining[0]);
      setForcedBracket(2);
    } else {
      setPendingBracketCommander(null);
    }
    setConfirmingBracket(false);
  };

  const initial = (nameInputValue || '?').charAt(0).toUpperCase();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; overflow: hidden; }
        @keyframes sheet-up {
          from { transform: translateY(20px); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      ` }} />

      <div style={{
        width: '100%', height: '100%', maxWidth: 430, margin: '0 auto',
        position: 'relative',
        background: T.parchment,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: T.fontUI,
        paddingTop: 'env(safe-area-inset-top, 16px)',
      }}>
        <ProfileTopBar
          onSettings={() => setSettingsOpen(true)}
          name={nameInputValue || 'Player'}
          initial={initial}
          joined={joinDate || 'Joined recently'}
          gameCount={gameCount}
        />

        <div style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 16,
          paddingTop: 12, paddingBottom: 24,
        }}>
          <PodCard/>
          <CommandersSection commanders={commanders} loading={loadingDecks}/>
        </div>

        <BottomNav active="profile"/>
      </div>

      {/* Settings sheet */}
      {settingsOpen && (
        <SettingsSheet
          onClose={() => setSettingsOpen(false)}
          onAccount={() => { setSettingsOpen(false); setAccountOpen(true); }}
          onLogout={async () => {
            await signOut();
            setSettingsOpen(false);
            window.location.href = '/landing';
          }}
        />
      )}

      {/* Account screen */}
      {accountOpen && (
        <AccountScreen
          initial={initial}
          nameValue={nameInputValue}
          emailValue={userEmail}
          onNameChange={setNameInputValue}
          onBack={() => setAccountOpen(false)}
          onSave={async () => {
            const { error } = await supabase.auth.updateUser({
              data: { display_name: nameInputValue },
            });
            if (error) {
              showToastMsg('Failed to save: ' + error.message);
            } else {
              setAccountOpen(false);
              showToastMsg('Changes saved');
            }
          }}
          onDeleteAccount={async () => {
            try {
              // Calls the SECURITY DEFINER function that deletes auth.users row
              // CASCADE handles all child tables (profiles, decks, games, etc.)
              const { error } = await supabase.rpc('delete_own_account');
              if (error) throw error;
              // Sign out locally and redirect to landing
              await supabase.auth.signOut();
              window.location.href = '/landing';
            } catch (e: any) {
              showToastMsg('Failed to delete: ' + (e?.message || 'Unknown error'));
            }
          }}
          onChangePhoto={() => showToastMsg('Change Photo — Coming Soon')}
        />
      )}

      {/* Forced bracket picker — appears when a commander has NULL bracket */}
      {pendingBracketCommander && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: T.fontUI,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 430,
            background: T.parchment,
            borderRadius: '24px 24px 0 0',
            padding: '14px 16px 28px',
            boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
            maxHeight: '90%', overflow: 'auto',
            borderTop: `1px solid ${T.lineStrong}`,
            animation: 'popIn 240ms cubic-bezier(.22,.61,.36,1)',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: T.ink4, margin: '0 auto 6px' }}/>

            {/* Commander art + info header */}
            <div style={{ textAlign: 'center', marginBottom: 14, marginTop: 10 }}>
              {pendingBracketCommander.commanderArtUrl && (
                <div style={{
                  width: 80, height: 80, borderRadius: 20, overflow: 'hidden',
                  margin: '0 auto 12px',
                  border: `2px solid ${T.copper}`,
                  boxShadow: `0 8px 24px -8px rgba(43,33,24,0.4)`,
                }}>
                  <img src={pendingBracketCommander.commanderArtUrl} alt={pendingBracketCommander.commanderName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }}/>
                </div>
              )}
              <div style={{
                fontFamily: T.fontUI, fontWeight: 700,
                fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' as const,
                color: T.ink3,
              }}>Before we continue</div>
              <div style={{
                fontFamily: T.fontDisplay, fontWeight: 400, fontSize: 24,
                color: T.ink, letterSpacing: '-0.01em', marginTop: 2,
              }}>Set bracket for {pendingBracketCommander.commanderName}</div>
              <div style={{
                fontSize: 13, color: T.ink2,
                marginTop: 4, padding: '0 12px',
              }}>Pick a power level so your scores and badges can be applied.</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BRACKETS.map(b => {
                const selected = forcedBracket === b.value;
                return (
                  <button key={b.value} onClick={() => setForcedBracket(b.value)} style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'stretch', gap: 14,
                    padding: 14,
                    background: selected ? T.copperSoft : T.parchmentCard,
                    border: selected ? `1.5px solid ${T.copper}` : `1px solid rgba(43,33,24,0.08)`,
                    borderLeft: selected ? `6px solid ${T.copper}` : `4px solid ${T.ink4}`,
                    borderRadius: 20,
                    boxShadow: selected ? T.shadowActive : T.shadowRest,
                    fontFamily: T.fontUI,
                    transition: 'all 160ms cubic-bezier(.22,.61,.36,1)',
                  }}>
                    <div style={{
                      width: 56, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: selected ? T.parchmentCard : T.parchmentDeep,
                      borderRadius: 12,
                      border: selected ? `1px solid ${T.copper}` : `1px solid rgba(43,33,24,0.08)`,
                    }}>
                      <span style={{
                        fontFamily: T.fontDisplay,
                        fontSize: 38, fontWeight: 400,
                        color: selected ? T.copper : T.ink,
                        lineHeight: 1, letterSpacing: '-0.02em',
                      }}>{b.value}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                      <div style={{
                        fontFamily: T.fontDisplay, fontWeight: 400, fontSize: 18,
                        color: T.ink, letterSpacing: '-0.005em', lineHeight: 1.15,
                      }}>{b.label}</div>
                      <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.35 }}>{b.desc}</div>
                    </div>
                    {selected && (
                      <div style={{
                        flexShrink: 0, alignSelf: 'center',
                        width: 24, height: 24, borderRadius: 999,
                        background: T.copper, color: T.parchment,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ProfileIcon name="check" size={14} width={2.5}/>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button onClick={handleConfirmForcedBracket} disabled={confirmingBracket} style={{
              width: '100%', marginTop: 18, cursor: confirmingBracket ? 'default' : 'pointer',
              background: confirmingBracket ? T.ink3 : T.forest,
              border: 'none',
              borderRadius: 20,
              padding: '16px 16px',
              color: T.parchment,
              fontFamily: T.fontUI, fontWeight: 600, fontSize: 16,
              boxShadow: T.shadowRest,
            }}>{confirmingBracket ? 'Applying scores…' : 'Confirm Bracket'}</button>
          </div>
        </div>
      )}

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 100, left: '50%',
        transform: `translateX(-50%) translateY(${showToast ? 0 : 20}px)`,
        background: T.ink, color: T.parchment,
        padding: '10px 20px', borderRadius: 8,
        fontFamily: T.fontUI, fontSize: 13, fontWeight: 500,
        opacity: showToast ? 1 : 0,
        pointerEvents: 'none',
        transition: 'all 0.3s ease',
        zIndex: 9999,
      }}>
        {toastMessage}
      </div>
    </>
  );
}
