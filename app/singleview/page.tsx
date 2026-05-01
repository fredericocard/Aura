'use client';

import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getGame } from '@/lib/games';
import { supabase } from '@/lib/supabase';
import { useWakeLock } from '@/lib/use-wake-lock';
import { getMyCommanders } from '@/lib/commanders';
import { searchCommanders } from '@/lib/scryfall';
import { updateLifeTotal, updatePoisonCounters, updateExperienceCounters, updateEnergyCounters, updateCommanderDamage, abandonGame } from '@/lib/game-triggers';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens (injected once into <head>)
// ─────────────────────────────────────────────────────────────────────────────
const TOKENS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');

:root {
  --parchment:        #F5EFE2;
  --parchment-card:   #EFE6D2;
  --parchment-deep:   #E8DDC4;
  --ink:              #2B2118;
  --ink-2:            #4D3F30;
  --ink-3:            #7A6B57;
  --ink-4:            #A89F8E;
  --line:             rgba(43,33,24,0.10);
  --line-strong:      rgba(43,33,24,0.18);
  --copper:           #B06B2C;
  --copper-deep:      #8C521E;
  --forest:           #1F4C2C;
  --forest-deep:      #143620;
  --forest-soft:      #DCE6DD;
  --forest-line:      rgba(31,76,44,0.25);
  --shadow-rest:      0 1px 0 rgba(43,33,24,0.05), 0 6px 14px -8px rgba(43,33,24,0.18);
  --font-display:     'Cinzel', 'Trajan Pro', Georgia, serif;
  --font-ui:          'Inter', system-ui, sans-serif;
  --r-card:           14px;
}

@keyframes overlayFadeIn { from{opacity:0} to{opacity:1} }
@keyframes slideUpCard { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes dialShrinkUp { from{transform:scale(1.8) translateY(60px);opacity:0.3} to{transform:scale(1) translateY(0);opacity:1} }

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--parchment);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}
button {
  font-family: inherit;
  -webkit-tap-highlight-color: transparent;
}
`;

function ensureTokens() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('aura-sv-tokens')) return;
  const s = document.createElement('style');
  s.id = 'aura-sv-tokens';
  s.textContent = TOKENS_CSS;
  document.head.appendChild(s);
}

// ─── Mana color vocabulary ──────────────────────────────────────────────────
const MANA = {
  W: '#F8E7B9', U: '#A6C8E6', B: '#3F3A36',
  R: '#D27B5C', G: '#7BA37A', C: '#A89F8E',
};

function ManaDots({ colors = [], size = 8 }: any) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {colors.map((c: string, i: number) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: 999,
          background: (MANA as any)[c] || '#A89F8E',
          boxShadow: 'inset 0 0 0 1px rgba(43,33,24,0.18)',
        }}/>
      ))}
    </span>
  );
}

// ─── Counter vocabulary ─────────────────────────────────────────────────────
const COUNTER_VOCAB: any = {
  poison:      { label: 'Poison',      tone: '#4F8A4D', soft: '#E2EBDB', glyph: 'skull' },
  energy:      { label: 'Energy',      tone: '#C99B2F', soft: '#F6ECD2', glyph: 'bolt' },
  experience:  { label: 'Experience',  tone: '#7E4E8A', soft: '#EADDEE', glyph: 'star' },
  commander:   { label: 'Cmdr',        tone: '#B06B2C', soft: '#F3E3D1', glyph: 'sword' },
};

// ─── Icon set (24×24 viewBox, stroke-based) ─────────────────────────────────
function Icon({ name, size = 20, stroke = 'currentColor', width = 1.75 }: any) {
  const p: any = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  const paths: any = {
    'chevron-left':  <polyline points="15 18 9 12 15 6"/>,
    'memory-log':    <><path d="M4 5a2 2 0 0 1 2-2h11l3 3v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    plus:            <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    x:               <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    grid:            <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    user:            <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    dice:            <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill={stroke} stroke="none"/><circle cx="15.5" cy="8.5" r="1.2" fill={stroke} stroke="none"/><circle cx="12" cy="12" r="1.2" fill={stroke} stroke="none"/><circle cx="8.5" cy="15.5" r="1.2" fill={stroke} stroke="none"/><circle cx="15.5" cy="15.5" r="1.2" fill={stroke} stroke="none"/></>,
    bolt:            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    star:            <polygon points="12 2 15.1 8.6 22 9.6 17 14.5 18.2 21.5 12 18.2 5.8 21.5 7 14.5 2 9.6 8.9 8.6 12 2"/>,
    skull:           <><path d="M8 21h8v-3a4 4 0 0 0 4-4v-2a8 8 0 1 0-16 0v2a4 4 0 0 0 4 4v3z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><path d="M11 17h2"/></>,
    sword:           <><path d="m14.5 17.5 4-4-9-9H4v6l9 9z"/><line x1="14.5" y1="17.5" x2="20" y2="23"/><path d="m9.5 4.5 4 4"/></>,
    flame:           <path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 2 3 2 3-3z"/>,
    settings:        <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    warning:         <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

// ─── Style helpers ──────────────────────────────────────────────────────────
function kicker(size = 10) {
  return {
    fontSize: size, fontWeight: 700, letterSpacing: '0.22em',
    textTransform: 'uppercase', color: 'var(--ink-3)',
  };
}
function iconBtn() {
  return {
    width: 36, height: 36, borderRadius: 999,
    background: 'var(--parchment-card)', border: '1px solid var(--line-strong)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
  };
}

// ─── Avatar ─────────────────────────────────────────────────────────────────
function CommAvatar({ src, size = 36, ring = 'var(--line-strong)', dim = false }: any) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0,
      background: 'var(--parchment-deep)',
      boxShadow: `0 0 0 1.5px ${ring}, 0 0 0 4px var(--parchment)`,
      overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src ? (
        <img src={src} alt="" style={{
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: dim ? 0.5 : 1, filter: dim ? 'grayscale(0.4)' : 'none',
        }}/>
      ) : (
        <Icon name="user" size={size * 0.5} stroke="var(--ink-4)" width={1.5}/>
      )}
    </div>
  );
}

// ─── Backdrop — softened commander art ──────────────────────────────────────
function SVBackdrop({ src }: any) {
  return (
    <>
      <img src={src} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', opacity: 0.22,
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(245,239,226,0.30) 0%, rgba(245,239,226,0.85) 15%, var(--parchment) 100%)',
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 50% 28%, rgba(176,107,44,0.10), transparent 55%)',
        pointerEvents: 'none',
      }}/>
    </>
  );
}

// ─── Header ribbon ──────────────────────────────────────────────────────────
function SVHeader({ onBack, onSettings }: any) {
  return (
    <div style={{
      position: 'relative', zIndex: 5,
      padding: '52px 14px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <button style={iconBtn()} onClick={onBack}>
        <Icon name="chevron-left" size={18} stroke="var(--ink)"/>
      </button>
      <div style={{ flex: 1 }}/>
      <button style={iconBtn()} onClick={onSettings}>
        <Icon name="settings" size={18} stroke="var(--ink)"/>
      </button>
    </div>
  );
}

// (SVIdentity removed — life dial is the main focus)

// ─── Life dial ──────────────────────────────────────────────────────────────
const CMDR_DMG_COLORS = ['#E8A54B', '#D4783C', '#B8432E', '#8C2318', '#5E1610'];

function LifeDial({ life, dead = false, cmdrDmgSegments = [] }: any) {
  const sz = 180;
  const cx = sz / 2;
  const radius = 82;
  const c = 2 * Math.PI * radius;

  const totalDmg = cmdrDmgSegments.reduce((sum: number, s: any) => sum + s.dmg, 0);
  const hasDmg = totalDmg > 0;

  const sorted = [...cmdrDmgSegments]
    .map((s: any, i: number) => ({ ...s, colorIdx: i }))
    .sort((a: any, b: any) => b.dmg - a.dmg);

  const segments: any[] = [];
  const seen = new Set();
  sorted.forEach((s: any) => {
    if (s.dmg === 0) return;
    let frac = Math.min(s.dmg, 21) / 21;
    const key = s.dmg;
    if (seen.has(key)) {
      frac = Math.max(0, frac - 0.015);
    }
    seen.add(key);
    segments.push({ frac, color: CMDR_DMG_COLORS[s.colorIdx % CMDR_DMG_COLORS.length] });
  });

  return (
    <div style={{ position: 'relative', width: sz, height: sz }}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
        {/* Tick marks */}
        <g stroke="var(--ink-3)" strokeWidth="1">
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
            const r1 = 87, r2 = i % 5 === 0 ? 78 : 82;
            return <line key={i}
              x1={cx + Math.cos(a) * r1} y1={cx + Math.sin(a) * r1}
              x2={cx + Math.cos(a) * r2} y2={cx + Math.sin(a) * r2}
              opacity={i % 5 === 0 ? 0.45 : 0.18}/>;
          })}
        </g>

        {/* Base ring */}
        <circle cx={cx} cy={cx} r={radius}
          fill="none" stroke="var(--line-strong)" strokeWidth="2"/>

        {/* Commander damage segments */}
        {segments.map((seg: any, i: number) => (
          <circle key={i} cx={cx} cy={cx} r={radius}
            fill="none" stroke={seg.color}
            strokeWidth={5}
            strokeDasharray={`${c * seg.frac} ${c}`}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cx})`}
            opacity={0.92}/>
        ))}

        {/* Inner well */}
        <circle cx={cx} cy={cx} r="68"
          fill="var(--parchment-card)" stroke="var(--line)" strokeWidth="1"/>
      </svg>

      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {!dead ? (
          <>
            <div style={kicker(8)}>Life</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 72, lineHeight: 1, letterSpacing: '-0.04em',
              color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
            }}>{life}</div>
            {hasDmg ? (
              <div style={{
                marginTop: 2, fontSize: 10,
                color: totalDmg >= 21 ? '#8C2318' : 'var(--copper)',
                fontWeight: 600,
              }}>
                Cmdr dmg {totalDmg}/21
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 48, lineHeight: 1, color: 'var(--copper)',
            }}>×</div>
            <div style={{
              marginTop: 8, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.24em', textTransform: 'uppercase',
              color: 'var(--copper-deep)',
            }}>Eliminated</div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Round +/- buttons ──────────────────────────────────────────────────────
function RoundBtn({ glyph, onTap, onLongStart, onLongEnd }: any) {
  return (
    <button
      onClick={onTap}
      onPointerDown={onLongStart}
      onPointerUp={onLongEnd}
      onPointerLeave={onLongEnd}
      style={{
        width: 44, height: 44, borderRadius: 999,
        background: 'var(--parchment-card)', border: '1px solid var(--line-strong)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0,
        boxShadow: 'var(--shadow-rest)',
      }}
    >{glyph}</button>
  );
}

// ─── Counter chip ───────────────────────────────────────────────────────────
function CounterChip({ kind, value, label, dense = false }: any) {
  const v = COUNTER_VOCAB[kind] || { label: kind, tone: 'var(--ink)', soft: 'var(--parchment-deep)', glyph: 'flame' };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: dense ? '4px 8px' : '6px 12px',
      borderRadius: 999,
      background: v.soft, border: `1px solid ${v.tone}55`, color: v.tone,
      fontSize: dense ? 11 : 12, fontWeight: 700, letterSpacing: '0.02em',
    }}>
      <Icon name={v.glyph} size={dense ? 12 : 14} stroke={v.tone}/>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 400,
        fontSize: dense ? 13 : 15, lineHeight: 1, letterSpacing: '-0.01em',
      }}>{value}</span>
      {label !== false && <span style={{
        fontSize: dense ? 9 : 10, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.85,
      }}>{label || v.label}</span>}
    </div>
  );
}

// ─── Counter orbit (row of chips below dial) ────────────────────────────────
function CounterOrbit({ items = [] }: any) {
  if (!items.length) return null;
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
      padding: '0 24px', marginTop: 14,
    }}>
      {items.map((it: any, i: number) => <CounterChip key={i} {...it}/>)}
    </div>
  );
}

// ─── Opponent row ───────────────────────────────────────────────────────────
function OpponentRow({ p, onTap }: any) {
  return (
    <button onClick={() => onTap(p)} style={{
      width: '100%', padding: '8px 10px',
      background: 'var(--parchment-card)',
      border: '1px solid var(--line-strong)',
      borderRadius: 14,
      display: 'flex', alignItems: 'center', gap: 10,
      cursor: 'pointer', textAlign: 'left',
    }}>
      <CommAvatar src={p.art} size={32}
        ring={p.dead ? 'var(--ink-4)' : 'var(--copper)'} dim={p.dead}/>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={kicker(9)}>{p.name}</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 11, lineHeight: 1.1,
          color: p.dead ? 'var(--ink-3)' : 'var(--ink)',
          letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{p.commander}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {(p.counters || []).map((c: any, i: number) => {
          const v = COUNTER_VOCAB[c.kind] || {};
          return (
            <div key={i} title={v.label || c.kind} style={{
              width: 22, height: 22, borderRadius: 6,
              background: v.soft || 'var(--parchment-deep)',
              border: `1px solid ${(v.tone || 'var(--line-strong)')}55`,
              color: v.tone || 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-display)',
            }}>{c.value}</div>
          );
        })}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22, lineHeight: 1, letterSpacing: '-0.02em',
          color: p.dead ? 'var(--ink-4)' : 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          minWidth: 30, textAlign: 'right',
        }}>{p.dead ? '—' : p.life}</div>
      </div>
    </button>
  );
}

// ─── Bottom nav ─────────────────────────────────────────────────────────────
function GameNav({ active = 'single', onNav }: any) {
  const items = [
    { id: 'grid',   icon: 'grid',       label: 'Grid' },
    { id: 'single', icon: 'user',       label: 'You' },
    { id: 'dice',   icon: 'dice',       label: 'Dice' },
    { id: 'count',  icon: 'plus',       label: 'Counters' },
    { id: 'cmdr',   icon: 'sword',      label: 'Cmdr Dmg' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '10px 16px 32px', zIndex: 8,
      background: 'linear-gradient(180deg, rgba(245,239,226,0) 0%, rgba(245,239,226,0.92) 30%, var(--parchment) 100%)',
    }}>
      <div style={{
        background: 'var(--parchment-card)', border: '1px solid var(--line-strong)',
        borderRadius: 999, boxShadow: 'var(--shadow-rest)',
        padding: 6, display: 'flex', justifyContent: 'space-between',
      }}>
        {items.map(it => {
          const on = it.id === active;
          return (
            <button key={it.id} onClick={() => onNav?.(it.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '6px 0', border: 'none',
              background: on ? 'var(--forest)' : 'transparent',
              color: on ? 'var(--parchment)' : 'var(--ink-2)',
              borderRadius: 999,
              fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', gap: 2,
              cursor: 'pointer',
            }}>
              <Icon name={it.icon} size={16}
                stroke={on ? 'var(--parchment)' : 'var(--ink-2)'}/>
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mini life dial (compact, for opponent overlay) ─────────────────────────
function MiniLifeDial({ life }: any) {
  const r = 38, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: 96, height: 96 }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="1.5"/>
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--forest)" strokeWidth="2"
          strokeDasharray={`${c * 0.27} ${c}`} strokeDashoffset={-c * 0.05}
          strokeLinecap="round" transform="rotate(-90 48 48)"/>
        <circle cx="48" cy="48" r="32" fill="var(--parchment-card)" stroke="var(--line)" strokeWidth="1"/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 400,
          fontSize: 36, lineHeight: 1, letterSpacing: '-0.04em',
          color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
        }}>{life}</div>
      </div>
    </div>
  );
}

// ─── Mini round button (compact +/- for overlay) ───────────────────────────
function MiniRoundBtn({ glyph, onClick }: any) {
  return (
    <button onClick={onClick} style={{
      width: 36, height: 36, borderRadius: 999,
      background: 'var(--parchment-card)', border: '1px solid var(--line-strong)',
      color: 'var(--ink)', fontFamily: 'var(--font-display)',
      fontSize: 22, lineHeight: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', padding: 0, boxShadow: 'var(--shadow-rest)',
    }}>{glyph}</button>
  );
}

// ─── Dice bottom sheet ──────────────────────────────────────────────────────
function DiceSheet({ onClose, opponents = [] }: any) {
  const [results, setResults] = useState({ d6: null, d20: null, coin: null, player: null });
  const [lastRolled, setLastRolled] = useState<string | null>(null);

  const roll = (type: string) => {
    let result: any;
    if (type === 'd6') result = Math.floor(Math.random() * 6) + 1;
    else if (type === 'd20') result = Math.floor(Math.random() * 20) + 1;
    else if (type === 'coin') result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    else {
      const names = ['You', ...opponents.map((o: any) => o.name)];
      result = names[Math.floor(Math.random() * names.length)];
    }
    setResults(prev => ({ ...prev, [type]: result }));
    setLastRolled(type);
  };

  const dice = [
    { key: 'd6',     label: 'D6',            tone: 'var(--forest)' },
    { key: 'd20',    label: 'D20',           tone: 'var(--copper)' },
    { key: 'coin',   label: 'Coin',          tone: 'var(--ink)' },
    { key: 'player', label: 'Random Player', tone: '#7E4E8A' },
  ];

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 28,
        background: 'rgba(43,33,24,0.15)',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
        background: 'var(--parchment)',
        borderTop: '1px solid var(--line-strong)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '14px 18px 32px',
        boxShadow: '0 -20px 40px -10px rgba(43,33,24,0.18)',
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 999,
          background: 'var(--line-strong)', margin: '0 auto 14px',
        }}/>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={kicker(10)}>Your</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 22,
              color: 'var(--ink)', letterSpacing: '-0.01em',
              lineHeight: 1.15, marginTop: 2,
            }}>Dice</div>
          </div>
          <button onClick={onClose} style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'transparent', border: '1px solid var(--line-strong)',
            fontSize: 11, fontWeight: 700, color: 'var(--ink-2)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>Close</button>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, marginTop: 14,
        }}>
          {dice.map((d) => {
            const isLast = lastRolled === d.key;
            const val = (results as any)[d.key];
            return (
              <button key={d.key} onClick={() => roll(d.key)} style={{
                background: 'var(--parchment-card)',
                border: isLast ? `1.5px solid ${d.tone}` : '1px solid var(--line-strong)',
                borderRadius: 16, padding: '14px 12px',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 4, cursor: 'pointer',
                boxShadow: isLast ? `0 0 0 3px ${d.tone}1a` : 'none',
              }}>
                <span style={kicker(10)}>{d.label}</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 28,
                  lineHeight: 1, letterSpacing: '-0.02em', color: d.tone,
                }}>{val ?? '—'}</span>
                <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  {val ? (isLast ? 'Just rolled' : 'Previous roll') : 'Tap to roll'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Counter bottom sheet ──────────────────────────────────────────────────
function CounterSheet({ onClose, counters, onAdjust }: any) {
  const counterTypes = Object.entries(COUNTER_VOCAB).map(([key, v]: any) => ({
    key, ...v, value: counters[key] || 0,
  }));

  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 28,
        background: 'rgba(43,33,24,0.15)',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
        background: 'var(--parchment)',
        borderTop: '1px solid var(--line-strong)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '14px 18px 32px',
        boxShadow: '0 -20px 40px -10px rgba(43,33,24,0.18)',
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 999,
          background: 'var(--line-strong)', margin: '0 auto 14px',
        }}/>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={kicker(10)}>You</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 22,
              color: 'var(--ink)', letterSpacing: '-0.01em',
              lineHeight: 1.15, marginTop: 2,
            }}>Counters</div>
          </div>
          <button onClick={onClose} style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'transparent', border: '1px solid var(--line-strong)',
            fontSize: 11, fontWeight: 700, color: 'var(--ink-2)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>Close</button>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 10, marginTop: 14,
        }}>
          {counterTypes.map((ct: any) => {
            const active = ct.value > 0;
            return (
              <div key={ct.key} style={{
                background: active ? ct.soft : 'var(--parchment-card)',
                border: active ? `1.5px solid ${ct.tone}` : '1px solid var(--line-strong)',
                borderRadius: 16, padding: '12px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name={ct.glyph} size={16} stroke={ct.tone}/>
                  <span style={kicker(10)}>{ct.label}</span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 28,
                  lineHeight: 1, letterSpacing: '-0.02em', color: active ? ct.tone : 'var(--ink-3)',
                }}>{ct.value}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onAdjust(ct.key, -1)} style={{
                    flex: 1, height: 32, borderRadius: 10,
                    background: 'var(--parchment)', border: '1px solid var(--line-strong)',
                    fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                    opacity: ct.value === 0 ? 0.3 : 1,
                  }}>−</button>
                  <button onClick={() => onAdjust(ct.key, 1)} style={{
                    flex: 1, height: 32, borderRadius: 10,
                    background: 'var(--parchment)', border: '1px solid var(--line-strong)',
                    fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Commander damage bottom sheet ─────────────────────────────────────────
function CmdrDmgSheet({ onClose, opponents, cmdrDmg, onAdjust }: any) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 28,
        background: 'rgba(43,33,24,0.15)',
      }}/>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
        background: 'var(--parchment)',
        borderTop: '1px solid var(--line-strong)',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: '14px 18px 32px',
        boxShadow: '0 -20px 40px -10px rgba(43,33,24,0.18)',
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 999,
          background: 'var(--line-strong)', margin: '0 auto 14px',
        }}/>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={kicker(10)}>Damage from</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 22,
              color: 'var(--ink)', letterSpacing: '-0.01em',
              lineHeight: 1.15, marginTop: 2,
            }}>Opponents to you</div>
          </div>
          <button onClick={onClose} style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'transparent', border: '1px solid var(--line-strong)',
            fontSize: 11, fontWeight: 700, color: 'var(--ink-2)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>Close</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {opponents.map((opp: any) => {
            const dmg = cmdrDmg[opp.id] || 0;
            const frac = Math.min(dmg / 21, 1);
            return (
              <div key={opp.id} style={{
                background: 'var(--parchment-card)',
                border: dmg > 0 ? '1.5px solid var(--copper)' : '1px solid var(--line-strong)',
                borderRadius: 16, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <CommAvatar src={opp.art} size={36} ring="var(--copper)"/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={kicker(9)}>{opp.name}</div>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 11, lineHeight: 1.1,
                    color: 'var(--ink)', letterSpacing: '-0.01em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{opp.commander}</div>
                  <div style={{
                    marginTop: 6, height: 4, borderRadius: 999,
                    background: 'var(--line)',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      background: frac >= 1 ? '#9E2B2B' : 'var(--copper)',
                      width: `${frac * 100}%`,
                      transition: 'width 0.2s ease',
                    }}/>
                  </div>
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1,
                  letterSpacing: '-0.02em', color: dmg > 0 ? 'var(--copper-deep)' : 'var(--ink-3)',
                  fontVariantNumeric: 'tabular-nums', minWidth: 42, textAlign: 'center',
                }}>{dmg}<span style={{ fontSize: 12, color: 'var(--ink-4)' }}>/21</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button onClick={() => onAdjust(opp.id, 1)} style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'var(--parchment)', border: '1px solid var(--line-strong)',
                    fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}>+</button>
                  <button onClick={() => onAdjust(opp.id, -1)} style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: 'var(--parchment)', border: '1px solid var(--line-strong)',
                    fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                    opacity: dmg === 0 ? 0.3 : 1,
                  }}>−</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Opponent overlay — commander broadside ─────────────────────────────────
function OpponentOverlay({ p, myLife, miniRoster, onClose, onLifeAdj, onSelectPlayer }: any) {
  if (!p) return null;
  const isEmpty = p.isEmptySeat;
  const showSelector = miniRoster.length > 1;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: 'rgba(43,33,24,0.22)',
      backdropFilter: 'blur(2px)',
      display: 'flex', flexDirection: 'column',
      animation: 'overlayFadeIn 0.25s ease-out',
    }}>
      <div style={{
        margin: '52px auto 0', display: 'flex', alignItems: 'center', gap: 14,
        animation: 'dialShrinkUp 0.4s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <MiniRoundBtn glyph={'−'} onClick={() => onLifeAdj(-1)}/>
        <MiniLifeDial life={myLife}/>
        <MiniRoundBtn glyph="+" onClick={() => onLifeAdj(1)}/>
      </div>

      {/* Mini roster selector — only show when multiple opponents */}
      {showSelector && (
        <div style={{
          margin: '10px 14px 0',
          background: 'var(--parchment-card)',
          border: '1px solid var(--line-strong)',
          borderRadius: 12, padding: '6px 8px',
          display: 'flex', justifyContent: 'space-between', gap: 6,
        }}>
          {miniRoster.map((m: any, i: number) => {
            const isActive = m.id === p.id;
            return (
              <button key={i} onClick={() => onSelectPlayer?.(m)} style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', borderRadius: 8, border: 'none',
                background: isActive ? 'rgba(176,107,44,0.12)' : 'transparent',
                cursor: 'pointer',
                outline: isActive ? '1.5px solid var(--copper)' : 'none',
              }}>
                <CommAvatar src={m.art} size={18} ring={isActive ? 'var(--copper)' : 'var(--line-strong)'} dim={m.dead}/>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 14, lineHeight: 1,
                  color: m.dead ? 'var(--ink-4)' : 'var(--ink)',
                  fontVariantNumeric: 'tabular-nums',
                }}>{m.dead ? '—' : m.life}</div>
              </button>
            );
          })}
        </div>
      )}

      <div style={{
        margin: '14px 14px',
        background: 'var(--parchment-card)',
        border: '1px solid var(--line-strong)',
        borderRadius: 24,
        boxShadow: '0 30px 60px -20px rgba(43,33,24,0.35)',
        padding: 14, flex: 1, position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 10,
        animation: 'slideUpCard 0.35s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CommAvatar src={p.art} size={42} ring={isEmpty ? 'var(--line-strong)' : 'var(--copper)'}/>
            <div style={{ minWidth: 0 }}>
              <div style={kicker(9)}>{p.name}</div>
              {!isEmpty && p.commander && (
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.1,
                  color: 'var(--ink)', letterSpacing: '-0.01em',
                }}>{p.commander}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 999,
            background: 'transparent', border: '1px solid var(--line-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
          }}>
            <Icon name="x" size={14} stroke="var(--ink-2)"/>
          </button>
        </div>

        {/* Commander details — only for real players */}
        {!isEmpty && (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px',
              background: 'var(--parchment)', border: '1px solid var(--line)',
              borderRadius: 10,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600,
                color: 'var(--ink-2)', letterSpacing: '0.04em',
              }}>{p.typeLine || 'Legendary Creature'}</div>
              <ManaDots colors={p.colors} size={7}/>
            </div>

            {p.rulesText && (
              <div style={{
                background: 'var(--parchment)', border: '1px solid var(--line)',
                borderRadius: 12, padding: '10px 12px',
                fontSize: 12, lineHeight: 1.45,
                color: 'var(--ink-2)', fontStyle: 'italic',
              }}>
                {p.keywords && (
                  <span style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--ink)' }}>
                    {p.keywords}
                  </span>
                )}
                {' '}{p.rulesText}
                {p.pt && (
                  <span style={{
                    display: 'block', marginTop: 6, fontStyle: 'normal',
                    fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: 'var(--ink-3)', fontWeight: 700,
                  }}>Power · Toughness — {p.pt}</span>
                )}
              </div>
            )}
          </>
        )}

        {/* Empty seat message */}
        {isEmpty && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic',
          }}>
            Waiting for a player to join this seat.
          </div>
        )}

        {/* Counters */}
        {!isEmpty && (
          <div>
            <div style={kicker(9)}>Counters</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {(p.counters || []).map((c: any, i: number) => (
                <CounterChip key={i} kind={c.kind} value={c.value}/>
              ))}
              {!(p.counters || []).length && (
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>None on the table.</div>
              )}
            </div>
          </div>
        )}

        {/* Commander damage boxes */}
        <div style={{
          marginTop: 'auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          <div style={{
            background: '#FDF0E6',
            border: '1px solid rgba(176,107,44,0.30)',
            borderRadius: 12, padding: '8px 12px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: 'var(--copper-deep)',
            }}>Dmg to you</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1,
              letterSpacing: '-0.03em', color: 'var(--copper-deep)', marginTop: 4,
              fontVariantNumeric: 'tabular-nums',
            }}>{p.cmdrDmg ?? 0}<span style={{ fontSize: 14, color: 'var(--ink-4)' }}> /21</span></div>
          </div>
          <div style={{
            background: 'var(--forest-soft)',
            border: '1px solid var(--forest-line)',
            borderRadius: 12, padding: '8px 12px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: 'var(--forest)',
            }}>Dmg from you</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1,
              letterSpacing: '-0.03em', color: 'var(--forest-deep)', marginTop: 4,
              fontVariantNumeric: 'tabular-nums',
            }}>{p.cmdrDmgFromYou ?? 0}<span style={{ fontSize: 14, color: 'var(--ink-4)' }}> /21</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings overlay ──────────────────────────────────────────────────────
function SettingsOverlay({ onClose, onAbandon }: any) {
  const [confirmingAbandon, setConfirmingAbandon] = useState(false);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(43,33,24,0.22)',
      backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'overlayFadeIn 0.25s ease-out',
    }}>
      <div style={{
        width: 'calc(100% - 48px)', maxWidth: 340,
        background: 'var(--parchment)',
        border: '1px solid var(--line-strong)',
        borderRadius: 24,
        boxShadow: '0 30px 60px -20px rgba(43,33,24,0.35)',
        padding: 20,
        animation: 'slideUpCard 0.35s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={kicker(10)}>Game</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 22,
              color: 'var(--ink)', letterSpacing: '-0.01em',
              lineHeight: 1.15, marginTop: 2,
            }}>Settings</div>
          </div>
          <button onClick={onClose} style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'transparent', border: '1px solid var(--line-strong)',
            fontSize: 11, fontWeight: 700, color: 'var(--ink-2)',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>Close</button>
        </div>

        {!confirmingAbandon ? (
          <button onClick={() => setConfirmingAbandon(true)} style={{
            width: '100%', cursor: 'pointer',
            background: '#F5EFE2',
            color: '#9E2B2B',
            border: '1px solid rgba(158,43,43,0.2)',
            borderRadius: 20,
            padding: '14px 18px',
            fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>Abandon Game</button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              textAlign: 'center', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4,
              marginBottom: 4,
            }}>
              Are you sure? This action cannot be undone.
            </div>
            <button onClick={onAbandon} style={{
              width: '100%', cursor: 'pointer',
              background: '#F5EFE2',
              color: '#9E2B2B',
              border: '1px solid rgba(158,43,43,0.2)',
              borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>Confirm Abandon</button>
            <button onClick={() => setConfirmingAbandon(false)} style={{
              width: '100%', cursor: 'pointer',
              background: '#F5EFE2',
              color: 'var(--ink-2)',
              border: '1px solid var(--line-strong)',
              borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Eliminated popup ─────────────────────────────────────────────────────
function TornEdgeMini() {
  const teeth = 24, w = 430, h = 14;
  const seg = w / teeth;
  let d = `M 0 ${h} `;
  for (let i = 0; i <= teeth; i++) {
    const x = i * seg;
    const jitter = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1;
    const y = i % 2 === 0 ? 2 + jitter * 3 : 6 + jitter * 4;
    d += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  d += `L ${w} ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block', width: '100%', marginBottom: -1 }} aria-hidden="true">
      <path d={d} fill="#FAF5EA"/>
    </svg>
  );
}

function EliminatedPopup({ onRevive, onReview }: any) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-ui)',
    }}>
      <div onClick={onRevive} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(43,33,24,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}/>

      <div style={{
        marginTop: 'auto', position: 'relative',
        maxWidth: 430, width: '100%', alignSelf: 'center',
      }}>
        <TornEdgeMini/>

        <div style={{
          position: 'relative',
          background: '#FAF5EA',
          padding: '8px 22px 32px',
        }}>
          <button onClick={onRevive} aria-label="Close" style={{
            position: 'absolute', top: 14, right: 16,
            width: 32, height: 32, borderRadius: 999,
            border: '1px solid rgba(43,33,24,0.08)',
            background: '#EDE4D0',
            color: '#5C5043', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2, fontSize: 15, fontWeight: 700, lineHeight: 1,
          }}>×</button>

          <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <svg width={28} height={28} viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="36" r="2.4" fill="#B06B2C"/>
                <defs><clipPath id="elim-clip"><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath></defs>
                <g clipPath="url(#elim-clip)">
                  <polygon points="8,60 30,4 31,4 24,60" fill="#B06B2C"/>
                  <polygon points="40,60 33,4 34,4 56,60" fill="#B06B2C"/>
                </g>
              </svg>
            </div>
            <div style={{
              fontWeight: 700, fontSize: 11, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: '#B06B2C', marginBottom: 6,
            }}>Life Reached Zero</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 26, letterSpacing: '-0.02em',
              color: '#2B2118', lineHeight: 1.1,
            }}>You have been eliminated</div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#5C5043', lineHeight: 1.4 }}>
              If the game is over, head to review to rate your experience.
              If this was a mistake, revive to continue playing.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={onReview} style={{
              width: '100%', cursor: 'pointer',
              background: '#2F5D3A', color: '#F5EFE2',
              border: 'none', borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              boxShadow: '0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#F5EFE2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>
              </svg>
              Go to Review
            </button>

            <button onClick={onRevive} style={{
              width: '100%', cursor: 'pointer',
              background: '#F5EFE2', color: 'var(--ink-2)',
              border: '1px solid var(--line-strong)',
              borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>Revive</button>
          </div>

          <div style={{
            textAlign: 'center', fontSize: 11, color: '#8A7E6F',
            marginTop: 14, lineHeight: 1.4,
          }}>
            Closing this popup will revive you at 1 life.
          </div>
          <div style={{
            textAlign: 'center', fontSize: 12, color: '#8A7E6F',
            marginTop: 12,
          }}>
            Or <button onClick={onRevive} style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 12, color: '#8A7E6F', textDecoration: 'underline',
              cursor: 'pointer',
            }}>skip review</button> to exit the game.
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
function PageContent() {
  useWakeLock();
  ensureTokens();

  const router = useRouter();
  const searchParams = useSearchParams();
  const podId = searchParams.get('podId') ?? '';
  const gameId = searchParams.get('gameId') ?? '';
  const { user, isLoggedIn, loading } = useAuth();

  // Game state from backend
  const [life, setLife] = useState(40);
  const [poison, setPoison] = useState(0);
  const [experience, setExperience] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [dead, setDead] = useState(false);

  // UI state
  const [showDice, setShowDice] = useState(false);
  const [showCounters, setShowCounters] = useState(false);
  const [showCmdrDmg, setShowCmdrDmg] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEliminated, setShowEliminated] = useState(false);
  const [expandedOpponent, setExpandedOpponent] = useState<string | null>(null);
  const [cmdrDmg, setCmdrDmg] = useState<Record<string, number>>({});
  const [eliminationReason, setEliminationReason] = useState<'life' | 'cmdr' | null>(null);

  // Debounced sync refs
  const syncTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingSyncRef = useRef<Record<string, () => void>>({});
  const debouncedSync = (key: string, fn: () => void) => {
    if (syncTimerRef.current[key]) clearTimeout(syncTimerRef.current[key]);
    pendingSyncRef.current[key] = fn;
    syncTimerRef.current[key] = setTimeout(() => {
      fn();
      delete pendingSyncRef.current[key];
    }, 300);
  };

  // Flush pending syncs on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingSyncRef.current).forEach(fn => fn());
      Object.values(syncTimerRef.current).forEach(t => clearTimeout(t));
    };
  }, []);

  // Game data state
  const [podSize, setPodSize] = useState(0);
  const [opponents, setOpponents] = useState<any[]>([]);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [commanderDetails, setCommanderDetails] = useState<Record<string, any>>({});
  const [myArt, setMyArt] = useState('https://cards.scryfall.io/art_crop/front/4/e/4e4fb50c-a81f-44d3-93c5-fa9a0b37f617.jpg');
  const [myColors, setMyColors] = useState<string[]>([]);
  const [myName, setMyName] = useState('Your Commander');
  const [podName, setPodNameState] = useState('Game');

  // Load game data from backend when gameId is available AND user is loaded
  useEffect(() => {
    if (!gameId || loading || !user?.id) return;

    async function loadGameData() {
      try {
        const { data: game } = await getGame(gameId) as { data: any };
        if (!game) return;

        setPodSize(game.pod_size ?? 0);
        setPodNameState(game.name ?? 'Game');

        const deckIds = game.players.map((p: any) => p.deck_id).filter(Boolean);
        let deckMap = new Map();
        if (deckIds.length > 0) {
          const { data: decks } = await supabase
            .from('decks')
            .select('id, commander_name, color_identity, aura_score, badge_fun, badge_rivalry, badge_allegiance, badge_brilliance, badge_flavor')
            .in('id', deckIds) as { data: any };
          deckMap = new Map((decks ?? []).map((d: any) => [d.id, d]) as any);
        }

        const opponentsList: any[] = [];
        let currentPlayerData: any = null;

        game.players.forEach((p: any) => {
          const seatNum = p.seat_number ?? 1;
          const deck: any = p.deck_id ? deckMap.get(p.deck_id) : null;
          const isEmptySeat = !p.user_id && !p.deck_id && !p.commander_name;
          const isGuest = !p.user_id && (p.commander_name != null);

          const displayName = deck?.commander_name ?? p.commander_name ?? `Player ${seatNum}`;
          const colorId = deck?.color_identity ?? '';
          const colorIdentityArray = colorId.split('').filter((c: string) => 'WUBRG'.includes(c));

          const playerData = {
            key: `seat-${seatNum}`,
            id: `seat-${seatNum}`,
            seatNumber: seatNum,
            userId: p.user_id ?? null,
            name: displayName,
            player: displayName.split(',')[0],
            life: p.life_total ?? 40,
            color: colorId,
            lifeColor: (p.life_total ?? 40) <= 0 ? 'red' : (p.life_total ?? 40) < 10 ? 'red' : 'teal',
            aura: deck?.aura_score ?? 0,
            colorIdentity: colorId,
            poisonCounters: p.poison_counters ?? 0,
            experienceCounters: p.experience_counters ?? 0,
            energyCounters: p.energy_counters ?? 0,
            isEmptySeat,
            isGuest,
            badges: {
              brilliance: deck?.badge_brilliance ?? 0,
              flavor: deck?.badge_flavor ?? 0,
              rivalry: deck?.badge_rivalry ?? 0,
              allegiance: deck?.badge_allegiance ?? 0,
              fun: deck?.badge_fun ?? 0,
            },
          };

          if (p.user_id === user?.id) {
            currentPlayerData = playerData;
            setLife(p.life_total ?? 40);
            setPoison(p.poison_counters ?? 0);
            setExperience(p.experience_counters ?? 0);
            setEnergy(p.energy_counters ?? 0);
            if (p.commander_damage_received && typeof p.commander_damage_received === 'object') {
              setCmdrDmg(p.commander_damage_received as Record<string, number>);
            }
            setMyName(displayName);
            setMyColors(colorIdentityArray);
          } else {
            opponentsList.push(playerData);
          }
        });

        setCurrentUserData(currentPlayerData);
        setOpponents(opponentsList);
      } catch (err) {
        console.error('Failed to load game data:', err);
      }
    }

    loadGameData();

    const channel = supabase
      .channel(`game-singleview-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;

          if (row.user_id && row.user_id === user?.id) {
            setLife(row.life_total ?? 40);
            setPoison(row.poison_counters ?? 0);
            setExperience(row.experience_counters ?? 0);
            setEnergy(row.energy_counters ?? 0);
            if (row.commander_damage_received && typeof row.commander_damage_received === 'object') {
              setCmdrDmg(row.commander_damage_received);
            }
          } else {
            setOpponents(prev => prev.map(opp => {
              if (opp.seatNumber === row.seat_number) {
                return {
                  ...opp,
                  life: row.life_total ?? opp.life,
                  poisonCounters: row.poison_counters ?? opp.poisonCounters,
                  experienceCounters: row.experience_counters ?? opp.experienceCounters,
                  energyCounters: row.energy_counters ?? opp.energyCounters,
                  name: row.commander_name ?? opp.name,
                  player: row.commander_name ? row.commander_name.split(',')[0] : opp.player,
                  isEmptySeat: !row.user_id && !row.deck_id && !row.commander_name,
                  isGuest: !row.user_id && (row.commander_name != null),
                };
              }
              return opp;
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, loading, user?.id]);

  // Fetch Scryfall data for opponent commanders
  useEffect(() => {
    if (opponents.length === 0) return;
    opponents.forEach(async (opp: any) => {
      if (!opp.name || commanderDetails[opp.key]) return;
      try {
        const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(opp.name)}`);
        if (!res.ok) return;
        const card = await res.json();
        setCommanderDetails(prev => ({
          ...prev,
          [opp.key]: {
            name: card.name,
            typeLine: card.type_line ?? '',
            oracleText: card.oracle_text ?? '',
            flavorText: card.flavor_text ?? '',
            art_crop: card.image_uris?.art_crop ?? '',
            manaCost: card.mana_cost ?? '',
            power: card.power,
            toughness: card.toughness,
            colorIdentity: card.color_identity ?? [],
          }
        }));
      } catch { /* Scryfall fetch failed */ }
    });
  }, [opponents]);

  // Fetch current user's commander art from Scryfall
  useEffect(() => {
    if (!myName || myName === 'Your Commander') return;
    async function fetchMyArt() {
      try {
        const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(myName)}`);
        if (!res.ok) return;
        const card = await res.json();
        if (card.image_uris?.art_crop) {
          setMyArt(card.image_uris.art_crop);
        }
      } catch { /* Scryfall fetch failed */ }
    }
    fetchMyArt();
  }, [myName]);

  // Long press logic
  const longPressRef = useRef<{ timeout: NodeJS.Timeout | null; interval: NodeJS.Timeout | null }>({ timeout: null, interval: null });
  const latestLifeRef = useRef(life);

  useEffect(() => {
    latestLifeRef.current = life;
  }, [life]);

  const stopLongPress = useCallback(() => {
    if (longPressRef.current.timeout) {
      clearTimeout(longPressRef.current.timeout);
      longPressRef.current.timeout = null;
    }
    if (longPressRef.current.interval) {
      clearInterval(longPressRef.current.interval);
      longPressRef.current.interval = null;
    }
  }, []);

  const adjustLife = useCallback((delta: number) => {
    setLife(prev => {
      const newLife = Math.max(0, prev + delta);
      if (newLife === 0) {
        stopLongPress();
        setEliminationReason('life');
        setShowEliminated(true);
        setDead(true);
      }
      latestLifeRef.current = newLife;

      if (gameId && user?.id) {
        debouncedSync('life', () => {
          updateLifeTotal(gameId, user.id, newLife).catch((e) => {
            console.error('Failed to sync life:', e);
          });
        });
      }
      return newLife;
    });
  }, [gameId, user?.id, stopLongPress]);

  const startLongPress = useCallback((delta: number) => {
    longPressRef.current.timeout = setTimeout(() => {
      adjustLife(delta * 4);
      longPressRef.current.interval = setInterval(() => {
        adjustLife(delta * 5);
      }, 200);
    }, 400);
  }, [adjustLife]);

  // Map backend opponent data to wireframe format
  const mappedOpponents = opponents.map((opp: any) => {
    const detail = commanderDetails[opp.key] || {};
    const counters: any[] = [];
    if (opp.poisonCounters > 0) counters.push({ kind: 'poison', value: opp.poisonCounters });
    if (opp.experienceCounters > 0) counters.push({ kind: 'experience', value: opp.experienceCounters });
    if (opp.energyCounters > 0) counters.push({ kind: 'energy', value: opp.energyCounters });

    const colorIdentityArray = opp.colorIdentity.split('').filter((c: string) => 'WUBRG'.includes(c));
    const isEmptySeat = opp.isEmptySeat === true;
    const art = isEmptySeat ? null : (detail.art_crop || 'https://cards.scryfall.io/art_crop/front/4/e/4e4fb50c-a81f-44d3-93c5-fa9a0b37f617.jpg');

    return {
      id: opp.id,
      name: opp.name,
      commander: isEmptySeat ? null : opp.name,
      typeLine: isEmptySeat ? null : (detail.typeLine || 'Legendary Creature'),
      art: art,
      colors: isEmptySeat ? [] : colorIdentityArray,
      life: opp.life,
      cmdrDmg: cmdrDmg[opp.id] || 0,
      cmdrDmgFromYou: 0,
      counters: counters,
      keywords: isEmptySeat ? null : (detail.keywords || null),
      rulesText: isEmptySeat ? null : (detail.oracleText || null),
      pt: isEmptySeat ? null : (detail.power && detail.toughness ? `${detail.power}/${detail.toughness}` : null),
      dead: opp.life <= 0,
      isEmptySeat: isEmptySeat,
      isGuest: opp.isGuest === true,
    };
  });

  const counterChips: any[] = [];
  if (poison > 0) counterChips.push({ kind: 'poison', value: poison });
  if (energy > 0) counterChips.push({ kind: 'energy', value: energy });
  if (experience > 0) counterChips.push({ kind: 'experience', value: experience });

  const handleNav = (id: string) => {
    if (id === 'dice') { setShowDice(prev => !prev); setShowCounters(false); setShowCmdrDmg(false); }
    else if (id === 'count') { setShowCounters(prev => !prev); setShowDice(false); setShowCmdrDmg(false); }
    else if (id === 'cmdr') { setShowCmdrDmg(prev => !prev); setShowDice(false); setShowCounters(false); }
    else if (id === 'grid') {
      if (podSize >= 2 && podSize <= 5) {
        router.push(`/gridview-${podSize}p?podId=${podId}&gameId=${gameId}`);
      }
    }
  };

  const adjustCounter = useCallback((kind: string, delta: number) => {
    const setters: any = { poison: setPoison, energy: setEnergy, experience: setExperience };
    const setter = setters[kind];
    if (setter) {
      setter((prev: number) => {
        const newVal = Math.max(0, prev + delta);
        if (gameId && user?.id) {
          const updateFn = {
            poison: updatePoisonCounters,
            energy: updateEnergyCounters,
            experience: updateExperienceCounters,
          }[kind];
          if (updateFn) {
            debouncedSync(kind, () => {
              updateFn(gameId, user.id, newVal).catch(() => {});
            });
          }
        }
        return newVal;
      });
    }
  }, [gameId, user?.id]);

  const handleAbandon = () => {
    if (gameId && user?.id) {
      abandonGame(gameId, user.id).then(() => {
        router.push('/dashboard');
      }).catch(() => {});
    }
  };

  const miniRoster = mappedOpponents.filter(p => !p.dead).map(p => ({
    id: p.id,
    name: p.name,
    art: p.art,
    life: p.life,
    dead: p.dead,
    isEmptySeat: p.isEmptySeat,
  }));

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--parchment)',
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      fontFamily: 'var(--font-ui)',
    }}>
      <SVBackdrop src={myArt}/>
      <SVHeader
        onBack={() => router.back()}
        onSettings={() => setShowSettings(true)}/>

      {/* Life dial + buttons */}
      <div style={{
        position: 'relative', zIndex: 4, marginTop: 8,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
      }}>
        {!dead && (
          <div style={{ position: 'absolute', left: 24, zIndex: 5 }}>
            <RoundBtn glyph={'−'}
              onTap={() => adjustLife(-1)}
              onLongStart={() => startLongPress(-1)}
              onLongEnd={stopLongPress}/>
          </div>
        )}
        <LifeDial life={life} dead={dead}
          cmdrDmgSegments={mappedOpponents.map((o: any, i: number) => ({ id: o.id, dmg: cmdrDmg[o.id] || 0, colorIdx: i }))}/>
        {!dead && (
          <div style={{ position: 'absolute', right: 24, zIndex: 5 }}>
            <RoundBtn glyph="+"
              onTap={() => adjustLife(1)}
              onLongStart={() => startLongPress(1)}
              onLongEnd={stopLongPress}/>
          </div>
        )}
      </div>

      {/* Counter chips */}
      <div style={{ position: 'relative', zIndex: 4 }}>
        <CounterOrbit items={counterChips}/>
      </div>

      {/* Opponent rail */}
      <div style={{
        position: 'absolute', left: 14, right: 14, bottom: 96, zIndex: 4,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '0 4px 4px',
        }}>
          <div style={kicker(9)}>The Pod</div>
          <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>Tap to expand</div>
        </div>
        {mappedOpponents.map(p => (
          <OpponentRow key={p.id} p={p} onTap={(player: any) => setExpandedOpponent(player.id)}/>
        ))}
      </div>

      {/* Bottom nav */}
      <GameNav active="single" onNav={handleNav}/>

      {/* Dice sheet */}
      {showDice && (
        <DiceSheet onClose={() => setShowDice(false)} opponents={mappedOpponents}/>
      )}

      {/* Counter sheet */}
      {showCounters && (
        <CounterSheet
          onClose={() => setShowCounters(false)}
          counters={{ poison, energy, experience, commander: 0 }}
          onAdjust={adjustCounter}/>
      )}

      {/* Commander damage sheet */}
      {showCmdrDmg && (
        <CmdrDmgSheet
          onClose={() => setShowCmdrDmg(false)}
          opponents={mappedOpponents}
          cmdrDmg={cmdrDmg}
          onAdjust={(oppId: string, delta: number) => {
            setCmdrDmg(prev => {
              const newVal = Math.max(0, Math.min(21, (prev[oppId] || 0) + delta));
              const newMap = { ...prev, [oppId]: newVal };

              // Persist to backend
              if (gameId && user?.id) {
                debouncedSync('cmdrDmg', () => {
                  updateCommanderDamage(gameId, user.id, newMap).catch(() => {});
                });
              }

              // Check if 21 from any single opponent → elimination
              if (newVal >= 21) {
                setEliminationReason('cmdr');
                setShowEliminated(true);
                setDead(true);
              }

              return newMap;
            });
          }}/>
      )}

      {/* Opponent overlay */}
      {expandedOpponent && (
        <OpponentOverlay
          p={mappedOpponents.find((o: any) => o.id === expandedOpponent)}
          myLife={life}
          miniRoster={miniRoster}
          onClose={() => setExpandedOpponent(null)}
          onLifeAdj={adjustLife}
          onSelectPlayer={(m: any) => {
            setExpandedOpponent(m.id);
          }}/>
      )}

      {/* Settings overlay */}
      {showSettings && (
        <SettingsOverlay
          onClose={() => setShowSettings(false)}
          onAbandon={() => { setShowSettings(false); handleAbandon(); }}/>
      )}

      {/* Eliminated popup */}
      {showEliminated && (
        <EliminatedPopup
          onRevive={() => {
            if (eliminationReason === 'cmdr') {
              // Commander damage elimination: keep life, drop the 21+ source to 20
              setCmdrDmg(prev => {
                const fixed: Record<string, number> = {};
                for (const [k, v] of Object.entries(prev)) {
                  fixed[k] = v >= 21 ? 20 : v;
                }
                if (gameId && user?.id) {
                  updateCommanderDamage(gameId, user.id, fixed).catch(() => {});
                }
                return fixed;
              });
              setDead(false);
              setShowEliminated(false);
              setEliminationReason(null);
              // Life stays the same — just un-eliminate on backend
              if (gameId && user?.id) {
                updateLifeTotal(gameId, user.id, life).catch(() => {});
              }
            } else {
              // Life-based elimination: revive at 1 life
              setLife(1);
              setDead(false);
              setShowEliminated(false);
              setEliminationReason(null);
              if (gameId && user?.id) {
                updateLifeTotal(gameId, user.id, 1).catch(() => {});
              }
            }
          }}
          onReview={() => { setShowEliminated(false); setEliminationReason(null); router.push(`/review?podId=${podId}&gameId=${gameId}`); }}/>
      )}
    </div>
  );
}

export default function SingleViewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
