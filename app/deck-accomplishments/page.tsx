'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCommanderProfile, type CommanderProfile } from '@/lib/commander-profile';
import { updateBracket, deleteCommander, BRACKETS } from '@/lib/commanders';

// ── Tokens ──────────────────────────────────────────────────────────────────
type CategoryId = 'brilliance' | 'flavor' | 'rivalry' | 'allegiance' | 'fun';
type WinPresence = 'under' | 'balanced' | 'over';

const AURA_TIERS = [
  { min: 80, max: 100, label: 'Mythic',    tagline: 'Legendary status' },
  { min: 60, max: 79,  label: 'Beloved',   tagline: 'Regular at the table' },
  { min: 40, max: 59,  label: 'Brewed',    tagline: 'Part of the rotation' },
  { min: 20, max: 39,  label: 'Sideboard', tagline: 'Occasionally called in' },
  { min: 0,  max: 19,  label: 'Exiled',    tagline: 'Unwelcome at tables' },
];
function tierFor(score: number) {
  return AURA_TIERS.find(t => score >= t.min && score <= t.max) || AURA_TIERS[AURA_TIERS.length - 1];
}

const CATEGORIES: { id: CategoryId; label: string; glyph: CategoryId; color: string; soft: string }[] = [
  { id: 'brilliance', label: 'Brilliance', glyph: 'brilliance', color: 'var(--cat-brilliance)', soft: 'var(--cat-brilliance-soft)' },
  { id: 'flavor',     label: 'Flavour',    glyph: 'flavor',     color: 'var(--cat-flavor)',     soft: 'var(--cat-flavor-soft)' },
  { id: 'rivalry',    label: 'Rivalry',    glyph: 'rivalry',    color: 'var(--cat-rivalry)',    soft: 'var(--cat-rivalry-soft)' },
  { id: 'allegiance', label: 'Allegiance', glyph: 'allegiance', color: 'var(--cat-allegiance)', soft: 'var(--cat-allegiance-soft)' },
  { id: 'fun',        label: 'Fun',        glyph: 'fun',        color: 'var(--cat-fun)',        soft: 'var(--cat-fun-soft)' },
];

const MANA_COLORS: Record<string, { fill: string; stroke: string }> = {
  W: { fill: '#F4ECD2', stroke: 'rgba(43,33,24,0.45)' },
  U: { fill: '#A6C7E5', stroke: 'rgba(43,33,24,0.4)' },
  B: { fill: '#3A2E25', stroke: 'rgba(43,33,24,0.6)' },
  R: { fill: '#C9573A', stroke: 'rgba(43,33,24,0.4)' },
  G: { fill: '#5A8A4E', stroke: 'rgba(43,33,24,0.4)' },
  C: { fill: '#C9BFA8', stroke: 'rgba(43,33,24,0.4)' },
};

// ── Inline icons ───────────────────────────────────────────────────────────
function Icon({ name, size = 20, stroke = 'currentColor', width = 1.75 }: { name: string; size?: number; stroke?: string; width?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' } as React.SVGAttributes<SVGSVGElement>;
  const paths: Record<string, React.ReactNode> = {
    'chevron-left': <polyline points="15 18 9 12 15 6"/>,
    check:    <polyline points="20 6 9 17 4 12"/>,
    trash:    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>,
    dots:     <><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></>,
    lock:     <><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

// ── BadgeGlyph (PNG-mask, tints with color) ────────────────────────────────
function BadgeGlyph({ name, size = 28, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const url = `/assets/glyphs/${name}.png`;
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      backgroundColor: color,
      WebkitMaskImage: `url("${url}")`,
      maskImage: `url("${url}")`,
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center', maskPosition: 'center',
      WebkitMaskSize: 'contain', maskSize: 'contain',
    }}/>
  );
}

// ── AuraMark — brand glyph ─────────────────────────────────────────────────
function AuraMark({ size = 22, color = 'var(--forest)' }: { size?: number; color?: string }) {
  const id = `aura-mark-clip-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="36" r="2.4" fill={color}/>
      <defs><clipPath id={id}><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color}/>
        <polygon points="40,60 33,4 34,4 56,60" fill={color}/>
      </g>
    </svg>
  );
}

// ── AuraScore — ceremonial seal ────────────────────────────────────────────
function AuraScore({ score, size = 'lg', color = 'var(--copper)' }: { score: number; size?: 'lg' | 'xl'; color?: string }) {
  const w = size === 'xl' ? 116 : 88;
  const fs = size === 'xl' ? 50 : 38;
  return (
    <div style={{
      position: 'relative',
      width: w, height: w,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={w} height={w} viewBox="0 0 100 100" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="0.8" strokeDasharray="0.6 3"/>
        <circle cx="50" cy="50" r="42" fill="rgba(245,239,226,0.72)" stroke={color} strokeOpacity="0.55" strokeWidth="1.2"/>
        <g opacity="0.18" fill={color}>
          <polygon points="50,50 24,92 30,92"/>
          <polygon points="50,50 47,92 53,92"/>
          <polygon points="50,50 70,92 76,92"/>
        </g>
      </svg>
      <span style={{
        position: 'relative', zIndex: 1,
        fontFamily: 'var(--font-display)',
        fontWeight: 400, fontSize: fs, lineHeight: 1,
        color, letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>{score}</span>
    </div>
  );
}

// ── ManaPips ────────────────────────────────────────────────────────────────
function ManaPips({ colors = [], size = 9 }: { colors?: string[]; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {colors.map((c, i) => {
        const m = MANA_COLORS[c] || MANA_COLORS.C;
        return <span key={i} style={{
          width: size, height: size, borderRadius: 999,
          background: m.fill, border: `1px solid ${m.stroke}`,
          flexShrink: 0,
        }}/>;
      })}
    </span>
  );
}

// ── BracketPip ──────────────────────────────────────────────────────────────
function BracketPip({ n }: { n: number }) {
  return (
    <span style={{
      fontFamily: 'var(--font-ui)',
      fontSize: 10, fontWeight: 700,
      letterSpacing: '0.08em',
      color: 'var(--ink-2)',
      background: 'var(--parchment-deep)',
      border: '1px solid var(--line)',
      padding: '2px 6px',
      borderRadius: 4,
      lineHeight: 1.1,
    }}>B{n}</span>
  );
}

// ── DistributionBar ────────────────────────────────────────────────────────
function DistributionBar({ counts, height = 12 }: { counts: Record<CategoryId, number>; height?: number }) {
  const total = Object.values(counts).reduce((s: number, n: number) => s + (n || 0), 0);
  const allCats = CATEGORIES.map(c => ({ ...c, count: counts[c.id] || 0 }));
  const segments = allCats.filter(s => s.count > 0).sort((a, b) => b.count - a.count);
  // Columns mirror the bar order: earned categories sorted by count desc, then locked.
  const orderedCols = [
    ...segments,
    ...allCats.filter(s => s.count === 0),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        height,
        borderRadius: 999,
        background: 'var(--parchment-deep)',
        border: '1px solid var(--line)',
        overflow: 'hidden',
        display: 'flex',
        boxShadow: 'inset 0 1px 2px rgba(43,33,24,0.06)',
      }}>
        {total > 0 && segments.map((s, i) => {
          const pct = (s.count / total) * 100;
          return (
            <div key={s.id} style={{
              width: `${pct}%`,
              height: '100%',
              background: s.color,
              borderRight: i === segments.length - 1 ? 'none' : '1px solid rgba(250,245,234,0.4)',
            }}/>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
        {orderedCols.map(s => {
          const earned = s.count > 0;
          return (
            <div key={s.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              fontFamily: 'var(--font-ui)',
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 20, fontWeight: 400, lineHeight: 1,
                letterSpacing: '-0.01em',
                color: earned ? s.color : 'var(--ink-4)',
                fontVariantNumeric: 'tabular-nums',
              }}>{s.count}</span>
              <span style={{
                fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: earned ? 'var(--ink-2)' : 'var(--ink-4)',
                lineHeight: 1.1,
              }}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── WinRateMeter ───────────────────────────────────────────────────────────
function WinRateMeter({ state = 'balanced' }: { state?: WinPresence }) {
  const stops: { id: WinPresence; label: string }[] = [
    { id: 'under',    label: 'Under-represented' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'over',     label: 'Over-represented' },
  ];
  const activeIdx = stops.findIndex(s => s.id === state);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 8, right: 8, top: '50%',
          height: 2, transform: 'translateY(-50%)',
          background: 'var(--line-strong)', borderRadius: 1,
        }}/>
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {stops.map((s, i) => {
            const active = i === activeIdx;
            return (
              <div key={s.id} style={{
                width: active ? 14 : 9,
                height: active ? 14 : 9,
                borderRadius: 999,
                background: active ? 'var(--ink)' : 'var(--parchment-card)',
                border: active ? '2px solid var(--ink)' : '1.5px solid var(--ink-4)',
                boxShadow: active ? '0 0 0 4px rgba(43,33,24,0.06)' : 'none',
              }}/>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-ui)' }}>
        {stops.map((s, i) => (
          <div key={s.id} style={{
            fontSize: 10, fontWeight: i === activeIdx ? 700 : 500,
            color: i === activeIdx ? 'var(--ink)' : 'var(--ink-3)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            textAlign: i === 0 ? 'left' : i === stops.length - 1 ? 'right' : 'center',
            flex: 1,
          }}>{s.label}</div>
        ))}
      </div>
    </div>
  );
}

// ── LockedBadge + BadgeTile ────────────────────────────────────────────────
function LockedBadge({ size = 56 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: 'var(--parchment-deep)',
      border: '1.5px dashed var(--line-strong)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--ink-4)', position: 'relative',
    }}>
      <Icon name="lock" size={Math.round(size * 0.34)} stroke="currentColor" width={1.8}/>
    </div>
  );
}

function BadgeTile({ catId, count = 0 }: { catId: CategoryId; count?: number }) {
  const cat = CATEGORIES.find(c => c.id === catId)!;
  const earned = count > 0;
  const ring = 56;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      flex: 1, minWidth: 0,
    }}>
      <div style={{ position: 'relative' }}>
        {earned ? (
          <div style={{
            width: ring, height: ring, borderRadius: 999,
            background: cat.soft, color: cat.color,
            border: `1.5px solid ${cat.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-rest)',
          }}>
            <BadgeGlyph name={cat.glyph} size={30} color={cat.color}/>
          </div>
        ) : (
          <LockedBadge size={ring}/>
        )}
        {earned && (
          <div style={{
            position: 'absolute', right: -4, bottom: -4,
            minWidth: 18, height: 18, borderRadius: 999,
            background: 'var(--ink)', color: 'var(--parchment)',
            fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 6px',
            border: '2px solid var(--parchment-card)',
            fontFamily: 'var(--font-ui)',
          }}>×{count}</div>
        )}
      </div>
      <div style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 11, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: earned ? 'var(--ink)' : 'var(--ink-4)',
        textAlign: 'center', lineHeight: 1.1,
      }}>{earned ? cat.label : '—'}</div>
    </div>
  );
}

// ── BracketTile (for the change-bracket popup) ─────────────────────────────
function BracketTile({ n, label, description, selected, onSelect }: { n: number; label: string; description: string; selected: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      display: 'flex', alignItems: 'stretch', gap: 14,
      padding: 14,
      background: selected ? 'var(--copper-soft)' : 'var(--parchment-card)',
      border: selected ? '1.5px solid var(--copper)' : '1px solid var(--line)',
      borderLeft: selected ? '6px solid var(--copper)' : '4px solid var(--ink-4)',
      borderRadius: 'var(--r-card)',
      boxShadow: selected ? 'var(--shadow-active)' : 'var(--shadow-rest)',
      fontFamily: 'var(--font-ui)',
      transition: 'all 160ms var(--ease)',
    }}>
      <div style={{
        width: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? 'var(--parchment-card)' : 'var(--parchment-deep)',
        borderRadius: 12,
        border: selected ? '1px solid var(--copper)' : '1px solid var(--line)',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 38, fontWeight: 400,
          color: selected ? 'var(--copper)' : 'var(--ink)',
          lineHeight: 1, letterSpacing: '-0.02em',
        }}>{n}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400, fontSize: 18,
          color: 'var(--ink)', letterSpacing: '-0.005em',
          lineHeight: 1.15,
        }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.35 }}>{description}</div>
      </div>
      {selected && (
        <div style={{
          flexShrink: 0, alignSelf: 'center',
          width: 24, height: 24, borderRadius: 999,
          background: 'var(--copper)', color: 'var(--parchment)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={14} width={2.5}/>
        </div>
      )}
    </button>
  );
}

// ── ScreenHeader ───────────────────────────────────────────────────────────
function ScreenHeader({ title, onBack, trailing }: { title: string; onBack?: () => void; trailing?: React.ReactNode }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 12px 12px 8px',
      background: 'rgba(245,239,226,0.88)',
      backdropFilter: 'blur(14px) saturate(120%)',
      WebkitBackdropFilter: 'blur(14px) saturate(120%)',
      borderBottom: '1px solid var(--line)',
      fontFamily: 'var(--font-ui)',
      flexShrink: 0,
    }}>
      {onBack ? (
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: 999, border: 'none',
          background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink)', cursor: 'pointer',
        }}>
          <Icon name="chevron-left" size={24}/>
        </button>
      ) : <div style={{ width: 40 }}/>}
      <h1 style={{
        margin: 0, fontFamily: 'var(--font-ui)', fontWeight: 700,
        fontSize: 19, letterSpacing: '-0.01em', color: 'var(--ink)',
        flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{title}</h1>
      {trailing || <AuraMark size={20}/>}
    </div>
  );
}

// ── Win-presence derivation from aura score ────────────────────