// ============================================
// GAME REVIEW — Review questions + Memory Card
// Route: /review
// ============================================
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from '../../lib/auth-context';
import { getGame, type GamePlayer } from '@/lib/games';
import { castVote, castBracketCheck, type QuestionKey } from '@/lib/votes';
import { submitReview } from '@/lib/pods';
import { getGameCard, type GameCard, type CommanderCardData } from '@/lib/game-card';

interface PlayerInfo {
  id: string;      // user_id
  deckId: string;   // deck_id
  name: string;     // display name (commander for now)
  short: string;    // commander name
  art: string;      // commander art URL
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

function ActiveCard({ idx, cat, selectedId, onSelect, players }: { idx: number; cat: typeof CATEGORIES[0]; selectedId: string | undefined; onSelect: (id: string) => void; players: PlayerInfo[] }) {
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
        {players.map(p => (
          <button key={p.deckId} onClick={() => onSelect(p.deckId)} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', opacity: faded && selectedId !== p.deckId ? 0.28 : 1, transition: 'opacity 160ms cubic-bezier(.22,.61,.36,1)' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 56, height: 56, borderRadius: 999, overflow: 'hidden', border: '2px solid #FAF5EA', boxShadow: selectedId === p.deckId ? '0 0 0 3px #B06B2C' : '0 0 0 1px rgba(43,33,24,.08)', background: '#EDE4D0' }}>
                {p.art ? <img src={p.art} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{p.short.charAt(0)}</div>}
              </div>
              {selectedId === p.deckId && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(176,107,44,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Icon name="check" size={26} width={2.5} />
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#2B2118' }}>{p.name}</div>
              <div style={{ fontSize: 10, color: '#8A7E6F' }}>{p.short}</div>
            </div>
          </button>
        ))}
        <button onClick={() => onSelect('__skip')} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', opacity: faded && selectedId !== '__skip' ? 0.28 : 1 }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, border: '1.5px dashed rgba(43,33,24,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A7E6F', background: '#F5EFE2' }}>
            <Icon name="arrow-right" size={22} />
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

function BracketActiveCard({ selected, onSelect, players }: { selected: string | null; onSelect: (val: string) => void; players: PlayerInfo[] }) {
  return (
    <div style={{ background: '#FAF5EA', border: '1.5px solid #8A7E6F', borderLeft: '6px solid #8A7E6F', borderRadius: 20, padding: '22px 20px 24px', boxShadow: '0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 999, background: '#EDE4D0', border: '1.5px solid #8A7E6F', color: '#5C5043', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="layers" size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5C5043' }}>Bracket check · 6/6</div>
          <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontSize: 24, fontWeight: 400, color: '#2B2118', lineHeight: 1.15, marginTop: 2 }}>Did any deck play above its bracket?</div>
        </div>
      </div>

      <button onClick={() => onSelect('on-bracket')} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, background: selected === 'on-bracket' ? '#EDE4D0' : 'transparent', border: 'none', fontFamily: "'Instrument Sans', sans-serif", transition: 'background 120ms' }}>
        <div style={{ width: 36, height: 36, borderRadius: 999, background: selected === 'on-bracket' ? '#2F5D3A' : '#EDE4D0', color: selected === 'on-bracket' ? '#F5EFE2' : '#5C5043', border: selected === 'on-bracket' ? 'none' : '1.5px dashed rgba(43,33,24,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={20} width={2.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2B2118', lineHeight: 1.2 }}>Everyone was on bracket</div>
          <div style={{ fontSize: 11, color: '#8A7E6F', marginTop: 1 }}>Default · no deck outpaced the table</div>
        </div>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 2px' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,.08)' }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: '#8A7E6F', textTransform: 'uppercase' }}>Or flag a deck</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(43,33,24,.08)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {players.map(p => (
          <button key={p.id} onClick={() => onSelect(p.deckId)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, background: selected === p.deckId ? '#EDE4D0' : 'transparent', border: 'none', fontFamily: "'Instrument Sans', sans-serif" }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, overflow: 'hidden', border: '2px solid #FAF5EA', boxShadow: selected === p.deckId ? '0 0 0 2px #9E2B2B' : '0 0 0 1px rgba(43,33,24,.08)', background: '#EDE4D0' }}>
                {p.art ? <img src={p.art} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{p.short.charAt(0)}</div>}
              </div>
              {selected === p.deckId && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(158,43,43,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Icon name="check" size={18} width={2.5} />
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#2B2118', lineHeight: 1.2 }}>{p.short}</div>
              <div style={{ fontSize: 11, color: '#8A7E6F', marginTop: 1 }}>{p.name}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


function KeepsakeCard({ card }: { card: GameCard }) {
  const commanders = (card.commanders ?? []) as CommanderCardData[];
  const dateStr = card.game_date ?? '';

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

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(201,155,47,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <AuraMark size={16} color="#E2B858" />
            <span style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 15, letterSpacing: '-0.01em', color: '#E2B858', lineHeight: 1 }}>Aura</span>
          </div>
          <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(226,184,88,0.6)' }}>{dateStr}</span>
        </div>

        <div style={{ position: 'relative', marginBottom: 12, textAlign: 'center', fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'rgba(226,184,88,0.85)', textShadow: '0 0 12px rgba(201,155,47,0.45)' }}>
          ✦ &nbsp; Every Game Has a Story &nbsp; ✦
        </div>

        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(201,155,47,0.3)' }}>
          {commanders.map((c, i) => {
            const badge = c.brewed_badge;
            const isWinner = c.is_winner;
            return (
              <div key={c.deck_id} style={{ position: 'relative', display: 'flex', alignItems: 'stretch', height: 72, background: '#0A0604', overflow: 'hidden', borderBottom: i < commanders.length - 1 ? '1px solid rgba(201,155,47,0.22)' : 'none' }}>
                <div style={{ position: 'relative', width: '65%', flexShrink: 0, overflow: 'hidden' }}>
                  {c.art_url ? (
                    <img src={c.art_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: '50% 12%', transform: 'scale(1.15)' }}/>
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a140e', color: '#E2B858', fontSize: 28, fontFamily: "'Young Serif', Georgia, serif" }}>{c.commander_name.charAt(0)}</div>
                  )}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 80, background: 'linear-gradient(90deg, transparent 0%, rgba(10,6,4,0.55) 55%, #0A0604 100%)', pointerEvents: 'none' }} />
                  {isWinner && (
                    <div style={{ position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: 999, background: 'rgba(10,6,4,0.72)', border: '1px solid rgba(226,184,88,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E2B858' }}>
                      <Icon name="crown" size={12} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
                  <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 500, color: '#F5EFE2', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.8 }}>{c.archetype}</div>
                  <div style={{ fontFamily: "'Young Serif', Georgia, serif", fontWeight: 400, fontSize: 15, lineHeight: 1.15, color: '#F5EFE2' }}>{c.commander_name}</div>
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
            <span style={{ color: 'rgba(245,239,226,0.7)' }}>{card.narrative}</span>
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

function MemoryCardOverlay({ onClose, card }: { onClose: () => void; card: GameCard | null }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,6,4,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 20px', fontFamily: "'Instrument Sans', sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%', maxWidth: 430 }}>
        {card ? <KeepsakeCard card={card} /> : (
          <div style={{ color: '#E2B858', fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, textAlign: 'center', padding: 40 }}>Loading your Game Card...</div>
        )}
        <div style={{ display: 'flex', gap: 14 }}>
          <button style={{ width: 44, height: 44, borderRadius: 999, border: '1px solid rgba(201,155,47,0.55)', background: 'linear-gradient(180deg, #140C07 0%, #0A0604 100%)', color: '#E2B858', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px -4px rgba(10,6,4,0.45)' }}>
            <Icon name="download" size={16} />
          </button>
          <button style={{ width: 44, height: 44, borderRadius: 999, border: '1px solid rgba(201,155,47,0.55)', background: 'linear-gradient(180deg, #140C07 0%, #0A0604 100%)', color: '#E2B858', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px -4px rgba(10,6,4,0.45)' }}>
            <Icon name="share-2" size={16} />
          </button>
        </div>
        <button onClick={e => { e.stopPropagation(); onClose(); }} style={{ width: '100%', border: 'none', background: '#2F5D3A', color: '#F5EFE2', fontFamily: "'Instrument Sans', sans-serif", fontWeight: 600, fontSize: 16, padding: '16px 20px', borderRadius: 20, boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)', cursor: 'pointer' }}>View Profile</button>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { isGuest, isLoggedIn } = useAuth();
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
  const [bracketAnswer, setBracketAnswer] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [showPromotion, setShowPromotion] = useState(false);
  const [gameCard, setGameCard] = useState<GameCard | null>(null);
  const activeCardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const doneCardRef = useRef<HTMLDivElement>(null);

  // Load game players on mount
  useEffect(() => {
    if (!gameId) { setPageError('No game specified'); setLoading(false); return; }
    async function load() {
      const { data: game, error: err } = await getGame(gameId);
      if (err || !game) { setPageError(err ?? 'Game not found'); setLoading(false); return; }
      // Build player list from game_players + deck info
      // We need deck info — game_players has deck_id but we need commander name/art
      // For now, use deck_id as identifier; the game query joined decks
      const supabase = (await import('@/lib/supabase')).supabase;
      const deckIds = game.players.map(p => p.deck_id);
      const { data: decks } = await supabase
        .from('decks')
        .select('id, commander_name, commander_art_url')
        .in('id', deckIds) as { data: any };
      const deckMap = new Map((decks ?? []).map((d: any) => [d.id, d]));

      const loaded: PlayerInfo[] = game.players.map(p => {
        const deck: any = deckMap.get(p.deck_id);
        return {
          id: p.user_id,
          deckId: p.deck_id,
          name: deck?.commander_name ?? 'Unknown',
          short: deck?.commander_name ?? 'Unknown',
          art: deck?.commander_art_url ?? '',
        };
      });
      setPlayers(loaded);
      setLoading(false);
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

  const allAnswered = CATEGORIES.every(c => answers[c.id] != null) && (bracketAnswer != null);

  useEffect(() => {
    if (allAnswered && doneCardRef.current) {
      setTimeout(() => {
        doneCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [allAnswered]);

  const selectAnswer = (catId: string, playerId: string) => {
    setAnswers(a => ({ ...a, [catId]: playerId }));

    // Fire vote to backend (fire-and-forget for snappy UX)
    if (playerId !== '__skip' && gameId) {
      // playerId here is actually deckId for real players
      castVote(gameId, catId as QuestionKey, playerId).catch(() => {});
    }

    setTimeout(() => {
      const nextIdx = CATEGORIES.findIndex((c, i) => i > activeIdx && !answers[c.id] && c.id !== catId);
      if (nextIdx >= 0) setActiveIdx(nextIdx);
      else if (!bracketAnswer && !answers.bracket) setActiveIdx(5);
    }, 180);
  };

  const handleBracketSelect = (val: string) => {
    setBracketAnswer(val);
    // Fire bracket check vote
    if (gameId) {
      if (val === 'on-bracket') {
        castBracketCheck(gameId, []).catch(() => {});
      } else {
        // val is a deckId
        castBracketCheck(gameId, [val]).catch(() => {});
      }
    }
  };

  const handleAcceptReview = async () => {
    if (!podId) return;
    setSubmitting(true);
    const { allDone, error: submitErr } = await submitReview(podId);
    setSubmitting(false);
    if (submitErr) { setPageError(submitErr); return; }

    // Load the Game Card (created by the orchestration pipeline after all reviews are in)
    if (gameId) {
      getGameCard(gameId).then(card => { if (card) setGameCard(card); }).catch(() => {});
    }

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
        <button style={{ width: 40, height: 40, borderRadius: 999, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2B2118', cursor: 'pointer' }}>
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
            const player = players.find(p => p.deckId === ans);
            return <DoneCard key={cat.id} idx={idx} cat={cat} answerPlayer={player ? { id: player.id, name: player.name, short: player.short, art: player.art } : undefined} onReopen={() => setActiveIdx(idx)} />;
          }
          if (isActive) {
            return (
              <div key={cat.id} ref={activeCardRef} style={{ margin: '10px 0' }}>
                <ActiveCard idx={idx} cat={cat} selectedId={answers[cat.id]} onSelect={deckId => selectAnswer(cat.id, deckId)} players={players} />
              </div>
            );
          }
          return <InactiveCard key={cat.id} idx={idx} question={cat.question} />;
        })}

        {activeIdx === 5 ? (
          <div ref={activeCardRef} style={{ margin: '10px 0' }}>
            <BracketActiveCard selected={bracketAnswer} onSelect={handleBracketSelect} players={players} />
          </div>
        ) : bracketAnswer != null ? (
          <button onClick={() => setActiveIdx(5)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: '#FAF5EA', border: '1px solid rgba(43,33,24,.08)', borderLeft: '4px solid #2F5D3A', borderRadius: 20, padding: '14px 16px 14px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)', fontFamily: "'Instrument Sans', sans-serif" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#8A7E6F', minWidth: 28 }}>6/6</span>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: '#2B2118' }}>Did any deck play above its bracket?</span>
            {bracketAnswer === 'on-bracket' ? (
              <span style={{ fontSize: 13, color: '#5C5043', fontWeight: 500 }}>On bracket</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {(() => { const pl = players.find(p => p.deckId === bracketAnswer); return pl ? (
                  <>
                    <div style={{ width: 26, height: 26, borderRadius: 999, overflow: 'hidden', border: '2px solid #FAF5EA', boxShadow: '0 0 0 1px rgba(43,33,24,.08)', background: '#EDE4D0' }}>
                      {pl.art ? <img src={pl.art} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}/> : null}
                    </div>
                    <span style={{ fontSize: 13, color: '#5C5043', fontWeight: 500 }}>{pl.short}</span>
                  </>
                ) : null; })()}
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

      {showMemory && <MemoryCardOverlay card={gameCard} onClose={() => setShowMemory(false)} />}
    </div>
  );
}
