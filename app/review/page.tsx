// ============================================
// GAME REVIEW — Review questions + Memory Card
// Route: /review
// ============================================
"use client";

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from '../../lib/auth-context';
import { getGame, type GamePlayer } from '@/lib/games';
import { castVote, castBracketCheck, type QuestionKey } from '@/lib/votes';
import { submitReview } from '@/lib/pods';
import { checkPodCompletion, isGameCardLocked } from '@/lib/questionnaire';
import { updateCurrentPage } from '@/lib/game-triggers';
import { getGameCard, previewGameCard, type GameCard, type CommanderCardData } from '@/lib/game-card';

interface PlayerInfo {
  id: string;         // unique selection key: 'seat-${seat}'
  seat: number;
  deckId: string | null;
  userId: string | null;
  name: string;
  short: string;
  art: string;
  isEmptySeat: boolean;
  bracket: number | null;
}

const CATEGORIES = [
  { id: 'brilliance' as QuestionKey, label: 'Brilliance', question: 'Who pulled off the wildest play?', glyph: 'brilliance', color: '#C99B2F', soft: '#F6ECD2' },
  { id: 'flavor' as QuestionKey, label: 'Flavour', question: 'Who took the flavour win?', glyph: 'flavor', color: '#7E4E8A', soft: '#EADDEE' },
  { id: 'rivalry' as QuestionKey, label: 'Rivalry', question: 'Who was the biggest threat?', glyph: 'rivalry', color: '#9E2B2B', soft: '#F1D4CF' },
  { id: 'allegiance' as QuestionKey, label: 'Allegiance', question: 'Who did you team up with?', glyph: 'allegiance', color: '#2F7A74', soft: '#D6E6E3' },
  { id: 'fun' as QuestionKey, label: 'Fun', question: "Who's invited back first?", glyph: 'fun', color: '#E07B4A', soft: '#F9DFCD' },
];

const BADGE_LABELS: Record<string, string> = { brilliance: 'Brilliance', rivalry: 'Rivalry', allegiance: 'Allegiance', fun: 'Fun', flavor: 'Flavour' };

function AuraMark({ size = 22, color = '#2B2118' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="36" r="2.4" fill={color} />
      <defs><clipPath id={`aura-clip-${size}`}><ellipse cx="32" cy="32" rx="22" ry="26" /></clipPath></defs>
      <g clipPath={`url(#aura-clip-${size})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color} />
        <polygon points="40,60 33,4 34,4 56,60" fill={color} />
      </g>
    </svg>
  );
}

function Icon({ name, size = 20, stroke = 'currentColor', width = 1.75 }: { name: string; size?: number; stroke?: string; width?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, React.ReactNode> = {
    sparkles: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v3M20.5 4.5h-3M5 18v3M6.5 19.5h-3"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>,
    swords: <><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M9.5 6.5 21 18v3h-3L6.5 9.5"/><path d="m5 14 6 6"/><path d="m4 13 2-2"/><path d="m7 10-2-2"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    smile: <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
    layers: <><path d="m12.83 2.18-9 4a2 2 0 0 0 0 3.64l9 4a2 2 0 0 0 1.66 0l9-4a2 2 0 0 0 0-3.64l-9-4a2 2 0 0 0-1.66 0z"/><path d="m2 12.5 9.2 4.1a2 2 0 0 0 1.6 0L22 12.5"/><path d="m2 17.5 9.2 4.1a2 2 0 0 0 1.6 0L22 17.5"/></>,
    'chevron-left': <polyline points="15 18 9 12 15 6"/>,
    'chevron-down': <polyline points="6 9 12 15 18 9"/>,
    check: <polyline points="20 6 9 17 4 12"/>,
    'arrow-right': <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    'share-2': <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></>,
    crown: <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>,
    'thumbs-up': <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4-8a2 2 0 0 1 2 2v1.88z"/>,
    'book-open': <><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></>,
    'refresh-cw': <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

function BadgeGlyph({ name, size = 28, stroke: strokeColor = 'currentColor' }: { name: string; size?: number; stroke?: string }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      backgroundColor: strokeColor,
      WebkitMaskImage: `url("/assets/glyphs/${name}.png")`,
      maskImage: `url("/assets/glyphs/${name}.png")`,
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center', maskPosition: 'center',
      WebkitMaskSize: 'contain', maskSize: 'contain',
    }}/>
  );
}

function DoneCard({ idx, cat, answerPlayer, onReopen }: { idx: number; cat: typeof CATEGORIES[0]; answerPlayer: { id: string; name: string; short: string; art: string } | undefined; onReopen: () => void }) {
  return (
    <button onClick={onReopen} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: '#FAF5EA', border: '1px solid rgba(43,33,24,.08)', borderLeft: '4px solid #2F5D3A', borderRadius: 20, padding: '14px 16px 14px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)', fontFamily: "'Instrument Sans', sans-serif" }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#8A7E6F', minWidth: 28 }}>{idx + 1}/6</span>
      <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: '#2B2118' }}>{cat.question}</span>
      {answerPlayer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, overflow: 'hidden', border: '2px solid #FAF5EA', boxShadow: '0 0 0 1px rgba(43,33,24,.08)', background: '#EDE4D0' }}>
            <img src={answerPlayer.art} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}/>
          </div>
          <span style={{ fontSize: 13, color: '#5C5043', fontWeight: 500 }}>{answerPlayer.short}</span>
        </div>
      )}
    </button>
  );
}

function InactiveCard({ idx, question }: { idx: number; question: string }) {
  return (
    <div style={{ background: '#FAF5EA', border: '1px solid rgba(43,33,24,.08)', borderRadius: 20, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)', opacity: 0.72 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#8A7E6F', minWidth: 28 }}>{idx + 1}/6</span>
      <span style={{ flex: 1, fontSize: 15, color: '#8A7E6F', fontWeight: 500 }}>{question}</span>
    </div>
  );
}

function ActiveCard({ idx, cat, selectedId, onSelect, players }: { idx: number; cat: typeof CATEGORIES[0]; selectedId: string | undefined; onSelect: (choice: PlayerInfo | '__skip') => void; players: PlayerInfo[] }) {
  const faded = selectedId != null;
  return (
    <div style={{ background: '#FAF5EA', border: `1.5px solid ${cat.color}`, borderLeft: `6px solid ${cat.color}`, borderRadius: 20, padding: '22px 20px 24px', boxShadow: '0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 999, background: '#EDE4D0', border: `1.5px solid ${cat.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BadgeGlyph name={cat.glyph} size={27} stroke={cat.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: cat.color }}>{cat.label} · {idx + 1}/6</div>
          <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontSize: 26, fontWeight: 400, color: '#2B2118', lineHeight: 1.15, marginTop: 2 }}>{cat.question}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {players.map((p: any) => (
          <button key={p.id} onClick={() => onSelect(p)} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', opacity: faded && selectedId !== p.id ? 0.28 : 1, transition: 'opacity 160ms cubic-bezier(.22,.61,.36,1)' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, overflow: 'hidden', border: '2px solid #FAF5EA', boxShadow: selectedId === p.id ? '0 0 0 3px #B06B2C' : '0 0 0 1px rgba(43,33,24,.08)', background: '#EDE4D0' }}>
                {p.art ? <img src={p.art} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#8A7E6F', background: '#F5EFE2' }}>{`P${p.seat}`}</div>}
              </div>
              {selectedId === p.id && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(176,107,44,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Icon name="check" size={26} width={2.5} />
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2B2118' }}>{p.isEmptySeat ? `P${p.seat}` : p.short}</div>
              <div style={{ fontSize: 10, color: '#8A7E6F' }}>{p.isEmptySeat ? 'Empty seat' : p.name}</div>
            </div>
          </button>
        ))}
        <button onClick={() => onSelect('__skip')} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', opacity: faded && selectedId !== '__skip' ? 0.28 : 1, transition: 'opacity 160ms cubic-bezier(.22,.61,.36,1)' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, border: selectedId === '__skip' ? '2px solid #FAF5EA' : '1.5px dashed rgba(43,33,24,.14)', boxShadow: selectedId === '__skip' ? '0 0 0 3px #B06B2C' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A7E6F', background: '#F5EFE2' }}>
              <Icon name="arrow-right" size={22} />
            </div>
            {selectedId === '__skip' && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(176,107,44,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Icon name="check" size={26} width={2.5} />
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2B2118' }}>Skip</div>
            <div style={{ fontSize: 10, color: '#8A7E6F' }}>No answer</div>
          </div>
        </button>
      </div>
    </div>
  );
}

function BracketActiveCard({ selectedIds, onToggle, onSelectOnBracket, players }: { selectedIds: Set<string>; onToggle: (playerId: string) => void; onSelectOnBracket: () => void; players: PlayerInfo[] }) {
  const isOnBracket = selectedIds.has('on-bracket');
  return (
    <div style={{ background: '#FAF5EA', border: '1.5px solid #8A7E6F', borderLeft: '6px solid #8A7E6F', borderRadius: 20, padding: '22px 20px 24px', boxShadow: '0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 999, background: '#EDE4D0', border: '1.5px solid #8A7E6F', color: '#5C5043', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="book-open" size={26} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C5043' }}>Bracket check · 6/6</div>
          <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontSize: 24, fontWeight: 400, color: '#2B2118', lineHeight: 1.15, marginTop: 2 }}>Did any deck play above its bracket?</div>
        </div>
      </div>

      <button onClick={onSelectOnBracket} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, background: isOnBracket ? '#EDE4D0' : 'transparent', border: 'none', fontFamily: "'Instrument Sans', sans-serif", transition: 'background 120ms' }}>
        <div style={{ width: 36, height: 36, borderRadius: 999, background: isOnBracket ? '#2F5D3A' : '#EDE4D0', color: isOnBracket ? '#F5EFE2' : '#5C5043', border: isOnBracket ? 'none' : '1.5px dashed rgba(43,33,24,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={20} width={2.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2B2118', lineHeight: 1.2 }}>Everyone was on bracket</div>
          <div style={{ fontSize: 11, color: '#8A7E6F', marginTop: 1 }}>Default · no deck outpaced the table</div>
        </div>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 2px' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,.08)' }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#8A7E6F', textTransform: 'uppercase' }}>Or flag decks</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,.08)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {players.map((p: any) => {
          const isFlagged = selectedIds.has(p.id);
          return (
            <button key={p.id} onClick={() => onToggle(p.id)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, background: isFlagged ? '#EDE4D0' : 'transparent', border: 'none', fontFamily: "'Instrument Sans', sans-serif" }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, overflow: 'hidden', border: '2px solid #FAF5EA', boxShadow: isFlagged ? '0 0 0 2px #9E2B2B' : '0 0 0 1px rgba(43,33,24,.08)', background: '#EDE4D0' }}>
                  {p.art ? <img src={p.art} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#8A7E6F', background: '#F5EFE2' }}>{`P${p.seat}`}</div>}
                </div>
                {isFlagged && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(158,43,43,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Icon name="check" size={18} width={2.5} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#2B2118', lineHeight: 1.2 }}>{p.isEmptySeat ? `P${p.seat}` : p.short}</div>
                <div style={{ fontSize: 11, color: '#8A7E6F', marginTop: 1 }}>{p.isEmptySeat ? 'Empty seat' : p.name}</div>
              </div>
              {/* Bracket pip */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 28, height: 20, padding: '0 6px',
                borderRadius: 6,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                fontFamily: "'Instrument Sans', sans-serif",
                ...(p.isEmptySeat
                  ? { background: '#EDE4D0', color: '#B8AD9E', border: '1px dashed rgba(43,33,24,.14)' }
                  : p.bracket == null
                    ? { background: 'rgba(176,107,44,0.08)', color: '#B06B2C', border: '1px dashed rgba(176,107,44,0.35)' }
                    : { background: 'rgba(47,93,58,0.08)', color: '#2F5D3A', border: '1px solid rgba(47,93,58,0.2)' }
                ),
              }}>
                {p.isEmptySeat ? '—' : p.bracket == null ? 'B?' : `B${p.bracket}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// In-memory cache for Scryfall art lookups.
const _keepsakeArtCache = new Map<string, string | null>();
async function fetchKeepsakeArt(name: string): Promise<string | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (_keepsakeArtCache.has(key)) return _keepsakeArtCache.get(key) ?? null;
  try {
    const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
    if (!res.ok) { _keepsakeArtCache.set(key, null); return null; }
    const card = await res.json();
    const art = card?.image_uris?.art_crop || card?.card_faces?.[0]?.image_uris?.art_crop || null;
    _keepsakeArtCache.set(key, art);
    return art;
  } catch { _keepsakeArtCache.set(key, null); return null; }
}

/** Backfill missing art_url from Scryfall for commanders that have none. */
function useCommandersWithArt(input: CommanderCardData[]): CommanderCardData[] {
  const [extraArt, setExtraArt] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const missing = input.filter(c => !c.art_url && c.commander_name && c.commander_name !== `P${c.seat_number ?? '?'}`);
    if (missing.length === 0) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const c of missing) {
        const key = c.commander_name.toLowerCase();
        if (extraArt[key]) continue;
        const art = await fetchKeepsakeArt(c.commander_name);
        if (cancelled) return;
        if (art) updates[key] = art;
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setExtraArt(prev => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
  }, [input.map(c => `${c.commander_name}|${c.art_url ?? ''}`).join(',')]);
  return useMemo(() => input.map(c => {
    if (c.art_url) return c;
    const cached = extraArt[c.commander_name?.toLowerCase() ?? ''];
    return cached ? { ...c, art_url: cached } : c;
  }), [input, extraArt]);
}

function ReviewNarrativeText({ text, commanders }: { text: string; commanders: any[] }) {
  const names = commanders
    .map((c: any) => c.commander_name)
    .filter((n: string) => n && !n.startsWith('P'))
    .sort((a: string, b: string) => b.length - a.length);
  if (names.length === 0) return <span style={{ color: 'rgba(245,239,226,0.7)' }}>{text}</span>;
  const pattern = new RegExp(`(${names.map((n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const parts = text.split(pattern);
  const nameSet = new Set(names);
  return (
    <span style={{ color: 'rgba(245,239,226,0.7)' }}>
      {parts.map((part: string, i: number) =>
        nameSet.has(part) ? (
          <span key={i} style={{ color: '#E2B858', fontWeight: 400 }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function KeepsakeCard({ card }: { card: GameCard }) {
  const rawCommanders = (card.commanders ?? []) as CommanderCardData[];
  const commanders = useCommandersWithArt(rawCommanders);
  const rawDate = card.game_date ?? '';
  const dateStr = (() => {
    try {
      const [y, m, d] = rawDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return rawDate; }
  })();

  return (
    <div style={{ padding: 4, background: 'linear-gradient(135deg, #E2B858 0%, #C99B2F 22%, #8C5A28 50%, #C99B2F 78%, #E2B858 100%)', borderRadius: 24, boxShadow: '0 30px 60px -20px rgba(10,6,4,0.55), 0 12px 24px -8px rgba(43,33,24,0.35), 0 1px 0 rgba(255,255,255,0.35) inset' }}>
      <div style={{ background: '#0A0604', backgroundImage: 'radial-gradient(ellipse at 50% 15%, rgba(201,155,47,0.34), transparent 45%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.6), transparent 50%), linear-gradient(180deg, #140C07 0%, #0A0604 45%, #050302 100%)', borderRadius: 20, padding: '12px 12px 14px', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(201,155,47,0.35), inset 0 0 30px rgba(0,0,0,0.5)' }}>

        {/* Compass rose SVG */}
        <svg width="520" height="520" viewBox="0 0 320 320" style={{
          position: 'absolute', top: '15%', left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.22,
          pointerEvents: 'none',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 90%)',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 90%)',
        }}>
          <g stroke="#E2B858" strokeWidth="0.8" fill="none">
            {Array.from({ length: 24 }).map((_: any, i: any) => {
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

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(201,155,47,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <AuraMark size={16} color="#E2B858" />
            <span style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 15, letterSpacing: '-0.01em', color: '#E2B858', lineHeight: 1 }}>Aura</span>
          </div>
          <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(226,184,88,0.6)' }}>{dateStr}{card.game_time ? ` · ${card.game_time}` : ''}</span>
        </div>

        <div style={{ position: 'relative', marginBottom: 12, textAlign: 'center', fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'rgba(226,184,88,0.85)', textShadow: '0 0 12px rgba(201,155,47,0.45)' }}>
          ✦ &nbsp; Every Game Has a Story &nbsp; ✦
        </div>

        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(201,155,47,0.3)' }}>
          {commanders.map((c: any, i: any) => {
            const badge = c.brewed_badge;
            const isWinner = c.is_winner;
            return (
              <div key={c.deck_id} style={{ position: 'relative', display: 'flex', alignItems: 'stretch', minHeight: 72, background: '#0A0604', overflow: 'hidden', borderBottom: i < commanders.length - 1 ? '1px solid rgba(201,155,47,0.22)' : 'none' }}>
                <div style={{ position: 'relative', width: '55%', flexShrink: 0, overflow: 'hidden' }}>
                  {/* Initial-letter fallback always rendered underneath; image overlays on top when it loads. */}
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a140e', color: '#E2B858', fontSize: 28, fontFamily: "'Young Serif', Georgia, serif" }}>{c.commander_name.charAt(0)}</div>
                  {c.art_url && (
                    <img
                      src={c.art_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: '50% 12%', transform: 'scale(1.15)' }}
                    />
                  )}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 80, background: 'linear-gradient(90deg, transparent 0%, rgba(10,6,4,0.55) 55%, #0A0604 100%)', pointerEvents: 'none' }} />
                  {/* Top-left circle: brewed badge glyph */}
                  {badge && badge !== 'none' && (
                    <div style={{ position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: 999, background: 'rgba(10,6,4,0.72)', border: '1px solid rgba(226,184,88,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ display: 'inline-block', width: 13, height: 13, backgroundColor: '#E2B858', WebkitMaskImage: `url("/assets/glyphs/${badge}.png")`, maskImage: `url("/assets/glyphs/${badge}.png")`, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: 'contain', maskSize: 'contain' }} />
                    </div>
                  )}
                </div>
                {/* Crown on the divider line between image and text */}
                {isWinner && (
                  <div style={{ position: 'absolute', top: '50%', left: '55%', transform: 'translate(-50%, -50%)', zIndex: 2, width: 22, height: 22, borderRadius: 999, background: 'rgba(10,6,4,0.85)', border: '1.5px solid rgba(226,184,88,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="#E2B858" stroke="#E2B858" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0, padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                  <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 500, color: '#F5EFE2', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8 }}>{c.display_name ? c.display_name : (c.archetype !== 'The Unknown' ? c.archetype : 'Player')}</div>
                  <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 15, lineHeight: 1.15, color: '#F5EFE2', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{c.commander_name}</div>
                  {badge && badge !== 'none' && (
                    <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 8, fontWeight: 300, color: 'rgba(245,239,226,0.55)', marginTop: 2 }}>
                      Brewed for <span style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 10, color: '#F5EFE2', marginLeft: 2 }}>{BADGE_LABELS[badge] ?? badge}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {card.narrative && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(201,155,47,0.25)', position: 'relative', textAlign: 'center', fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 13, lineHeight: 1.45, color: '#F5EFE2', padding: '12px 4px 0', textWrap: 'pretty' as any }}>
            <ReviewNarrativeText text={card.narrative} commanders={commanders} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── GuestPromotionOverlay — sign-up gate before Game Card ── */
function GuestPromotionOverlay({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const { promoteGuest, promoteGuestWithGoogle } = useAuth();
  const [view, setView] = useState<'main' | 'email'>('main');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleEmailPromotion = async () => {
    setError('');
    if (!email || !password) { setError('Please fill in all fields'); return; }
    if (email !== confirmEmail) { setError('Emails do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setSubmitting(true);
    const { error: authError } = await promoteGuest(email, password);
    setSubmitting(false);

    if (authError) {
      setError(authError);
    } else {
      setSuccess(true);
      setTimeout(onComplete, 1200);
    }
  };

  const handleGooglePromotion = async () => {
    const { error: authError } = await promoteGuestWithGoogle();
    if (authError) setError(authError);
    // Google SSO redirects — on return, auth state updates and isGuest becomes false
  };

  const fieldStyle = {
    width: '100%',
    background: '#F5EFE2',
    border: '1px solid rgba(43,33,24,0.14)',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 15,
    color: '#2B2118',
    fontFamily: "'Instrument Sans', sans-serif",
    outline: 'none',
  } as const;

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: '#8A7E6F',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(10,6,4,0.78)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      padding: '24px 20px',
      fontFamily: "'Instrument Sans', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: '#FAF5EA',
        borderRadius: 24,
        padding: '28px 24px 24px',
        boxShadow: '0 30px 60px -20px rgba(10,6,4,0.55), 0 12px 24px -8px rgba(43,33,24,0.35)',
        position: 'relative',
      }}>
        {/* Close / skip button */}
        <button onClick={onSkip} aria-label="Skip" style={{
          position: 'absolute', top: 14, right: 14,
          width: 30, height: 30, borderRadius: 999,
          border: '1px solid rgba(43,33,24,0.08)',
          background: '#EDE4D0', color: '#5C5043', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, lineHeight: 1,
        }}>
          <Icon name="chevron-down" size={15} />
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: '#2F5D3A', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={24} stroke="#F5EFE2" width={2.5} />
            </div>
            <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontSize: 24, color: '#2B2118', marginBottom: 6 }}>You&apos;re in</div>
            <div style={{ fontSize: 13, color: '#5C5043' }}>Your game history is saved. Loading your Game Card...</div>
          </div>
        ) : view === 'main' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <AuraMark size={24} color="#B06B2C" />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B06B2C', marginBottom: 6 }}>Your Game Card awaits</div>
              <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontSize: 26, color: '#2B2118', lineHeight: 1.05 }}>Keep your story</div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#5C5043', lineHeight: 1.4 }}>Sign up to save your Game Card, badges, and Aura score forever.</div>
            </div>

            {/* Google SSO */}
            <button onClick={handleGooglePromotion} style={{
              width: '100%', cursor: 'pointer',
              background: '#F5EFE2', color: '#2B2118',
              border: '1px solid rgba(43,33,24,0.14)',
              borderRadius: 20, padding: '13px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 15, fontWeight: 600,
              fontFamily: "'Instrument Sans', sans-serif",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,0.14)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8A7E6F', letterSpacing: '0.18em', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,0.14)' }} />
            </div>

            {/* Email sign-up button */}
            <button onClick={() => setView('email')} style={{
              width: '100%', cursor: 'pointer',
              background: '#2F5D3A', color: '#F5EFE2',
              border: 'none', borderRadius: 20, padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
              fontFamily: "'Instrument Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              Sign up with email
            </button>

            {/* Skip link */}
            <button onClick={onSkip} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#8A7E6F', fontSize: 13, fontWeight: 500,
              fontFamily: "'Instrument Sans', sans-serif",
              padding: '6px 0', textAlign: 'center', width: '100%',
            }}>
              Skip for now — view card as guest
            </button>
          </div>
        ) : (
          /* Email sign-up form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <AuraMark size={24} color="#B06B2C" />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B06B2C', marginBottom: 6 }}>New player</div>
              <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontSize: 26, color: '#2B2118', lineHeight: 1.05 }}>Create account</div>
            </div>

            {error && (
              <div style={{ background: 'rgba(158,43,43,0.08)', border: '1px solid rgba(158,43,43,0.2)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#9E2B2B', textAlign: 'center' }}>{error}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={labelStyle}>Email</span>
                <input type="email" placeholder="you@table.cards" value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={labelStyle}>Confirm email</span>
                <input type="email" placeholder="you@table.cards" value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} style={fieldStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={labelStyle}>Password</span>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={fieldStyle} />
              </label>
            </div>

            <button onClick={handleEmailPromotion} disabled={submitting} style={{
              background: submitting ? '#8A7E6F' : '#2F5D3A', color: '#F5EFE2',
              border: 'none', borderRadius: 20, padding: '14px 18px',
              cursor: submitting ? 'default' : 'pointer',
              fontSize: 15, fontWeight: 600, marginTop: 4,
              boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
              fontFamily: "'Instrument Sans', sans-serif",
            }}>{submitting ? 'Creating...' : 'Create account'}</button>

            <button onClick={() => { setView('main'); setError(''); }} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#5C5043', fontSize: 13, fontWeight: 600,
              fontFamily: "'Instrument Sans', sans-serif",
              padding: '4px 0', textAlign: 'center',
            }}>Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MemoryCardOverlay({ onClose, onViewProfile, card, gameId, onRefreshed }: { onClose: () => void; onViewProfile: () => void; card: GameCard | null; gameId: string; onRefreshed?: (card: GameCard) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [locked, setLocked] = useState(false);

  // Check if the game card is locked (all reviews completed)
  useEffect(() => {
    if (!gameId) return;
    isGameCardLocked(gameId).then(setLocked);
  }, [gameId, card]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const { downloadCard } = await import('@/lib/share-card');
    await downloadCard(cardRef.current, 'aura-game-card');
  };
  const handleShare = async () => {
    if (!cardRef.current) return;
    const { shareCard } = await import('@/lib/share-card');
    await shareCard(cardRef.current);
  };
  const handleRefresh = async () => {
    if (!gameId || refreshing) return;
    setRefreshing(true);
    try {
      const fresh = await previewGameCard(gameId);
      if (fresh) onRefreshed?.(fresh);
      // Re-check lock status after refresh
      const isLocked = await isGameCardLocked(gameId);
      setLocked(isLocked);
    } catch { /* ignore */ }
    setRefreshing(false);
  };

  const btnStyle: React.CSSProperties = { width: 44, height: 44, borderRadius: 999, border: '1px solid rgba(201,155,47,0.55)', background: 'linear-gradient(180deg, #140C07 0%, #0A0604 100%)', color: '#E2B858', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px -4px rgba(10,6,4,0.45)' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,6,4,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 20px', fontFamily: "'Instrument Sans', sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%', maxWidth: 430 }}>
        <div ref={cardRef}>
          {card ? <KeepsakeCard card={card} /> : (
            <div style={{ color: '#E2B858', fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, textAlign: 'center', padding: 40 }}>Loading your Game Card...</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <button onClick={handleDownload} style={btnStyle}>
            <Icon name="download" size={16} />
          </button>
          <button onClick={handleShare} style={btnStyle}>
            <Icon name="share-2" size={16} />
          </button>
          {!locked && (
            <button onClick={handleRefresh} disabled={refreshing} style={{ ...btnStyle, opacity: refreshing ? 0.5 : 1, cursor: refreshing ? 'not-allowed' : 'pointer', transition: 'opacity 160ms ease, transform 320ms ease', transform: refreshing ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <Icon name="refresh-cw" size={16} />
            </button>
          )}
        </div>
        {locked && (
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(226,184,88,0.5)' }}>All reviews in · Card locked</div>
        )}
        <button onClick={e => { e.stopPropagation(); onClose(); onViewProfile(); }} style={{ width: '100%', border: 'none', background: '#2F5D3A', color: '#F5EFE2', fontFamily: "'Instrument Sans', sans-serif", fontWeight: 600, fontSize: 16, padding: '16px 20px', borderRadius: 20, boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)', cursor: 'pointer' }}>View Profile</button>
      </div>
    </div>
  );
}

function PageContent() {
  const { isGuest, isLoggedIn, user: authUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId') ?? '';
  const podId = searchParams.get('podId') ?? '';

  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [bracketAnswers, setBracketAnswers] = useState<Set<string>>(new Set());
  const [showMemory, setShowMemory] = useState(false);
  const [showPromotion, setShowPromotion] = useState(false);
  const [gameCard, setGameCard] = useState<GameCard | null>(null);
  const [podSize, setPodSize] = useState<number>(2);
  const activeCardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const doneCardRef = useRef<HTMLDivElement>(null);

  // ── Track current_page in DB so revive flow knows this player is on review ──
  useEffect(() => {
    if (!gameId || !authUser?.id) return;
    updateCurrentPage(gameId, authUser.id, 'review');
    return () => { updateCurrentPage(gameId, authUser.id, null); };
  }, [gameId, authUser?.id]);

  // Load game players on mount
  useEffect(() => {
    if (!gameId) { setPageError('No game specified'); setLoading(false); return; }
    async function load() {
      const { data: game, error: err } = await getGame(gameId);
      if (err || !game) { setPageError(err ?? 'Game not found'); setLoading(false); return; }
      setPodSize((game as any).pod_size ?? 2);
      // Build player list from game_players + deck info
      const supabase = (await import('@/lib/supabase')).supabase;
      const deckIds = game.players.map((p: any) => p.deck_id).filter(Boolean);
      let deckMap = new Map();
      if (deckIds.length > 0) {
        const { data: decks } = await supabase
          .from('decks')
          .select('id, commander_name, commander_art_url, bracket')
          .in('id', deckIds) as { data: any };
        deckMap = new Map((decks ?? []).map((d: any) => [d.id, d]) as any);
      }

      // Get the current user's id so we can exclude self from the choices
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const myUserId = currentUser?.id ?? null;

      // If this player already submitted their review, skip straight to game card
      if (myUserId && podId) {
        const { data: myMembership } = await supabase
          .from('pod_members')
          .select('review_submitted_at')
          .eq('pod_id', podId)
          .eq('user_id', myUserId)
          .maybeSingle();
        if (myMembership?.review_submitted_at) {
          // Already reviewed — show game card directly
          try {
            const card = await previewGameCard(gameId);
            setGameCard(card);
          } catch { /* card may not exist yet */ }
          setLoading(false);
          setShowMemory(true);
          return;
        }
      }

      const loaded: PlayerInfo[] = game.players
        .map((gp: any): PlayerInfo => {
          const seat = gp.seat_number ?? 0;
          const deck: any = gp.deck_id ? deckMap.get(gp.deck_id) : null;
          const isEmptySeat = !gp.user_id && !gp.deck_id && !gp.commander_name;
          const commanderName: string | null = deck?.commander_name ?? gp.commander_name ?? null;
          return {
            id: `seat-${seat}`,
            seat,
            deckId: gp.deck_id ?? null,
            userId: gp.user_id ?? null,
            name: commanderName ?? `P${seat}`,
            short: commanderName ? commanderName.split(',')[0] : `P${seat}`,
            art: deck?.commander_art_url ?? '',
            isEmptySeat,
            bracket: deck?.bracket ?? null,
          };
        })
        .filter((pl) => !myUserId || pl.userId !== myUserId)
        .sort((a, b) => a.seat - b.seat);
      setPlayers(loaded);
      setLoading(false);

      // Backfill missing commander art from Scryfall (same source the gridview uses).
      const missing = loaded.filter(p => !p.art && p.name && !p.isEmptySeat);
      if (missing.length > 0) {
        const artUpdates: Record<string, string> = {};
        for (const p of missing) {
          try {
            const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(p.name)}`);
            if (!res.ok) continue;
            const card = await res.json();
            const artUrl = card?.image_uris?.art_crop || card?.card_faces?.[0]?.image_uris?.art_crop;
            if (artUrl) artUpdates[p.id] = artUrl;
          } catch { /* skip */ }
        }
        if (Object.keys(artUpdates).length > 0) {
          setPlayers(prev => prev.map(p => artUpdates[p.id] ? { ...p, art: artUpdates[p.id] } : p));
        }
      }
    }
    load();
  }, [gameId]);

  useEffect(() => {
    if (activeCardRef.current) {
      setTimeout(() => {
        activeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 220);
    }
  }, [activeIdx]);

  const allAnswered = CATEGORIES.every(c => answers[c.id] != null) && (bracketAnswers.size > 0);

  useEffect(() => {
    if (allAnswered && doneCardRef.current) {
      setTimeout(() => {
        doneCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [allAnswered]);

  // Poll Supabase for the Game Card once the memory overlay opens.
  // Card is created asynchronously by the orchestration pipeline so may not
  // exist immediately. Retry every 600ms for up to ~12 seconds.
  useEffect(() => {
    if (!showMemory || gameCard || !gameId) return;
    let cancelled = false;
    let tries = 0;
    const poll = async () => {
      while (!cancelled && tries < 20) {
        try {
          // Try persisted card first; fall back to live preview so the user
          // sees the card take shape even before orchestration finishes
          const card = await previewGameCard(gameId);
          if (card) {
            if (!cancelled) setGameCard(card);
            return;
          }
        } catch { /* ignore and retry */ }
        tries++;
        await new Promise(r => setTimeout(r, 600));
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [showMemory, gameCard, gameId]);

  const selectAnswer = (catId: string, choice: PlayerInfo | '__skip') => {
    const selectionId = choice === '__skip' ? '__skip' : choice.id;
    setAnswers(a => ({ ...a, [catId]: selectionId }));

    // Fire vote to backend. Skip and empty-seat selections don't go to Supabase.
    if (choice !== '__skip' && choice.deckId && gameId) {
      castVote(gameId, catId as QuestionKey, choice.deckId).catch(() => {});
    }

    setTimeout(() => {
      const nextIdx = CATEGORIES.findIndex((c, i) => i > activeIdx && !answers[c.id] && c.id !== catId);
      if (nextIdx >= 0) setActiveIdx(nextIdx);
      else if (bracketAnswers.size === 0 && !answers.bracket) setActiveIdx(5);
    }, 180);
  };

  // Fire bracket check vote to backend with current flagged deck IDs
  const fireBracketVote = (nextAnswers: Set<string>) => {
    if (!gameId) return;
    if (nextAnswers.has('on-bracket') || nextAnswers.size === 0) {
      castBracketCheck(gameId, []).catch(() => {});
    } else {
      const flaggedDeckIds = players
        .filter(pl => nextAnswers.has(pl.id) && pl.deckId)
        .map(pl => pl.deckId!);
      castBracketCheck(gameId, flaggedDeckIds).catch(() => {});
    }
  };

  const handleBracketTogglePlayer = (playerId: string) => {
    setBracketAnswers(prev => {
      const next = new Set(prev);
      // Remove "on-bracket" if user is flagging a player
      next.delete('on-bracket');
      // Toggle this player
      if (next.has(playerId)) {
        next.delete(playerId);
      } else {
        next.add(playerId);
      }
      fireBracketVote(next);
      return next;
    });
  };

  const handleBracketOnBracket = () => {
    const next = new Set(['on-bracket']);
    setBracketAnswers(next);
    fireBracketVote(next);
  };

  const handleAcceptReview = async () => {
    if (!podId) return;
    setSubmitting(true);
    const { error: submitErr } = await submitReview(podId);
    if (submitErr) { setPageError(submitErr); setSubmitting(false); return; }

    // Trigger the orchestration pipeline (badges → AURA → nudges → Game Card).
    // checkPodCompletion fires onGameCompleted(gameId) when all reviews are in,
    // which creates the Game Card in Supabase.
    if (gameId) {
      try { await checkPodCompletion(podId, gameId); } catch { /* keep going */ }
    }
    setSubmitting(false);

    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (!isLoggedIn) {
      setShowPromotion(true);
    } else {
      setShowMemory(true);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: 430, height: '100dvh', margin: '0 auto', position: 'relative', display: 'flex', flexDirection: 'column', background: '#F5EFE2', backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(201,155,47,0.04), transparent 40%), radial-gradient(circle at 90% 80%, rgba(47,93,58,0.05), transparent 40%)', fontFamily: "'Instrument Sans', sans-serif", color: '#2B2118', overflow: 'hidden' }}>

      <div style={{ flexShrink: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#F5EFE2', borderBottom: '1px solid rgba(43,33,24,.08)' }}>
        <button onClick={() => router.push(`/gridview-${podSize}p?podId=${podId}&gameId=${gameId}`)} style={{ width: 40, height: 40, borderRadius: 999, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2B2118', cursor: 'pointer' }}>
          <Icon name="chevron-left" size={24} />
        </button>
        <h1 style={{ margin: 0, fontFamily: "'Instrument Sans', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em', color: '#2B2118', flex: 1 }}>Review Game</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.75 }}>
          <AuraMark size={20} />
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8A7E6F' }}>Loading game data...</div>
        ) : pageError ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#B0593E' }}>{pageError}</div>
        ) : (
        <>
        {CATEGORIES.map((cat, idx) => {
          const ans = answers[cat.id];
          const isActive = idx === activeIdx;
          if (ans != null && !isActive) {
            const player = players.find(p => p.id === ans);
            return <DoneCard key={cat.id} idx={idx} cat={cat} answerPlayer={player ? { id: player.id, name: player.name, short: player.short, art: player.art } : undefined} onReopen={() => setActiveIdx(idx)} />;
          }
          if (isActive) {
            return (
              <div key={cat.id} ref={activeCardRef} style={{ margin: '10px 0' }}>
                <ActiveCard idx={idx} cat={cat} selectedId={answers[cat.id]} onSelect={choice => selectAnswer(cat.id, choice)} players={players} />
              </div>
            );
          }
          return <InactiveCard key={cat.id} idx={idx} question={cat.question} />;
        })}

        {activeIdx === 5 ? (
          <div ref={activeCardRef} style={{ margin: '10px 0' }}>
            <BracketActiveCard selectedIds={bracketAnswers} onToggle={handleBracketTogglePlayer} onSelectOnBracket={handleBracketOnBracket} players={players} />
          </div>
        ) : bracketAnswers.size > 0 ? (
          <button onClick={() => setActiveIdx(5)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: '#FAF5EA', border: '1px solid rgba(43,33,24,.08)', borderLeft: '4px solid #2F5D3A', borderRadius: 20, padding: '14px 16px 14px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)', fontFamily: "'Instrument Sans', sans-serif" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#8A7E6F', minWidth: 28 }}>6/6</span>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: '#2B2118' }}>Did any deck play above its bracket?</span>
            {bracketAnswers.has('on-bracket') ? (
              <span style={{ fontSize: 13, color: '#5C5043', fontWeight: 500 }}>On bracket</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {players.filter(p => bracketAnswers.has(p.id)).map(pl => (
                  <div key={pl.id} style={{ width: 26, height: 26, borderRadius: 999, overflow: 'hidden', border: '2px solid #FAF5EA', boxShadow: '0 0 0 1px rgba(158,43,43,.25)', background: '#EDE4D0' }}>
                    {pl.art ? <img src={pl.art} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#8A7E6F' }}>{`P${pl.seat}`}</div>}
                  </div>
                ))}
              </div>
            )}
          </button>
        ) : (
          <InactiveCard idx={5} question="Did any deck play above its bracket?" />
        )}

        {allAnswered && (
          <div ref={doneCardRef} style={{ margin: '10px 0' }}>
            <div style={{ background: '#E8F0E8', border: '1px solid rgba(47,93,58,0.2)', borderRadius: 20, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 999, background: '#2F5D3A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="check" size={18} stroke="#F5EFE2" />
              </div>
              <div>
                <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontWeight: 700, fontSize: 16, color: '#2B2118' }}>Review complete</div>
                <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontWeight: 400, fontSize: 13, color: '#5C5043', marginTop: 1 }}>Here&apos;s your feedback</div>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 16px 32px', background: 'linear-gradient(to top, #F5EFE2 60%, rgba(245,239,226,0))', pointerEvents: 'none', zIndex: 5 }}>
        <button disabled={!allAnswered || submitting} onClick={handleAcceptReview} style={{ pointerEvents: 'auto', width: '100%', border: 'none', background: '#B06B2C', color: '#F5EFE2', fontFamily: "'Instrument Sans', sans-serif", fontWeight: 600, fontSize: 16, padding: '16px 20px', borderRadius: 20, boxShadow: allAnswered ? '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)' : 'none', opacity: allAnswered && !submitting ? 1 : 0.4, cursor: allAnswered && !submitting ? 'pointer' : 'not-allowed', transition: 'opacity 160ms cubic-bezier(.22,.61,.36,1)' }}>{submitting ? 'Submitting...' : 'Accept Review'}</button>
      </div>

      {showPromotion && (
        <GuestPromotionOverlay
          onComplete={() => {
            setShowPromotion(false);
            setShowMemory(true);
          }}
          onSkip={() => {
            setShowPromotion(false);
            setShowMemory(true);
          }}
        />
      )}

      {showMemory && <MemoryCardOverlay card={gameCard} gameId={gameId} onClose={() => setShowMemory(false)} onViewProfile={() => router.push('/profile')} onRefreshed={(c) => setGameCard(c)} />}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
