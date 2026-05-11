'use client';

// AuraLoaderF.tsx
// Aura · Five-Trait Orbit loader — "Settle to Pentagon" (Variant F)
// Light/parchment surface; forest mark. Used for light-mode loading screens.

import React from 'react';

const TRAIT_COLORS = [
  '#C99B2F', // Brilliance — gold
  '#7E4E8A', // Flavour    — plum
  '#9E2B2B', // Rivalry    — crimson
  '#2F7A74', // Allegiance — teal
  '#E07B4A', // Fun        — coral
];

export default function AuraLoaderF({
  size = 180,
  markColor = 'var(--forest, #2F5D3A)',
  trackColor = 'rgba(47,93,58,0.35)',
  dotColors = TRAIT_COLORS,
  duration = 2400,
  className = '',
  style = {} as React.CSSProperties,
}: {
  size?: number;
  markColor?: string;
  trackColor?: string;
  dotColors?: string[];
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const radius = size * 0.44;
  const dotSize = Math.max(10, Math.round(size * 0.078));

  return (
    <div
      className={`aura-loader-f ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...({ '--alf-duration': `${duration}ms`, '--alf-ease': 'cubic-bezier(.22,.61,.36,1)' } as React.CSSProperties),
        ...style,
      }}
    >
      <style>{`
        @keyframes alf-settle {
          0%   { transform: rotate(0deg); }
          70%  { transform: rotate(360deg); }
          80%  { transform: rotate(372deg); }
          90%  { transform: rotate(356deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '999px',
          border: `1px dashed ${trackColor}`,
          animation: 'alf-settle var(--alf-duration) var(--alf-ease) infinite',
        }}
      >
        {dotColors.map((c, i) => {
          const a = (i / dotColors.length) * 360;
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: dotSize,
                height: dotSize,
                marginTop: -dotSize / 2,
                marginLeft: -dotSize / 2,
                borderRadius: '999px',
                background: c,
                transform: `rotate(${a}deg) translate(${radius}px)`,
                boxShadow:
                  '0 1px 0 rgba(43,33,24,.08), 0 4px 10px -4px rgba(43,33,24,.22)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 3,
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,.32)',
                }}
              />
            </span>
          );
        })}
      </div>

      <AuraMarkF size={Math.round(size * 0.31)} color={markColor} />
    </div>
  );
}

function AuraMarkF({ size = 56, color = 'currentColor' }: { size?: number; color?: string }) {
  const id = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ position: 'relative', zIndex: 2, display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`alf-clip-${id}`}>
          <ellipse cx="32" cy="32" rx="22" ry="26" />
        </clipPath>
      </defs>
      <g clipPath={`url(#alf-clip-${id})`}>
        <polygon points="8,60 30,4 31,4 24,60" fill={color} />
        <polygon points="40,60 33,4 34,4 56,60" fill={color} />
      </g>
      <circle cx="32" cy="36" r="2.4" fill={color} />
    </svg>
  );
}
