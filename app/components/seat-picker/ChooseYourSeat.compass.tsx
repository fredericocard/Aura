'use client';

/**
 * Aura — "Choose your seat" modal · COMPASS style (shared base)
 *
 * Internal components, theme constants, table ornament, ChairOutline,
 * keyframe styles, and the SeatModal root used by all pod-size wrappers
 * (ChooseYourSeat2P / 3P / 4P / 5P).
 */

import React from 'react';

// ── Seat tile dimensions (px) ────────────────────────────────────
export const SEAT_BOX = {
  top:    { w: 64, h: 50 },
  bottom: { w: 64, h: 50 },
  left:   { w: 50, h: 64 },
  right:  { w: 50, h: 64 },
};
export const SEAT_OFFSET = 14;

export type SeatSide = 'top' | 'bottom' | 'left' | 'right';

export function seatTransform(side: SeatSide) {
  const { w, h } = SEAT_BOX[side];
  switch (side) {
    case 'top':    return { x: -w / 2, y: -(h + SEAT_OFFSET) };
    case 'bottom': return { x: -w / 2, y: SEAT_OFFSET };
    case 'left':   return { x: -(w + SEAT_OFFSET), y: -h / 2 };
    case 'right':  return { x: SEAT_OFFSET, y: -h / 2 };
    default:       return { x: 0, y: 0 };
  }
}

// ── Compass theme ────────────────────────────────────────────────
export const COMPASS_THEME = {
  modalBg: 'var(--parchment-card)',
  modalBorder: '1px solid var(--line-strong)',
  tableFill: 'var(--parchment-deep)',
  tableStroke: 'var(--copper)',
  tableShadow:
    'inset 0 0 0 1px rgba(176,107,44,0.25), inset 0 0 30px rgba(176,107,44,0.08)',
  emptyStroke: 'var(--copper)',
  takenRing: 'var(--copper)',
  title: 'var(--ink)',
  subtitle: 'var(--fg-subtle)',
};

// ── Aura mark (used inside the compass rose) ─────────────────────
export function AuraMarkRaw({ size = 22, color = 'var(--copper)' }: { size?: number; color?: string }) {
  const cid = `amr-${size}-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }}>
      <circle cx="32" cy="36" r="2.4" fill={color}/>
      <defs>
        <clipPath id={cid}>
          <ellipse cx="32" cy="32" rx="22" ry="26"/>
        </clipPath>
      </defs>
      <g clipPath={`url(#${cid})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color}/>
        <polygon points="40,60 33,4 34,4 56,60" fill={color}/>
      </g>
    </svg>
  );
}

// ── Compass rose ornament drawn inside the table ─────────────────
export function CompassOrnament({ w, h }: { w: number; h: number }) {
  const cx = w / 2, cy = h / 2;
  const r2 = Math.min(w, h) * 0.42;
  return (
    <svg width={w} height={h} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <g stroke="var(--copper)" strokeWidth="0.6" fill="none" opacity="0.5">
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return (
            <line key={i}
              x1={cx + Math.cos(a) * 22} y1={cy + Math.sin(a) * 22}
              x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2}/>
          );
        })}
        <circle cx={cx} cy={cy} r="22"/>
        <circle cx={cx} cy={cy} r={Math.min(w, h) * 0.32} strokeDasharray="1 4"/>
      </g>
      <g transform={`translate(${cx - 12} ${cy - 12})`}>
        <AuraMarkRaw size={24} color="var(--copper)"/>
      </g>
    </svg>
  );
}

// ── Empty-seat chair outline (dashed, with "+" sigil) ────────────
export function ChairOutline({ color, side }: { color: string; side: SeatSide }) {
  const rotate =
    side === 'top'    ? 0   :
    side === 'bottom' ? 180 :
    side === 'left'   ? -90 :
    90;
  return (
    <svg viewBox="0 0 60 60"
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        transform: `rotate(${rotate}deg)`,
        transformOrigin: 'center',
        overflow: 'visible',
      }}>
      <path d="M14 10 Q 30 6 46 10 L 46 16 Q 30 12 14 16 Z"
        fill="none" stroke={color} strokeWidth="1.5"
        strokeDasharray="3 2.5" strokeLinejoin="round" strokeLinecap="round"/>
      <rect x="10" y="20" width="40" height="34" rx="6"
        fill="none" stroke={color} strokeWidth="1.5"
        strokeDasharray="3 2.5" strokeLinejoin="round"/>
      <path d="M30 30 L30 44 M23 37 L37 37"
        stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export type SeatClaim = { id: string; name: string; art: string };

export type SeatDef = {
  id: string;
  side: SeatSide;
  x: number;
  y: number;
  _px?: { left: number; top: number };
};

// ── Single seat tile ────────────────────────────────────────────
export function Seat({
  seat,
  claim,
  onClaim,
  justClaimedId,
  idleIndex = 0,
  youId,
}: {
  seat: SeatDef & { _px: { left: number; top: number } };
  claim?: SeatClaim;
  onClaim: (id: string) => void;
  justClaimedId: string | null;
  idleIndex?: number;
  youId?: string;
}) {
  const isTaken = !!claim;
  const isMe = !!(claim && youId && claim.id === youId);
  const box = SEAT_BOX[seat.side];
  const fresh = justClaimedId === seat.id;
  const theme = COMPASS_THEME;

  const empty = (
    <button
      type="button"
      onClick={() => onClaim(seat.id)}
      aria-label={`Claim seat ${seat.id}`}
      style={{
        position: 'absolute', inset: 0,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 120ms var(--ease, ease)',
      }}
      onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.93)'; }}
      onTouchEnd={(e)   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        animation: 'seatAuraIdle 5.4s ease-in-out infinite',
        animationDelay: `${idleIndex * 0.6}s`,
      }}>
        <ChairOutline color={theme.emptyStroke} side={seat.side}/>
      </div>
    </button>
  );

  // Taken seats that are NOT the current user are still tappable —
  // claimSeat() will decide server-side if the takeover is allowed
  // (e.g. guest-occupied seats can be taken over).
  const takenContent = (
    <div style={{
      position: 'absolute',
      width: 50, height: 50,
      left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
      overflow: 'hidden',
      border: `2px solid ${theme.takenRing}`,
      background: 'rgba(176,107,44,0.10)',
      boxShadow: '0 2px 8px rgba(43,33,24,0.22)',
    }}>
      {claim?.art && (
        <img
          src={claim.art}
          alt={claim?.name ?? ''}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}
    </div>
  );

  const taken = isMe ? takenContent : (
    <button
      type="button"
      onClick={() => onClaim(seat.id)}
      aria-label={`Take over seat ${seat.id}`}
      style={{
        position: 'absolute', inset: 0,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {takenContent}
    </button>
  );

  return (
    <div style={{
      position: 'absolute',
      left: seat._px.left, top: seat._px.top,
      width: box.w, height: box.h,
    }}>
      {fresh && (
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            border: '2px solid var(--copper)',
            animation: 'seatWaxRipple 720ms var(--ease, ease) forwards',
          }}/>
          <div style={{
            position: 'absolute', inset: 0,
            width: 50, height: 50, borderRadius: '50%',
            border: '1.5px solid var(--copper)', opacity: 0.55,
            animation: 'seatWaxRipple 920ms var(--ease, ease) 140ms forwards',
          }}/>
        </div>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: isTaken ? 0 : 1,
        transition: 'opacity 160ms var(--ease, ease)',
      }}>{empty}</div>
      <div style={{
        position: 'absolute', inset: 0,
        opacity: isTaken ? 1 : 0,
        pointerEvents: isTaken ? 'auto' : 'none',
        animation: fresh ? 'seatWaxStamp 520ms cubic-bezier(.34,1.56,.64,1) both' : 'none',
        transition: fresh ? 'none' : 'opacity 220ms var(--ease, ease) 80ms',
      }}>{taken}</div>
    </div>
  );
}

// ── Reactive title copy ──────────────────────────────────────────
export function titleFor(claimedCount: number, total: number, youSeated: boolean) {
  const empty = total - claimedCount;
  if (claimedCount === 0)       return { eyebrow: `${total}-player pod`, head: 'Choose your seat',     sub: 'Tap where you’re sitting at the table.' };
  if (youSeated && empty > 0)   return { eyebrow: 'You’re in',           head: 'Waiting on the pod…',  sub: `${empty} ${empty === 1 ? 'seat' : 'seats'} still open.` };
  if (youSeated && empty === 0) return { eyebrow: 'Pod full',            head: 'All set',              sub: 'Starting the game.' };
  if (empty === 1)              return { eyebrow: 'Last seat',           head: 'Your spot is waiting', sub: 'Tap it to take your place.' };
  return { eyebrow: `${claimedCount} of ${total} seated`, head: 'Take your place', sub: 'Tap an open seat at the table.' };
}

export type SeatModalCompassProps = {
  pod: number;
  layout: SeatDef[];
  tableW: number;
  tableH: number;
  claimed: Record<string, SeatClaim>;
  onClaim: (id: string) => void;
  justClaimedId?: string | null;
  you: SeatClaim;
};

// ── Modal shell (consumed by per-pod wrappers) ───────────────────
export function SeatModalCompass({
  pod,
  layout,
  tableW,
  tableH,
  claimed,
  onClaim,
  justClaimedId = null,
  you,
}: SeatModalCompassProps) {
  const claimedCount = Object.keys(claimed).length;
  const youSeated = Object.values(claimed).some((p) => p?.id === you.id);
  const ttl = titleFor(claimedCount, layout.length, youSeated);
  const theme = COMPASS_THEME;

  const seats = layout.map((s) => {
    const t = seatTransform(s.side);
    return {
      ...s,
      _px: {
        left: s.x * tableW + t.x,
        top:  s.y * tableH + t.y,
      },
    };
  });

  const padX = 64, padY = 64;

  return (
    <div style={{
      width: tableW + padX * 2 + 24,
      borderRadius: 24,
      background: theme.modalBg,
      border: theme.modalBorder,
      boxShadow: '0 30px 60px -16px rgba(43,33,24,0.45), 0 4px 0 rgba(43,33,24,0.06)',
      padding: '18px 16px 16px',
      fontFamily: 'var(--font-ui)',
      color: theme.title,
      position: 'relative',
    }}>
      <div key={ttl.head} style={{
        textAlign: 'center', marginBottom: 6,
        animation: 'titleSwap 320ms var(--ease, ease) both',
      }}>
        <div style={{
          fontSize: 10, letterSpacing: '0.22em',
          textTransform: 'uppercase', fontWeight: 700,
          color: 'var(--copper)', marginBottom: 4,
        }}>{ttl.eyebrow}</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 24,
          letterSpacing: '-0.01em', lineHeight: 1.1, color: theme.title,
        }}>{ttl.head}</div>
        <div style={{
          fontSize: 12, color: theme.subtitle, marginTop: 4,
        }}>{ttl.sub}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
          {Array.from({ length: layout.length }).map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: 999,
              background: i < claimedCount ? 'var(--copper)' : 'transparent',
              border: `1px solid ${i < claimedCount ? 'var(--copper)' : 'var(--line-strong)'}`,
              transition: 'background 220ms var(--ease, ease)',
            }}/>
          ))}
        </div>
      </div>

      <div style={{
        position: 'relative',
        width: tableW + padX * 2,
        height: tableH + padY * 2,
        margin: '8px auto 4px',
      }}>
        <div style={{
          position: 'absolute',
          left: padX, top: padY,
          width: tableW, height: tableH,
          background: theme.tableFill,
          border: `1px solid ${theme.tableStroke}`,
          borderRadius: 24,
          boxShadow: theme.tableShadow,
          animation: 'tableBreathe 4.2s ease-in-out infinite',
          transformOrigin: 'center',
        }}>
          <CompassOrnament w={tableW} h={tableH}/>
        </div>
        <div style={{
          position: 'absolute', left: padX, top: padY,
          width: tableW, height: tableH,
        }}>
          {seats.map((s, i) => (
            <Seat key={s.id}
              seat={s}
              claim={claimed[s.id]}
              onClaim={onClaim}
              justClaimedId={justClaimedId ?? null}
              idleIndex={i}
              youId={you.id}/>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Keyframes — mount once in your tree ───────────────────
export function ChooseYourSeatStyles() {
  return (
    <style>{`
      @keyframes seatAuraIdle {
        0%, 100% {
          filter:
            drop-shadow(0 0 0px rgba(176,107,44,0))
            drop-shadow(0 0 0px rgba(176,107,44,0));
        }
        50% {
          filter:
            drop-shadow(0 0 4px rgba(176,107,44,0.85))
            drop-shadow(0 0 10px rgba(176,107,44,0.45));
        }
      }
      @keyframes seatWaxStamp {
        0%   { transform: scale(2.4); opacity: 0; }
        55%  { transform: scale(0.92); opacity: 1; }
        78%  { transform: scale(1.05); }
        100% { transform: scale(1);    opacity: 1; }
      }
      @keyframes seatWaxRipple {
        0%   { transform: scale(0.7); opacity: 0.85; }
        100% { transform: scale(2.4); opacity: 0;    }
      }
      @keyframes tableBreathe {
        0%, 100% { transform: scale(1); }
        50%      { transform: scale(1.012); }
      }
      @keyframes titleSwap {
        0%   { opacity: 0; transform: translateY(4px); }
        100% { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );
}
