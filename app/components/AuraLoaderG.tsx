'use client';
// AuraLoaderG.tsx
// Aura · Five-Trait Orbit loader — "Settle, Dark + Gold" (Variant G)
//
// Five metallic dots (memory-card frame palette) orbit the Aura mark,
// settle, overshoot, lock. Designed for the dark ink surface that sits
// between vote and memory-card reveal.

import React from 'react';

const METALLIC_DOTS = ['#E2B858', '#C99B2F', '#B06B2C', '#8C5A28', '#F5EFE2'];

export default function AuraLoaderG({
  size = 180,
  markColor = '#E2B858',
  ringColor = 'rgba(226,184,88,0.45)',
  haloColor = 'rgba(201,155,47,0.18)',
  dotColors = METALLIC_DOTS,
  duration = 2400,
  className = '',
  style = {},
}: {
  size?: number;
  markColor?: string;
  ringColor?: string;
  haloColor?: string;
  dotColors?: string[];
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const radius = size * 0.44;
  const dotSize = Math.max(10, Math.round(size * 0.078));
  const id = React.useId();

  return (
    <div
      className={`aura-loader-g ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(ellipse at center, ${haloColor}, transparent 55%)`,
        ...style,
      }}
    >
      <style>{`
        @keyframes alg-settle {
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
          border: `1px dashed ${ringColor}`,
          animation: `alg-settle ${duration}ms cubic-bezier(.22,.61,.36,1) infinite`,
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
                  '0 1px 0 rgba(0,0,0,.35), 0 4px 10px -4px rgba(0,0,0,.55), inset 0 1px 1px rgba(255,235,180,.35), inset 0 -2px 2px rgba(0,0,0,.25)',
              }}
            />
          );
        })}
      </div>

      {/* Brand mark (inline SVG) */}
      <svg
        width={Math.round(size * 0.31)}
        height={Math.round(size * 0.31)}
        viewBox="0 0 64 64"
        style={{ position: 'relative', zIndex: 2, display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={`alg-clip-${id}`}>
            <ellipse cx="32" cy="32" rx="22" ry="26" />
          </clipPath>
        </defs>
        <g clipPath={`url(#alg-clip-${id})`}>
          <polygon points="8,60 30,4 31,4 24,60" fill={markColor} />
          <polygon points="40,60 33,4 34,4 56,60" fill={markColor} />
        </g>
        <circle cx="32" cy="36" r="2.4" fill={markColor} />
      </svg>
    </div>
  );
}
