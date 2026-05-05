'use client';

import React, { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getGame } from '@/lib/games';
import { updateLifeTotal, updatePoisonCounters, updateExperienceCounters, updateEnergyCounters, concedeGame, updateLifeBySeat, updatePoisonBySeat, updateExperienceBySeat, updateEnergyBySeat } from '@/lib/game-triggers';
import { supabase } from '@/lib/supabase';
import { useWakeLock } from '@/lib/use-wake-lock';
import { getQrCodeUrl } from '@/lib/pods';

const DARK = {
  bg:        '#0A0604',
  bgCard:    '#150E08',
  bgDeep:    '#050302',
  ink:       '#F0E8D8',
  ink2:      '#C5B9A5',
  ink3:      '#8A7E6F',
  ink4:      '#5C5043',
  copper:    '#E2B858',
  copperDim: 'rgba(226,184,88,0.55)',
  copperGlow:'rgba(201,155,47,0.34)',
  gold:      '#C99B2F',
  forest:    '#3F9F4D',
  forestDeep:'#2C7A37',
  line:      'rgba(226,184,88,0.10)',
  lineStrong:'rgba(226,184,88,0.18)',
  cellBorder:'rgba(226,184,88,0.14)',
  shadowRest:'0 1px 0 rgba(0,0,0,.15), 0 6px 18px -8px rgba(0,0,0,.35)',
  navBg:     'linear-gradient(180deg, rgba(10,6,4,0) 0%, rgba(10,6,4,0.92) 30%, #0A0604 100%)',
  navPill:   '#150E08',
  navBorder: 'rgba(226,184,88,0.18)',
};

const MANA = {
  W: '#F8E7B9', U: '#A6C8E6', B: '#3F3A36',
  R: '#D27B5C', G: '#7BA37A', C: '#A89F8E',
};

const COLOR_WASH = {
  G: 'rgba(123,163,122,0.14)',
  W: 'rgba(248,231,185,0.18)',
  U: 'rgba(166,200,230,0.14)',
  B: 'rgba(63,58,54,0.10)',
  R: 'rgba(210,123,92,0.14)',
};

const COUNTER_VOCAB = {
  poison:     { label: 'Poison',     tone: '#4F8A4D', soft: '#E2EBDB', glyph: 'skull' },
  energy:     { label: 'Energy',     tone: '#C99B2F', soft: '#F6ECD2', glyph: 'bolt' },
  experience: { label: 'Experience', tone: '#7E4E8A', soft: '#EADDEE', glyph: 'star' },
};

// ─── Components ───────────────────────────────────────────────────────────

function Icon({ name, size = 20, stroke = 'currentColor', width = 1.75 }: { name: string; size?: number; stroke?: string; width?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round' } as React.SVGAttributes<SVGSVGElement>;
  const paths: Record<string, React.ReactNode> = {
    'chevron-left': <polyline points="15 18 9 12 15 6"/>,
    grid:     <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    user:     <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    dice:     <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill={stroke} stroke="none"/><circle cx="15.5" cy="8.5" r="1.2" fill={stroke} stroke="none"/><circle cx="12" cy="12" r="1.2" fill={stroke} stroke="none"/><circle cx="8.5" cy="15.5" r="1.2" fill={stroke} stroke="none"/><circle cx="15.5" cy="15.5" r="1.2" fill={stroke} stroke="none"/></>,
    plus:     <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    minus:    <line x1="5" y1="12" x2="19" y2="12"/>,
    sword:    <><path d="m14.5 17.5 4-4-9-9H4v6l9 9z"/><line x1="14.5" y1="17.5" x2="20" y2="23"/><path d="m9.5 4.5 4 4"/></>,
    close:    <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    skull:    <><path d="M8 21h8v-3a4 4 0 0 0 4-4v-2a8 8 0 1 0-16 0v2a4 4 0 0 0 4 4v3z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><path d="M11 17h2"/></>,
    bolt:     <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    star:     <polygon points="12 2 15.1 8.6 22 9.6 17 14.5 18.2 21.5 12 18.2 5.8 21.5 7 14.5 2 9.6 8.9 8.6 12 2"/>,
    'plus-circle': <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

function ManaDots({ colors = [], size = 7 }: { colors?: string[]; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {colors.map((c, i) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: 999,
          background: MANA[c as keyof typeof MANA] || MANA.C,
          boxShadow: '0 0 0 1px rgba(43,33,24,0.18)',
          display: 'inline-block',
        }}/>
      ))}
    </span>
  );
}

function CounterChip({ kind, count }: { kind: string; count: number }) {
  const v = COUNTER_VOCAB[kind as keyof typeof COUNTER_VOCAB] || COUNTER_VOCAB.poison;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: 22, padding: '0 9px',
      background: `${v.tone}22`,
      color: v.soft,
      border: `1px solid ${v.tone}44`,
      borderRadius: 999,
      fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      <Icon name={v.glyph} size={12} stroke={v.soft} width={1.9}/>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 400,
        fontSize: 13, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>{count}</span>
    </div>
  );
}

function DarkCompassBg() {
  return (
    <svg width="520" height="520" viewBox="0 0 320 320" style={{
      position: 'absolute', top: '22%', left: '50%',
      transform: 'translate(-50%, -50%)',
      opacity: 0.18,
      pointerEvents: 'none',
      zIndex: 0,
      WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.15) 75%, rgba(0,0,0,0) 95%)',
      maskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.15) 75%, rgba(0,0,0,0) 95%)',
    } as React.CSSProperties}>
      <g stroke={DARK.copper} strokeWidth="0.8" fill="none">
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r1 = 40, r2 = 170;
          const cx = 160, cy = 160;
          return <line key={i}
            x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1}
            x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2}/>;
        })}
        <circle cx="160" cy="160" r="40"/>
        <circle cx="160" cy="160" r="60" strokeDasharray="1 3"/>
        <circle cx="160" cy="160" r="110" strokeDasharray="1 4"/>
        <circle cx="160" cy="160" r="170"/>
      </g>
    </svg>
  );
}

function ScreenBg({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'relative', height: '100%', width: '100%',
      background: DARK.bg,
      backgroundImage:
        `radial-gradient(ellipse at 50% 12%, ${DARK.copperGlow}, transparent 50%), ` +
        `radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.6), transparent 50%), ` +
        `linear-gradient(180deg, #140C07 0%, #0A0604 45%, #050302 100%)`,
      fontFamily: 'var(--font-ui)',
    }}>
      <DarkCompassBg/>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(201,155,47,0.12)',
      }}/>
      {children}
    </div>
  );
}

function CommanderArt({ colors = ['C'], art = null, opacity = 0.4 }: { colors?: string[]; art?: string | null; opacity?: number }) {
  if (art) {
    return (
      <img src={art} alt="" style={{
        position:'absolute', inset:0, width:'100%', height:'100%',
        objectFit:'cover', objectPosition:'center 25%', opacity,
      }}/>
    );
  }
  const top = MANA[colors[0] as keyof typeof MANA] || MANA.C;
  const bot = MANA[colors[1] as keyof typeof MANA || colors[0] as keyof typeof MANA] || MANA.C;
  return (
    <div style={{
      position:'absolute', inset:0,
      background:
        `radial-gradient(120% 80% at 50% 20%, ${top}cc 0%, ${top}55 35%, transparent 70%),`+
        `linear-gradient(180deg, ${bot}33 0%, transparent 60%)`,
      opacity,
      mixBlendMode:'multiply',
    } as React.CSSProperties}/>
  );
}

function CellInner({ player }: { player: any }) {
  const counters = player.counters || {};
  const counterEntries = Object.entries(counters).filter(([, n]) => (n as number) > 0);

  const darkWash = (() => {
    const c = player.colors[0];
    const map = {
      G: 'rgba(123,163,122,0.12)', W: 'rgba(248,231,185,0.10)',
      U: 'rgba(166,200,230,0.10)', B: 'rgba(80,70,60,0.10)',
      R: 'rgba(210,123,92,0.12)',
    };
    return (map as Record<string, string>)[c] || 'rgba(168,159,142,0.06)';
  })();

  return (
    <div style={{ position:'absolute', inset:0, borderRadius:'20px', overflow:'hidden' }}>
      <CommanderArt colors={player.colors} art={player.art} opacity={0.4}/>
      <div style={{ position:'absolute', inset:0,
        background: 'linear-gradient(180deg, rgba(10,6,4,0.88) 0%, rgba(10,6,4,0.35) 22%, rgba(10,6,4,0.25) 50%, rgba(10,6,4,0.45) 78%, rgba(10,6,4,0.90) 100%)',
      }}/>
      <div style={{ position:'absolute', inset:0,
        background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${darkWash} 0%, transparent 70%)`,
      }}/>

      <div style={{ position:'absolute', top:14, left:16, right:16,
        display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:3, minWidth:0 }}>
          <div style={{ fontFamily:'var(--font-ui)', fontSize:10, fontWeight:700, letterSpacing:'0.20em', textTransform:'uppercase',
            color: player.isYou ? DARK.copper : DARK.ink3,
            display:'inline-flex', alignItems:'center', gap:5 }}>
            {player.isYou && <span style={{
              width:4, height:4, borderRadius:999,
              background: DARK.copper,
              boxShadow: '0 0 8px rgba(226,184,88,0.7)',
            }}/>}
            {player.isYou ? 'You' : player.name}
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:13, lineHeight:1.15,
            color: DARK.ink,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{player.commander}</div>
        </div>
        <ManaDots colors={player.colors} size={7}/>
      </div>

      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:8 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:400,
          fontSize:120, lineHeight:1, letterSpacing:'-0.04em',
          color: DARK.ink,
          fontVariantNumeric:'tabular-nums',
          textShadow: '0 0 40px rgba(226,184,88,0.12), 0 1px 0 rgba(10,6,4,0.6)',
        }}>{player.life}</div>

        {counterEntries.length > 0 && (
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center', maxWidth:'90%' }}>
            {counterEntries.map(([k, n]) => (
              <CounterChip key={k} kind={k} count={n as number}/>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function NormalCell({ player, flipped = false, onTapLeft, onTapRight }: { player: any; flipped?: boolean; onTapLeft: () => void; onTapRight: () => void }) {
  return (
    <div style={{
      position:'relative',
      height:'100%',
      borderRadius:'20px',
      background: DARK.bgCard,
      border: `1px solid ${DARK.cellBorder}`,
      boxShadow: DARK.shadowRest,
      overflow:'hidden',
      transform: flipped ? 'rotate(180deg)' : 'none',
    }}>
      <CellInner player={player}/>

      {/* Tap zones */}
      <div style={{ position:'absolute', inset:0, display:'flex', zIndex:10 }}>
        <button style={{
          flex:1, background:'transparent', border:'none', cursor:'pointer', padding:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}
          onClick={onTapLeft}
          onMouseDown={(e: any) => { e.currentTarget.style.background = 'rgba(255,80,80,0.08)'; }}
          onMouseUp={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
          onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
          onTouchStart={(e: any) => { e.currentTarget.style.background = 'rgba(255,80,80,0.08)'; }}
          onTouchEnd={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
        />
        <button style={{
          flex:1, background:'transparent', border:'none', cursor:'pointer', padding:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}
          onClick={onTapRight}
          onMouseDown={(e: any) => { e.currentTarget.style.background = 'rgba(80,200,80,0.08)'; }}
          onMouseUp={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
          onMouseLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
          onTouchStart={(e: any) => { e.currentTarget.style.background = 'rgba(80,200,80,0.08)'; }}
          onTouchEnd={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
        />
      </div>
    </div>
  );
}

function NormalEmptyCell({ seatLabel = 'Seat', flipped = false, onClaimSeat }: { seatLabel?: string; flipped?: boolean; onClaimSeat: () => void }) {
  return (
    <div style={{
      position:'relative',
      height:'100%',
      borderRadius:'20px',
      background: DARK.bgDeep,
      border: `2.5px dashed rgba(226,184,88,0.25)`,
      boxShadow: 'inset 0 0 0 1px rgba(226,184,88,0.06)',
      overflow:'hidden',
      transform: flipped ? 'rotate(180deg)' : 'none',
    }}>
      <div style={{
        position:'absolute', top:14, left:16, right:16,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{
          fontFamily:'var(--font-ui)', fontSize:10, fontWeight:700,
          letterSpacing:'0.20em', textTransform:'uppercase',
          color: DARK.ink3,
        }}>{seatLabel}</div>
        <div style={{
          fontFamily:'var(--font-ui)', fontSize:9, fontWeight:700,
          letterSpacing:'0.16em', textTransform:'uppercase',
          color: DARK.ink4,
          padding:'2px 8px',
          border:`1px solid rgba(226,184,88,0.12)`,
          borderRadius:999,
        }}>Empty</div>
      </div>

      <div style={{
        position:'absolute', inset:0,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <div style={{
          fontFamily:'var(--font-display)', fontWeight:400,
          fontSize:120, lineHeight:1, letterSpacing:'-0.04em',
          color: DARK.ink4,
          fontVariantNumeric:'tabular-nums',
          opacity:0.6,
        }}>40</div>
      </div>

      <div style={{
        position:'absolute', bottom:18, left:16, right:16,
        display:'flex', justifyContent:'center',
      }}>
        <button onClick={onClaimSeat} style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'9px 18px',
          background: DARK.forest,
          color: DARK.ink,
          border:'none', borderRadius:999,
          boxShadow: '0 2px 8px -2px rgba(63,159,77,0.35)',
          fontFamily:'var(--font-ui)', fontSize:10, fontWeight:700,
          letterSpacing:'0.14em', textTransform:'uppercase',
          cursor:'pointer',
        }}>
          <Icon name="plus-circle" size={14} stroke={DARK.ink}/>
          Claim Seat
        </button>
      </div>
    </div>
  );
}

function GameNav({ active = 'grid', onDiceClick, onCountersClick, podId, gameId }: { active?: string; onDiceClick: () => void; onCountersClick: () => void; podId: string; gameId: string }) {
  const items = [
    { id: 'grid',   icon: 'grid',   label: 'Grid' },
    { id: 'single', icon: 'user',   label: 'You' },
    { id: 'dice',   icon: 'dice',   label: 'Dice' },
    { id: 'count',  icon: 'plus',   label: 'Counters' },
    { id: 'cmdr',   icon: 'sword',  label: 'Cmdr Dmg' },
  ];
  return (
    <div style={{
      flexShrink: 0,
      padding: '10px 16px 24px',
      background: DARK.bg,
    }}>
      <div style={{
        background: DARK.navPill,
        border: `1px solid ${DARK.navBorder}`,
        borderRadius: 999, boxShadow: DARK.shadowRest,
        padding: 6, display: 'flex', justifyContent: 'space-between',
      }}>
        {items.map(it => {
          const on = it.id === active;
          const handleClick = () => {
            if (it.id === 'dice') onDiceClick();
            else if (it.id === 'count') onCountersClick();
            else if (it.id === 'single') window.location.href = `/singleview?podId=${podId}&gameId=${gameId}`;
          };
          return (
            <button key={it.id} onClick={handleClick} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '6px 0', border: 'none',
              background: on ? DARK.forest : 'transparent',
              color: on ? DARK.ink : DARK.ink3,
              borderRadius: 999,
              fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', gap: 2,
              cursor: 'pointer',
            }}>
              <Icon name={it.icon} size={16} stroke={on ? DARK.ink : DARK.ink3}/>
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModalTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.32em', textTransform: 'uppercase',
        color: DARK.copper,
      }}>
        <span style={{ width: 18, height: 1, background: DARK.copper, opacity: 0.5 }}/>
        <span style={{ fontSize: 8, opacity: 0.7 }}>✦</span>
        <span>{kicker}</span>
        <span style={{ fontSize: 8, opacity: 0.7 }}>✦</span>
        <span style={{ width: 18, height: 1, background: DARK.copper, opacity: 0.5 }}/>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1.05,
        color: DARK.ink, marginTop: 4, letterSpacing: '-0.01em',
      }}>{title}</div>
    </div>
  );
}

function PageContent() {
  useWakeLock();
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId') ?? '';
  const podId = searchParams.get('podId') ?? '';

  const [players, setPlayers] = useState<Record<number, { life: number; name: string; commander: string | null; claimed: boolean; colors: string[]; assignedColor: string | null; art?: string }>>({
    1: { life: 40, name: 'Frederico', commander: 'Atraxa, Praetors\' Voice', claimed: true, colors: ['W', 'U', 'B', 'G'], assignedColor: null },
    2: { life: 40, name: 'Player 2', commander: null, claimed: false, colors: [], assignedColor: null }
  });

  const [counters, setCounters] = useState<Record<number, { poison: number; experience: number; energy: number }>>({
    1: { poison: 0, experience: 0, energy: 0 },
    2: { poison: 0, experience: 0, energy: 0 }
  });

  const [selectedCounterPlayer, setSelectedCounterPlayer] = useState(1);
  const [diceTab, setDiceTab] = useState('d6');
  const [rolling, setRolling] = useState(false);
  const [diceResult, setDiceResult] = useState('—');
  const [rollingText, setRollingText] = useState('');
  const [joinSlot, setJoinSlot] = useState<number | null>(null);
  const [diceModalOpen, setDiceModalOpen] = useState(false);
  const [countersModalOpen, setCountersModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [podShortCode, setPodShortCode] = useState<string>('');
  const [playerUserIds, setPlayerUserIds] = useState<Record<number, string>>({});
  const [playerSeatNumbers, setPlayerSeatNumbers] = useState<Record<number, number>>({});

  const syncTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const holdTimersRef = useRef<Record<number, NodeJS.Timeout>>({});
  const repeatTimersRef = useRef<Record<number, NodeJS.Timeout>>({});

  const debouncedSync = (key: string, fn: () => void) => {
    if (syncTimerRef.current[key]) clearTimeout(syncTimerRef.current[key]);
    syncTimerRef.current[key] = setTimeout(fn, 300);
  };

  useEffect(() => {
    if (!gameId) return;
    async function loadGame() {
      const { data: game } = await getGame(gameId);
      if (!game) return;

      if (game.pod_id) {
        const { data: pod } = await supabase.from('pods').select('short_code').eq('id', game.pod_id).single() as { data: any };
        if (pod?.short_code) setPodShortCode(pod.short_code);
      }

      const deckIds = game.players.map((p: any) => p.deck_id).filter(Boolean);
      let deckMap = new Map();
      if (deckIds.length > 0) {
        const { data: decks } = await supabase
          .from('decks')
          .select('id, commander_name, color_identity')
          .in('id', deckIds) as { data: any };
        deckMap = new Map((decks ?? []).map((d: any) => [d.id, d]) as any);
      }

      const newPlayers: Record<number, typeof players[1]> = {};
      const newUserIds: Record<number, string> = {};
      const newSeatNumbers: Record<number, number> = {};
      const newCounters: Record<number, { poison: number; experience: number; energy: number }> = {};
      game.players.forEach((p: any) => {
        const deck: any = p.deck_id ? deckMap.get(p.deck_id) : null;
        const slot = p.seat_number ?? 1;
        if (slot > 2) return;
        const isEmptySeat = !p.user_id && !p.deck_id && !p.commander_name;
        const displayName = deck?.commander_name ?? p.commander_name ?? `Player ${slot}`;

        newPlayers[slot] = {
          life: p.life_total ?? 40,
          name: displayName.split(',')[0],
          commander: deck?.commander_name ?? p.commander_name ?? null,
          claimed: !isEmptySeat,
          colors: (deck?.color_identity ?? '').split('').filter((c: string) => 'WUBRG'.includes(c)),
          assignedColor: null,
        };
        if (p.user_id) newUserIds[slot] = p.user_id;
        newSeatNumbers[slot] = slot;
        newCounters[slot] = {
          poison: p.poison_counters ?? 0,
          experience: p.experience_counters ?? 0,
          energy: p.energy_counters ?? 0
        };
      });
      setPlayers(newPlayers);
      setPlayerUserIds(newUserIds);
      setPlayerSeatNumbers(newSeatNumbers);
      setCounters(newCounters);

      const channel = supabase
        .channel(`game-${gameId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` }, (payload: any) => {
          const row = payload.new;
          if (!row) return;
          const num = row.seat_number;
          if (num && num <= 2) {
            setPlayers(prev => ({ ...prev, [num]: { ...prev[num], life: row.life_total ?? prev[num].life } }));
            setCounters(prev => ({ ...prev, [num]: { poison: row.poison_counters ?? prev[num].poison, experience: row.experience_counters ?? prev[num].experience, energy: row.energy_counters ?? prev[num].energy } }));
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    loadGame();
  }, [gameId]);

  const handleLifeChange = (playerNum: number, delta: number) => {
    setPlayers(prev => {
      const newLife = Math.max(0, Math.min(999, prev[playerNum].life + delta));
      if (newLife === 0) {
        if (holdTimersRef.current[playerNum]) clearTimeout(holdTimersRef.current[playerNum]);
        if (repeatTimersRef.current[playerNum]) clearInterval(repeatTimersRef.current[playerNum]);
      }

      if (gameId) {
        debouncedSync(`life-${playerNum}`, () => {
          const userId = playerUserIds[playerNum];
          const seat = playerSeatNumbers[playerNum];
          if (userId) updateLifeTotal(gameId, userId, newLife).catch(() => {});
          else if (seat) updateLifeBySeat(gameId, seat, newLife).catch(() => {});
        });
      }

      return {
        ...prev,
        [playerNum]: { ...prev[playerNum], life: newLife }
      };
    });
  };

  const handleCounterChange = (type: 'poison' | 'experience' | 'energy', action: 'plus' | 'minus') => {
    const playerNum = selectedCounterPlayer;
    setCounters(prev => {
      const newVal = action === 'plus' ? prev[playerNum][type] + 1 : Math.max(0, prev[playerNum][type] - 1);

      const userId = playerUserIds[playerNum];
      const seat = playerSeatNumbers[playerNum];
      if (gameId) {
        debouncedSync(`${type}-${playerNum}`, () => {
          if (userId) {
            if (type === 'poison') updatePoisonCounters(gameId, userId, newVal).catch(() => {});
            else if (type === 'experience') updateExperienceCounters(gameId, userId, newVal).catch(() => {});
            else if (type === 'energy') updateEnergyCounters(gameId, userId, newVal).catch(() => {});
          } else if (seat) {
            if (type === 'poison') updatePoisonBySeat(gameId, seat, newVal).catch(() => {});
            else if (type === 'experience') updateExperienceBySeat(gameId, seat, newVal).catch(() => {});
            else if (type === 'energy') updateEnergyBySeat(gameId, seat, newVal).catch(() => {});
          }
        });
      }

      return {
        ...prev,
        [playerNum]: {
          ...prev[playerNum],
          [type]: newVal
        }
      };
    });
  };

  const handleDiceRoll = () => {
    if (rolling) return;
    setRolling(true);
    setRollingText('Rolling…');

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      const max = diceTab === 'd6' ? 6 : diceTab === 'd20' ? 20 : 2;
      const val = Math.floor(Math.random() * max) + 1;
      setDiceResult(diceTab === 'coin' ? (val === 1 ? 'H' : 'T') : val.toString());

      if (frame >= 14) {
        clearInterval(interval);
        setRolling(false);
        const final = Math.floor(Math.random() * max) + 1;
        setDiceResult(diceTab === 'coin' ? (final === 1 ? 'HEADS' : 'TAILS') : final.toString());
        setRollingText('');
      }
    }, 70);
  };

  const openJoinModal = (slotNum: number) => {
    setJoinSlot(slotNum);
    setJoinModalOpen(true);
  };

  const copyPodCode = () => {
    if (podShortCode) {
      navigator.clipboard.writeText(podShortCode).catch(() => {});
    }
  };

  const qrCodeUrl = podShortCode
    ? getQrCodeUrl(podShortCode, typeof window !== 'undefined' ? window.location.origin : 'https://auramtg.com')
    : '';

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Young+Serif&display=swap');

    :root {
      --font-ui: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
      --font-display: 'Young Serif', ui-serif, Georgia, serif;
      --r-card: 20px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; overflow: hidden; font-family: var(--font-ui); background: ${DARK.bg} !important; color: ${DARK.ink}; }

    .app { width: 100%; height: 100%; max-width: 430px; margin: 0 auto; display: flex; flex-direction: column; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); overflow: hidden; background: ${DARK.bg}; }

    .grid-container-2p { flex: 1; display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; gap: 10px; padding: 10px; min-height: 0; overflow: hidden; }

    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.65); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .modal-overlay.active { display: flex; }

    .dice-modal { width: calc(100% - 40px); max-width: 340px; background: ${DARK.bgCard}; border: 1px solid ${DARK.lineStrong}; border-radius: 20px; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); position: relative; }

    .modal-close { position: absolute; top: 16px; right: 16px; background: none; border: none; font-size: 28px; color: ${DARK.ink3}; cursor: pointer; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s ease; }
    .modal-close:active { transform: scale(0.9); background: ${DARK.bgDeep}; }

    .tab-group { display: flex; justify-content: center; gap: 8px; margin-bottom: 24px; }
    .tab { padding: 10px 18px; border: 1px solid ${DARK.lineStrong}; background: ${DARK.bgDeep}; color: ${DARK.ink3}; font-weight: 600; font-size: 13px; cursor: pointer; border-radius: 10px; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.02em; }
    .tab.active { background: ${DARK.copper}; color: ${DARK.bgDeep}; border-color: ${DARK.copper}; }

    .result-display { font-family: var(--font-display); font-weight: 700; font-size: 120px; color: ${DARK.copper}; text-align: center; margin-bottom: 12px; line-height: 1; min-height: 120px; display: flex; align-items: center; justify-content: center; letter-spacing: -2px; }
    .rolling-text { font-size: 13px; color: ${DARK.ink3}; text-align: center; margin-bottom: 20px; min-height: 18px; }
    .roll-button { width: 100%; padding: 14px; background: ${DARK.copper}; border: none; border-radius: 12px; color: ${DARK.bgDeep}; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.02em; }
    .roll-button:active { transform: scale(0.98); }

    .counters-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.65); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .counters-overlay.active { display: flex; }

    .counters-modal { width: 320px; background: ${DARK.bgCard}; border: 1px solid ${DARK.lineStrong}; border-radius: 20px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); position: relative; }

    .counters-title { font-weight: 700; font-size: 16px; color: ${DARK.ink}; letter-spacing: 0.02em; text-transform: uppercase; }

    .player-selector { display: flex; gap: 10px; margin-bottom: 18px; justify-content: center; }
    .player-selector-btn { width: 44px; height: 44px; border-radius: 50%; border: 2px solid ${DARK.lineStrong}; background: ${DARK.bgDeep}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: var(--font-ui); font-weight: 700; font-size: 16px; color: ${DARK.ink}; transition: all 0.2s ease; position: relative; }
    .player-selector-btn.active { border-color: ${DARK.copper}; background: ${DARK.copper}; color: ${DARK.bgDeep}; box-shadow: 0 0 0 1px ${DARK.bgCard}; transform: scale(1.08); }
    .player-selector-btn:active { transform: scale(0.95); }

    .counter-row { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: ${DARK.bgDeep}; border-radius: 12px; margin-bottom: 12px; border: 1px solid ${DARK.line}; }
    .counter-row:last-child { margin-bottom: 0; }

    .counter-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: ${DARK.copper}; }
    .counter-icon svg { width: 24px; height: 24px; stroke: ${DARK.copper}; }

    .counter-name { font-weight: 600; font-size: 14px; color: ${DARK.ink}; letter-spacing: 0.02em; text-transform: uppercase; }

    .counter-controls { display: flex; align-items: center; gap: 12px; }
    .counter-btn { width: 32px; height: 36px; border-radius: 8px; border: 1px solid ${DARK.lineStrong}; background: ${DARK.bgCard}; color: ${DARK.copper}; font-size: 20px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
    .counter-btn:active { transform: scale(0.9); background: ${DARK.bgDeep}; }

    .counter-value { font-weight: 700; font-size: 26px; color: ${DARK.copper}; min-width: 32px; text-align: center; font-family: 'Courier New', monospace; }

    .join-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.65); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
    .join-modal.active { display: flex; }

    .join-modal-card { width: calc(100% - 40px); max-width: 340px; background: ${DARK.bgCard}; border: 1px solid ${DARK.lineStrong}; border-radius: 20px; padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); position: relative; text-align: center; }
    .join-modal-title { font-weight: 700; font-size: 18px; color: ${DARK.ink}; margin-bottom: 6px; text-align: center; letter-spacing: 0.02em; }
    .join-modal-subtitle { font-size: 13px; color: ${DARK.ink3}; margin-bottom: 20px; }

    .join-slot-code { margin-top: 16px; padding: 10px 16px; background: ${DARK.bgDeep}; border: 1px solid ${DARK.lineStrong}; border-radius: 10px; display: inline-block; cursor: pointer; transition: all 0.2s ease; }
    .join-slot-code:active { transform: scale(0.98); border-color: ${DARK.copper}; }
    .join-slot-code span { color: ${DARK.copper}; font-size: 16px; font-weight: 700; letter-spacing: 4px; font-family: 'Courier New', monospace; }

    .toast { position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%) translateY(20px); background: ${DARK.bgCard}; color: ${DARK.ink}; padding: 12px 24px; border-radius: 10px; border: 1px solid ${DARK.lineStrong}; font-size: 13px; font-weight: 600; opacity: 0; pointer-events: none; transition: all 0.3s ease; z-index: 9999; }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        <div className="grid-container-2p">
          {/* Top: opponent (slot 2), flipped 180° */}
          {players[2].claimed ? (
            <NormalCell
              player={players[2]}
              flipped={true}
              onTapLeft={() => handleLifeChange(2, -1)}
              onTapRight={() => handleLifeChange(2, 1)}
            />
          ) : (
            <NormalEmptyCell
              seatLabel="Seat 2"
              flipped={true}
              onClaimSeat={() => openJoinModal(2)}
            />
          )}
          {/* Bottom: you (slot 1), normal orientation */}
          <NormalCell
            player={{ ...players[1], isYou: true }}
            flipped={false}
            onTapLeft={() => handleLifeChange(1, -1)}
            onTapRight={() => handleLifeChange(1, 1)}
          />
        </div>

        <GameNav
          onDiceClick={() => setDiceModalOpen(true)}
          onCountersClick={() => setCountersModalOpen(true)}
          podId={podId}
          gameId={gameId}
        />
      </div>

      {diceModalOpen && (
        <div
          className="modal-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDiceModalOpen(false);
            }
          }}
        >
          <div className="dice-modal">
            <button
              className="modal-close"
              onClick={() => setDiceModalOpen(false)}
            >
              ✕
            </button>
            <ModalTitle kicker="Roll" title="Dice Roller"/>
            <div className="tab-group">
              {['d6', 'd20', 'coin'].map(tab => (
                <button
                  key={tab}
                  className={`tab ${diceTab === tab ? 'active' : ''}`}
                  onClick={() => {
                    setDiceTab(tab);
                    setDiceResult('—');
                    setRollingText('');
                  }}
                >
                  {tab === 'coin' ? 'Coin' : tab.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="result-display">{diceResult}</div>
            <div className="rolling-text">{rollingText}</div>
            <button className="roll-button" onClick={handleDiceRoll}>
              Roll
            </button>
          </div>
        </div>
      )}

      {countersModalOpen && (
        <div
          className="counters-overlay active"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCountersModalOpen(false);
            }
          }}
        >
          <div className="counters-modal">
            <button
              className="modal-close"
              onClick={() => setCountersModalOpen(false)}
            >
              ✕
            </button>
            <div style={{ marginBottom: 18 }}>
              <ModalTitle kicker="Adjust" title="Counters"/>
            </div>

            <div className="player-selector">
              {[1, 2].map(num => {
                const p = players[num];
                return (
                  <button
                    key={num}
                    className={`player-selector-btn ${selectedCounterPlayer === num ? 'active' : ''}`}
                    onClick={() => setSelectedCounterPlayer(num)}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${DARK.lineStrong}`, textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: DARK.copper, marginBottom: 4, letterSpacing: '0.02em' }}>
                {players[selectedCounterPlayer].commander || '—'}
              </div>
              <div style={{ fontWeight: 400, fontSize: 12, color: DARK.ink3 }}>
                {players[selectedCounterPlayer].claimed
                  ? players[selectedCounterPlayer].name
                  : `Player ${selectedCounterPlayer}`}
              </div>
            </div>

            {(['poison', 'experience', 'energy'] as const).map(type => (
              <div key={type} className="counter-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="counter-icon">
                    {type === 'poison' ? (
                      <Icon name="skull" size={24} stroke={COUNTER_VOCAB[type].tone}/>
                    ) : type === 'experience' ? (
                      <Icon name="star" size={24} stroke={COUNTER_VOCAB[type].tone}/>
                    ) : (
                      <Icon name="bolt" size={24} stroke={COUNTER_VOCAB[type].tone}/>
                    )}
                  </div>
                  <div className="counter-name">
                    {type === 'experience' ? 'Experience' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </div>
                </div>
                <div className="counter-controls">
                  <button className="counter-btn" onClick={() => handleCounterChange(type, 'minus')}>
                    −
                  </button>
                  <div className="counter-value">
                    {counters[selectedCounterPlayer][type]}
                  </div>
                  <button className="counter-btn" onClick={() => handleCounterChange(type, 'plus')}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {joinModalOpen && (
        <div className="join-modal active">
          <div className="join-modal-card">
            <button
              className="modal-close"
              onClick={() => setJoinModalOpen(false)}
            >
              ✕
            </button>
            <div className="join-modal-title">Join Slot {joinSlot}</div>
            <div className="join-modal-subtitle">Scan to claim this player slot</div>
            <div style={{ width: 150, height: 150, margin: '0 auto', padding: 10, background: DARK.bgDeep, borderRadius: 12, border: `1px solid ${DARK.cellBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR code to join pod" width={130} height={130} style={{ imageRendering: 'pixelated' }} />
              ) : (
                <div style={{ color: DARK.ink3, fontSize: 12 }}>No pod code</div>
              )}
            </div>
            <div className="join-slot-code" onClick={copyPodCode} style={{ cursor: 'pointer' }}>
              <span>{podShortCode ? `${podShortCode.slice(0, 3)}—${podShortCode.slice(3)}` : '------'}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: DARK.ink3, textAlign: 'center' }}>
              Tap the code to copy
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast show">
          {toast}
        </div>
      )}
    </>
  );
}

export default function GridView2P() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: DARK.ink3 }}>Loading...</div>}>
      <ScreenBg>
        <PageContent />
      </ScreenBg>
    </Suspense>
  );
}
