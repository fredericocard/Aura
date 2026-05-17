'use client';

import React, { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { deleteCommander, confirmBracketAndApplyScoring, BRACKETS } from '@/lib/commanders';
import { manualBracketChange } from '@/lib/bracket-change';
import { CommanderArtPicker } from '@/app/components/CommanderArtPicker';

// ── Types ───────────────────────────────────────────────────────────────────
type CategoryId = 'brilliance' | 'flavor' | 'rivalry' | 'allegiance' | 'fun';
type WinPresence = 'under' | 'balanced' | 'over';

interface CommanderProfile {
  deckId: string;
  commanderName: string;
  commanderArtUrl: string | null;
  colorIdentity: string | null;
  currentBracket: number;
  /** True if the deck has never had a bracket assigned. Drives the
   *  "first-time bracket pick → retroactive scoring" branch. */
  bracketIsUnset: boolean;
  auraScore: number;
  badges: { badge: string; earnedCount: number }[];
  totalBadgesEarned: number;
  totalGames: number;
}

// ── Lightweight profile loader (avoids the brittle getCommanderProfile call) ─
async function loadProfile(deckId: string): Promise<CommanderProfile> {
  const { supabase } = await import('@/lib/supabase');
  const { data: deck, error: deckErr } = await supabase
    .from('decks')
    .select('id, commander_name, commander_art_url, color_identity, bracket, aura_score, badge_brilliance, badge_flavor, badge_rivalry, badge_allegiance, badge_fun')
    .eq('id', deckId)
    .single() as { data: any; error: any };
  if (deckErr || !deck) throw new Error(deckErr?.message || 'Deck not found');

  const { count } = await supabase
    .from('game_players')
    .select('id', { count: 'exact', head: true })
    .eq('deck_id', deckId);

  const badges = [
    { badge: 'brilliance', earnedCount: Number(deck.badge_brilliance ?? 0) },
    { badge: 'flavor',     earnedCount: Number(deck.badge_flavor     ?? 0) },
    { badge: 'rivalry',    earnedCount: Number(deck.badge_rivalry    ?? 0) },
    { badge: 'allegiance', earnedCount: Number(deck.badge_allegiance ?? 0) },
    { badge: 'fun',        earnedCount: Number(deck.badge_fun        ?? 0) },
  ];

  return {
    deckId,
    commanderName: deck.commander_name,
    commanderArtUrl: deck.commander_art_url,
    colorIdentity: deck.color_identity,
    currentBracket: Number(deck.bracket ?? 2),
    bracketIsUnset: deck.bracket === null || deck.bracket === undefined,
    auraScore: Number(deck.aura_score ?? 50),
    badges,
    totalBadgesEarned: badges.reduce((s, b) => s + b.earnedCount, 0),
    totalGames: count ?? 0,
  };
}

// ── Tokens ──────────────────────────────────────────────────────────────────
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

// ── Inline icons ────────────────────────────────────────────────────────────
function Icon({ name, size = 20, stroke = 'currentColor', width = 1.75 }: { name: string; size?: number; stroke?: string; width?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' } as React.SVGAttributes<SVGSVGElement>;
  const paths: Record<string, React.ReactNode> = {
    'chevron-left': <polyline points="15 18 9 12 15 6"/>,
    check: <polyline points="20 6 9 17 4 12"/>,
    trash: <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>,
    dots:  <><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></>,
    lock:  <><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    scroll: <><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M19 17V5a2 2 0 0 0-2-2H6"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="M21 15l-5-5L5 21"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

// ── BadgeGlyph (PNG mask, tints with color) ─────────────────────────────────
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

// ── AuraMark — brand glyph ──────────────────────────────────────────────────
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

// ── AuraScore — ceremonial seal ─────────────────────────────────────────────
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

// ── DistributionBar ─────────────────────────────────────────────────────────
function DistributionBar({ counts, height = 12 }: { counts: Record<CategoryId, number>; height?: number }) {
  const total = Object.values(counts).reduce((s: number, n: number) => s + (n || 0), 0);
  const allCats = CATEGORIES.map(c => ({ ...c, count: counts[c.id] || 0 }));
  const segments = allCats.filter(s => s.count > 0).sort((a, b) => b.count - a.count);
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

// ── WinRateMeter ────────────────────────────────────────────────────────────
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

// ── LockedBadge + BadgeTile ─────────────────────────────────────────────────
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

// ── BracketTile ─────────────────────────────────────────────────────────────
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

// ── ScreenHeader ────────────────────────────────────────────────────────────
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

// ── Win-presence derivation ─────────────────────────────────────────────────
function winRateFromAura(aura: number): WinPresence {
  if (aura >= 65) return 'over';
  if (aura <= 35) return 'under';
  return 'balanced';
}

// ── Page content ────────────────────────────────────────────────────────────
function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deckId') ?? searchParams.get('id') ?? '';

  const [profile, setProfile] = useState<CommanderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBracket, setShowBracket] = useState(false);
  const [selectedBracket, setSelectedBracket] = useState(2);
  const [showBracketConfirm, setShowBracketConfirm] = useState(false);
  const [savingBracket, setSavingBracket] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showArtPicker, setShowArtPicker] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const bracketSheetDrag = useSheetDrag(() => setShowBracket(false));

  const displayToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    if (!deckId) { setError('No deck specified'); setLoading(false); return; }
    loadProfile(deckId)
      .then(p => { setProfile(p); setSelectedBracket(p.currentBracket); })
      .catch((e: any) => setError(e?.message ?? 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [deckId]);

  const c = useMemo(() => {
    if (!profile) return null;
    const find = (id: string) => profile.badges.find(b => b.badge === id)?.earnedCount ?? 0;
    const counts: Record<CategoryId, number> = {
      brilliance: find('brilliance'),
      flavor:     find('flavor'),
      rivalry:    find('rivalry'),
      allegiance: find('allegiance'),
      fun:        find('fun'),
    };
    return {
      id: profile.deckId,
      name: profile.commanderName,
      art: profile.commanderArtUrl,
      colors: profile.colorIdentity ? profile.colorIdentity.split('').filter(c => 'WUBRGC'.includes(c)) : [],
      bracket: profile.currentBracket,
      aura: Math.round(profile.auraScore),
      gamesPlayed: profile.totalGames,
      winRate: winRateFromAura(profile.auraScore),
      counts,
    };
  }, [profile]);

  const handleBracketSave = () => {
    if (!profile) return;
    if (selectedBracket === profile.currentBracket) { setShowBracket(false); return; }
    setShowBracketConfirm(true);
  };

  const handleBracketConfirm = async () => {
    if (!profile) return;
    setSavingBracket(true);
    try {
      if (profile.bracketIsUnset) {
        // First-time bracket pick — run the proper scoring back-fill so any
        // games this deck has already played count retroactively. AURA is
        // NOT reset; it's computed from the now-eligible game history.
        const { error } = await confirmBracketAndApplyScoring(profile.deckId, selectedBracket);
        if (error) throw new Error(error);
      } else {
        // Changing between brackets — proper manual bracket change:
        // resets AURA to 50, clears chronic-archenemy, stamps bracket_set_at,
        // writes a row to bracket_change_log for audit. All badge counts
        // are preserved.
        await manualBracketChange(profile.deckId, selectedBracket);
      }
      // Re-fetch from DB so the UI reflects the new state (aura_score may
      // have been recomputed by the back-fill or reset to 50).
      const refreshed = await loadProfile(profile.deckId);
      setProfile(refreshed);
      setShowBracketConfirm(false);
      setShowBracket(false);
      displayToast('Bracket updated.');
    } catch (err: any) {
      displayToast(err?.message ?? 'Could not change bracket.');
    } finally {
      setSavingBracket(false);
    }
  };

  const handleDelete = async () => {
    if (!profile) return;
    setDeleting(true);
    try {
      const { supabase: sb } = await import('@/lib/supabase');
      // Delete related records first (FK constraints)
      await sb.from('badge_vote_history').delete().eq('deck_id', profile.deckId);
      await sb.from('game_players').delete().eq('deck_id', profile.deckId);
      // Now delete the deck itself
      const { error: e } = await deleteCommander(profile.deckId);
      if (!e) {
        router.push('/decks');
      } else {
        displayToast('Failed to delete: ' + e);
        setDeleting(false);
      }
    } catch (err: any) {
      displayToast('Failed to delete: ' + (err?.message ?? 'Unknown error'));
      setDeleting(false);
    }
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Young+Serif&display=swap');

    :root {
      --parchment: #F5EFE2;
      --parchment-card: #FAF5EA;
      --parchment-deep: #EDE4D0;
      --ink: #2B2118;
      --ink-2: #5C5043;
      --ink-3: #8A7E6F;
      --ink-4: #B8AE9E;
      --forest: #2F5D3A;
      --forest-deep: #22472B;
      --forest-soft: #E5ECE3;
      --copper: #B06B2C;
      --copper-deep: #8A5320;
      --copper-soft: #F3E3D1;
      --line: rgba(43,33,24,.08);
      --line-strong: rgba(43,33,24,.14);
      --cat-brilliance: #C99B2F;
      --cat-brilliance-soft: #F6ECD2;
      --cat-flavor: #7E4E8A;
      --cat-flavor-soft: #EADDEE;
      --cat-rivalry: #9E2B2B;
      --cat-rivalry-soft: #F1D4CF;
      --cat-allegiance: #2F7A74;
      --cat-allegiance-soft: #D6E6E3;
      --cat-fun: #E07B4A;
      --cat-fun-soft: #F9DFCD;
      --font-ui: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
      --font-display: 'Young Serif', ui-serif, Georgia, serif;
      --r-card: 20px;
      --shadow-rest: 0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12);
      --shadow-active: 0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22);
      --ease: cubic-bezier(.22,.61,.36,1);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; font-family: var(--font-ui); background: var(--parchment); color: var(--ink); -webkit-font-smoothing: antialiased; }

    .ph-root {
      width: 100%; height: 100%; max-width: 430px; margin: 0 auto;
      display: flex; flex-direction: column;
      background: var(--parchment);
      background-image:
        radial-gradient(circle at 50% 0%, rgba(47,93,58,0.07), transparent 40%),
        radial-gradient(circle at 90% 100%, rgba(201,155,47,0.05), transparent 35%);
      position: relative; overflow: hidden;
    }

    .ph-stamp { font-family: var(--font-ui); font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }

    @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

    .toast {
      position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: var(--ink); color: var(--parchment);
      font-family: var(--font-ui); font-size: 14px; font-weight: 500;
      padding: 12px 20px; border-radius: 14px;
      box-shadow: 0 8px 24px rgba(43,33,24,0.25);
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s var(--ease), transform 0.3s var(--ease);
      z-index: 9999; max-width: 340px; text-align: center;
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); pointer-events: auto; }
  `;

  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="ph-root">
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 14 }}>
            Loading commander…
          </div>
        </div>
      </>
    );
  }

  if (error || !c) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <div className="ph-root">
          <ScreenHeader title="Commander" onBack={() => router.push('/decks')}/>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', fontSize: 14, padding: 24, textAlign: 'center' }}>
            {error || 'Commander not found'}
          </div>
        </div>
      </>
    );
  }

  const tier = tierFor(c.aura);
  const totalBadges = Object.values(c.counts).reduce((s: number, n: number) => s + n, 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="ph-root">
        <ScreenHeader title="Commander" onBack={() => router.push('/decks')} trailing={
          <button onClick={() => setShowMenu(true)} title="More actions" style={{
            width: 40, height: 40, borderRadius: 999, border: 'none',
            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-2)', cursor: 'pointer',
          }}>
            <Icon name="dots" size={22} stroke="currentColor"/>
          </button>
        }/>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px 16px' }}>
          {/* Hero */}
          <div style={{
            borderRadius: 'var(--r-card)', overflow: 'hidden',
            background: 'var(--ink)', boxShadow: 'var(--shadow-active)',
            position: 'relative', border: '1px solid var(--line-strong)',
            flexShrink: 0,
          }}>
            {c.art ? (
              <img src={c.art} alt="" style={{
                width: '100%', height: 200, objectFit: 'cover',
                objectPosition: '50% 22%', display: 'block',
              }}/>
            ) : (
              <div style={{
                width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'repeating-linear-gradient(45deg, #2B2118 0 8px, #221a13 8px 16px)',
                color: 'var(--ink-3)', fontSize: 12,
              }}>commander art</div>
            )}

            {c.aura > 0 && (
              <div style={{
                position: 'absolute', right: 14, bottom: 70,
                filter: 'drop-shadow(0 4px 10px rgba(43,33,24,0.4))',
                zIndex: 1,
              }}>
                <AuraScore score={c.aura} size="lg" color="var(--copper)"/>
              </div>
            )}

            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: '70px 16px 14px',
              background: 'linear-gradient(180deg, transparent 0%, rgba(10,6,4,0.5) 45%, rgba(10,6,4,0.94) 100%)',
              color: 'var(--parchment)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ManaPips colors={c.colors} size={9}/>
                {c.bracket && <BracketPip n={c.bracket}/>}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 400,
                fontSize: 22, letterSpacing: '-0.01em',
                lineHeight: 1.1, color: 'var(--parchment)',
              }}>{c.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <span className="ph-stamp" style={{ fontSize: 10, color: 'var(--copper)', letterSpacing: '0.16em' }}>{tier.label}</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontStyle: 'italic',
                  fontSize: 12, color: 'rgba(245,239,226,0.78)',
                }}>— {tier.tagline.toLowerCase()}</span>
              </div>
            </div>
          </div>

          {/* Personality */}
          <div style={{
            background: 'var(--parchment-card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-card)',
            padding: '12px 14px 14px',
            boxShadow: 'var(--shadow-rest)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="ph-stamp" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Personality</span>
              <span style={{
                fontFamily: 'var(--font-display)', fontStyle: 'italic',
                fontSize: 12, color: 'var(--ink-3)',
              }}>The Mastermind</span>
            </div>
            <DistributionBar counts={c.counts}/>
          </div>

          {/* Trait Badges */}
          <div style={{
            background: 'var(--parchment-card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-card)',
            padding: '12px 12px 14px',
            boxShadow: 'var(--shadow-rest)',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              padding: '0 4px', marginBottom: 10,
            }}>
              <span className="ph-stamp" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{tier.label} for</span>
              <span style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 11, color: 'var(--ink-3)',
                fontVariantNumeric: 'tabular-nums', fontWeight: 600,
              }}>{totalBadges} badge{totalBadges === 1 ? '' : 's'} · {c.gamesPlayed} game{c.gamesPlayed === 1 ? '' : 's'}</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {CATEGORIES.map(cat => (
                <BadgeTile key={cat.id} catId={cat.id} count={c.counts[cat.id] || 0}/>
              ))}
            </div>
          </div>

          {/* Win presence */}
          <div style={{
            background: 'var(--parchment-card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-card)',
            padding: '8px 14px 10px',
            boxShadow: 'var(--shadow-rest)',
            flexShrink: 0,
          }}>
            <span className="ph-stamp" style={{
              fontSize: 10, color: 'var(--ink-3)',
              display: 'block', marginBottom: 4,
            }}>Win presence</span>
            <WinRateMeter state={c.winRate}/>
          </div>

        </div>
      </div>

      {/* Actions sheet */}
      {showMenu && (
        <ActionsSheet
          commander={c}
          onClose={() => setShowMenu(false)}
          onChangeBracket={() => { setShowMenu(false); setSelectedBracket(c.bracket || 2); setShowBracket(true); }}
          onChangeArt={() => { setShowMenu(false); setShowArtPicker(true); }}
          onRecentGames={() => { setShowMenu(false); router.push(`/recent-games?deckId=${c.id}`); }}
          onDelete={() => { setShowMenu(false); setShowDelete(true); }}
        />
      )}

      {/* Commander art picker */}
      <CommanderArtPicker
        open={showArtPicker}
        deckId={c.id}
        commanderName={c.name}
        currentArtUrl={c.art}
        onClose={() => setShowArtPicker(false)}
        onSaved={(newArtUrl) => {
          // Reflect change locally so the hero image refreshes on next render.
          (c as any).art = newArtUrl;
          if (profile) setProfile({ ...profile, commanderArtUrl: newArtUrl });
          displayToast('Commander art updated.');
        }}
      />

      {/* Bracket picker — compact horizontal */}
      {showBracket && (
        <div onClick={() => setShowBracket(false)} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: 'var(--font-ui)',
        }}>
          <div ref={bracketSheetDrag.sheetRef} onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 430,
            background: 'var(--parchment)',
            borderRadius: '24px 24px 0 0',
            padding: '12px 16px 24px',
            boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
            borderTop: '1px solid var(--line-strong)',
            animation: 'slideUp 240ms var(--ease)',
          }}>
            <div
              onTouchStart={bracketSheetDrag.onTouchStart}
              onTouchMove={bracketSheetDrag.onTouchMove}
              onTouchEnd={bracketSheetDrag.onTouchEnd}
              style={{ cursor: 'grab', touchAction: 'none' }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--ink-4)', margin: '0 auto 4px' }}/>
            </div>

            {/* Commander art + info header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 12 }}>
              {c?.art && (
                <div style={{
                  width: 52, height: 52, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
                  border: '2px solid var(--copper)',
                  boxShadow: '0 6px 16px -6px rgba(43,33,24,0.35)',
                }}>
                  <img src={c.art} alt={c.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }}/>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ph-stamp" style={{ fontSize: 9, color: 'var(--ink-3)' }}>Power level</div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 20,
                  color: 'var(--ink)', letterSpacing: '-0.01em', marginTop: 1, lineHeight: 1.15,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>Bracket for {c?.name?.split(',')[0] ?? 'Commander'}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>
                  Set honestly so the pod knows what to expect.
                </div>
              </div>
            </div>

            {/* Compact bracket tiles — horizontal row */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {BRACKETS.map(b => {
                const selected = selectedBracket === b.value;
                return (
                  <button key={b.value} onClick={() => setSelectedBracket(b.value)} style={{
                    flex: 1, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '10px 4px 8px',
                    background: selected ? 'var(--copper-soft)' : 'var(--parchment-card)',
                    border: selected ? '2px solid var(--copper)' : '1px solid var(--line)',
                    borderRadius: 14,
                    boxShadow: selected ? 'var(--shadow-active)' : 'var(--shadow-rest)',
                    fontFamily: 'var(--font-ui)',
                    transition: 'all 140ms var(--ease)',
                    position: 'relative',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 26, fontWeight: 400,
                      color: selected ? 'var(--copper)' : 'var(--ink)',
                      lineHeight: 1, letterSpacing: '-0.02em',
                    }}>{b.value}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, color: selected ? 'var(--copper-dark, #8C5422)' : 'var(--ink-3)',
                      letterSpacing: '0.04em', lineHeight: 1.2, textAlign: 'center',
                    }}>{b.desc.split(' ')[0]}</span>
                    {selected && (
                      <div style={{
                        position: 'absolute', top: -5, right: -5,
                        width: 18, height: 18, borderRadius: 999,
                        background: 'var(--copper)', color: 'var(--parchment)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(43,33,24,0.25)',
                      }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Description of selected bracket */}
            <div style={{
              textAlign: 'center', fontSize: 12, color: 'var(--ink-2)',
              padding: '4px 8px 8px', lineHeight: 1.4,
            }}>
              {BRACKETS.find(b => b.value === selectedBracket)?.desc}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowBracket(false)} style={{
                flex: 1, cursor: 'pointer',
                background: 'transparent',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--r-card)',
                padding: '14px 16px',
                color: 'var(--ink)',
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 15,
              }}>Cancel</button>
              <button onClick={handleBracketSave} disabled={savingBracket} style={{
                flex: 1.4, cursor: savingBracket ? 'default' : 'pointer',
                background: savingBracket ? 'var(--ink-3)' : 'var(--forest)',
                border: 'none',
                borderRadius: 'var(--r-card)',
                padding: '14px 16px',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 15,
                boxShadow: 'var(--shadow-rest)',
              }}>{savingBracket ? 'Saving…' : 'Save bracket'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Bracket-change confirmation */}
      {showBracketConfirm && (
        <div onClick={() => !savingBracket && setShowBracketConfirm(false)} style={{
          position: 'fixed', inset: 0, zIndex: 110,
          background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-ui)',
          padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 340,
            background: 'var(--parchment)',
            borderRadius: 20,
            padding: '24px 22px 20px',
            boxShadow: '0 30px 60px -16px rgba(43,33,24,0.35)',
            border: '1px solid var(--line-strong)',
          }}>
            <div className="ph-stamp" style={{ fontSize: 10, color: 'var(--copper)' }}>Confirm switch</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22,
              color: 'var(--ink)', letterSpacing: '-0.01em', marginTop: 2, lineHeight: 1.2,
            }}>Move to bracket {selectedBracket}?</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.4 }}>
              Switching brackets will reset your Aura to <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>50</strong>. Past games stay on the record, but the score starts fresh at the new power level.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowBracketConfirm(false)} disabled={savingBracket} style={{
                flex: 1, cursor: savingBracket ? 'default' : 'pointer',
                background: 'transparent',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--r-card)',
                padding: '12px 14px',
                color: 'var(--ink)',
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14,
              }}>Cancel</button>
              <button onClick={handleBracketConfirm} disabled={savingBracket} style={{
                flex: 1, cursor: savingBracket ? 'default' : 'pointer',
                background: savingBracket ? 'var(--ink-3)' : 'var(--forest)',
                border: 'none',
                borderRadius: 'var(--r-card)',
                padding: '12px 14px',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14,
                boxShadow: 'var(--shadow-rest)',
              }}>{savingBracket ? 'Saving…' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div onClick={() => !deleting && setShowDelete(false)} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-ui)',
          padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 340,
            background: 'var(--parchment)',
            borderRadius: 20,
            padding: '24px 22px 20px',
            boxShadow: '0 30px 60px -16px rgba(43,33,24,0.35)',
            border: '1px solid var(--line-strong)',
          }}>
            <div className="ph-stamp" style={{ fontSize: 10, color: 'var(--cat-rivalry)' }}>Remove commander</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22,
              color: 'var(--ink)', letterSpacing: '-0.01em', marginTop: 2, lineHeight: 1.2,
            }}>Delete {c.name}?</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.4 }}>
              This deck will be removed from your library along with its Aura, badges, and history. You can re-add the commander later, but earned data won&apos;t come back.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setShowDelete(false)} disabled={deleting} style={{
                flex: 1, cursor: deleting ? 'default' : 'pointer',
                background: 'transparent',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--r-card)',
                padding: '12px 14px',
                color: 'var(--ink)',
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14,
              }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{
                flex: 1, cursor: deleting ? 'default' : 'pointer',
                background: deleting ? 'var(--ink-3)' : 'var(--cat-rivalry)',
                border: 'none',
                borderRadius: 'var(--r-card)',
                padding: '12px 14px',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14,
                boxShadow: 'var(--shadow-rest)',
              }}>{deleting ? 'Deleting…' : 'Delete deck'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`toast ${showToast ? 'show' : ''}`}>{toastMsg}</div>
    </>
  );
}


// ── useSheetDrag — swipe-down-to-dismiss (matches decks/profile pattern) ────
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

// ── ActionsSheet — three-dots menu, matches unified sheet pattern ──────────
function ActionsSheet({ commander, onClose, onChangeBracket, onChangeArt, onRecentGames, onDelete }: {
  commander: any;
  onClose: () => void;
  onChangeBracket: () => void;
  onChangeArt: () => void;
  onRecentGames: () => void;
  onDelete: () => void;
}) {
  const drag = useSheetDrag(onClose);
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(43,33,24,0.55)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      fontFamily: 'var(--font-ui)',
    }}>
      <div ref={drag.sheetRef} onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 430, maxHeight: '88%',
        background: 'var(--parchment)',
        borderRadius: '24px 24px 0 0',
        padding: '14px 16px 0',
        boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
        display: 'flex', flexDirection: 'column',
        borderTop: '1px solid var(--line-strong)',
        animation: 'popIn 240ms cubic-bezier(.22,.61,.36,1)',
      }}>
        {/* Drag handle + header */}
        <div
          onTouchStart={drag.onTouchStart}
          onTouchMove={drag.onTouchMove}
          onTouchEnd={drag.onTouchEnd}
          style={{ cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--ink-4)', margin: '0 auto 6px' }}/>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0 14px' }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-ui)', fontWeight: 700,
                fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' as const,
                color: 'var(--ink-3)',
              }}>For this commander</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26,
                color: 'var(--ink)', letterSpacing: '-0.01em', marginTop: 2,
              }}>Actions</div>
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
              color: 'var(--ink-3)', padding: 0,
            }}>Done</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            <button onClick={onChangeBracket} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', padding: '14px 14px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderRadius: 16, textAlign: 'left',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'var(--parchment-deep)',
                border: '1.5px solid var(--line-strong)',
                color: 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name="layers" size={20} stroke="currentColor" width={1.6}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>Change bracket</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', marginTop: 2 }}>Currently bracket {commander.bracket || '—'}</div>
              </div>
            </button>
            <button onClick={onChangeArt} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', padding: '14px 14px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderRadius: 16, textAlign: 'left',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'var(--parchment-deep)',
                border: '1.5px solid var(--line-strong)',
                color: 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name="image" size={20} stroke="currentColor" width={1.6}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>Change commander art</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', marginTop: 2 }}>Pick a different printing</div>
              </div>
            </button>
            <button onClick={onRecentGames} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', padding: '14px 14px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderRadius: 16, textAlign: 'left',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'var(--parchment-deep)',
                border: '1.5px solid var(--line-strong)',
                color: 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon name="scroll" size={20} stroke="currentColor" width={1.6}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>Recent games</div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-3)', marginTop: 2 }}>View match history</div>
              </div>
            </button>
          </div>

          <div style={{ paddingTop: 8, borderTop: '1px solid var(--line)' }}>
            <button onClick={onDelete} style={{
              width: '100%', padding: '14px 14px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderRadius: 12, textAlign: 'center',
              fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600,
              color: 'var(--cat-rivalry)',
            }}>Delete deck</button>
          </div>
        </div>
      </div>

      <style>{`@keyframes popIn { from { transform: translateY(20px); opacity: 0.6; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A7E6F', fontSize: 14 }}>
        Loading…
      </div>
    }>
       <PageContent />
    </Suspense>
  );
}
