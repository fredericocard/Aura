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
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Young+Serif&display=swap');

:root {
  --parchment:        #0A0604;
  --parchment-card:   #1A1410;
  --parchment-deep:   #100C08;
  --ink:              #F0E8D8;
  --ink-2:            #C8BCA8;
  --ink-3:            #8A7E6F;
  --ink-4:            #5C5043;
  --line:             rgba(240,232,216,0.08);
  --line-strong:      rgba(240,232,216,0.14);
  --copper:           #B06B2C;
  --copper-deep:      #D4883E;
  --forest:           #3F9F4D;
  --forest-deep:      #2F7A3A;
  --forest-soft:      rgba(63,159,77,0.15);
  --forest-line:      rgba(63,159,77,0.30);
  --shadow-rest:      0 1px 0 rgba(0,0,0,0.30), 0 6px 18px -8px rgba(0,0,0,0.50);
  --font-display:     'Young Serif', ui-serif, Georgia, serif;
  --font-ui:          'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  --r-card:           20px;
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
          boxShadow: 'inset 0 0 0 1px rgba(240,232,216,0.18)',
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
function kicker(size = 10): any {
  return {
    fontSize: size, fontWeight: 700, letterSpacing: '0.22em',
    textTransform: 'uppercase', color: '#8A7E6F',
    fontFamily: 'var(--font-ui)',
  };
}
function iconBtn() {
  return {
    width: 36, height: 36, borderRadius: 999,
    background: '#150E08',
    border: '1px solid rgba(226,184,88,0.18)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
    boxShadow: '0 1px 0 rgba(0,0,0,.15), 0 6px 18px -8px rgba(0,0,0,.35)',
  };
}

// ─── Avatar ─────────────────────────────────────────────────────────────────
function CommAvatar({ src, size = 36, ring = 'rgba(226,184,88,0.18)', dim = false }: any) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0,
      background: '#050302',
      boxShadow: `0 0 0 1.5px ${ring}, 0 0 0 4px #0A0604`,
      overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {src ? (
        <img src={src} alt="" style={{
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: dim ? 0.5 : 1, filter: dim ? 'grayscale(0.4)' : 'none',
        }}/>
      ) : (
        <Icon name="user" size={size * 0.5} stroke="#5C5043" width={1.5}/>
      )}
    </div>
  );
}

// ─── Digital Mat Mesh ───────────────────────────────────────────────────────
// Technical grid with thin lines and small + crosses at each intersection.
function DigitalMatMesh() {
  const gap = 9;
  const half = gap / 2;
  const arm = 1.2;
  return (
    <svg style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 1, opacity: 0.45,
    }}>
      <defs>
        <pattern id="sv-grid-mesh" width={gap} height={gap} patternUnits="userSpaceOnUse">
          {/* Grid lines */}
          <line x1={half} y1="0" x2={half} y2={gap} stroke="rgba(180,155,100,0.25)" strokeWidth="0.3"/>
          <line x1="0" y1={half} x2={gap} y2={half} stroke="rgba(180,155,100,0.25)" strokeWidth="0.3"/>
          {/* Cross at center */}
          <line x1={half - arm} y1={half} x2={half + arm} y2={half} stroke="rgba(180,155,100,0.6)" strokeWidth="0.5"/>
          <line x1={half} y1={half - arm} x2={half} y2={half + arm} stroke="rgba(180,155,100,0.6)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sv-grid-mesh)"/>
    </svg>
  );
}

// ─── Backdrop — commander art + mesh + veil ────────────────────────────────
function SVBackdrop({ src }: any) {
  return (
    <>
      <img src={src} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover',
      }}/>

      {/* Digital mat mesh overlay */}
      <DigitalMatMesh/>

      {/* Dark gradient veil */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        background: 'linear-gradient(180deg, rgba(10,6,4,0.30) 0%, rgba(10,6,4,0.60) 35%, #0A0604 85%)',
      }}/>

      {/* Copper warm glow at top */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% 15%, rgba(201,155,47,0.18), transparent 60%)',
      }}/>

      {/* Inner border glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(201,155,47,0.12)',
      }}/>
    </>
  );
}

// ─── Header — settings only ─────────────────────────────────────────────────
function SVHeader({ onSettings }: any) {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, zIndex: 10,
      padding: '52px 14px 0',
    }}>
      <button style={iconBtn()} onClick={onSettings}>
        <Icon name="settings" size={18} stroke="var(--ink)"/>
      </button>
    </div>
  );
}

// ─── Corner brackets (decorative frame around dial) ─────────────────────────
function CornerBrackets({ size = 220 }: any) {
  const inset = 0;
  const len = 18;
  const sw = 1.5;
  const color = 'rgba(226,184,88,0.35)';
  const Bracket = ({ rotate, style }: any) => (
    <svg width={inset + len + 2} height={inset + len + 2} style={{
      position: 'absolute', ...style,
      transform: `rotate(${rotate}deg)`,
      pointerEvents: 'none',
    }}>
      <path d={`M ${inset} ${inset + len} L ${inset} ${inset} L ${inset + len} ${inset}`}
        stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none"/>
    </svg>
  );
  return (
    <div style={{
      position: 'absolute', width: size, height: size,
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }}>
      <Bracket rotate={0}   style={{ top: 0, left: 0 }}/>
      <Bracket rotate={90}  style={{ top: 0, right: 0 }}/>
      <Bracket rotate={270} style={{ bottom: 0, left: 0 }}/>
      <Bracket rotate={180} style={{ bottom: 0, right: 0 }}/>
    </div>
  );
}

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

        {/* Copper gradient ring */}
        <defs>
          <linearGradient id="dial-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E2B858"/>
            <stop offset="22%" stopColor="#C99B2F"/>
            <stop offset="50%" stopColor="#8C5A28"/>
            <stop offset="78%" stopColor="#C99B2F"/>
            <stop offset="100%" stopColor="#E2B858"/>
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={radius}
          fill="none" stroke="url(#dial-ring-grad)" strokeWidth="2.5" strokeOpacity="0.6"/>

        {/* Commander damage segments */}
        {segments.map((seg: any, i: number) => (
          <circle key={i} cx={cx} cy={cx} r={radius}
            fill="none" stroke={seg.color}
            strokeWidth={5}
            strokeDasharray={`${c * seg.frac} ${c}`}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cx})`}
            opacity={0.92}
            style={{ filter: `drop-shadow(0 0 4px ${seg.color}60)` }}/>
        ))}

        {/* Inner well */}
        <circle cx={cx} cy={cx} r="68"
          fill="var(--parchment-card)" stroke="var(--line)" strokeWidth="1"/>

        {/* Inner decorative ring */}
        <circle cx={cx} cy={cx} r="65"
          fill="none" stroke="#E2B858" strokeWidth="0.4" strokeOpacity="0.25"
          strokeDasharray="1 3"/>
      </svg>

      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {!dead ? (
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 75, lineHeight: 1, letterSpacing: '-0.04em',
              color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 30px rgba(226,184,88,0.12), 0 1px 0 rgba(10,6,4,0.6)',
            }}>{life}</div>
        ) : (
          <>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 48, lineHeight: 1, color: '#E2B858',
            }}>×</div>
            <div style={{
              marginTop: 10, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.24em', textTransform: 'uppercase',
              color: '#C99B2F',
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
        background: '#150E08',
        border: '1px solid rgba(226,184,88,0.18)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0,
        boxShadow: '0 1px 0 rgba(0,0,0,.15), 0 6px 18px -8px rgba(0,0,0,.35)',
      }}
    >{glyph}</button>
  );
}

// ─── Counter chip (KeepsakeCard dark) ───────────────────────────────────────
function CounterChip({ kind, value, label, dense = false }: any) {
  const v = COUNTER_VOCAB[kind] || { label: kind, tone: '#8A7E6F', soft: '#F0E8D8', glyph: 'flame' };
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: dense ? 5 : 6,
      height: dense ? 22 : 'auto',
      padding: dense ? '0 9px' : '6px 12px',
      borderRadius: 999,
      background: `${v.tone}22`,
      border: `1px solid ${v.tone}44`,
      color: v.soft,
      fontSize: dense ? 11 : 12, fontWeight: 700, letterSpacing: '0.02em',
      fontFamily: 'var(--font-ui)',
    }}>
      <Icon name={v.glyph} size={dense ? 12 : 14} stroke={v.soft} width={1.9}/>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 400,
        fontSize: dense ? 13 : 15, lineHeight: 1, letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
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

// ─── Opponent row (KeepsakeCard dark) ────────────────────────────────────────
function OpponentRow({ p, onTap }: any) {
  return (
    <button onClick={() => onTap(p)} style={{
      width: '100%', padding: '8px 10px',
      background: '#150E08',
      border: '1px solid rgba(226,184,88,0.18)',
      borderRadius: 14,
      display: 'flex', alignItems: 'center', gap: 10,
      cursor: 'pointer', textAlign: 'left',
    }}>
      <CommAvatar src={p.art} size={32}
        ring={p.dead ? '#5C5043' : '#E2B858'} dim={p.dead}/>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: '#8A7E6F',
        }}>{p.name}</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 11, lineHeight: 1.1,
          color: p.dead ? '#8A7E6F' : 'var(--ink)',
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
              background: `${v.tone}22`,
              border: `1px solid ${(v.tone || 'rgba(226,184,88,0.18)')}55`,
              color: v.soft || 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-display)',
            }}>{c.value}</div>
          );
        })}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22, lineHeight: 1, letterSpacing: '-0.02em',
          color: p.dead ? '#5C5043' : 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          minWidth: 30, textAlign: 'right',
        }}>{p.dead ? '—' : p.life}</div>
      </div>
    </button>
  );
}

// ─── Bottom nav (KeepsakeCard dark) ─────────────────────────────────────────
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
      background: 'linear-gradient(180deg, rgba(10,6,4,0) 0%, rgba(10,6,4,0.92) 30%, #0A0604 100%)',
    }}>
      <div style={{
        background: '#150E08',
        border: '1px solid rgba(226,184,88,0.18)',
        borderRadius: 999,
        boxShadow: '0 1px 0 rgba(0,0,0,.15), 0 6px 18px -8px rgba(0,0,0,.35)',
        padding: 6, display: 'flex', justifyContent: 'space-between',
      }}>
        {items.map(it => {
          const on = it.id === active;
          return (
            <button key={it.id} onClick={() => onNav?.(it.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '6px 0', border: 'none',
              background: on ? '#3F9F4D' : 'transparent',
              color: on ? '#F0E8D8' : '#8A7E6F',
              borderRadius: 999,
              fontFamily: 'var(--font-ui)',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', gap: 2,
              cursor: 'pointer',
            }}>
              <Icon name={it.icon} size={16}
                stroke={on ? '#F0E8D8' : '#8A7E6F'}/>
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mini life dial (compact, for opponent overlay) ─────────────────────────
function MiniLifeDial({ life, cmdrDmgSegments = [] }: any) {
  const sz = 96, cx = 48, radius = 38;
  const c = 2 * Math.PI * radius;

  const sorted = [...cmdrDmgSegments]
    .map((s: any, i: number) => ({ ...s, colorIdx: i }))
    .sort((a: any, b: any) => b.dmg - a.dmg);

  const segments: any[] = [];
  const seen = new Set();
  sorted.forEach((s: any) => {
    if (s.dmg === 0) return;
    let frac = Math.min(s.dmg, 21) / 21;
    const key = s.dmg;
    if (seen.has(key)) frac = Math.max(0, frac - 0.015);
    seen.add(key);
    segments.push({ frac, color: CMDR_DMG_COLORS[s.colorIdx % CMDR_DMG_COLORS.length] });
  });

  return (
    <div style={{ position: 'relative', width: sz, height: sz }}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
        {/* Tick marks */}
        <g stroke="var(--ink-3)" strokeWidth="0.75">
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
            const r1 = 45, r2 = i % 5 === 0 ? 40 : 42;
            return <line key={i}
              x1={cx + Math.cos(a) * r1} y1={cx + Math.sin(a) * r1}
              x2={cx + Math.cos(a) * r2} y2={cx + Math.sin(a) * r2}
              opacity={i % 5 === 0 ? 0.45 : 0.18}/>;
          })}
        </g>

        <circle cx={cx} cy={cx} r={radius} fill="none" stroke="var(--line-strong)" strokeWidth="1.5"/>

        {/* Commander damage segments */}
        {segments.map((seg: any, i: number) => (
          <circle key={i} cx={cx} cy={cx} r={radius}
            fill="none" stroke={seg.color}
            strokeWidth={4}
            strokeDasharray={`${c * seg.frac} ${c}`}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cx})`}
            opacity={0.92}/>
        ))}

        <circle cx={cx} cy={cx} r="30" fill="var(--parchment-card)" stroke="var(--line)" strokeWidth="1"/>
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
      background: '#150E08', border: '1px solid rgba(226,184,88,0.18)',
      color: 'var(--ink)', fontFamily: 'var(--font-display)',
      fontSize: 22, lineHeight: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', padding: 0,
      boxShadow: '0 1px 0 rgba(0,0,0,.15), 0 6px 18px -8px rgba(0,0,0,.35)',
    }}>{glyph}</button>
  );
}

// ─── Compass Rose (watermark for bottom sheets) ────────────────────────────
function CompassRose({ color = '#E2B858', opacity = 0.22, size = 240 }: any) {
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      opacity, pointerEvents: 'none',
    }}>
      <g stroke={color} strokeWidth="0.8" fill="none">
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r1 = 40, r2 = 150;
          const cx = 160, cy = 160;
          return <line key={i}
            x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1}
            x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2}/>;
        })}
        <circle cx="160" cy="160" r="40"/>
        <circle cx="160" cy="160" r="60" strokeDasharray="1 3"/>
        <circle cx="160" cy="160" r="100" strokeDasharray="1 4"/>
        <circle cx="160" cy="160" r="150"/>
      </g>
    </svg>
  );
}

// ─── ModalTitle (KeepsakeCard style) ────────────────────────────────────────
function ModalTitle({ kickerText, title }: any) {
  return (
    <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.32em', textTransform: 'uppercase',
        color: '#E2B858',
      }}>
        <span style={{ width: 18, height: 1, background: '#E2B858', opacity: 0.5 }}/>
        <span style={{ fontSize: 8, opacity: 0.7 }}>✦</span>
        <span>{kickerText}</span>
        <span style={{ fontSize: 8, opacity: 0.7 }}>✦</span>
        <span style={{ width: 18, height: 1, background: '#E2B858', opacity: 0.5 }}/>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1.05,
        color: 'var(--ink)', marginTop: 4, letterSpacing: '-0.01em',
      }}>{title}</div>
    </div>
  );
}

// ─── Bottom Sheet Shell (KeepsakeCard style) ────────────────────────────────
function BottomSheet({ children, onClose }: any) {
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, zIndex: 28,
        background: 'rgba(5,3,2,0.72)',
        backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
      }}/>

      {/* Copper glow behind sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: 300, height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(226,184,88,0.10) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 29,
      }}/>

      {/* Sheet body */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
        borderTop: '2px solid transparent',
        borderImage: 'linear-gradient(90deg, #8C5A28 0%, #E2B858 25%, #C99B2F 50%, #E2B858 75%, #8C5A28 100%) 1',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'relative',
          background: '#1C140C',
          padding: '14px 18px 32px',
          boxShadow: '0 -20px 40px -10px rgba(0,0,0,0.50)',
        }}>
          {/* Compass rose watermark */}
          <CompassRose size={280} opacity={0.06} color="#E2B858"/>

          {/* Drag handle */}
          <div style={{
            position: 'relative', zIndex: 1,
            width: 40, height: 4, borderRadius: 999,
            background: 'rgba(226,184,88,0.18)', margin: '0 auto 14px',
          }}/>

          <div style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Dice bottom sheet (KeepsakeCard) ───────────────────────────────────────
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
    { key: 'd6',     label: 'D6',            icon: 'dice' },
    { key: 'd20',    label: 'D20',           icon: 'dice' },
    { key: 'coin',   label: 'Coin',          icon: 'dice' },
    { key: 'player', label: 'Random Player', icon: 'dice' },
  ];

  return (
    <BottomSheet onClose={onClose}>
      <ModalTitle kickerText="Roll" title="Dice & Random"/>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 10, marginTop: 4,
      }}>
        {dice.map((d) => {
          const isLast = lastRolled === d.key;
          const val = (results as any)[d.key];
          const accent = isLast ? '#E2B858' : '#8A7E6F';
          const bgFill = isLast
            ? 'radial-gradient(circle at 30% 20%, #2A1E12 0%, #1E1409 65%)'
            : '#1A120A';
          return (
            <button key={d.key} onClick={() => roll(d.key)} style={{
              position: 'relative',
              background: bgFill,
              border: `1px solid ${isLast ? 'rgba(226,184,88,0.53)' : 'rgba(226,184,88,0.22)'}`,
              borderRadius: 16,
              padding: '16px 14px 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              cursor: 'pointer', textAlign: 'center',
              boxShadow: isLast
                ? '0 0 0 3px rgba(226,184,88,0.08), 0 4px 14px -4px rgba(226,184,88,0.20), inset 0 1px 0 rgba(226,184,88,0.08)'
                : 'inset 0 1px 0 rgba(226,184,88,0.04), 0 1px 2px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: accent,
              }}>
                <Icon name={d.icon} size={11} stroke={accent} width={1.6}/>
                <span>{d.label}</span>
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 30, lineHeight: 1,
                color: 'var(--ink)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em', marginTop: 2,
                textShadow: isLast ? '0 0 12px rgba(226,184,88,0.25)' : 'none',
              }}>{val ?? '—'}</div>
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: 9,
                color: '#5C5043',
                letterSpacing: '0.04em', marginTop: 2,
              }}>{val ? (isLast ? 'Last roll' : 'Previous') : 'Tap to roll'}</div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}

// ─── Counter Row (KeepsakeCard) ─────────────────────────────────────────────
function CounterRow({ counter, count, isFirst, onAdjust }: any) {
  const iconSize = 44;
  const fillPct = counter.lethal ? Math.min(100, (count / counter.lethal) * 100) : 0;

  return (
    <div style={{
      position: 'relative',
      padding: '14px 4px',
      borderTop: isFirst ? 'none' : `1px dashed ${counter.tone}55`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          position: 'relative',
          width: iconSize, height: iconSize, borderRadius: 999,
          background: `radial-gradient(circle at 35% 30%, ${counter.tone}33 0%, ${counter.tone}1A 60%, ${counter.tone}22 100%)`,
          border: `1.5px solid ${counter.tone}BB`,
          color: counter.tone,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 14px -2px ${counter.tone}50, inset 0 0 8px ${counter.tone}15`,
          flexShrink: 0,
        }}>
          <Icon name={counter.glyph} size={20} stroke={counter.tone} width={1.8}/>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: counter.tone,
          }}>{counter.label}{counter.lethal ? ` · lethal ${counter.lethal}` : ''}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 1 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1,
              color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}>{count}</div>
            {counter.lethal && (
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: 11,
                color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums',
              }}>/ {counter.lethal}</div>
            )}
          </div>
          {counter.lethal && (
            <div style={{
              marginTop: 6, height: 3, borderRadius: 999,
              background: `${counter.tone}33`,
              overflow: 'hidden', maxWidth: 120,
            }}>
              <div style={{
                width: `${fillPct}%`, height: '100%',
                background: counter.tone, borderRadius: 999,
                boxShadow: `0 0 6px ${counter.tone}66`,
              }}/>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => onAdjust(counter.key, -1)} style={{
            width: 38, height: 38, borderRadius: 999,
            background: `${counter.tone}25`,
            color: counter.tone,
            border: `1.5px solid ${counter.tone}AA`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
            boxShadow: `0 0 8px -2px ${counter.tone}30`,
            opacity: count === 0 ? 0.3 : 1,
          }}><Icon name="minus" size={16} stroke={counter.tone} width={2.2}/></button>
          <button onClick={() => onAdjust(counter.key, 1)} style={{
            width: 38, height: 38, borderRadius: 999,
            background: counter.tone,
            color: '#fff',
            border: `1.5px solid ${counter.tone}AA`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
            boxShadow: `0 2px 8px -2px ${counter.tone}66, inset 0 1px 0 rgba(255,255,255,0.25)`,
          }}><Icon name="plus" size={16} stroke="#fff" width={2.2}/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Counter bottom sheet (KeepsakeCard) ───────────────────────────────────
function CounterSheet({ onClose, counters, onAdjust }: any) {
  const COUNTERS = [
    { key: 'poison',     label: 'Poison',     glyph: 'skull', tone: '#4F8A4D', lethal: 10 },
    { key: 'energy',     label: 'Energy',     glyph: 'bolt',  tone: '#C99B2F', lethal: null },
    { key: 'experience', label: 'Experience', glyph: 'star',  tone: '#7E4E8A', lethal: null },
  ];

  return (
    <BottomSheet onClose={onClose}>
      <ModalTitle kickerText="Your" title="Counters"/>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
      }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(226,184,88,0.18)' }}/>
        <span style={{
          fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700,
          letterSpacing: '0.28em', textTransform: 'uppercase',
          color: '#8A7E6F',
        }}>Track</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(226,184,88,0.18)' }}/>
      </div>

      <div>
        {COUNTERS.map((c, i) => (
          <CounterRow key={c.key} counter={c}
            count={counters[c.key] || 0}
            isFirst={i === 0}
            onAdjust={onAdjust}/>
        ))}
      </div>
    </BottomSheet>
  );
}

// ─── Commander damage bottom sheet (KeepsakeCard) ──────────────────────────
function CmdrDmgSheet({ onClose, opponents, cmdrDmg, onAdjust }: any) {
  const CMDR_HEAT_COLORS = ['#E8A54B', '#D4783C', '#B8432E', '#8C2318', '#5E1610'];

  return (
    <BottomSheet onClose={onClose}>
      <ModalTitle kickerText="Damage from" title="Commanders"/>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opponents.map((opp: any) => {
          const dmg = cmdrDmg[opp.id] || 0;
          const frac = Math.min(dmg / 21, 1);
          const heatIdx = Math.min(CMDR_HEAT_COLORS.length - 1, Math.floor(frac * CMDR_HEAT_COLORS.length));
          const accent = dmg > 0 ? CMDR_HEAT_COLORS[heatIdx] : '#8A7E6F';
          return (
            <div key={opp.id} style={{
              background: '#150E08',
              border: dmg > 0 ? `1.5px solid ${accent}66` : '1px solid rgba(226,184,88,0.18)',
              borderRadius: 16, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <CommAvatar src={opp.art} size={36} ring={dmg > 0 ? accent : 'rgba(226,184,88,0.18)'}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: '#8A7E6F',
                }}>{opp.name}</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 11, lineHeight: 1.1,
                  color: 'var(--ink)', letterSpacing: '-0.01em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{opp.commander}</div>
                <div style={{
                  marginTop: 6, height: 4, borderRadius: 999,
                  background: 'rgba(226,184,88,0.10)',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 999,
                    background: frac >= 1 ? '#9E2B2B' : accent,
                    width: `${frac * 100}%`,
                    boxShadow: dmg > 0 ? `0 0 6px ${accent}44` : 'none',
                  }}/>
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1,
                letterSpacing: '-0.02em', color: dmg > 0 ? accent : '#8A7E6F',
                fontVariantNumeric: 'tabular-nums', minWidth: 42, textAlign: 'center',
              }}>{dmg}<span style={{ fontSize: 12, color: '#5C5043' }}>/21</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => onAdjust(opp.id, 1)} style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: '#0A0604', border: '1px solid rgba(226,184,88,0.18)',
                  fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', padding: 0,
                }}>+</button>
                <button onClick={() => onAdjust(opp.id, -1)} style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: '#0A0604', border: '1px solid rgba(226,184,88,0.18)',
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
    </BottomSheet>
  );
}

// ─── Opponent overlay — commander broadside ─────────────────────────────────
function OpponentOverlay({ p, myLife, cmdrDmgSegments, miniRoster, onClose, onLifeAdj, onSelectPlayer }: any) {
  if (!p) return null;
  const isEmpty = p.isEmptySeat;
  const showSelector = miniRoster.length > 1;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: 'rgba(5,3,2,0.72)',
      backdropFilter: 'blur(2px)',
      display: 'flex', flexDirection: 'column',
      animation: 'overlayFadeIn 0.25s ease-out',
    }}>
      <div style={{
        margin: '52px auto 0', display: 'flex', alignItems: 'center', gap: 14,
        animation: 'dialShrinkUp 0.4s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <MiniRoundBtn glyph={'−'} onClick={() => onLifeAdj(-1)}/>
        <MiniLifeDial life={myLife} cmdrDmgSegments={cmdrDmgSegments || []}/>
        <MiniRoundBtn glyph="+" onClick={() => onLifeAdj(1)}/>
      </div>

      {/* Mini roster selector — only show when multiple opponents */}
      {showSelector && (
        <div style={{
          margin: '10px 14px 0',
          background: '#150E08',
          border: '1px solid rgba(226,184,88,0.18)',
          borderRadius: 12, padding: '6px 8px',
          display: 'flex', justifyContent: 'space-between', gap: 6,
        }}>
          {miniRoster.map((m: any, i: number) => {
            const isActive = m.id === p.id;
            return (
              <button key={i} onClick={() => onSelectPlayer?.(m)} style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', borderRadius: 8, border: 'none',
                background: isActive ? 'rgba(226,184,88,0.12)' : 'transparent',
                cursor: 'pointer',
                outline: isActive ? '1.5px solid #E2B858' : 'none',
              }}>
                <CommAvatar src={m.art} size={18} ring={isActive ? '#E2B858' : 'rgba(226,184,88,0.18)'} dim={m.dead}/>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 14, lineHeight: 1,
                  color: m.dead ? '#5C5043' : 'var(--ink)',
                  fontVariantNumeric: 'tabular-nums',
                }}>{m.dead ? '—' : m.life}</div>
              </button>
            );
          })}
        </div>
      )}

      <div style={{
        margin: '14px 14px',
        background: '#150E08',
        border: '1px solid rgba(226,184,88,0.18)',
        borderRadius: 24,
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.60)',
        padding: 14, flex: 1, position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 10,
        animation: 'slideUpCard 0.35s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CommAvatar src={p.art} size={42} ring={isEmpty ? 'rgba(226,184,88,0.18)' : '#E2B858'}/>
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
            background: 'transparent', border: '1px solid rgba(226,184,88,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
          }}>
            <Icon name="x" size={14} stroke="#C8BCA8"/>
          </button>
        </div>

        {/* Commander details — only for real players */}
        {!isEmpty && (
          <>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px',
              background: '#0A0604', border: '1px solid rgba(226,184,88,0.10)',
              borderRadius: 10,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600,
                color: '#C8BCA8', letterSpacing: '0.04em',
              }}>{p.typeLine || 'Legendary Creature'}</div>
              <ManaDots colors={p.colors} size={7}/>
            </div>

            {p.rulesText && (
              <div style={{
                background: '#0A0604', border: '1px solid rgba(226,184,88,0.10)',
                borderRadius: 12, padding: '10px 12px',
                fontSize: 12, lineHeight: 1.45,
                color: '#C8BCA8', fontStyle: 'italic',
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
                    color: '#8A7E6F', fontWeight: 700,
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
            background: '#0A0604', border: '1px solid rgba(226,184,88,0.10)',
            borderRadius: 12, padding: '8px 12px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: '#D4883E',
            }}>Dmg to you</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1,
              letterSpacing: '-0.03em', color: '#D4883E', marginTop: 2,
              fontVariantNumeric: 'tabular-nums',
            }}>{p.cmdrDmg ?? 0}<span style={{ fontSize: 16, color: '#8A7E6F' }}> /21</span></div>
          </div>
          <div style={{
            background: 'rgba(63,159,77,0.10)',
            border: '1px solid rgba(63,159,77,0.25)',
            borderRadius: 12, padding: '8px 12px',
          }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: '#3F9F4D',
            }}>Dmg from you</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1,
              letterSpacing: '-0.03em', color: '#2F7A3A', marginTop: 2,
              fontVariantNumeric: 'tabular-nums',
            }}>{p.cmdrDmgFromYou ?? 0}<span style={{ fontSize: 16, color: '#8A7E6F' }}> /21</span></div>
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
      background: 'rgba(5,3,2,0.72)',
      backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'overlayFadeIn 0.25s ease-out',
    }}>
      <div style={{
        width: 'calc(100% - 48px)', maxWidth: 340,
        background: '#1C140C',
        border: '1px solid rgba(226,184,88,0.18)',
        borderRadius: 24,
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.60)',
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
            background: 'transparent', border: '1px solid rgba(226,184,88,0.18)',
            fontSize: 11, fontWeight: 700, color: '#C8BCA8',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>Close</button>
        </div>

        {!confirmingAbandon ? (
          <button onClick={() => setConfirmingAbandon(true)} style={{
            width: '100%', cursor: 'pointer',
            background: '#150E08',
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
              textAlign: 'center', fontSize: 13, color: '#C8BCA8', lineHeight: 1.4,
              marginBottom: 4,
            }}>
              Are you sure? This action cannot be undone.
            </div>
            <button onClick={onAbandon} style={{
              width: '100%', cursor: 'pointer',
              background: '#150E08',
              color: '#9E2B2B',
              border: '1px solid rgba(158,43,43,0.2)',
              borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>Confirm Abandon</button>
            <button onClick={() => setConfirmingAbandon(false)} style={{
              width: '100%', cursor: 'pointer',
              background: '#150E08',
              color: '#C8BCA8',
              border: '1px solid rgba(226,184,88,0.18)',
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
      <path d={d} fill="#1A1410"/>
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
        background: 'rgba(0,0,0,0.60)',
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
          background: '#1A1410',
          padding: '8px 22px 32px',
        }}>
          <button onClick={onRevive} aria-label="Close" style={{
            position: 'absolute', top: 14, right: 16,
            width: 32, height: 32, borderRadius: 999,
            border: '1px solid rgba(240,232,216,0.08)',
            background: '#100C08',
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
              color: '#F0E8D8', lineHeight: 1.1,
            }}>You have been eliminated</div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#5C5043', lineHeight: 1.4 }}>
              If the game is over, head to review to rate your experience.
              If this was a mistake, revive to continue playing.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={onReview} style={{
              width: '100%', cursor: 'pointer',
              background: '#3F9F4D', color: '#F0E8D8',
              border: 'none', borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              boxShadow: '0 2px 0 rgba(0,0,0,.30), 0 18px 36px -12px rgba(0,0,0,.50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#F0E8D8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>
              </svg>
              Go to Review
            </button>

            <button onClick={onRevive} style={{
              width: '100%', cursor: 'pointer',
              background: '#1A1410', color: 'var(--ink-2)',
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
      <SVHeader onSettings={() => setShowSettings(true)}/>

      {/* Life dial + buttons + corner brackets */}
      <div style={{
        position: 'relative', zIndex: 4, marginTop: 60,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
      }}>
        <CornerBrackets size={220}/>
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
          cmdrDmgSegments={mappedOpponents.map((o: any, i: number) => ({ id: o.id, dmg: cmdrDmg[o.id] || 0, colorIdx: i }))}
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
