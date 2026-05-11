'use client';

import React, { useEffect, useId, useState, CSSProperties, ReactNode } from 'react';

// Total runtime of the in-place defeat animation, ms.
export const ZERO_FADE_DEFAULT_DURATION = 320 + 340 + 1200; // 1860ms

function pct(at: number, total: number) {
  return ((at / total) * 100).toFixed(2);
}

// ─── useDefeatAnimation ────────────────────────────────────────────────────
// Lets a cell animate its own existing life number in place when defeated.
//
// Returns:
//   • keyframesNode      — a <style> element to drop into the cell.
//   • lifeAnimationStyle — spread on the life number's element to apply the
//                          crimson-pop / parchment-settle / ash-drain animation.
//                          When not defeated, this is an empty object.
//   • fadeStyle          — spread on every other element that should disappear
//                          when defeated (commander art, name row, mana dots,
//                          counters, tap-zone hints).
//   • pulseAndWispsNode  — renders the crimson pulse + ash wisps anchored
//                          to the cell center. null when not defeated.

export function useDefeatAnimation(
  defeated: boolean,
  triggerKey: string | number = 0,
  opts?: {
    color?: string;
    hot?: string;
    glow?: string;
    pulseColor?: string;
    ashColor?: string;
    ashOpacity?: number;
    smokeColor?: string;
    smokeCount?: number;
    inMs?: number;
    holdMs?: number;
    outMs?: number;
    /** Width of the crimson pulse, in px. Roughly 1.6x the life font size. */
    pulseSize?: number;
  },
) {
  const rawId = useId();
  const id = rawId.replace(/[^a-z0-9]/gi, '');

  const color = opts?.color ?? 'var(--parchment, #F5EFE2)';
  const hot = opts?.hot ?? '#E78A85';
  const glow = opts?.glow ?? 'rgba(158,43,43,0.7)';
  const pulseColor = opts?.pulseColor ?? 'rgba(158,43,43,0.55)';
  const ashColor = opts?.ashColor ?? 'rgba(245,239,226,0.32)';
  const ashOpacity = opts?.ashOpacity ?? 0.6;
  const smokeColor = opts?.smokeColor ?? 'rgba(245,239,226,0.55)';
  const smokeCount = opts?.smokeCount ?? 3;
  const inMs = opts?.inMs ?? 320;
  const holdMs = opts?.holdMs ?? 340;
  const outMs = opts?.outMs ?? 1200;
  const pulseSize = opts?.pulseSize ?? 180;

  const totalMs = inMs + holdMs + outMs;
  const pulseDelay = Math.round(inMs * 0.3);
  const pulseDur = Math.max(600, Math.round((inMs + holdMs) * 1.1));
  const smokeStart = Math.round(inMs * 0.6);
  const smokeDur = Math.max(1200, Math.round(holdMs + outMs * 0.7));

  const css = `
    @keyframes zf-num-${id} {
      0%   { opacity: 0.95; transform: scale(0.94);
             color: ${color}; text-shadow: 0 0 0 transparent; }
      ${pct(inMs * 0.6, totalMs)}% { opacity: 1; transform: scale(1.08);
             color: ${hot}; text-shadow: 0 0 18px ${glow}; }
      ${pct(inMs, totalMs)}% { opacity: 1; transform: scale(1);
             color: ${color}; text-shadow: none; }
      ${pct(inMs + holdMs, totalMs)}% { color: ${color}; opacity: 1; }
      100% { color: ${ashColor}; opacity: ${ashOpacity}; transform: scale(1); }
    }
    @keyframes zf-pulse-${id} {
      0%   { opacity: 0;   transform: translate(-50%, -50%) scale(0.4); }
      22%  { opacity: 0.9; transform: translate(-50%, -50%) scale(1.0); }
      100% { opacity: 0;   transform: translate(-50%, -50%) scale(1.7); }
    }
    @keyframes zf-smoke-${id} {
      0%   { opacity: 0;   transform: translate(-50%, 0)    scale(0.6); }
      30%  { opacity: 0.8; transform: translate(-50%, -10px) scale(1.0); }
      100% { opacity: 0;   transform: translate(-50%, -40px) scale(1.6); }
    }
  `;

  const keyframesNode: ReactNode = <style key={`kf-${id}-${triggerKey}`}>{css}</style>;

  const lifeAnimationStyle: CSSProperties = defeated
    ? {
        animation: `zf-num-${id} ${totalMs}ms cubic-bezier(.22,.61,.36,1) forwards`,
        willChange: 'transform, color, opacity, text-shadow',
        display: 'inline-block',
      }
    : {};

  const fadeStyle: CSSProperties = {
    opacity: defeated ? 0 : 1,
    transition: 'opacity 320ms cubic-bezier(.22,.61,.36,1)',
    pointerEvents: defeated ? 'none' : undefined,
  };

  const wisps: ReactNode = defeated
    ? Array.from({ length: smokeCount }, (_, i) => {
        const spread = smokeCount > 1 ? (i / (smokeCount - 1) - 0.5) * 36 : 0;
        return (
          <span
            key={`wisp-${i}-${triggerKey}`}
            style={{
              position: 'absolute',
              left: `calc(50% + ${spread}px)`,
              top: '42%',
              width: 14,
              height: 14,
              borderRadius: 999,
              background: `radial-gradient(circle, ${smokeColor}, transparent 70%)`,
              opacity: 0,
              animation: `zf-smoke-${id} ${smokeDur}ms cubic-bezier(.22,.61,.36,1) ${smokeStart + i * 140}ms forwards`,
              pointerEvents: 'none',
            }}
          />
        );
      })
    : null;

  const pulseAndWispsNode: ReactNode = defeated ? (
    <div
      key={`pw-${id}-${triggerKey}`}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: pulseSize,
          height: pulseSize,
          borderRadius: 999,
          background: `radial-gradient(circle, ${pulseColor}, transparent 65%)`,
          transform: 'translate(-50%, -50%) scale(0.4)',
          opacity: 0,
          animation: `zf-pulse-${id} ${pulseDur}ms cubic-bezier(.22,.61,.36,1) ${pulseDelay}ms forwards`,
          pointerEvents: 'none',
        }}
      />
      {wisps}
    </div>
  ) : null;

  return {
    keyframesNode,
    lifeAnimationStyle,
    fadeStyle,
    pulseAndWispsNode,
    totalMs,
  };
}

// ─── DefeatedButtonsLayer ──────────────────────────────────────────────────
// Sits on top of the cell once defeat is triggered. NO backdrop — the cell's
// non-life elements fade themselves out via useDefeatAnimation's fadeStyle.
// After the ZeroFade animation completes (~1860ms), the Revive button — and
// optionally the Review Game button — pop in with a small overshoot.

export type DefeatedButtonsLayerProps = {
  reviveColor: string;
  reviveTextColor: string;
  reviewBorder?: string;
  reviewTextColor?: string;
  onRevive?: () => void;
  onReview?: () => void;
  showReviewButton?: boolean;
  zIndex?: number;
  /** Re-fires the pop-in delay when this changes. */
  triggerKey?: string | number;
  /** Delay before the buttons pop in. Defaults to ZERO_FADE_DEFAULT_DURATION. */
  delayMs?: number;
};

export function DefeatedButtonsLayer({
  reviveColor,
  reviveTextColor,
  reviewBorder,
  reviewTextColor,
  onRevive,
  onReview,
  showReviewButton = false,
  zIndex = 30,
  triggerKey,
  delayMs = ZERO_FADE_DEFAULT_DURATION,
}: DefeatedButtonsLayerProps) {
  const [buttonsIn, setButtonsIn] = useState(false);

  useEffect(() => {
    setButtonsIn(false);
    const t = setTimeout(() => setButtonsIn(true), delayMs);
    return () => clearTimeout(t);
  }, [triggerKey, delayMs]);

  const rawId = useId();
  const id = rawId.replace(/[^a-z0-9]/gi, '');

  const css = `
    @keyframes defeat-button-pop-${id} {
      0%   { opacity: 0; transform: scale(0.6); }
      60%  { opacity: 1; transform: scale(1.06); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;

  if (!buttonsIn) {
    return <style>{css}</style>;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '18%',
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <style>{css}</style>
      <button
        onClick={onRevive}
        style={{
          padding: '10px 22px',
          background: reviveColor,
          color: reviveTextColor,
          border: 'none',
          borderRadius: 999,
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
          opacity: 0,
          transform: 'scale(0.6)',
          animation: `defeat-button-pop-${id} 280ms cubic-bezier(.34,1.56,.64,1) 0ms forwards`,
          willChange: 'opacity, transform',
        }}
      >
        Revive
      </button>
      {showReviewButton && (
        <button
          onClick={onReview}
          style={{
            padding: '8px 18px',
            background: 'transparent',
            color: reviewTextColor ?? reviveTextColor,
            border: `1px solid ${reviewBorder ?? 'rgba(226,184,88,0.18)'}`,
            borderRadius: 999,
            fontFamily: 'var(--font-ui)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            pointerEvents: 'auto',
            opacity: 0,
            transform: 'scale(0.6)',
            animation: `defeat-button-pop-${id} 280ms cubic-bezier(.34,1.56,.64,1) 90ms forwards`,
            willChange: 'opacity, transform',
          }}
        >
          Review Game
        </button>
      )}
    </div>
  );
}

// ─── Legacy DefeatedOverlay (compat shim) ──────────────────────────────────
// Old API — kept so existing call sites still compile while they're migrated
// to useDefeatAnimation + DefeatedButtonsLayer. Backdrop is dropped; we just
// pop the buttons in place over whatever the cell renders.

export type DefeatedOverlayProps = {
  bgColor?: string;
  reviveColor: string;
  reviveTextColor: string;
  reviveBorder?: string;
  reviewBorder?: string;
  reviewTextColor?: string;
  onRevive?: () => void;
  onReview?: () => void;
  showReviewButton?: boolean;
  zIndex?: number;
  triggerKey?: string | number;
  label?: string;
  size?: number;
};

export function DefeatedOverlay(props: DefeatedOverlayProps) {
  return (
    <DefeatedButtonsLayer
      reviveColor={props.reviveColor}
      reviveTextColor={props.reviveTextColor}
      reviewBorder={props.reviewBorder}
      reviewTextColor={props.reviewTextColor}
      onRevive={props.onRevive}
      onReview={props.onReview}
      showReviewButton={props.showReviewButton}
      zIndex={props.zIndex}
      triggerKey={props.triggerKey}
    />
  );
}
