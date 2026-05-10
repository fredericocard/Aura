'use client';

import React, { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getGame } from '@/lib/games';
import { updateLifeTotal, updatePoisonCounters, updateExperienceCounters, updateEnergyCounters, concedeGame, updateLifeBySeat, updatePoisonBySeat, updateExperienceBySeat, updateEnergyBySeat, updateCommanderDamage, updateCommanderDamageBySeat } from '@/lib/game-triggers';
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
  forest:    '#B06B2C',
  forestDeep:'#8C5422',
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
    shield:   <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    close:    <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    skull:    <><path d="M8 21h8v-3a4 4 0 0 0 4-4v-2a8 8 0 1 0-16 0v2a4 4 0 0 0 4 4v3z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><path d="M11 17h2"/></>,
    bolt:     <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    star:     <polygon points="12 2 15.1 8.6 22 9.6 17 14.5 18.2 21.5 12 18.2 5.8 21.5 7 14.5 2 9.6 8.9 8.6 12 2"/>,
    'plus-circle': <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
    coin:     <><circle cx="12" cy="12" r="9"/><path d="M9 9h4a2 2 0 0 1 0 4H9V9zm0 4v3"/></>,
    shuffle:  <><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></>,
    arrow:    <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    rotate:   <><polyline points="8 9 12 5 16 9"/><polyline points="8 15 12 19 16 15"/><line x1="5" y1="12" x2="19" y2="12"/></>,
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

function DarkCompassBg({ centered = false }: { centered?: boolean } = {}) {
  const color = centered ? '#B06B2C' : DARK.copper;
  return (
    <svg viewBox="0 0 320 320" style={{
      position: 'absolute',
      top: centered ? '8%' : '22%',
      left: 0, right: 0,
      marginLeft: 'auto', marginRight: 'auto',
      transform: 'translateY(-50%)',
      width: centered ? 'min(85vw, 360px)' : '520px',
      height: centered ? 'min(85vw, 360px)' : '520px',
      opacity: centered ? 0.28 : 0.18,
      pointerEvents: 'none',
      zIndex: 0,
      ...(centered ? {} : {
        WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.15) 75%, rgba(0,0,0,0) 95%)',
        maskImage: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.15) 75%, rgba(0,0,0,0) 95%)',
      }),
    } as React.CSSProperties}>
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

function CmdrDamageRing({ damages = [], radius = 20, strokeWidth = 3, insetOverlap = 0 }: {
  damages?: { from: string; amount: number; colorIndex: number }[];
  radius?: number;
  strokeWidth?: number;
  insetOverlap?: number;
}) {
  if (!damages.length) return null;
  let cursor = 0;
  return (
    <svg style={{
      position: 'absolute', inset: -insetOverlap,
      width: `calc(100% + ${insetOverlap * 2}px)`,
      height: `calc(100% + ${insetOverlap * 2}px)`,
      pointerEvents: 'none',
      overflow: 'visible',
      zIndex: 4,
    }}>
      {damages.map((d, i) => {
        const len = Math.min(100, (d.amount / 21) * 100);
        const offset = -cursor;
        cursor += len;
        return (
          <rect key={i}
            x={strokeWidth / 2} y={strokeWidth / 2}
            width={`calc(100% - ${strokeWidth}px)`}
            height={`calc(100% - ${strokeWidth}px)`}
            rx={radius - strokeWidth / 2}
            ry={radius - strokeWidth / 2}
            fill="none"
            stroke={CMDR_DMG_COLORS[d.colorIndex % CMDR_DMG_COLORS.length]}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            pathLength={100}
            strokeDasharray={`${len} 100`}
            strokeDashoffset={offset}
          />
        );
      })}
    </svg>
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

function CellInner({ player, lifeSize = 64 }: { player: any; lifeSize?: number }) {
  const counters = player.counters || {};
  const counterEntries = Object.entries(counters).filter(([, n]) => (n as number) > 0);
  const hasRing = (player.cmdrDamage || []).length > 0;

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

      {hasRing && <CmdrDamageRing damages={player.cmdrDamage || []} radius={20} strokeWidth={3}/>}

      <div style={{ position:'absolute', top:10, left:12, right:12,
        display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:2, minWidth:0 }}>
          <div style={{ fontFamily:'var(--font-ui)', fontSize:9, fontWeight:700, letterSpacing:'0.20em', textTransform:'uppercase',
            color: player.isYou ? DARK.copper : DARK.ink3,
            display:'inline-flex', alignItems:'center', gap:5 }}>
            {player.isYou && <span style={{
              width:4, height:4, borderRadius:999,
              background: DARK.copper,
              boxShadow: '0 0 8px rgba(226,184,88,0.7)',
            }}/>}
            {player.name}
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:11, lineHeight:1.1,
            color: DARK.ink,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>{player.commander}</div>
        </div>
        <ManaDots colors={player.colors} size={6}/>
      </div>

      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:14 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:400,
          fontSize:lifeSize, lineHeight:1, letterSpacing:'-0.04em',
          color: DARK.ink,
          fontVariantNumeric:'tabular-nums',
          textShadow: '0 0 30px rgba(226,184,88,0.15), 0 1px 0 rgba(10,6,4,0.6)',
        }}>{player.life}</div>

        {counterEntries.length > 0 && (
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center', maxWidth:'90%' }}>
            {counterEntries.map(([k, n]) => (
              <CounterChip key={k} kind={k} count={n as number}/>
            ))}
          </div>
        )}
      </div>

      {/* Tap-zone hints */}
      <div style={{
        position:'absolute', bottom:8, left:12, right:12, zIndex:3,
        display:'flex', justifyContent:'space-between',
        color: DARK.ink3,
        fontFamily:'var(--font-display)', fontSize:22, lineHeight:1,
        pointerEvents:'none',
      }}>
        <span>−</span><span>+</span>
      </div>

    </div>
  );
}

function SidewaysCell({ player, rotation, onTapLeft, onTapRight, onRevive, onHoldLeftStart, onHoldRightStart, onHoldEnd }: { player: any; rotation: number; onTapLeft: () => void; onTapRight: () => void; onRevive?: () => void; onHoldLeftStart?: () => void; onHoldRightStart?: () => void; onHoldEnd?: () => void }) {
  const hasRing = (player.cmdrDamage || []).length > 0;
  return (
    <div style={{
      position:'relative',
      height:'100%',
      containerType:'size',
      borderRadius:'20px',
      background: DARK.bgCard,
      border: hasRing ? '1px solid transparent' : `1px solid ${DARK.cellBorder}`,
      boxShadow: DARK.shadowRest,
      overflow:'hidden',
    } as React.CSSProperties}>
      <div style={{
        position:'absolute',
        top:'50%',
        left:'50%',
        width:'100cqh',
        height:'100cqw',
        transform:`translate(-50%, -50%) rotate(${rotation}deg)`,
        transformOrigin:'center center',
      } as React.CSSProperties}>
        <CellInner player={player}/>
      {(() => {
        const isLifeZero = (player.life ?? 1) <= 0;
        const isPoisoned = (player.counters?.poison || 0) >= 10;
        const isCmdrLethal = (player.cmdrDamage || []).some((d: any) => d.amount >= 21);
        if (!isLifeZero && !isPoisoned && !isCmdrLethal) return null;
        const causes: string[] = [];
        if (isLifeZero) causes.push('Life');
        if (isPoisoned) causes.push('Poison');
        if (isCmdrLethal) causes.push('Commander');
        const reason = causes.join(' + ');
        return (
          <div style={{
            position:'absolute', inset:0, zIndex:20,
            background:'rgba(10,6,4,0.88)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14,
          }}>
            <div style={{
              fontFamily:'var(--font-ui)', fontSize:11, fontWeight:700,
              letterSpacing:'0.20em', textTransform:'uppercase',
              color: DARK.ink2,
            }}>Defeated · {reason}</div>
            <button onClick={onRevive} style={{
              padding:'10px 22px',
              background: DARK.forest,
              color: DARK.ink,
              border:'none', borderRadius:999,
              fontFamily:'var(--font-ui)', fontSize:12, fontWeight:700,
              letterSpacing:'0.16em', textTransform:'uppercase',
              cursor:'pointer', whiteSpace:'nowrap',
            }}>Revive</button>
          </div>
        );
      })()}

        {/* Tap zones */}
        <div style={{ position:'absolute', inset:0, display:'flex', zIndex:10 }}>
          <button style={{
            flex:1, background:'transparent', border:'none', cursor:'pointer', padding:0,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
            onClick={onTapLeft}
            onPointerDown={(e: any) => { e.currentTarget.style.background = 'rgba(255,80,80,0.08)'; onHoldLeftStart && onHoldLeftStart(); }}
            onPointerUp={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
            onPointerLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
            onPointerCancel={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
          />
          <button style={{
            flex:1, background:'transparent', border:'none', cursor:'pointer', padding:0,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
            onClick={onTapRight}
            onPointerDown={(e: any) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; onHoldRightStart && onHoldRightStart(); }}
            onPointerUp={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
            onPointerLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
            onPointerCancel={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
          />
        </div>
      </div>
    </div>
  );
}

function SidewaysEmptyCell({ seatLabel = 'Player', life = 40, counters: cellCounters = {}, cmdrDamage = [], rotation, showQR = false, qrCodeUrl = null, podShortCode = null, onClaimSeat, onCloseQR, onRevive, onTapLeft, onTapRight, onHoldLeftStart, onHoldRightStart, onHoldEnd }: { seatLabel?: string; life?: number; counters?: { poison?: number; energy?: number; experience?: number }; cmdrDamage?: { from: string; amount: number; colorIndex: number }[]; rotation: number; showQR?: boolean; qrCodeUrl?: string | null; podShortCode?: string | null; onClaimSeat: () => void; onCloseQR?: () => void; onTapLeft?: () => void; onTapRight?: () => void; onRevive?: () => void; onHoldLeftStart?: () => void; onHoldRightStart?: () => void; onHoldEnd?: () => void }) {
  const counterEntries = Object.entries(cellCounters || {}).filter(([, n]) => (n as number) > 0);
  if (showQR) {
    return (
      <div style={{
        position:'relative',
        height:'100%',
        containerType:'size',
        borderRadius:'20px',
        background: DARK.bgDeep,
        border: `2.5px dashed rgba(226,184,88,0.25)`,
        boxShadow: 'inset 0 0 0 1px rgba(226,184,88,0.06)',
        overflow:'hidden',
      } as React.CSSProperties}>
        <div style={{
          position:'absolute',
          top:'50%',
          left:'50%',
          width:'100cqh',
          height:'100cqw',
          transform:`translate(-50%, -50%) rotate(${rotation}deg)`,
          transformOrigin:'center center',
        } as React.CSSProperties}>
          <button onClick={onCloseQR} aria-label="Close" style={{
            position:'absolute', top:10, right:10, zIndex:30,
            width:32, height:32, borderRadius:999,
            background:'rgba(10,6,4,0.55)',
            border:`1px solid ${DARK.lineStrong}`,
            color: DARK.ink2, fontSize:18, fontWeight:600,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            lineHeight:1, padding:0,
          }}>×</button>
          <div style={{
            position:'absolute', inset:0, zIndex:20,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14,
            padding:20,
          }}>
            <div style={{
              padding:8, background:'#FAF5EA', borderRadius:12,
              boxShadow:'0 4px 20px -6px rgba(0,0,0,0.35)',
              maxWidth:'80%', maxHeight:'70%',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR code to join pod" style={{ imageRendering:'pixelated', display:'block', width:'100%', height:'auto', maxHeight:'100%', aspectRatio:'1 / 1' }}/>
              ) : (
                <div style={{ width:100, height:100, display:'flex', alignItems:'center', justifyContent:'center', color:'#888', fontSize:11 }}>No pod code</div>
              )}
            </div>
            {podShortCode && (
              <div style={{
                fontFamily:'var(--font-display)', fontSize:18, letterSpacing:'0.16em',
                color: DARK.ink, fontVariantNumeric:'tabular-nums',
              }}>{`${podShortCode.slice(0,3)}—${podShortCode.slice(3)}`}</div>
            )}
          </div>
        </div>
      </div>
    );
  }
  const hasRing = (cmdrDamage || []).length > 0;
  return (
    <div style={{
      position:'relative',
      height:'100%',
      containerType:'size',
      borderRadius:'20px',
      background: DARK.bgDeep,
      border: `2.5px dashed rgba(226,184,88,0.25)`,
      boxShadow: 'inset 0 0 0 1px rgba(226,184,88,0.06)',
      overflow:'hidden',
    } as React.CSSProperties}>
      {hasRing && <CmdrDamageRing damages={cmdrDamage} radius={20} strokeWidth={3}/>}
      <div style={{
        position:'absolute',
        top:'50%',
        left:'50%',
        width:'100cqh',
        height:'100cqw',
        transform:`translate(-50%, -50%) rotate(${rotation}deg)`,
        transformOrigin:'center center',
      } as React.CSSProperties}>
        <div style={{ position:'absolute', inset:0, borderRadius:'20px', overflow:'hidden' }}>
        {(() => {
          const isLifeZero = (life ?? 1) <= 0;
          const isPoisoned = (cellCounters?.poison || 0) >= 10;
          const isCmdrLethal = (cmdrDamage || []).some((d: any) => d.amount >= 21);
          if (!isLifeZero && !isPoisoned && !isCmdrLethal) return null;
          const causes: string[] = [];
          if (isLifeZero) causes.push('Life');
          if (isPoisoned) causes.push('Poison');
          if (isCmdrLethal) causes.push('Commander');
          const reason = causes.join(' + ');
          return (
            <div style={{
              position:'absolute', inset:0, zIndex:25,
              background:'rgba(10,6,4,0.88)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12,
              padding:'8px 12px',
            }}>
              <div style={{
                fontFamily:'var(--font-ui)', fontSize:10, fontWeight:700,
                letterSpacing:'0.20em', textTransform:'uppercase',
                color: DARK.ink2, textAlign:'center',
              }}>Defeated · {reason}</div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <button onClick={onRevive} style={{
                  padding:'8px 18px',
                  background: DARK.forest,
                  color: DARK.ink,
                  border:'none', borderRadius:999,
                  fontFamily:'var(--font-ui)', fontSize:11, fontWeight:700,
                  letterSpacing:'0.14em', textTransform:'uppercase',
                  cursor:'pointer', whiteSpace:'nowrap',
                }}>Revive</button>
                <button onClick={onClaimSeat} style={{
                  padding:'6px 14px',
                  background:'transparent',
                  color: DARK.ink2,
                  border:`1px solid ${DARK.lineStrong}`, borderRadius:999,
                  fontFamily:'var(--font-ui)', fontSize:10, fontWeight:700,
                  letterSpacing:'0.14em', textTransform:'uppercase',
                  cursor:'pointer', whiteSpace:'nowrap',
                }}>Review Game</button>
              </div>
            </div>
          );
        })()}
          {/* Header: seat label + compact Claim button (replaces the old Empty pill) */}
          <div style={{
            position:'absolute', top:10, left:12, right:12, zIndex:10,
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
          }}>
            <div style={{
              fontFamily:'var(--font-ui)', fontSize:9, fontWeight:700,
              letterSpacing:'0.20em', textTransform:'uppercase',
              color: DARK.ink3, pointerEvents:'none',
            }}>{seatLabel}</div>
            <button onClick={onClaimSeat} style={{
              display:'inline-flex', alignItems:'center', gap:5,
              padding:'4px 9px',
              background: DARK.forest,
              color: DARK.ink,
              border:'none', borderRadius:999,
              boxShadow: '0 2px 6px -2px rgba(176,107,44,0.4)',
              fontFamily:'var(--font-ui)', fontSize:8, fontWeight:700,
              letterSpacing:'0.14em', textTransform:'uppercase',
              cursor:'pointer', whiteSpace:'nowrap',
            }}>
              <Icon name="plus-circle" size={11} stroke={DARK.ink}/>
              Claim
            </button>
          </div>

          {/* Life + counters — same color/size as claimed cells */}
          <div style={{
            position:'absolute', inset:0, zIndex:5, pointerEvents:'none',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14,
          }}>
            <div style={{
              fontFamily:'var(--font-display)', fontWeight:400,
              fontSize:64, lineHeight:1, letterSpacing:'-0.04em',
              color: DARK.ink,
              fontVariantNumeric:'tabular-nums',
              textShadow: '0 0 30px rgba(226,184,88,0.15), 0 1px 0 rgba(10,6,4,0.6)',
            }}>{life}</div>

            {counterEntries.length > 0 && (
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', justifyContent:'center', maxWidth:'90%' }}>
                {counterEntries.map(([k, n]) => (
                  <CounterChip key={k} kind={k} count={n as number}/>
                ))}
              </div>
            )}
          </div>



          {/* Tap-zone hints */}
          <div style={{
            position:'absolute', bottom:8, left:12, right:12, zIndex:3,
            display:'flex', justifyContent:'space-between',
            color: DARK.ink3,
            fontFamily:'var(--font-display)', fontSize:22, lineHeight:1,
            pointerEvents:'none',
          }}>
            <span>−</span><span>+</span>
          </div>

          {/* Tap zones for life +/- (under the Claim button via z-index) */}
          <div style={{ position:'absolute', inset:0, display:'flex', zIndex:6 }}>
            <button style={{
              flex:1, background:'transparent', border:'none', cursor:'pointer', padding:0,
            }}
              onClick={onTapLeft}
              onPointerDown={(e: any) => { e.currentTarget.style.background = 'rgba(255,80,80,0.08)'; onHoldLeftStart && onHoldLeftStart(); }}
              onPointerUp={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
              onPointerLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
              onPointerCancel={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
            />
            <button style={{
              flex:1, background:'transparent', border:'none', cursor:'pointer', padding:0,
            }}
              onClick={onTapRight}
              onPointerDown={(e: any) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; onHoldRightStart && onHoldRightStart(); }}
              onPointerUp={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
              onPointerLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
              onPointerCancel={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NormalCell({ player, onTapLeft, onTapRight, onRevive, lifeSize = 72, onHoldLeftStart, onHoldRightStart, onHoldEnd }: { player: any; onTapLeft: () => void; onTapRight: () => void; onRevive?: () => void; lifeSize?: number; onHoldLeftStart?: () => void; onHoldRightStart?: () => void; onHoldEnd?: () => void }) {
  const hasRing = (player.cmdrDamage || []).length > 0;
  return (
    <div style={{
      position:'relative',
      height:'100%',
      borderRadius:'20px',
      background: DARK.bgCard,
      border: hasRing ? '1px solid transparent' : `1px solid ${DARK.cellBorder}`,
      boxShadow: DARK.shadowRest,
      overflow:'hidden',
    }}>
      <CellInner player={player} lifeSize={lifeSize}/>
      {(() => {
        const isLifeZero = (player.life ?? 1) <= 0;
        const isPoisoned = (player.counters?.poison || 0) >= 10;
        const isCmdrLethal = (player.cmdrDamage || []).some((d: any) => d.amount >= 21);
        if (!isLifeZero && !isPoisoned && !isCmdrLethal) return null;
        const causes: string[] = [];
        if (isLifeZero) causes.push('Life');
        if (isPoisoned) causes.push('Poison');
        if (isCmdrLethal) causes.push('Commander');
        const reason = causes.join(' + ');
        return (
          <div style={{
            position:'absolute', inset:0, zIndex:20,
            background:'rgba(10,6,4,0.88)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14,
          }}>
            <div style={{
              fontFamily:'var(--font-ui)', fontSize:11, fontWeight:700,
              letterSpacing:'0.20em', textTransform:'uppercase',
              color: DARK.ink2,
            }}>Defeated · {reason}</div>
            <button onClick={onRevive} style={{
              padding:'10px 22px',
              background: DARK.forest,
              color: DARK.ink,
              border:'none', borderRadius:999,
              fontFamily:'var(--font-ui)', fontSize:12, fontWeight:700,
              letterSpacing:'0.16em', textTransform:'uppercase',
              cursor:'pointer', whiteSpace:'nowrap',
            }}>Revive</button>
          </div>
        );
      })()}

      <div style={{ position:'absolute', inset:0, display:'flex', zIndex:10 }}>
        <button style={{
          flex:1, background:'transparent', border:'none', cursor:'pointer', padding:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}
          onClick={onTapLeft}
          onPointerDown={(e: any) => { e.currentTarget.style.background = 'rgba(255,80,80,0.08)'; onHoldLeftStart && onHoldLeftStart(); }}
          onPointerUp={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
          onPointerLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
          onPointerCancel={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
        />
        <button style={{
          flex:1, background:'transparent', border:'none', cursor:'pointer', padding:0,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}
          onClick={onTapRight}
          onPointerDown={(e: any) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; onHoldRightStart && onHoldRightStart(); }}
          onPointerUp={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
          onPointerLeave={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
          onPointerCancel={(e: any) => { e.currentTarget.style.background = 'transparent'; onHoldEnd && onHoldEnd(); }}
        />
      </div>
    </div>
  );
}

function GameNav({ active = 'grid', onDiceClick, onCountersClick, onCmdrClick, podId, gameId }: { active?: string; onDiceClick: () => void; onCountersClick: () => void; onCmdrClick: () => void; podId: string; gameId: string }) {
  const router = useRouter();
  const [sliding, setSliding] = useState(false);
  const actions = [
    { id: 'dice',   icon: 'dice',   label: 'Dice' },
    { id: 'count',  icon: 'plus',   label: 'Counters' },
    { id: 'cmdr',   icon: 'shield', label: 'Cmdr Dmg' },
  ];
  const handleToggle = (target: string) => {
    if (target === active || sliding) return;
    if (target === 'single') {
      setSliding(true);
      const url = `/singleview?podId=${podId}&gameId=${gameId}`;
      // Navigate immediately — no setTimeout (which can be cancelled by re-renders)
      // Use router.push first; fall back to window.location.href in case the soft nav fails
      try { router.push(url); } catch (e) { /* swallow */ }
      // Hard-redirect fallback after a short delay, in case router.push silently fails
      setTimeout(() => {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/singleview')) {
          window.location.href = url;
        }
      }, 300);
    }
  };
  const thumbLeft = (active === 'grid' && !sliding) || (active === 'single' && sliding);
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
        padding: 6, display: 'flex', gap: 4,
      }}>
        <div style={{
          position: 'relative', display: 'flex', flex: '0 0 auto',
          width: 120, borderRadius: 999, overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            width: '50%', borderRadius: 999,
            background: DARK.forest,
            transform: thumbLeft ? 'translateX(0%)' : 'translateX(100%)',
            transition: 'transform 0.28s cubic-bezier(.4,.0,.2,1)',
          }}/>
          {[{ id: 'grid', icon: 'grid', label: 'Grid' }, { id: 'single', icon: 'user', label: 'You' }].map(it => {
            const on = it.id === active && !sliding || it.id !== active && sliding;
            return (
              <button key={it.id} onClick={() => handleToggle(it.id)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '6px 0', border: 'none', background: 'transparent',
                color: on ? DARK.ink : DARK.ink3,
                borderRadius: 999, position: 'relative', zIndex: 1,
                fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase', gap: 2,
                cursor: 'pointer', transition: 'color 0.28s ease',
              }}>
                <Icon name={it.icon} size={16} stroke={on ? DARK.ink : DARK.ink3}/>
                <span>{it.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, alignSelf: 'stretch', margin: '4px 2px', background: 'rgba(226,184,88,0.12)', borderRadius: 1 }}/>

        {actions.map(it => {
          const handleClick = () => {
            if (it.id === 'dice') onDiceClick();
            else if (it.id === 'count') onCountersClick();
            else if (it.id === 'cmdr') onCmdrClick();
          };
          return (
            <button key={it.id} onClick={handleClick} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '6px 0', border: 'none', background: 'transparent',
              color: DARK.ink3, borderRadius: 999,
              fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', gap: 2,
              cursor: 'pointer',
            }}>
              <Icon name={it.icon} size={16} stroke={DARK.ink3}/>
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
    <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 6 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: 'var(--font-ui)', fontSize: 7, fontWeight: 700,
        letterSpacing: '0.32em', textTransform: 'uppercase',
        color: DARK.copper,
      }}>
        <span style={{ width: 12, height: 1, background: DARK.copper, opacity: 0.5 }}/>
        <span style={{ fontSize: 6, opacity: 0.7 }}>✦</span>
        <span>{kicker}</span>
        <span style={{ fontSize: 6, opacity: 0.7 }}>✦</span>
        <span style={{ width: 12, height: 1, background: DARK.copper, opacity: 0.5 }}/>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.05,
        color: DARK.ink, marginTop: 1, letterSpacing: '-0.01em',
      }}>{title}</div>
    </div>
  );
}

// ─── Modal constants ─────────────────────────────────────────────────────
const CMDR_DMG_COLORS = ['#E8A54B', '#D4783C', '#B8432E', '#8C2318', '#5E1610'];
const DICE_OPTS: { id: string; label: string; icon: string; large?: boolean }[] = [
  { id: 'd6',     label: 'D6',            icon: 'dice'   },
  { id: 'd20',    label: 'D20',           icon: 'dice', large: true },
  { id: 'coin',   label: 'Coin Flip',     icon: 'coin'   },
  { id: 'random', label: 'Random Player', icon: 'shuffle'},
];
const COUNTER_DEFS: { id: 'poison' | 'energy' | 'experience'; label: string; glyph: string; tone: string; soft: string; lethal: number | null }[] = [
  { id: 'poison',     label: 'Poison',     glyph: 'skull', tone: '#4F8A4D', soft: '#E2EBDB', lethal: 10 },
  { id: 'energy',     label: 'Energy',     glyph: 'bolt',  tone: '#C99B2F', soft: '#F6ECD2', lethal: null },
  { id: 'experience', label: 'Experience', glyph: 'star',  tone: '#7E4E8A', soft: '#EADDEE', lethal: null },
];

// ─── Modal helper components ─────────────────────────────────────────────
function ModalCompass({ size = 300, opacity = 0.10 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" style={{
      position: 'absolute', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      opacity, pointerEvents: 'none',
    }}>
      <g stroke={DARK.copper} strokeWidth="0.8" fill="none">
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <line key={i}
            x1={160 + Math.cos(a) * 40} y1={160 + Math.sin(a) * 40}
            x2={160 + Math.cos(a) * 150} y2={160 + Math.sin(a) * 150}/>;
        })}
        <circle cx="160" cy="160" r="40"/>
        <circle cx="160" cy="160" r="60" strokeDasharray="1 3"/>
        <circle cx="160" cy="160" r="100" strokeDasharray="1 4"/>
        <circle cx="160" cy="160" r="150"/>
      </g>
    </svg>
  );
}

function ModalCard({ width = 320, onClose, onRotate, rotated = false, children, showCompass = true }: { width?: number; onClose: () => void; onRotate?: () => void; rotated?: boolean; children: React.ReactNode; showCompass?: boolean }) {
  return (
    <div onClick={(e) => e.stopPropagation()} style={{
      padding: 3,
      background: 'linear-gradient(135deg, #E2B858 0%, #C99B2F 22%, #8C5A28 50%, #C99B2F 78%, #E2B858 100%)',
      borderRadius: 26,
      boxShadow: '0 30px 80px -20px rgba(0,0,0,.7), 0 0 0 1px rgba(226,184,88,0.2), 0 0 60px -10px rgba(226,184,88,0.15)',
    }}>
      <div style={{
        position: 'relative',
        width, padding: '14px 22px 20px',
        background: '#1C140C',
        borderRadius: 23,
        overflow: 'hidden',
        transform: rotated ? 'rotate(180deg)' : 'none',
        transition: 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {showCompass && <ModalCompass/>}
        <button onClick={onClose} style={{
          position: 'absolute', top: 6, left: 10, zIndex: 2,
          width: 36, height: 36, borderRadius: 999,
          background: 'rgba(226,184,88,0.12)',
          border: '1.5px solid rgba(226,184,88,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
          boxShadow: '0 0 8px -2px rgba(226,184,88,0.15)',
        }}>
          <Icon name="close" size={16} stroke={DARK.ink2} width={1.8}/>
        </button>
        {onRotate && (
          <button onClick={onRotate} aria-label="Rotate" style={{
            position: 'absolute', top: 6, right: 10, zIndex: 2,
            width: 36, height: 36, borderRadius: 999,
            background: 'rgba(226,184,88,0.12)',
            border: '1.5px solid rgba(226,184,88,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
            boxShadow: '0 0 8px -2px rgba(226,184,88,0.15)',
          }}>
            <Icon name="rotate" size={18} stroke={DARK.ink2} width={2}/>
          </button>
        )}
        <div style={{ position: 'relative' }}>{children}</div>
      </div>
    </div>
  );
}

function DicePlaque({ option, active, result, onClick }: { option: { id: string; label: string; icon: string; large?: boolean }; active: boolean; result: string | null; onClick: () => void }) {
  const accent = active ? DARK.copper : DARK.ink3;
  return (
    <button onClick={onClick} style={{
      width: '100%', minWidth: 0,
      height: 90,
      position: 'relative',
      background: active ? `radial-gradient(circle at 30% 20%, #2A1E12 0%, #1E1409 65%)` : '#1A120A',
      border: `1px solid ${active ? `${DARK.copper}88` : 'rgba(226,184,88,0.22)'}`,
      borderRadius: 16,
      padding: '12px 10px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
      cursor: 'pointer',
      textAlign: 'center',
      boxShadow: active
        ? `0 0 0 3px rgba(226,184,88,0.08), 0 4px 14px -4px rgba(226,184,88,0.20), inset 0 1px 0 rgba(226,184,88,0.08)`
        : `inset 0 1px 0 rgba(226,184,88,0.04), 0 1px 2px rgba(0,0,0,0.2)`,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: accent,
      }}>
        <Icon name={option.icon} size={11} stroke={accent} width={1.6}/>
        <span>{option.label}</span>
      </div>
      {(() => {
        const len = result ? result.length : 0;
        const fontSize = !result ? 30 : (len <= 4 ? 30 : Math.max(13, Math.floor(30 * 5 / len)));
        return (
          <div style={{
            position: 'relative',
            fontFamily: 'var(--font-display)',
            fontSize, lineHeight: 1.05,
            height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: DARK.ink,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            textShadow: active ? '0 0 12px rgba(226,184,88,0.25)' : 'none',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{result || '—'}</div>
        );
      })()}
      <div style={{
        position: 'relative',
        fontFamily: 'var(--font-ui)', fontSize: 9,
        color: DARK.ink4,
        letterSpacing: '0.04em',
      }}>{result ? 'Last roll' : 'Tap to roll'}</div>
    </button>
  );
}

function PlayerAvatarRow({ players, selectedNum, onSelect, label, accent = DARK.copper, size = 42, disabledNum }: {
  players: Record<number, { name: string; commander: string | null; claimed: boolean; colors: string[]; art?: string }>;
  selectedNum: number;
  onSelect: (n: number) => void;
  label: string;
  accent?: string;
  size?: number;
  disabledNum?: number;
}) {
  const playerNums = Object.keys(players).map(Number).sort();
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: DARK.ink3,
        textAlign: 'center', marginBottom: 8,
      }}>— {label} —</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, padding: '0 4px' }}>
        {playerNums.map(n => {
          const p = players[n];
          const on = n === selectedNum;
          const disabled = n === disabledNum;
          const initial = `P${n}`;
          return (
            <button key={n} onClick={() => !disabled && onSelect(n)} style={{
              flex: 1, minWidth: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '4px 2px',
              background: 'transparent', border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.3 : 1,
              transition: 'opacity 160ms ease',
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: size, height: size, borderRadius: 999,
                  overflow: 'hidden',
                  border: `2px solid ${DARK.bgCard}`,
                  boxShadow: on
                    ? `0 0 0 2px ${accent}, 0 0 12px -2px ${accent}66`
                    : `0 0 0 1px ${DARK.lineStrong}`,
                  transition: 'box-shadow 160ms ease',
                  background: DARK.bgDeep,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.art ? (
                    <img src={p.art} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: '50% 25%' }}/>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.32, color: DARK.ink2 }}>{initial}</span>
                  )}
                  {!on && <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,6,4,0.25)' }}/>}
                </div>
                {on && (
                  <div style={{
                    position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)',
                    width: 6, height: 6, borderRadius: 999,
                    background: accent,
                    boxShadow: `0 0 6px ${accent}`,
                  }}/>
                )}
              </div>
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.02em',
                color: on ? DARK.ink : DARK.ink2,
                whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>{p.name || `Player ${n}`}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CounterRow({ counter, count, isFirst, onMinus, onPlus }: {
  counter: typeof COUNTER_DEFS[number];
  count: number;
  isFirst: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const fillPct = counter.lethal ? Math.min(100, (count / counter.lethal) * 100) : 0;
  const stepBase = {
    width: 38, height: 38, borderRadius: 999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
    flexShrink: 0,
  } as React.CSSProperties;
  return (
    <div style={{
      position: 'relative',
      padding: '14px 4px',
      borderTop: isFirst ? 'none' : `1px dashed ${counter.tone}55`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          position: 'relative',
          width: 44, height: 44, borderRadius: 999,
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
              color: DARK.ink, fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}>{count}</div>
            {counter.lethal && (
              <div style={{
                fontFamily: 'var(--font-ui)', fontSize: 11,
                color: DARK.ink3,
                fontVariantNumeric: 'tabular-nums',
              }}>/ {counter.lethal}</div>
            )}
          </div>
          {counter.lethal && (
            <div style={{
              marginTop: 6, height: 3, borderRadius: 999,
              background: `${counter.tone}33`,
              overflow: 'hidden',
              maxWidth: 120,
            }}>
              <div style={{
                width: `${fillPct}%`, height: '100%',
                background: counter.tone,
                borderRadius: 999,
                boxShadow: `0 0 6px ${counter.tone}66`,
              }}/>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onMinus} style={{
            ...stepBase,
            background: `${counter.tone}25`,
            color: counter.tone,
            border: `1.5px solid ${counter.tone}AA`,
            boxShadow: `0 0 8px -2px ${counter.tone}30`,
          }}><Icon name="minus" size={16} stroke={counter.tone} width={2.2}/></button>
          <button onClick={onPlus} style={{
            ...stepBase,
            background: counter.tone,
            color: '#fff',
            border: `1.5px solid ${counter.tone}AA`,
            boxShadow: `0 2px 8px -2px ${counter.tone}66, inset 0 1px 0 rgba(255,255,255,0.25)`,
          }}><Icon name="plus" size={16} stroke="#fff" width={2.2}/></button>
        </div>
      </div>
    </div>
  );
}

function DamageSeal({ amount, lethal, accent, onMinus, onPlus }: { amount: number; lethal: number; accent: string; onMinus: () => void; onPlus: () => void }) {
  const pct = Math.min(1, amount / lethal);
  const SIZE = 132, R = 58, C = 2 * Math.PI * R;
  const dash = pct * C;
  const stepStyle: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 999,
    background: '#1A120A',
    border: `1.5px solid ${accent}`,
    color: accent,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
    boxShadow: `0 2px 6px -2px ${accent}40, inset 0 1px 0 rgba(255,255,255,0.06)`,
    flexShrink: 0,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 0' }}>
      <button onClick={onMinus} style={stepStyle}><Icon name="minus" size={20} stroke={accent} width={2.2}/></button>

      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="seal-bg" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#2A1E12"/>
              <stop offset="60%" stopColor="#1C140C"/>
              <stop offset="100%" stopColor={accent} stopOpacity="0.18"/>
            </radialGradient>
          </defs>
          <circle cx={SIZE/2} cy={SIZE/2} r={R + 4} fill="url(#seal-bg)"/>
          <circle cx={SIZE/2} cy={SIZE/2} r={R + 4} fill="none" stroke={accent} strokeWidth="1" strokeOpacity="0.55"/>
          <circle cx={SIZE/2} cy={SIZE/2} r={R - 2} fill="none" stroke={accent} strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="1 3"/>
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="3"/>
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
            stroke={accent} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
            transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
            style={{ filter: `drop-shadow(0 0 4px ${accent}80)` }}/>
          {[7, 14, 21].map(v => {
            const a = (v / lethal) * Math.PI * 2 - Math.PI / 2;
            const r1 = R + 4, r2 = R + 9;
            return <line key={v}
              x1={SIZE/2 + Math.cos(a) * r1} y1={SIZE/2 + Math.sin(a) * r1}
              x2={SIZE/2 + Math.cos(a) * r2} y2={SIZE/2 + Math.sin(a) * r2}
              stroke={accent} strokeOpacity={v <= amount ? 0.9 : 0.35}
              strokeWidth={v === lethal ? 1.5 : 0.8} strokeLinecap="round"/>;
          })}
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 48, lineHeight: 1,
            color: accent, fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.04em',
            textShadow: `0 0 16px ${accent}44`,
          }}>{amount}</div>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: DARK.ink3,
            marginTop: 2,
          }}>of {lethal}</div>
        </div>
      </div>

      <button onClick={onPlus} style={stepStyle}><Icon name="plus" size={20} stroke={accent} width={2.2}/></button>
    </div>
  );
}

function DiceModal({ open, onClose, players, selectedDiceOpt, diceResults, onRoll }: {
  open: boolean;
  onClose: () => void;
  players: Record<number, { name: string; commander: string | null; claimed: boolean; colors: string[]; assignedColor?: string | null; art?: string }>;
  selectedDiceOpt: string;
  diceResults: Record<string, string>;
  onRoll: (id: string) => void;
}) {
  const [rotated, setRotated] = useState(false);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }}>
      <ModalCard width={320} onClose={onClose} onRotate={() => setRotated(r => !r)} rotated={rotated}>
        <ModalTitle kicker="Roll" title="Dice & Random"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
          {DICE_OPTS.map(opt => (
            <DicePlaque key={opt.id} option={opt}
              active={selectedDiceOpt === opt.id}
              result={diceResults[opt.id] || null}
              onClick={() => onRoll(opt.id)}
            />
          ))}
        </div>
      </ModalCard>
    </div>
  );
}

function CountersModal({ open, onClose, players, selectedNum, setSelectedNum, counters, onChange }: {
  open: boolean;
  onClose: () => void;
  players: Record<number, { name: string; commander: string | null; claimed: boolean; colors: string[]; assignedColor?: string | null; art?: string }>;
  selectedNum: number;
  setSelectedNum: (n: number) => void;
  counters: Record<number, { poison: number; experience: number; energy: number }>;
  onChange: (type: 'poison' | 'experience' | 'energy', action: 'plus' | 'minus') => void;
}) {
  const [rotated, setRotated] = useState(false);
  if (!open) return null;
  const playerCounts = counters[selectedNum] ?? { poison: 0, energy: 0, experience: 0 };
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }}>
      <ModalCard width={326} onClose={onClose} onRotate={() => setRotated(r => !r)} rotated={rotated} showCompass={false}>
        <ModalTitle kicker="Adjust" title="Counters"/>
        <div style={{ marginBottom: 12 }}>
          <PlayerAvatarRow players={players} selectedNum={selectedNum}
            onSelect={setSelectedNum} label="Whose counters?"/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1, height: 1, background: DARK.lineStrong }}/>
          <span style={{
            fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700,
            letterSpacing: '0.28em', textTransform: 'uppercase', color: DARK.ink3,
          }}>Track</span>
          <div style={{ flex: 1, height: 1, background: DARK.lineStrong }}/>
        </div>
        <div>
          {COUNTER_DEFS.map((c, i) => (
            <CounterRow key={c.id} counter={c}
              count={playerCounts[c.id] ?? 0}
              isFirst={i === 0}
              onMinus={() => onChange(c.id, 'minus')}
              onPlus={() => onChange(c.id, 'plus')}
            />
          ))}
        </div>
      </ModalCard>
    </div>
  );
}

function CmdrDmgModal({ open, onClose, players, fromNum, setFromNum, toNum, setToNum, damage, onChange }: {
  open: boolean;
  onClose: () => void;
  players: Record<number, { name: string; commander: string | null; claimed: boolean; colors: string[]; assignedColor?: string | null; art?: string }>;
  fromNum: number;
  toNum: number;
  setFromNum: (n: number) => void;
  setToNum: (n: number) => void;
  damage: Record<number, Record<number, number>>;
  onChange: (delta: number) => void;
}) {
  const [rotated, setRotated] = useState(false);
  if (!open) return null;
  const playerNums = Object.keys(players).map(Number).sort();
  const handleFromSelect = (n: number) => {
    setFromNum(n);
    if (n === toNum) {
      const next = playerNums.find(p => p !== n);
      if (next !== undefined) setToNum(next);
    }
  };
  const handleToSelect = (n: number) => {
    setToNum(n);
    if (n === fromNum) {
      const next = playerNums.find(p => p !== n);
      if (next !== undefined) setFromNum(next);
    }
  };
  const amount = damage[fromNum]?.[toNum] ?? 0;
  const lethal = 21;
  const pct = Math.min(1, amount / lethal);
  const heatIdx = Math.min(CMDR_DMG_COLORS.length - 1, Math.floor(pct * CMDR_DMG_COLORS.length));
  const accent = CMDR_DMG_COLORS[heatIdx];
  const fromPlayer = players[fromNum];
  const toPlayer = players[toNum];
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }}>
      <ModalCard width={332} onClose={onClose} onRotate={() => setRotated(r => !r)} rotated={rotated} showCompass={false}>
        <ModalTitle kicker="Track" title="Commander Damage"/>
        <div style={{ marginBottom: 10 }}>
          <PlayerAvatarRow players={players} selectedNum={fromNum} onSelect={handleFromSelect}
            label="Damage from" accent={accent} size={38} disabledNum={toNum}/>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, margin: '4px 0', color: DARK.ink4,
        }}>
          <span style={{ width: 36, height: 1, background: DARK.lineStrong }}/>
          <Icon name="shield" size={11} stroke={DARK.ink3} width={1.6}/>
          <span style={{ width: 36, height: 1, background: DARK.lineStrong }}/>
        </div>
        <div style={{ marginBottom: 12 }}>
          <PlayerAvatarRow players={players} selectedNum={toNum} onSelect={handleToSelect}
            label="Damage to" accent={DARK.ink} size={38} disabledNum={fromNum}/>
        </div>
        <div style={{
          background: '#140E08',
          border: `1px solid ${accent}44`,
          borderRadius: 18, padding: '4px 14px 8px',
          boxShadow: 'inset 0 0 24px rgba(0,0,0,0.2)',
        }}>
          <DamageSeal amount={amount} lethal={lethal} accent={accent}
            onMinus={() => onChange(-1)} onPlus={() => onChange(1)}/>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 4, paddingTop: 8,
            borderTop: `1px dashed ${DARK.lineStrong}`,
            fontFamily: 'var(--font-ui)', fontSize: 11,
          }}>
            <span style={{ color: accent, fontWeight: 700, letterSpacing: '0.04em' }}>
              {fromPlayer?.name || `Player ${fromNum}`}
            </span>
            <Icon name="arrow" size={12} stroke={accent} width={2}/>
            <span style={{ color: DARK.ink, fontWeight: 700, letterSpacing: '0.04em' }}>
              {toPlayer?.name || `Player ${toNum}`}
            </span>
          </div>
        </div>
      </ModalCard>
    </div>
  );
}

function LandscapeModalShell({ children, rotation = 90, width = 540, height = 310, onClose, showCompass = true }: {
  children: React.ReactNode;
  rotation?: number;
  width?: number;
  height?: number;
  onClose: () => void;
  showCompass?: boolean;
}) {
  return (
    <div onClick={(e) => e.stopPropagation()} style={{
      padding: 3,
      transform: `rotate(${rotation}deg)`,
      background: 'linear-gradient(135deg, #E2B858 0%, #C99B2F 22%, #8C5A28 50%, #C99B2F 78%, #E2B858 100%)',
      borderRadius: 26,
      boxShadow: '0 30px 80px -20px rgba(0,0,0,.7), 0 0 0 1px rgba(226,184,88,0.2), 0 0 60px -10px rgba(226,184,88,0.15)',
    }}>
      <div style={{
        position: 'relative',
        width, height, padding: '18px 20px 16px',
        background: '#1C140C',
        borderRadius: 23,
        overflow: 'hidden',
      }}>
        {showCompass && <ModalCompass size={260} opacity={0.08}/>}
        <button onClick={onClose} style={{
          position: 'absolute', top: 6, left: 10, zIndex: 2,
          width: 36, height: 36, borderRadius: 999,
          background: 'rgba(226,184,88,0.12)',
          border: '1.5px solid rgba(226,184,88,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
          boxShadow: '0 0 8px -2px rgba(226,184,88,0.15)',
        }}>
          <Icon name="close" size={16} stroke={DARK.ink2} width={1.8}/>
        </button>
        <div style={{ position: 'relative', height: '100%' }}>{children}</div>
      </div>
    </div>
  );
}

function DiceModalLandscape({ open, onClose, players, selectedDiceOpt, diceResults, onRoll }: {
  open: boolean;
  onClose: () => void;
  players: Record<number, { name: string; commander: string | null; claimed: boolean; colors: string[]; assignedColor?: string | null; art?: string }>;
  selectedDiceOpt: string;
  diceResults: Record<string, string>;
  onRoll: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }}>
      <LandscapeModalShell width={500} height={240} onClose={onClose}>
        <ModalTitle kicker="Roll" title="Dice & Random"/>
        <div style={{ display: 'flex', gap: 8 }}>
          {DICE_OPTS.map(opt => (
            <div key={opt.id} style={{ flex: 1 }}>
              <DicePlaque option={opt}
                active={selectedDiceOpt === opt.id}
                result={diceResults[opt.id] || null}
                onClick={() => onRoll(opt.id)}
              />
            </div>
          ))}
        </div>
      </LandscapeModalShell>
    </div>
  );
}

function CountersModalLandscape({ open, onClose, players, selectedNum, setSelectedNum, counters, onChange }: {
  open: boolean;
  onClose: () => void;
  players: Record<number, { name: string; commander: string | null; claimed: boolean; colors: string[]; assignedColor?: string | null; art?: string }>;
  selectedNum: number;
  setSelectedNum: (n: number) => void;
  counters: Record<number, { poison: number; experience: number; energy: number }>;
  onChange: (type: 'poison' | 'experience' | 'energy', action: 'plus' | 'minus') => void;
}) {
  if (!open) return null;
  const playerCounts = counters[selectedNum] ?? { poison: 0, energy: 0, experience: 0 };
  const playerNums = Object.keys(players).map(Number).sort();
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }}>
      <LandscapeModalShell width={460} height={300} onClose={onClose} showCompass={false}>
        <ModalTitle kicker="Adjust" title="Counters"/>
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Player picker — small grid */}
          <div style={{ flexShrink: 0 }}>
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 7, fontWeight: 700,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: DARK.ink3,
              textAlign: 'center', marginBottom: 6,
            }}>Player</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, justifyItems: 'center' }}>
              {playerNums.map(n => {
                const p = players[n];
                const on = n === selectedNum;
                const initial = `P${n}`;
                return (
                  <button key={n} onClick={() => setSelectedNum(n)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 1,
                  }}>
                    <div style={{
                      position: 'relative',
                      width: 34, height: 34, borderRadius: 999, overflow: 'hidden',
                      border: `2px solid ${DARK.bgCard}`,
                      boxShadow: on
                        ? `0 0 0 2px ${DARK.copper}, 0 0 10px -2px rgba(226,184,88,0.4)`
                        : `0 0 0 1px ${DARK.lineStrong}`,
                      background: DARK.bgDeep,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {p?.art ? (
                        <img src={p.art} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: '50% 25%' }}/>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: DARK.ink2 }}>{initial}</span>
                      )}
                      {!on && <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,6,4,0.25)' }}/>}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-ui)', fontSize: 7, fontWeight: 600,
                      color: on ? DARK.ink : DARK.ink2,
                      letterSpacing: '0.02em',
                    }}>{p?.name || `P${n}`}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width: 1, background: 'rgba(226,184,88,0.28)', alignSelf: 'stretch', margin: '4px 0' }}/>

          {/* Counter rows */}
          <div style={{ flex: 1 }}>
            {COUNTER_DEFS.map((c, i) => (
              <CounterRow key={c.id} counter={c}
                count={playerCounts[c.id] ?? 0}
                isFirst={i === 0}
                onMinus={() => onChange(c.id, 'minus')}
                onPlus={() => onChange(c.id, 'plus')}
              />
            ))}
          </div>
        </div>
      </LandscapeModalShell>
    </div>
  );
}

function CmdrDmgModalLandscape({ open, onClose, players, fromNum, setFromNum, toNum, setToNum, damage, onChange }: {
  open: boolean;
  onClose: () => void;
  players: Record<number, { name: string; commander: string | null; claimed: boolean; colors: string[]; assignedColor?: string | null; art?: string }>;
  fromNum: number;
  toNum: number;
  setFromNum: (n: number) => void;
  setToNum: (n: number) => void;
  damage: Record<number, Record<number, number>>;
  onChange: (delta: number) => void;
}) {
  if (!open) return null;
  const amount = damage[fromNum]?.[toNum] ?? 0;
  const lethal = 21;
  const pct = Math.min(1, amount / lethal);
  const heatIdx = Math.min(CMDR_DMG_COLORS.length - 1, Math.floor(pct * CMDR_DMG_COLORS.length));
  const accent = CMDR_DMG_COLORS[heatIdx];
  const fromPlayer = players[fromNum];
  const toPlayer = players[toNum];
  const playerNums = Object.keys(players).map(Number).sort();
  const handleLandscapeFrom = (n: number) => {
    if (n === toNum) return;
    setFromNum(n);
  };
  const handleLandscapeTo = (n: number) => {
    if (n === fromNum) return;
    setToNum(n);
  };

  const renderColumn = (label: string, selectedN: number, setN: (n: number) => void, colAccent: string, disabledN?: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: DARK.ink3,
      }}>{label}</div>
      {playerNums.map(n => {
        const p = players[n];
        const on = n === selectedN;
        const disabled = n === disabledN;
        const initial = `P${n}`;
        return (
          <button key={n} onClick={() => !disabled && setN(n)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer', padding: 2,
            opacity: disabled ? 0.3 : 1,
            transition: 'opacity 160ms ease',
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 30, height: 30, borderRadius: 999, overflow: 'hidden',
                border: `2px solid ${DARK.bgCard}`,
                boxShadow: on
                  ? `0 0 0 2px ${colAccent}, 0 0 10px -2px ${colAccent}66`
                  : `0 0 0 1px ${DARK.lineStrong}`,
                background: DARK.bgDeep,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {p?.art ? (
                  <img src={p.art} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: '50% 25%' }}/>
                ) : (
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: DARK.ink2 }}>{initial}</span>
                )}
                {!on && <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,6,4,0.25)' }}/>}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 600,
              color: on ? DARK.ink : DARK.ink3,
            }}>{p?.name || `P${n}`}</div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }}>
      <LandscapeModalShell width={530} height={290} onClose={onClose} showCompass={false}>
        <ModalTitle kicker="Track" title="Commander Damage"/>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {renderColumn('From', fromNum, handleLandscapeFrom, accent, toNum)}
            {/* Sword divider */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              alignSelf: 'stretch', gap: 4, padding: '20px 0',
            }}>
              <div style={{ flex: 1, width: 1, background: 'rgba(226,184,88,0.18)' }}/>
              <Icon name="shield" size={12} stroke={DARK.ink3} width={1.4}/>
              <div style={{ flex: 1, width: 1, background: 'rgba(226,184,88,0.18)' }}/>
            </div>
            {renderColumn('To', toNum, handleLandscapeTo, DARK.ink, fromNum)}
          </div>
          {/* Vertical divider */}
          <div style={{ width: 1, background: 'rgba(226,184,88,0.28)', alignSelf: 'stretch' }}/>
          {/* Damage seal */}
          <div style={{
            flexShrink: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <div style={{
              background: '#140E08',
              border: `1px solid ${accent}44`,
              borderRadius: 18, padding: '4px 10px 8px',
              boxShadow: 'inset 0 0 24px rgba(0,0,0,0.2)',
            }}>
              <DamageSeal amount={amount} lethal={lethal} accent={accent}
                onMinus={() => onChange(-1)} onPlus={() => onChange(1)}/>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'var(--font-ui)', fontSize: 10,
            }}>
              <span style={{ color: accent, fontWeight: 700, letterSpacing: '0.04em' }}>
                {fromPlayer?.name || `P${fromNum}`}
              </span>
              <Icon name="arrow" size={11} stroke={accent} width={2}/>
              <span style={{ color: DARK.ink, fontWeight: 700, letterSpacing: '0.04em' }}>
                {toPlayer?.name || `P${toNum}`}
              </span>
            </div>
          </div>
        </div>
      </LandscapeModalShell>
    </div>
  );
}

function TornEdgeMiniGV() {
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

function VictoryPopup({ onContinue, onReview }: { onContinue: () => void; onReview: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-ui)',
    }}>
      <div onClick={onContinue} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.60)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}/>
      <div style={{
        marginTop: 'auto', position: 'relative',
        maxWidth: 430, width: '100%', alignSelf: 'center',
      }}>
        <TornEdgeMiniGV/>
        <div style={{
          position: 'relative',
          background: '#1A1410',
          padding: '8px 22px 32px',
        }}>
          <button onClick={onContinue} aria-label="Close" style={{
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
              <svg width={32} height={32} viewBox="0 0 64 64" aria-hidden="true">
                <defs>
                  <linearGradient id="vict-crown-grad-gv" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#E2B858"/>
                    <stop offset="100%" stopColor="#C99B2F"/>
                  </linearGradient>
                </defs>
                <path d="M10 48 L16 22 L24 36 L32 16 L40 36 L48 22 L54 48 Z"
                  fill="url(#vict-crown-grad-gv)" stroke="#8C5A28" strokeWidth="1.5" strokeLinejoin="round"/>
                <rect x="10" y="48" width="44" height="6" rx="1" fill="#C99B2F" stroke="#8C5A28" strokeWidth="1.5"/>
                <circle cx="16" cy="22" r="2.5" fill="#F0E8D8"/>
                <circle cx="32" cy="16" r="2.8" fill="#F0E8D8"/>
                <circle cx="48" cy="22" r="2.5" fill="#F0E8D8"/>
              </svg>
            </div>
            <div style={{
              fontWeight: 700, fontSize: 11, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: '#E2B858', marginBottom: 6,
            }}>Last One Standing</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 26, letterSpacing: '-0.02em',
              color: '#F0E8D8', lineHeight: 1.1,
            }}>Victory is yours</div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#5C5043', lineHeight: 1.4 }}>
              All opponents have been defeated. Head to review to celebrate the win and rate the game.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={onReview} style={{
              width: '100%', cursor: 'pointer',
              background: '#B06B2C', color: '#F0E8D8',
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
            <button onClick={onContinue} style={{
              width: '100%', cursor: 'pointer',
              background: '#1A1410', color: '#C5B9A5',
              border: '1px solid rgba(226,184,88,0.25)',
              borderRadius: 20,
              padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>Continue Playing</button>
          </div>
          <div style={{
            textAlign: 'center', fontSize: 11, color: '#8A7E6F',
            marginTop: 14, lineHeight: 1.4,
          }}>
            Closing this popup keeps you in the game.
          </div>
        </div>
      </div>
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
    2: { life: 40, name: 'Player 2', commander: null, claimed: false, colors: [], assignedColor: null },
    3: { life: 40, name: 'Player 3', commander: null, claimed: false, colors: [], assignedColor: null },
    4: { life: 40, name: 'Player 4', commander: null, claimed: false, colors: [], assignedColor: null },
    5: { life: 40, name: 'Player 5', commander: null, claimed: false, colors: [], assignedColor: null }
  });

  const [counters, setCounters] = useState<Record<number, { poison: number; experience: number; energy: number }>>({
    1: { poison: 0, experience: 0, energy: 0 },
    2: { poison: 0, experience: 0, energy: 0 },
    3: { poison: 0, experience: 0, energy: 0 },
    4: { poison: 0, experience: 0, energy: 0 },
    5: { poison: 0, experience: 0, energy: 0 }
  });

  const [gameLoaded, setGameLoaded] = useState(false);
  const [selectedCounterPlayer, setSelectedCounterPlayer] = useState(1);
  const [diceTab, setDiceTab] = useState('d20');
  const [diceResults, setDiceResults] = useState<Record<string, string>>({});
  const [rollingOpt, setRollingOpt] = useState<string | null>(null);
  const [joinSlot, setJoinSlot] = useState<number | null>(null);
  const [diceModalOpen, setDiceModalOpen] = useState(false);
  const [countersModalOpen, setCountersModalOpen] = useState(false);
  const [cmdrModalOpen, setCmdrModalOpen] = useState(false);
  const [cmdrFrom, setCmdrFrom] = useState(2);
  const [cmdrTo, setCmdrTo] = useState(1);
  const [cmdrDamage, setCmdrDamage] = useState<Record<number, Record<number, number>>>({});
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [podShortCode, setPodShortCode] = useState<string>('');
  const [playerUserIds, setPlayerUserIds] = useState<Record<number, string>>({});
  const [playerSeatNumbers, setPlayerSeatNumbers] = useState<Record<number, number>>({});
  const [commanderArt, setCommanderArt] = useState<Record<string, string>>({});

  const syncTimerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const diceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimersRef = useRef<Record<number, NodeJS.Timeout>>({});
  const repeatTimersRef = useRef<Record<number, NodeJS.Timeout>>({});

  const dirtyUntilRef = useRef<Record<string, number>>({});
  const isDirty = (key: string) => {
    const until = dirtyUntilRef.current[key];
    if (!until) return false;
    if (Date.now() > until) { delete dirtyUntilRef.current[key]; return false; }
    return true;
  };
  const debouncedSync = (key: string, fn: () => void) => {
    if (syncTimerRef.current[key]) clearTimeout(syncTimerRef.current[key]);
    dirtyUntilRef.current[key] = Date.now() + 2000;
    syncTimerRef.current[key] = setTimeout(() => {
      fn();
      setTimeout(() => { delete dirtyUntilRef.current[key]; }, 800);
    }, 300);
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

      // Fetch current user's profile name
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const myUserId = authUser?.id ?? null;
      const myDisplayName = authUser?.user_metadata?.display_name ?? null;

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
        if (slot > 5) return;
        const isEmptySeat = !p.user_id && !p.deck_id && !p.commander_name;
        const commanderName = deck?.commander_name ?? p.commander_name ?? null;
        const profileName = (p.user_id === myUserId && myDisplayName) ? myDisplayName : null;
        const displayName = profileName ?? (commanderName ? commanderName.split(',')[0] : `Player ${slot}`);

        newPlayers[slot] = {
          life: p.life_total ?? 40,
          name: displayName,
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
      setGameLoaded(true);

      // Load commander damage from Supabase (stored as damage RECEIVED per player)
      // Convert to cmdrDamage[from][to] format used by gridview
      const loadedCmdrDmg: Record<number, Record<number, number>> = {};
      game.players.forEach((p: any) => {
        const toSeat = p.seat_number ?? 1;
        if (toSeat > 5) return;
        const received = p.commander_damage_received;
        if (received && typeof received === 'object') {
          Object.entries(received).forEach(([key, amount]) => {
            const fromSeat = parseInt(key.replace('seat-', ''), 10);
            if (!isNaN(fromSeat) && typeof amount === 'number' && amount > 0) {
              if (!loadedCmdrDmg[fromSeat]) loadedCmdrDmg[fromSeat] = {};
              loadedCmdrDmg[fromSeat][toSeat] = amount;
            }
          });
        }
      });
      setCmdrDamage(loadedCmdrDmg);

      const channel = supabase
        .channel(`game-${gameId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` }, (payload: any) => {
          const row = payload.new;
          if (!row) return;
          const num = row.seat_number;
          if (num && num <= 5) {
            if (!isDirty(`life-${num}`)) {
              setPlayers(prev => ({ ...prev, [num]: { ...prev[num], life: row.life_total ?? prev[num].life } }));
            }
            setCounters(prev => {
              const updated = { ...prev[num] };
              if (!isDirty(`poison-${num}`)) updated.poison = row.poison_counters ?? prev[num].poison;
              if (!isDirty(`experience-${num}`)) updated.experience = row.experience_counters ?? prev[num].experience;
              if (!isDirty(`energy-${num}`)) updated.energy = row.energy_counters ?? prev[num].energy;
              return { ...prev, [num]: updated };
            });
            // Commander damage received — convert from Supabase format to cmdrDamage[from][to]
            if (!isDirty(`cmdr-${num}`) && row.commander_damage_received && typeof row.commander_damage_received === 'object') {
              const received = row.commander_damage_received as Record<string, number>;
              setCmdrDamage(prev => {
                const next = { ...prev };
                Object.entries(received).forEach(([key, amount]) => {
                  const fromSeat = parseInt(key.replace('seat-', ''), 10);
                  if (!isNaN(fromSeat) && typeof amount === 'number') {
                    next[fromSeat] = { ...(next[fromSeat] ?? {}), [num]: amount };
                  }
                });
                return next;
              });
            }
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
    loadGame();
  }, [gameId]);

  // Fetch commander art from Scryfall for each claimed player. De-duped by commander name.
  useEffect(() => {
    const fetchedNames = new Set<string>();
    Object.values(players).forEach((p) => {
      const name = p?.commander;
      if (!name || !p?.claimed) return;
      if (commanderArt[name] || fetchedNames.has(name)) return;
      fetchedNames.add(name);
      fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((card) => {
          if (!card) return;
          const art = card.image_uris?.art_crop || card.card_faces?.[0]?.image_uris?.art_crop;
          if (art) {
            setCommanderArt((prev) => ({ ...prev, [name]: art }));
          }
        })
        .catch(() => { /* Scryfall offline or rate-limited — fall back to gradient */ });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);


  // Loading screen
  if (!gameLoaded) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `radial-gradient(ellipse 80% 40% at 50% 0%, rgba(176,107,44,0.18) 0%, transparent 100%),
          radial-gradient(ellipse 50% 35% at 0% 35%, rgba(176,107,44,0.12) 0%, transparent 100%),
          radial-gradient(ellipse 50% 35% at 100% 55%, rgba(176,107,44,0.12) 0%, transparent 100%),
          radial-gradient(ellipse 70% 30% at 50% 100%, rgba(176,107,44,0.14) 0%, transparent 100%),
          radial-gradient(ellipse 40% 25% at 25% 75%, rgba(176,107,44,0.06) 0%, transparent 100%),
          radial-gradient(ellipse 40% 25% at 80% 20%, rgba(176,107,44,0.06) 0%, transparent 100%),
          ${DARK.bg}`,
      }}>
        <DarkCompassBg centered/>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 40%, transparent 100%)',
          pointerEvents: 'none' }}/>
        <svg width="72" height="72" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'relative', zIndex: 2, opacity: 0.55 }}>
          <defs><clipPath id="aura-gv-load"><ellipse cx="32" cy="32" rx="22" ry="26"/></clipPath></defs>
          <circle cx="32" cy="36" r="2.4" fill="rgba(226,184,88,0.7)"/>
          <g clipPath="url(#aura-gv-load)">
            <polygon points="8,60 30,4 31,4 24,60" fill="rgba(226,184,88,0.7)"/>
            <polygon points="40,60 33,4 34,4 56,60" fill="rgba(226,184,88,0.7)"/>
          </g>
        </svg>
      </div>
    );
  }

  // Merge counters + cmdr damage onto a player so cells get all visual data
  const enrichPlayer = (n: number, isYou = false) => {
    const base = players[n];
    if (!base) return { life: 40, name: `Player ${n}`, commander: null, claimed: false, colors: [] as string[], isYou, counters: { poison: 0, energy: 0, experience: 0 }, cmdrDamage: [] as { from: string; amount: number; colorIndex: number }[] };
    const damages: { from: string; amount: number; colorIndex: number }[] = [];
    Object.keys(players).map(Number).filter(fromN => fromN !== n).forEach(fromN => {
      const amount = cmdrDamage[fromN]?.[n] ?? 0;
      if (amount <= 0) return;
      const heatIdx = Math.min(
        CMDR_DMG_COLORS.length - 1,
        Math.floor((amount / 21) * CMDR_DMG_COLORS.length)
      );
      damages.push({
        from: players[fromN]?.name || `P${fromN}`,
        amount,
        colorIndex: heatIdx,
      });
    });
    return {
      ...base,
      isYou,
      art: base.commander ? commanderArt[base.commander] : undefined,
      counters: counters[n] ?? { poison: 0, energy: 0, experience: 0 },
      cmdrDamage: damages,
    };
  };

  const startLifeHold = (playerNum: number, delta: number) => {
    if (holdTimersRef.current[playerNum]) clearTimeout(holdTimersRef.current[playerNum]);
    if (repeatTimersRef.current[playerNum]) clearInterval(repeatTimersRef.current[playerNum]);
    holdTimersRef.current[playerNum] = setTimeout(() => {
      handleLifeChange(playerNum, delta);
      repeatTimersRef.current[playerNum] = setInterval(() => {
        handleLifeChange(playerNum, delta);
      }, 120);
    }, 400);
  };

  const stopLifeHold = (playerNum: number) => {
    if (holdTimersRef.current[playerNum]) { clearTimeout(holdTimersRef.current[playerNum]); delete holdTimersRef.current[playerNum]; }
    if (repeatTimersRef.current[playerNum]) { clearInterval(repeatTimersRef.current[playerNum]); delete repeatTimersRef.current[playerNum]; }
  };

  // ── Victory detection (logged-in user only) ──
  const auth = useAuth();
  const [showVictory, setShowVictory] = useState(false);
  const [victoryDismissed, setVictoryDismissed] = useState(false);

  useEffect(() => {
    const uid = auth?.user?.id;
    if (!uid || victoryDismissed) return;
    const mySeatEntry = Object.entries(playerUserIds).find(([, v]) => v === uid);
    if (!mySeatEntry) return;
    const mySeat = Number(mySeatEntry[0]);
    const me = players[mySeat];
    if (!me) return;
    const myPoison = counters[mySeat]?.poison ?? 0;
    const myCmdrLethal = Object.values(cmdrDamage).some((m: any) => (m?.[mySeat] ?? 0) >= 21);
    if ((me.life ?? 40) <= 0 || myPoison >= 10 || myCmdrLethal) return; // I'm not alive
    const otherSeats = Object.keys(players).map(Number).filter(n => n !== mySeat && players[n]?.claimed);
    if (otherSeats.length === 0) return;
    const allDead = otherSeats.every(n => {
      const opp = players[n];
      const oppPoison = counters[n]?.poison ?? 0;
      const oppCmdrLethal = Object.values(cmdrDamage).some((m: any) => (m?.[n] ?? 0) >= 21);
      return (opp?.life ?? 40) <= 0 || oppPoison >= 10 || oppCmdrLethal;
    });
    if (allDead) setShowVictory(true);
  }, [players, counters, cmdrDamage, playerUserIds, auth?.user?.id, victoryDismissed]);

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

  const handleRevive = (playerNum: number) => {
    let revivedLife: number | null = null;
    let revivedPoison: number | null = null;
    setPlayers(prev => {
      const cur = prev[playerNum];
      if (!cur || (cur.life ?? 1) > 0) return prev;
      revivedLife = 1;
      return { ...prev, [playerNum]: { ...cur, life: 1 } };
    });
    setCounters(prev => {
      const cur = prev[playerNum] ?? { poison: 0, experience: 0, energy: 0 };
      if ((cur.poison ?? 0) < 10) return prev;
      revivedPoison = Math.min(9, cur.poison);
      return { ...prev, [playerNum]: { ...cur, poison: revivedPoison } };
    });
    setCmdrDamage(prev => {
      const next: typeof prev = { ...prev };
      let changed = false;
      for (const fromN of Object.keys(next).map(Number)) {
        const dmgFromN = next[fromN] ?? {};
        if ((dmgFromN[playerNum] ?? 0) >= 21) {
          next[fromN] = { ...dmgFromN, [playerNum]: 20 };
          changed = true;
        }
      }
      if (changed && gameId) {
        const seat = playerSeatNumbers[playerNum];
        const map: Record<string, number> = {};
        for (const fromN of Object.keys(next).map(Number)) {
          const v = next[fromN]?.[playerNum] ?? 0;
          if (v > 0) {
            const fromSeat = playerSeatNumbers[fromN];
            if (fromSeat) map[`seat-${fromSeat}`] = v;
          }
        }
        if (seat) {
          debouncedSync(`cmdr-${playerNum}`, () => {
            updateCommanderDamageBySeat(gameId, seat, map).catch(() => {});
          });
        }
      }
      return changed ? next : prev;
    });
    // Sync revived life/poison to Supabase so realtime doesn't revert it
    if (gameId && revivedLife !== null) {
      const userId = playerUserIds[playerNum];
      const seat = playerSeatNumbers[playerNum];
      debouncedSync(`life-${playerNum}`, () => {
        if (userId) updateLifeTotal(gameId, userId, revivedLife as number).catch(() => {});
        else if (seat) updateLifeBySeat(gameId, seat, revivedLife as number).catch(() => {});
      });
    }
    if (gameId && revivedPoison !== null) {
      const userId = playerUserIds[playerNum];
      const seat = playerSeatNumbers[playerNum];
      debouncedSync(`poison-${playerNum}`, () => {
        if (userId) updatePoisonCounters(gameId, userId, revivedPoison as number).catch(() => {});
        else if (seat) updatePoisonBySeat(gameId, seat, revivedPoison as number).catch(() => {});
      });
    }
  };

  const handleCounterChange = (type: 'poison' | 'experience' | 'energy', action: 'plus' | 'minus') => {
    const playerNum = selectedCounterPlayer;
    setCounters(prev => {
      const cap = type === 'poison' ? 10 : 999;
      const newVal = action === 'plus' ? Math.min(cap, prev[playerNum][type] + 1) : Math.max(0, prev[playerNum][type] - 1);

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

  const handleCmdrChange = (delta: number) => {
    setCmdrDamage(prev => {
      const cur = prev[cmdrFrom]?.[cmdrTo] ?? 0;
      const next = Math.max(0, Math.min(99, cur + delta));
      const updated = {
        ...prev,
        [cmdrFrom]: {
          ...(prev[cmdrFrom] ?? {}),
          [cmdrTo]: next,
        }
      };

      // Sync to Supabase: rebuild damage map for the RECEIVING player (cmdrTo)
      if (gameId) {
        const damageMap: Record<string, number> = {};
        Object.entries(updated).forEach(([from, targets]) => {
          const amount = (targets as Record<number, number>)[cmdrTo];
          if (amount && amount > 0) damageMap[`seat-${from}`] = amount;
        });
        debouncedSync(`cmdr-${cmdrTo}`, () => {
          const userId = playerUserIds[cmdrTo];
          const seat = playerSeatNumbers[cmdrTo];
          if (userId) updateCommanderDamage(gameId, userId, damageMap).catch(() => {});
          else if (seat) updateCommanderDamageBySeat(gameId, seat, damageMap).catch(() => {});
        });
      }

      return updated;
    });
  };

  const handleDiceRoll = (optId: string) => {
    // If a roll is already in progress, cancel it and start fresh — every tap re-rolls.
    if (diceIntervalRef.current) {
      clearInterval(diceIntervalRef.current);
      diceIntervalRef.current = null;
    }
    setDiceTab(optId);
    setRollingOpt(optId);

    const rollOne = (final: boolean): string => {
      if (optId === 'd6') return String(Math.floor(Math.random() * 6) + 1);
      if (optId === 'd20') return String(Math.floor(Math.random() * 20) + 1);
      if (optId === 'coin') {
        const v = Math.random() < 0.5;
        return final ? (v ? 'Heads' : 'Tails') : (v ? 'H' : 'T');
      }
      if (optId === 'random') {
        // Include claimed players first; fall back to ALL slots so the random
        // pick still varies even when other seats are unclaimed.
        const claimed = Object.entries(players).filter(([, p]) => p.claimed);
        const pool = claimed.length >= 2 ? claimed : Object.entries(players);
        if (pool.length === 0) return '—';
        const [num, p] = pool[Math.floor(Math.random() * pool.length)];
        return p.name || `Player ${num}`;
      }
      return '?';
    };

    let frame = 0;
    diceIntervalRef.current = setInterval(() => {
      frame++;
      setDiceResults(prev => ({ ...prev, [optId]: rollOne(false) }));
      if (frame >= 14) {
        if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
        diceIntervalRef.current = null;
        setDiceResults(prev => ({ ...prev, [optId]: rollOne(true) }));
        setRollingOpt(null);
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

    .grid-container-5p { flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 10px; min-height: 0; overflow: hidden; }
    .grid-top-5p { flex: 3; display: flex; flex-direction: row; gap: 10px; min-height: 0; }
    .grid-bottom-5p { flex: 1; display: flex; min-height: 0; }
    .grid-col-5p { flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
    .grid-cell-5p { flex: 1; min-height: 0; }
    .grid-bottom-cell { flex: 1; }

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

    .player-selector { display: flex; gap: 8px; margin-bottom: 18px; justify-content: center; flex-wrap: wrap; }
    .player-selector-btn { width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${DARK.lineStrong}; background: ${DARK.bgDeep}; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: var(--font-ui); font-weight: 700; font-size: 15px; color: ${DARK.ink}; transition: all 0.2s ease; position: relative; }
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

    @keyframes revive-pulse {
      0%, 100% {
        box-shadow: inset 0 0 0 3px #9E2B2B, inset 0 0 40px rgba(158,43,43,0.40);
        background: radial-gradient(ellipse at 50% 50%, rgba(158,43,43,0.45) 0%, rgba(10,6,4,0.92) 65%);
      }
      50% {
        box-shadow: inset 0 0 0 3px #C84545, inset 0 0 60px rgba(200,69,69,0.65);
        background: radial-gradient(ellipse at 50% 50%, rgba(200,69,69,0.55) 0%, rgba(10,6,4,0.95) 70%);
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        <div className="grid-container-5p">
          {/* Top section: 2 columns side-by-side, each with 2 stacked sideways cells */}
          <div className="grid-top-5p">
            {/* Col 1: P2 + P3, both rotated 90° */}
            <div className="grid-col-5p">
              <div className="grid-cell-5p">
                {players[2].claimed ? (
                  <SidewaysCell
                    player={enrichPlayer(2)}
                    rotation={90}
                    onTapLeft={() => handleLifeChange(2, -1)}
                    onTapRight={() => handleLifeChange(2, 1)}
                    onHoldLeftStart={() => startLifeHold(2, -1)}
                    onHoldRightStart={() => startLifeHold(2, 1)}
                    onHoldEnd={() => stopLifeHold(2)}
              onRevive={() => handleRevive(2)}
                  />
                ) : (
                  <SidewaysEmptyCell
                    seatLabel="Player 2"
                    life={players[2].life}
                    counters={counters[2]}
                    cmdrDamage={enrichPlayer(2).cmdrDamage}
                    rotation={90}
                    onClaimSeat={() => openJoinModal(2)}
                  showQR={joinModalOpen && joinSlot === 2}
                  qrCodeUrl={qrCodeUrl}
                  podShortCode={podShortCode}
                  onCloseQR={() => setJoinModalOpen(false)}
                    onTapLeft={() => handleLifeChange(2, -1)}
                    onTapRight={() => handleLifeChange(2, 1)}
                    onHoldLeftStart={() => startLifeHold(2, -1)}
                    onHoldRightStart={() => startLifeHold(2, 1)}
                    onHoldEnd={() => stopLifeHold(2)}
              onRevive={() => handleRevive(2)}
                  />
                )}
              </div>
              <div className="grid-cell-5p">
                {players[3].claimed ? (
                  <SidewaysCell
                    player={enrichPlayer(3)}
                    rotation={90}
                    onTapLeft={() => handleLifeChange(3, -1)}
                    onTapRight={() => handleLifeChange(3, 1)}
                    onHoldLeftStart={() => startLifeHold(3, -1)}
                    onHoldRightStart={() => startLifeHold(3, 1)}
                    onHoldEnd={() => stopLifeHold(3)}
              onRevive={() => handleRevive(3)}
                  />
                ) : (
                  <SidewaysEmptyCell
                    seatLabel="Player 3"
                    life={players[3].life}
                    counters={counters[3]}
                    cmdrDamage={enrichPlayer(3).cmdrDamage}
                    rotation={90}
                    onClaimSeat={() => openJoinModal(3)}
                  showQR={joinModalOpen && joinSlot === 3}
                  qrCodeUrl={qrCodeUrl}
                  podShortCode={podShortCode}
                  onCloseQR={() => setJoinModalOpen(false)}
                    onTapLeft={() => handleLifeChange(3, -1)}
                    onTapRight={() => handleLifeChange(3, 1)}
                    onHoldLeftStart={() => startLifeHold(3, -1)}
                    onHoldRightStart={() => startLifeHold(3, 1)}
                    onHoldEnd={() => stopLifeHold(3)}
              onRevive={() => handleRevive(3)}
                  />
                )}
              </div>
            </div>
            {/* Col 2: P4 + P5, both rotated -90° */}
            <div className="grid-col-5p">
              <div className="grid-cell-5p">
                {players[4].claimed ? (
                  <SidewaysCell
                    player={enrichPlayer(4)}
                    rotation={-90}
                    onTapLeft={() => handleLifeChange(4, -1)}
                    onTapRight={() => handleLifeChange(4, 1)}
                    onHoldLeftStart={() => startLifeHold(4, -1)}
                    onHoldRightStart={() => startLifeHold(4, 1)}
                    onHoldEnd={() => stopLifeHold(4)}
              onRevive={() => handleRevive(4)}
                  />
                ) : (
                  <SidewaysEmptyCell
                    seatLabel="Player 4"
                    life={players[4].life}
                    counters={counters[4]}
                    cmdrDamage={enrichPlayer(4).cmdrDamage}
                    rotation={-90}
                    onClaimSeat={() => openJoinModal(4)}
                  showQR={joinModalOpen && joinSlot === 4}
                  qrCodeUrl={qrCodeUrl}
                  podShortCode={podShortCode}
                  onCloseQR={() => setJoinModalOpen(false)}
                    onTapLeft={() => handleLifeChange(4, -1)}
                    onTapRight={() => handleLifeChange(4, 1)}
                    onHoldLeftStart={() => startLifeHold(4, -1)}
                    onHoldRightStart={() => startLifeHold(4, 1)}
                    onHoldEnd={() => stopLifeHold(4)}
              onRevive={() => handleRevive(4)}
                  />
                )}
              </div>
              <div className="grid-cell-5p">
                {players[5].claimed ? (
                  <SidewaysCell
                    player={enrichPlayer(5)}
                    rotation={-90}
                    onTapLeft={() => handleLifeChange(5, -1)}
                    onTapRight={() => handleLifeChange(5, 1)}
                    onHoldLeftStart={() => startLifeHold(5, -1)}
                    onHoldRightStart={() => startLifeHold(5, 1)}
                    onHoldEnd={() => stopLifeHold(5)}
              onRevive={() => handleRevive(5)}
                  />
                ) : (
                  <SidewaysEmptyCell
                    seatLabel="Player 5"
                    life={players[5].life}
                    counters={counters[5]}
                    cmdrDamage={enrichPlayer(5).cmdrDamage}
                    rotation={-90}
                    onClaimSeat={() => openJoinModal(5)}
                  showQR={joinModalOpen && joinSlot === 5}
                  qrCodeUrl={qrCodeUrl}
                  podShortCode={podShortCode}
                  onCloseQR={() => setJoinModalOpen(false)}
                    onTapLeft={() => handleLifeChange(5, -1)}
                    onTapRight={() => handleLifeChange(5, 1)}
                    onHoldLeftStart={() => startLifeHold(5, -1)}
                    onHoldRightStart={() => startLifeHold(5, 1)}
                    onHoldEnd={() => stopLifeHold(5)}
              onRevive={() => handleRevive(5)}
                  />
                )}
              </div>
            </div>
          </div>
          {/* Bottom: P1 (You), normal orientation, full width */}
          <div className="grid-bottom-5p">
            <div className="grid-bottom-cell">
              <NormalCell
                player={enrichPlayer(1, true)}
                onTapLeft={() => handleLifeChange(1, -1)}
                onTapRight={() => handleLifeChange(1, 1)}
                onHoldLeftStart={() => startLifeHold(1, -1)}
                onHoldRightStart={() => startLifeHold(1, 1)}
                onHoldEnd={() => stopLifeHold(1)}
              onRevive={() => handleRevive(1)}
                lifeSize={72}
              />
            </div>
          </div>
        </div>

        <GameNav
          onDiceClick={() => setDiceModalOpen(true)}
          onCountersClick={() => setCountersModalOpen(true)}
          onCmdrClick={() => setCmdrModalOpen(true)}
          podId={podId}
          gameId={gameId}
        />
      </div>

      {diceModalOpen && (
        <DiceModalLandscape
          open={diceModalOpen}
          onClose={() => setDiceModalOpen(false)}
          players={players}
          selectedDiceOpt={diceTab}
          diceResults={diceResults}
          onRoll={handleDiceRoll}
        />
      )}

      {countersModalOpen && (
        <CountersModalLandscape
          open={countersModalOpen}
          onClose={() => setCountersModalOpen(false)}
          players={players}
          selectedNum={selectedCounterPlayer}
          setSelectedNum={setSelectedCounterPlayer}
          counters={counters}
          onChange={handleCounterChange}
        />
      )}

      {cmdrModalOpen && (
        <CmdrDmgModalLandscape
          open={cmdrModalOpen}
          onClose={() => setCmdrModalOpen(false)}
          players={players}
          fromNum={cmdrFrom}
          toNum={cmdrTo}
          setFromNum={setCmdrFrom}
          setToNum={setCmdrTo}
          damage={cmdrDamage}
          onChange={handleCmdrChange}
        />
      )}


      {showVictory && (
        <VictoryPopup
          onContinue={() => { setShowVictory(false); setVictoryDismissed(true); }}
          onReview={() => { setShowVictory(false); setVictoryDismissed(true); router.push(`/review?podId=${podId}&gameId=${gameId}`); }}
        />
      )}

      {toast && (
        <div className="toast show">
          {toast}
        </div>
      )}
    </>
  );
}

export default function GridView5P() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: DARK.ink3 }}>Loading...</div>}>
      <ScreenBg>
        <PageContent />
      </ScreenBg>
    </Suspense>
  );
}
