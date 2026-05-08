'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerCommander, getMyCommanders, BRACKETS, type Deck } from '../../lib/commanders';
import { useAuth } from '../../lib/auth-context';
import { validateCommander, searchCommanders, type CardData } from '../../lib/scryfall';

// ── Types ───────────────────────────────────────────────────────────────────
interface ScryfallCard {
  name: string;
  type_line?: string;
  image_uris?: { art_crop: string };
  card_faces?: { image_uris?: { art_crop: string } }[];
  color_identity: string[];
}

type CategoryId = 'brilliance' | 'flavor' | 'rivalry' | 'allegiance' | 'fun';

// ── Aura tier helpers ───────────────────────────────────────────────────────
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

// ── Trait categories (matches the badge attribution system) ─────────────────
const CATEGORIES: { id: CategoryId; label: string; glyph: CategoryId; color: string; soft: string }[] = [
  { id: 'brilliance', label: 'Brilliance', glyph: 'brilliance', color: 'var(--cat-brilliance)', soft: 'var(--cat-brilliance-soft)' },
  { id: 'flavor',     label: 'Flavour',    glyph: 'flavor',     color: 'var(--cat-flavor)',     soft: 'var(--cat-flavor-soft)' },
  { id: 'rivalry',    label: 'Rivalry',    glyph: 'rivalry',    color: 'var(--cat-rivalry)',    soft: 'var(--cat-rivalry-soft)' },
  { id: 'allegiance', label: 'Allegiance', glyph: 'allegiance', color: 'var(--cat-allegiance)', soft: 'var(--cat-allegiance-soft)' },
  { id: 'fun',        label: 'Fun',        glyph: 'fun',        color: 'var(--cat-fun)',        soft: 'var(--cat-fun-soft)' },
];

// ── Mana pip palette (parchment-friendly approximation of WUBRG) ────────────
const MANA_COLORS: Record<string, { fill: string; stroke: string }> = {
  W: { fill: '#F4ECD2', stroke: 'rgba(43,33,24,0.45)' },
  U: { fill: '#A6C7E5', stroke: 'rgba(43,33,24,0.4)' },
  B: { fill: '#3A2E25', stroke: 'rgba(43,33,24,0.6)' },
  R: { fill: '#C9573A', stroke: 'rgba(43,33,24,0.4)' },
  G: { fill: '#5A8A4E', stroke: 'rgba(43,33,24,0.4)' },
  C: { fill: '#C9BFA8', stroke: 'rgba(43,33,24,0.4)' },
};

// ── Inline icon set ─────────────────────────────────────────────────────────
function Icon({ name, size = 20, stroke = 'currentColor', width = 1.75 }: { name: string; size?: number; stroke?: string; width?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' } as React.SVGAttributes<SVGSVGElement>;
  const paths: Record<string, React.ReactNode> = {
    'chevron-left':  <polyline points="15 18 9 12 15 6"/>,
    'chevron-right': <polyline points="9 18 15 12 9 6"/>,
    plus:            <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    close:           <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    check:           <polyline points="20 6 9 17 4 12"/>,
    search:          <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    profile:         <><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
    layers:          <><path d="M3 6h18M3 12h18M3 18h12"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

// ── BadgeGlyph — PNG mask tinted to category color ─────────────────────────
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

// ── AuraMark — brand mark ──────────────────────────────────────────────────
function AuraMark({ size = 22, color = 'var(--forest)' }: { size?: number; color?: string }) {
  const id = `aura-clip-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="36" r="2.4" fill={color}/>
      <defs>
        <clipPath id={id}><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color}/>
        <polygon points="40,60 33,4 34,4 56,60" fill={color}/>
      </g>
    </svg>
  );
}

// ── AuraScore — ceremonial seal: ringed disc with compass rays + numeral ──
function AuraScore({ score, size = 'sm', color = 'var(--forest)', fill = 'var(--forest-soft)' }: { score: number; size?: 'sm' | 'md' | 'lg'; color?: string; fill?: string }) {
  const w  = size === 'lg' ? 88 : size === 'md' ? 64 : 48;
  const fs = size === 'lg' ? 38 : size === 'md' ? 26 : 20;
  return (
    <div style={{
      position: 'relative',
      width: w, height: w,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={w} height={w} viewBox="0 0 100 100" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {/* Outer dotted ring */}
        <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="0.8" strokeDasharray="0.6 3"/>
        {/* Inner disc — soft fill so the numeral reads clearly */}
        <circle cx="50" cy="50" r="42" fill={fill} stroke={color} strokeOpacity="0.55" strokeWidth="1.2"/>
        {/* Compass rays — three soft beams at the bottom */}
        <g opacity="0.18" fill={color}>
          <polygon points="50,50 24,92 30,92"/>
          <polygon points="50,50 47,92 53,92"/>
          <polygon points="50,50 70,92 76,92"/>
        </g>
      </svg>
      <span style={{
        position: 'relative', zIndex: 1,
        fontFamily: 'var(--font-display)',
        fontWeight: 400,
        fontSize: fs,
        lineHeight: 1,
        color,
        letterSpacing: '-0.02em',
        fontVariantNumeric: 'tabular-nums',
      }}>{score}</span>
    </div>
  );
}

// ── ManaPips — colored circles for WUBRG ───────────────────────────────────
function ManaPips({ colors = [], size = 8 }: { colors?: string[]; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {colors.map((c, i) => {
        const m = MANA_COLORS[c] || MANA_COLORS.C;
        return <span key={i} style={{
          width: size, height: size, borderRadius: 999,
          background: m.fill,
          border: `1px solid ${m.stroke}`,
          flexShrink: 0,
        }}/>;
      })}
    </span>
  );
}

// ── BracketPip — small "B3" stamp ──────────────────────────────────────────
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

// ── CommanderRow — list item ───────────────────────────────────────────────
type CommanderRowData = {
  id: string;
  name: string;
  art: string | null;
  colors: string[];
  bracket: number | null;
  aura: number;
  gamesPlayed: number;
  topBadge?: { id: CategoryId; count: number };
};

function CommanderRow({ commander, onTap }: { commander: CommanderRowData; onTap: () => void }) {
  const topBadge = commander.topBadge;
  const cat = topBadge ? CATEGORIES.find(c => c.id === topBadge.id) : null;

  return (
    <button onClick={onTap} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px',
      background: 'var(--parchment-card)',
      border: '1px solid var(--line)',
      borderRadius: 'var(--r-card)',
      boxShadow: 'var(--shadow-rest)',
      fontFamily: 'var(--font-ui)',
      transition: 'transform 120ms var(--ease)',
    }}>
      {/* Commander art crop */}
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        overflow: 'hidden', flexShrink: 0,
        border: '1px solid var(--line-strong)',
        boxShadow: 'inset 0 0 0 2px var(--parchment-card)',
        background: 'var(--ink)',
      }}>
        {commander.art ? (
          <img src={commander.art} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%', display: 'block' }}/>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)',
          }}>
            <AuraMark size={28} color="var(--ink-3)"/>
          </div>
        )}
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400, fontSize: 17,
          color: 'var(--ink)', lineHeight: 1.15,
          letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{commander.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ManaPips colors={commander.colors}/>
          {commander.bracket && <BracketPip n={commander.bracket}/>}
          <span style={{
            fontSize: 11, color: 'var(--ink-3)',
            fontVariantNumeric: 'tabular-nums', fontWeight: 500,
          }}>{commander.gamesPlayed} game{commander.gamesPlayed === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Top badge with count — fixed width for alignment */}
      <div style={{
        width: 44, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      }}>
        {cat && topBadge ? (
          <>
            <div style={{
              width: 32, height: 32, borderRadius: 999,
              background: cat.soft, color: cat.color,
              border: `1.5px solid ${cat.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BadgeGlyph name={cat.glyph} size={18} color={cat.color}/>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: 'var(--ink-2)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.04em',
            }}>×{topBadge.count}</span>
          </>
        ) : null}
      </div>

      {/* Aura — fixed width so tier labels (Beloved/Brewed/Sideboard) all align */}
      <div style={{
        width: 84, flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        paddingLeft: 6,
        borderLeft: '1px solid var(--line)',
      }}>
        <AuraScore score={commander.aura} size="sm" color="var(--forest)"/>
        <span style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: 700,
          fontSize: 9, color: 'var(--forest)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>{tierFor(commander.aura).label}</span>
      </div>
    </button>
  );
}

// ── BracketTile — large numeral tile for bracket popup ─────────────────────
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
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}>{n}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400, fontSize: 18,
          color: 'var(--ink)', letterSpacing: '-0.005em',
          lineHeight: 1.15,
        }}>{label}</div>
        <div style={{
          fontSize: 12, color: 'var(--ink-2)',
          lineHeight: 1.35,
        }}>{description}</div>
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

// ── BottomNav — three-icon bottom nav (matches existing app pattern) ──────
function BottomNav({ active = 'decks' }: { active?: 'profile' | 'decks' | 'recent' }) {
  const items: { id: 'profile' | 'decks' | 'recent'; label: string; href: string; icon?: string }[] = [
    { id: 'profile', label: 'Profile', href: '/profile', icon: 'profile' },
    { id: 'decks',   label: 'Decks',   href: '/decks' },
    { id: 'recent',  label: 'Recent',  href: '/recent-games', icon: 'layers' },
  ];

  return (
    <div style={{
      borderTop: '1px solid var(--line-strong)',
      background: 'rgba(250,245,234,0.9)',
      backdropFilter: 'blur(14px) saturate(120%)',
      WebkitBackdropFilter: 'blur(14px) saturate(120%)',
      display: 'flex',
      padding: '8px 8px 22px',
      fontFamily: 'var(--font-ui)',
      flexShrink: 0,
    }}>
      {items.map(item => {
        const isActive = item.id === active;
        const color = isActive ? 'var(--forest)' : 'var(--ink-3)';
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
              <Icon name={item.icon} size={22} stroke={color} width={1.75}/>
            ) : null}
            <span style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color,
            }}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function Page() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [pendingCard, setPendingCard] = useState<CardData | null>(null);
  const [selectedBracket, setSelectedBracket] = useState(2);
  const [registering, setRegistering] = useState(false);
  const [sortBy, setSortBy] = useState<'aura' | 'badges' | 'recent'>('aura');
  const [totalGames, setTotalGames] = useState(0);
  const [deckGameCounts, setDeckGameCounts] = useState<Record<string, number>>({});

  // Load decks from Supabase, then fetch per-deck game counts
  useEffect(() => {
    if (!isLoggedIn) { setLoadingDecks(false); return; }
    getMyCommanders().then(async ({ data }) => {
      setDecks(data);
      setLoadingDecks(false);
      // Fetch game counts per deck
      if (data.length > 0) {
        const { supabase: sb } = await import('../../lib/supabase');
        const deckIds = data.map(d => d.id);
        const { data: rows } = await sb
          .from('game_players')
          .select('deck_id, games!inner(state)')
          .in('deck_id', deckIds)
          .eq('games.state', 'completed') as { data: any[]; error: any };
        const counts: Record<string, number> = {};
        for (const row of (rows ?? [])) {
          counts[row.deck_id] = (counts[row.deck_id] || 0) + 1;
        }
        setDeckGameCounts(counts);
      }
    });
  }, [isLoggedIn]);

  // Count this profile's total games played (via game_players rows for the user)
  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      const { supabase } = await import('../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from('game_players')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setTotalGames(count ?? 0);
    })();
  }, [isLoggedIn]);

  const displayToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const searchScryfall = (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchCommanders(query)
      .then(results => {
        setSearchResults(results);
        setSearching(false);
      })
      .catch(() => { setSearchResults([]); setSearching(false); });
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => searchScryfall(value), 400);
    setSearchTimer(timer);
  };

  const getCardArt = (card: ScryfallCard): string => {
    if (card.image_uris?.art_crop) return card.image_uris.art_crop;
    if (card.card_faces?.[0]?.image_uris?.art_crop) return card.card_faces[0].image_uris.art_crop;
    return '';
  };

  const handleSelectCommander = async (card: ScryfallCard) => {
    const { data: validated, error: valError } = await validateCommander(card.name);
    if (valError || !validated) {
      displayToast(valError || 'Could not validate commander');
      return;
    }
    if (!validated.isValidCommander) {
      displayToast(`${validated.cardName} can't be used as a commander`);
      return;
    }
    setPendingCard(validated);
    setSelectedBracket(2);
    setShowAdd(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleConfirmRegistration = async () => {
    if (!pendingCard) return;
    setRegistering(true);
    const { data: newDeck, error } = await registerCommander(pendingCard.cardName, selectedBracket);
    if (error) {
      displayToast(`Error: ${error}`);
      setRegistering(false);
      return;
    }
    if (newDeck) {
      const { supabase } = await import('../../lib/supabase');
      await supabase.from('decks').update({
        commander_art_url: pendingCard.artUrl,
        color_identity: pendingCard.colorIdentity || null,
      }).eq('id', newDeck.id);

      setDecks(prev => [{
        ...newDeck,
        commander_art_url: pendingCard.artUrl,
        color_identity: pendingCard.colorIdentity || null,
      }, ...prev]);
    }
    displayToast(`${pendingCard.cardName} added at Bracket ${selectedBracket}!`);
    setPendingCard(null);
    setRegistering(false);
  };

  // Map a Deck to the row's expected shape. Fields the Deck doesn't carry
  // (gamesPlayed, topBadge) default to safe values; the row hides what's missing.
  const mapDeck = (d: Deck): CommanderRowData => ({
    id: d.id,
    name: d.commander_name,
    art: d.commander_art_url,
    colors: d.color_identity ? d.color_identity.split('').filter(c => 'WUBRGC'.includes(c)) : [],
    bracket: d.bracket,
    aura: Math.round(d.aura_score || 50),
    gamesPlayed: deckGameCounts[d.id] || 0,
    topBadge: undefined,
  });

  const sorted = useMemo(() => {
    const list = [...decks];
    if (sortBy === 'aura') return list.sort((a, b) => (b.aura_score || 0) - (a.aura_score || 0));
    if (sortBy === 'recent') return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list; // 'badges' — falls through to insertion order until badge counts are wired up
  }, [decks, sortBy]);

  // (totalAura was previously displayed; replaced with totalGames per profile)

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
      --r-chip: 12px;
      --shadow-rest: 0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12);
      --shadow-active: 0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22);
      --ease: cubic-bezier(.22,.61,.36,1);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body {
      height: 100%;
      font-family: var(--font-ui);
      background: var(--parchment);
      color: var(--ink);
      -webkit-font-smoothing: antialiased;
    }

    .ph-root {
      width: 100%;
      height: 100%;
      max-width: 430px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      background: var(--parchment);
      background-image:
        radial-gradient(circle at 20% 8%, rgba(201,155,47,0.05), transparent 40%),
        radial-gradient(circle at 90% 95%, rgba(47,93,58,0.05), transparent 40%);
      overflow: hidden;
    }

    .ph-stamp {
      font-family: var(--font-ui);
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    @keyframes popIn {
      from { transform: translateY(8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .toast {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--ink);
      color: var(--parchment);
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      z-index: 9999;
    }
    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="ph-root">
        {/* Sticky hero header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(245,239,226,0.92)',
          backdropFilter: 'blur(14px) saturate(120%)',
          WebkitBackdropFilter: 'blur(14px) saturate(120%)',
          borderBottom: '1px solid var(--line)',
          padding: '14px 16px 10px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div className="ph-stamp" style={{ color: 'var(--ink-3)', fontSize: 10 }}>Library</div>
              <h1 style={{
                margin: '2px 0 0',
                fontFamily: 'var(--font-display)',
                fontWeight: 400, fontSize: 32,
                color: 'var(--ink)', letterSpacing: '-0.02em',
                lineHeight: 1,
              }}>Commanders</h1>
            </div>
            <button onClick={() => { setShowAdd(true); setSearchQuery(''); setSearchResults([]); }} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--ink)', color: 'var(--parchment)',
              border: 'none', cursor: 'pointer',
              padding: '10px 14px', borderRadius: 999,
              fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13,
              boxShadow: 'var(--shadow-rest)',
            }}>
              <Icon name="plus" size={14} stroke="currentColor" width={2.5}/>
              New
            </button>
          </div>

          {/* Sort row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="ph-stamp" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Sort by</span>
            {([
              { id: 'aura', label: 'Aura' },
              { id: 'badges', label: 'Badges' },
              { id: 'recent', label: 'Recent' },
            ] as const).map(opt => {
              const active = sortBy === opt.id;
              return (
                <button key={opt.id} onClick={() => setSortBy(opt.id)} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0',
                  fontFamily: 'var(--font-ui)', fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  borderBottom: active ? '2px solid var(--copper)' : '2px solid transparent',
                  letterSpacing: '0.01em',
                }}>{opt.label}</button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="ph-stamp" style={{ fontSize: 10, color: 'var(--ink-3)', padding: '0 4px' }}>
            {decks.length} commander{decks.length !== 1 ? 's' : ''} ·{' '}
            <span style={{ color: 'var(--forest)', fontWeight: 700 }}>{totalGames}</span>{' '}
            game{totalGames === 1 ? '' : 's'} played
          </div>

          {loadingDecks && (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Loading your decks...</div>
          )}

          {!loadingDecks && decks.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 16px',
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 14, color: 'var(--ink-3)',
            }}>No commanders yet — tap <strong style={{ fontStyle: 'normal' }}>New</strong> to add one.</div>
          )}

          {!loadingDecks && sorted.map(d => (
            <CommanderRow key={d.id} commander={mapDeck(d)} onTap={() => router.push(`/deck-accomplishments?id=${d.id}`)}/>
          ))}

          {!loadingDecks && decks.length > 0 && (
            <div style={{
              textAlign: 'center', padding: '16px 0 4px',
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 13, color: 'var(--ink-3)',
            }}>— End of library —</div>
          )}
        </div>

        <BottomNav active="decks"/>
      </div>

      {/* Add Commander popup — search Scryfall */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: 'var(--font-ui)',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 430, height: '88%',
            background: 'var(--parchment)',
            borderRadius: '24px 24px 0 0',
            padding: '14px 16px 0',
            boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid var(--line-strong)',
            animation: 'popIn 240ms var(--ease)',
          }}>
            <div style={{
              width: 40, height: 4, borderRadius: 999,
              background: 'var(--ink-4)', margin: '0 auto 14px',
            }}/>

            <div style={{ marginBottom: 4 }}>
              <div className="ph-stamp" style={{ fontSize: 10, color: 'var(--ink-3)' }}>From Scryfall</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26,
                color: 'var(--ink)', letterSpacing: '-0.01em', marginTop: 2,
              }}>Choose a commander</div>
            </div>

            {/* Search input */}
            <div style={{
              marginTop: 14,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              background: 'var(--parchment-card)',
              border: '1px solid var(--line-strong)',
              borderRadius: 14,
              boxShadow: 'inset 0 1px 2px rgba(43,33,24,0.04)',
            }}>
              <Icon name="search" size={18} stroke="var(--ink-3)" width={1.8}/>
              <input
                type="text" value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search legendary creatures…"
                autoFocus
                style={{
                  flex: 1, border: 'none', background: 'transparent', outline: 'none',
                  fontFamily: 'var(--font-ui)', fontSize: 16, color: 'var(--ink)',
                }}/>
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-3)', padding: 4,
                }}>
                  <Icon name="close" size={16} stroke="currentColor" width={2}/>
                </button>
              )}
            </div>

            {/* Results */}
            <div style={{ flex: 1, overflowY: 'auto', marginTop: 14, paddingBottom: 14 }}>
              {searching && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>Searching…</div>
              )}
              {!searching && searchQuery.length < 2 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>
                  Type a commander name to search
                </div>
              )}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-3)', fontSize: 13 }}>
                  No commanders found
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="ph-stamp" style={{ fontSize: 10, color: 'var(--ink-3)', padding: '0 4px 8px' }}>
                  {searchResults.length} matches
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {searchResults.map((r, i) => {
                  const art = getCardArt(r);
                  return (
                    <button key={i} onClick={() => handleSelectCommander(r)} style={{
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 10px', borderRadius: 14,
                      background: 'transparent',
                      border: 'none',
                      fontFamily: 'var(--font-ui)',
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        overflow: 'hidden', flexShrink: 0,
                        border: '1px solid var(--line-strong)',
                        background: 'var(--ink)',
                      }}>
                        {art && <img src={art} alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }}/>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 16,
                          color: 'var(--ink)', lineHeight: 1.15, letterSpacing: '-0.005em',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{r.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <ManaPips colors={r.color_identity}/>
                          {r.type_line && (
                            <span style={{
                              fontSize: 11, color: 'var(--ink-3)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{r.type_line}</span>
                          )}
                        </div>
                      </div>
                      <Icon name="chevron-right" size={18} stroke="var(--ink-3)"/>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Bracket picker — appears after a commander is selected */}
      {pendingCard && (
        <div onClick={() => setPendingCard(null)} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: 'var(--font-ui)',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 430,
            background: 'var(--parchment)',
            borderRadius: '24px 24px 0 0',
            padding: '14px 16px 28px',
            boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
            maxHeight: '90%', overflow: 'auto',
            borderTop: '1px solid var(--line-strong)',
            animation: 'popIn 240ms var(--ease)',
          }}>
            <div style={{
              width: 40, height: 4, borderRadius: 999,
              background: 'var(--ink-4)', margin: '0 auto 14px',
            }}/>

            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div className="ph-stamp" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Power level</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26,
                color: 'var(--ink)', letterSpacing: '-0.01em', marginTop: 2,
              }}>Choose a bracket</div>
              <div style={{
                fontSize: 13, color: 'var(--ink-2)',
                marginTop: 4, padding: '0 12px',
              }}>How this commander reads at the table. Set honestly so the pod knows what to bring.</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {BRACKETS.map(b => (
                <BracketTile key={b.value} n={b.value} label={b.label} description={b.desc}
                  selected={selectedBracket === b.value}
                  onSelect={() => setSelectedBracket(b.value)}/>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setPendingCard(null)} style={{
                flex: 1, cursor: 'pointer',
                background: 'transparent',
                border: '1px solid var(--line-strong)',
                borderRadius: 'var(--r-card)',
                padding: '14px 16px',
                color: 'var(--ink)',
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 15,
              }}>Cancel</button>
              <button onClick={handleConfirmRegistration} disabled={registering} style={{
                flex: 1.4, cursor: registering ? 'default' : 'pointer',
                background: registering ? 'var(--ink-3)' : 'var(--forest)',
                border: 'none',
                borderRadius: 'var(--r-card)',
                padding: '14px 16px',
                color: 'var(--parchment)',
                fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 15,
                boxShadow: 'var(--shadow-rest)',
              }}>{registering ? 'Saving…' : 'Save bracket'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`toast ${showToast ? 'show' : ''}`}>{toastMsg}</div>
    </>
  );
}
