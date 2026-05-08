'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getGameLog, type GameLogEntry } from '@/lib/game-log';
import { supabase } from '@/lib/supabase';

// ─── Design tokens (inline) ────────────────────────────────────────────────
const TOKENS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Young+Serif&display=swap');
:root {
  --parchment: #F5EFE2; --parchment-card: #FAF5EA; --parchment-deep: #EDE4D0; --paper-white: #FFFFFF;
  --ink: #2B2118; --ink-2: #5C5043; --ink-3: #8A7E6F; --ink-4: #B8AE9E;
  --forest: #2F5D3A; --forest-deep: #22472B; --forest-soft: #E5ECE3; --forest-line: rgba(47,93,58,.35);
  --copper: #B06B2C; --copper-deep: #8A5320; --copper-soft: #F3E3D1; --gold: #C99B2F;
  --line: rgba(43,33,24,.08); --line-strong: rgba(43,33,24,.14);
  --cat-brilliance: #C99B2F; --cat-brilliance-soft: #F6ECD2;
  --cat-flavor: #7E4E8A; --cat-flavor-soft: #EADDEE;
  --cat-rivalry: #9E2B2B; --cat-rivalry-soft: #F1D4CF;
  --cat-allegiance: #2F7A74; --cat-allegiance-soft: #D6E6E3;
  --cat-fun: #E07B4A; --cat-fun-soft: #F9DFCD;
  --bg: var(--parchment); --bg-card: var(--parchment-card); --bg-sunken: var(--parchment-deep);
  --fg: var(--ink); --fg-muted: var(--ink-2); --fg-subtle: var(--ink-3); --fg-disabled: var(--ink-4);
  --accent: var(--forest); --accent-press: var(--forest-deep); --accent-soft: var(--forest-soft);
  --font-ui: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  --font-display: 'Young Serif', ui-serif, Georgia, serif;
  --r-chip: 12px; --r-card: 20px; --r-full: 999px;
  --shadow-rest: 0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12);
}
`;

// ─── Icon ───────────────────────────────────────────────────────────────────
function Icon({ name, size = 20, stroke = 'currentColor', width = 1.75 }: any) {
  const p: any = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  const paths: any = {
    layers: <><path d="m12.83 2.18-9 4a2 2 0 0 0 0 3.64l9 4a2 2 0 0 0 1.66 0l9-4a2 2 0 0 0 0-3.64l-9-4a2 2 0 0 0-1.66 0z"/><path d="m2 12.5 9.2 4.1a2 2 0 0 0 1.6 0L22 12.5"/><path d="m2 17.5 9.2 4.1a2 2 0 0 0 1.6 0L22 17.5"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    sparkles: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v3M20.5 4.5h-3M5 18v3M6.5 19.5h-3"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    'share-2': <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

// ─── Eyebrow label ──────────────────────────────────────────────────────────
function Eyebrow({ children, color = 'var(--fg-subtle)', style = {} }: any) {
  return (
    <div style={{
      fontFamily: 'var(--font-ui)',
      fontSize: 11, fontWeight: 700,
      letterSpacing: '0.16em',
      textTransform: 'uppercase' as const,
      color,
      fontVariantNumeric: 'tabular-nums',
      ...style,
    }}>{children}</div>
  );
}

// ─── Diamond divider ────────────────────────────────────────────────────────
function DiamondDivider({ width: w = 120, color = 'var(--line-strong)' }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
      <div style={{ height: 1, background: color, flex: 1, maxWidth: w }}/>
      <svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 0 L8 4 L4 8 L0 4 Z" fill={color}/></svg>
      <div style={{ height: 1, background: color, flex: 1, maxWidth: w }}/>
    </div>
  );
}

// ─── Bottom nav ─────────────────────────────────────────────────────────────
function BottomNav({ active = 'recent' }: { active?: string }) {
  const items = [
    { id: 'recent',  label: 'Recent',  icon: 'layers',   href: '/recent-games' },
    { id: 'profile', label: 'Profile', icon: 'shield',   href: '/profile' },
    { id: 'decks',   label: 'Decks',   icon: 'sparkles', href: '/decks' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 28, paddingTop: 8,
      background: 'rgba(245,239,226,0.92)',
      backdropFilter: 'blur(14px) saturate(120%)',
      WebkitBackdropFilter: 'blur(14px) saturate(120%)',
      borderTop: '1px solid var(--line)',
      display: 'flex', justifyContent: 'space-around',
      zIndex: 30,
    }}>
      {items.map(it => {
        const isActive = it.id === active;
        return (
          <Link key={it.id} href={it.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, padding: '6px 0',
            color: isActive ? 'var(--forest)' : 'var(--ink-3)',
            textDecoration: 'none',
          }}>
            <Icon name={it.icon} size={22} width={1.6}/>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
            }}>{it.label}</div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Category color mapping ─────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  brilliance: 'var(--cat-brilliance)',
  flavor: 'var(--cat-flavor)',
  rivalry: 'var(--cat-rivalry)',
  allegiance: 'var(--cat-allegiance)',
  fun: 'var(--cat-fun)',
};

// ─── Memory Card overlay (kept from existing) ───────────────────────────────
interface Player {
  name: string;
  commander: string;
  commanderFull: string;
  img: string;
}
interface Badge { key: string; }
interface Game {
  pod: string;
  date: string;
  rawDate: Date;
  length: string;
  aura: number;
  auraType: 'loss' | 'gain';
  winnerIdx: number;
  winnerName: string;
  deck: string;
  headline: string;
  cat: string;
  color: string;
  players: Player[];
  badges: Badge[];
  shareCode: string | null;
}

function MemoryCard({ game, onClose }: { game: Game; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleDownload = async () => {
    if (!cardRef.current) return;
    const { downloadCard } = await import('@/lib/share-card');
    await downloadCard(cardRef.current, `aura-card-${game.date}`);
  };
  const handleShare = async () => {
    if (!cardRef.current) return;
    const { shareCard } = await import('@/lib/share-card');
    await shareCard(cardRef.current);
  };
  const winner = game.players[game.winnerIdx];

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, background: 'rgba(232,220,200,0.45)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
        <div ref={cardRef} style={{
          width: '100%', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(184,146,46,0.3), 0 0 30px rgba(184,146,46,0.08), 0 30px 80px rgba(8,12,10,0.5)',
        }}>
          <div style={{
            background: 'linear-gradient(165deg, rgb(12,42,35) 0%, rgb(18,62,52) 25%, rgb(26,82,68) 50%, rgb(14,52,44) 75%, rgb(10,32,28) 100%)',
            padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,239,227,0.7)' }}>{game.pod}</div>
                <div style={{ fontSize: 9, color: 'rgba(245,239,227,0.4)' }}>{game.date}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'rgb(60,130,185)' }}>
                {game.aura >= 0 ? '+' : ''}{game.aura}
              </div>
            </div>
            {winner && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: 'linear-gradient(135deg, rgba(184,146,46,0.15) 0%, rgba(184,146,46,0.08) 100%)',
                border: '1px solid rgba(184,146,46,0.3)', borderRadius: 10,
              }}>
                <div style={{ fontSize: 18 }}>👑</div>
                <div>
                  <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', color: 'rgb(184,146,46)' }}>Winner</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'rgb(245,239,227)' }}>{winner.commanderFull}</div>
                  <div style={{ fontSize: 10, color: 'rgba(245,239,227,0.5)' }}>{winner.name}</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '14px 0 10px' }}>
              {game.players.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
                    border: idx === game.winnerIdx ? '1.5px solid rgb(184,146,46)' : '1.5px solid rgba(184,168,138,0.4)',
                    boxShadow: idx === game.winnerIdx ? '0 0 8px rgba(184,146,46,0.3)' : 'none',
                  }}>
                    {p.img ? <img src={p.img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> :
                      <div style={{ width: '100%', height: '100%', background: 'rgba(245,239,227,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'rgba(245,239,227,0.6)' }}>{p.name.charAt(0)}</div>}
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 600, color: 'rgba(245,239,227,0.8)', textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.commander}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: -18, right: 10, display: 'flex', gap: 6, zIndex: 10 }}>
          <button onClick={handleDownload} style={{
            width: 34, height: 34, borderRadius: '50%', background: 'rgba(245,239,227,0.85)',
            border: '1.5px solid rgb(184,168,138)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="download" size={15} stroke="rgb(44,62,54)"/></button>
          <button onClick={handleShare} style={{
            width: 34, height: 34, borderRadius: '50%', background: 'rgba(245,239,227,0.85)',
            border: '1.5px solid rgb(184,168,138)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="share-2" size={15} stroke="rgb(44,62,54)"/></button>
        </div>
      </div>
    </div>
  );
}

// ─── Main content ───────────────────────────────────────────────────────────
function RecentGamesContent() {
  const searchParams = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  useEffect(() => {
    // Inject tokens CSS once
    if (typeof document !== 'undefined' && !document.getElementById('aura-tokens')) {
      const s = document.createElement('style');
      s.id = 'aura-tokens';
      s.textContent = TOKENS_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    async function loadGames() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const deckIdFilter = searchParams.get('deckId') ?? undefined;
      const result = await getGameLog(user.id, { deckId: deckIdFilter, pageSize: 50 });

      const cats = ['brilliance', 'flavor', 'rivalry', 'allegiance', 'fun'];
      const mapped: Game[] = result.entries.map((e, idx) => {
        const cat = cats[idx % cats.length];
        const winnerIdx = e.podCommanders.findIndex(c => c.isWinner);
        const winner = e.podCommanders[winnerIdx];
        const gameDate = new Date(e.gameDate);
        return {
          pod: `${e.podSize}-player game`,
          date: gameDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rawDate: gameDate,
          length: '',
          aura: e.isWinner ? 8 : 4,
          auraType: e.isWinner ? 'gain' as const : 'loss' as const,
          winnerIdx: winnerIdx >= 0 ? winnerIdx : 0,
          winnerName: winner?.commanderName?.split(',')[0] ?? 'Unknown',
          deck: e.podCommanders[0]?.commanderName ?? '',
          headline: winner ? `${winner.commanderName.split(',')[0]} claimed the table.` : 'Game completed.',
          cat,
          color: CAT_COLORS[cat] ?? 'var(--cat-brilliance)',
          players: e.podCommanders.map(c => ({
            name: c.commanderName.split(',')[0],
            commander: c.commanderName.split(',')[0],
            commanderFull: c.commanderName,
            img: c.artUrl ?? '',
          })),
          badges: [],
          shareCode: e.shareCode,
        };
      });
      setGames(mapped);
      setLoading(false);
    }
    loadGames();
  }, [searchParams]);

  // Group games by time period
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisWeek = games.filter(g => g.rawDate >= weekAgo);
  const earlierThisMonth = games.filter(g => g.rawDate < weekAgo && g.rawDate >= monthStart);
  const older = games.filter(g => g.rawDate < monthStart);

  const groups = [
    ...(thisWeek.length ? [{ label: 'This week', items: thisWeek }] : []),
    ...(earlierThisMonth.length ? [{ label: 'Earlier this month', items: earlierThisMonth }] : []),
    ...(older.length ? [{ label: 'Older', items: older }] : []),
  ];

  // Stats
  const totalGames = games.length;
  const totalWins = games.filter(g => g.auraType === 'gain').length;
  const podSet = new Set(games.map(g => g.pod));

  return (
    <div style={{
      position: 'relative', height: '100dvh', width: '100%',
      background: 'var(--parchment)',
      fontFamily: 'var(--font-ui)',
      maxWidth: 430, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ padding: '52px 20px 14px' }}>
        <Eyebrow>Your History</Eyebrow>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)',
          letterSpacing: '-0.01em', lineHeight: 1.1, marginTop: 4,
        }}>Recent Games</div>
        <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
          {totalGames} game{totalGames !== 1 ? 's' : ''} · {totalWins} win{totalWins !== 1 ? 's' : ''} · {podSet.size} pod{podSet.size !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 100px', height: 'calc(100dvh - 140px)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-subtle)' }}>Loading games...</div>
        ) : games.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--fg-subtle)' }}>No games yet. Start a pod to play!</div>
        ) : (
          <>
            {groups.map(g => (
              <div key={g.label} style={{ marginBottom: 18 }}>
                <Eyebrow style={{ padding: '4px 4px 8px' }}>{g.label}</Eyebrow>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {g.items.map((gm, i) => (
                    <div key={i} onClick={() => setSelectedGame(gm)} style={{
                      background: 'var(--parchment-card)', border: '1px solid var(--line)',
                      borderRadius: 'var(--r-card)', padding: '14px 14px',
                      boxShadow: 'var(--shadow-rest)',
                      borderLeft: `4px solid ${gm.color}`,
                      cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Eyebrow color={gm.color}>{gm.pod}</Eyebrow>
                            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--fg-subtle)' }}>
                              · {gm.date}{gm.length ? ` · ${gm.length}` : ''}
                            </span>
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)',
                            letterSpacing: '-0.01em', lineHeight: 1.25, marginTop: 4,
                          }}>"{gm.headline}"</div>
                          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6 }}>
                            Won by <strong style={{ color: 'var(--ink)' }}>{gm.winnerName}</strong> · {gm.deck}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, marginLeft: 10, textAlign: 'right' as const }}>
                          <div style={{
                            fontFamily: 'var(--font-display)', fontSize: 22,
                            color: 'var(--forest)', letterSpacing: '-0.02em', lineHeight: 1,
                            fontVariantNumeric: 'tabular-nums',
                          }}>+{gm.aura}</div>
                          <div style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
                            color: 'var(--fg-subtle)', textTransform: 'uppercase' as const, marginTop: 2,
                          }}>Aura</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <DiamondDivider color="var(--line-strong)"/>
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--fg-subtle)' }}>
              Each game adds to the story your decks tell about you.
            </div>
          </>
        )}
      </div>

      <BottomNav active="recent"/>

      {selectedGame && (
        <MemoryCard game={selectedGame} onClose={() => setSelectedGame(null)}/>
      )}
    </div>
  );
}

// ─── Default export ─────────────────────────────────────────────────────────
export default function RecentGamesPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>}>
      <RecentGamesContent />
    </Suspense>
  );
}
