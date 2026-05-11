'use client';

import { CSSProperties, ReactNode } from 'react';
import { DARK, COUNTER_VOCAB } from './style-tokens';

// Mana color definitions
const MANA: Record<string, string> = {
  W: '#F8E7B9',
  U: '#A6C8E6',
  B: '#3F3A36',
  R: '#D27B5C',
  G: '#7BA37A',
  C: '#A89F8E',
};

// Commander damage heat colors
const CMDR_DMG_COLORS = ['#E8A54B', '#D4783C', '#B8432E', '#8C2318', '#5E1610'];

// ─── ManaDots Component ────────────────────────────────────────────────────
interface ManaDotsProps {
  colors?: string[];
  size?: number;
}

export function ManaDots({ colors = [], size = 7 }: ManaDotsProps): ReactNode {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {colors.map((c, i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 999,
            background: MANA[c] || MANA.C,
            boxShadow: `0 0 0 1px ${DARK.line}`,
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  );
}

// ─── CompassRose Component ────────────────────────────────────────────────
interface CompassRoseProps {
  color?: string;
  opacity?: number;
  scale?: number;
  size?: number;
}

export function CompassRose({
  color = DARK.copper,
  opacity = 0.22,
  scale = 1,
  size = 240,
}: CompassRoseProps): ReactNode {
  return (
    <svg
      width={size * scale}
      height={size * scale}
      viewBox="0 0 320 320"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <g stroke={color} strokeWidth="0.8" fill="none">
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const r1 = 40;
          const r2 = 150;
          const cx = 160;
          const cy = 160;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * r1}
              y1={cy + Math.sin(a) * r1}
              x2={cx + Math.cos(a) * r2}
              y2={cy + Math.sin(a) * r2}
            />
          );
        })}
        <circle cx="160" cy="160" r="40" />
        <circle cx="160" cy="160" r="60" strokeDasharray="1 3" />
        <circle cx="160" cy="160" r="100" strokeDasharray="1 4" />
        <circle cx="160" cy="160" r="150" />
      </g>
    </svg>
  );
}

// ─── CornerBrackets Component ─────────────────────────────────────────────
interface CornerBracketsProps {
  color?: string;
  inset?: number;
  len?: number;
  width?: number;
}

export function CornerBrackets({
  color = DARK.copper,
  inset = 6,
  len = 14,
  width = 1.75,
}: CornerBracketsProps): ReactNode {
  const common = {
    stroke: color,
    strokeWidth: width,
    strokeLinecap: 'round' as const,
    fill: 'none',
  };

  const Bracket = ({
    rotate,
    style,
  }: {
    rotate: number;
    style: CSSProperties;
  }): ReactNode => (
    <svg
      width={inset + len + 2}
      height={inset + len + 2}
      style={{
        position: 'absolute',
        ...style,
        transform: `rotate(${rotate}deg)`,
        pointerEvents: 'none',
      }}
    >
      <path d={`M ${inset} ${inset + len} L ${inset} ${inset} L ${inset + len} ${inset}`} {...common} />
    </svg>
  );

  return (
    <>
      <Bracket rotate={0} style={{ top: 0, left: 0 }} />
      <Bracket rotate={90} style={{ top: 0, right: 0 }} />
      <Bracket rotate={270} style={{ bottom: 0, left: 0 }} />
      <Bracket rotate={180} style={{ bottom: 0, right: 0 }} />
    </>
  );
}

// ─── Icon Component (SVG Icon Library) ─────────────────────────────────────
type IconName =
  | 'chevron-left'
  | 'grid'
  | 'user'
  | 'dice'
  | 'plus'
  | 'minus'
  | 'sword'
  | 'settings'
  | 'rotate'
  | 'close'
  | 'coin'
  | 'shuffle'
  | 'skull'
  | 'bolt'
  | 'star'
  | 'plus-circle'
  | 'arrow';

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: string;
  width?: number;
}

export function Icon({
  name,
  size = 20,
  stroke = 'currentColor',
  width = 1.75,
}: IconProps): ReactNode {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: width,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const paths: Record<IconName, ReactNode> = {
    'chevron-left': <polyline points="15 18 9 12 15 6" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    dice: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8.5" cy="8.5" r="1.2" fill={stroke} stroke="none" />
        <circle cx="15.5" cy="8.5" r="1.2" fill={stroke} stroke="none" />
        <circle cx="12" cy="12" r="1.2" fill={stroke} stroke="none" />
        <circle cx="8.5" cy="15.5" r="1.2" fill={stroke} stroke="none" />
        <circle cx="15.5" cy="15.5" r="1.2" fill={stroke} stroke="none" />
      </>
    ),
    plus: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    minus: <line x1="5" y1="12" x2="19" y2="12" />,
    sword: (
      <>
        <path d="m14.5 17.5 4-4-9-9H4v6l9 9z" />
        <line x1="14.5" y1="17.5" x2="20" y2="23" />
        <path d="m9.5 4.5 4 4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
    rotate: (
      <>
        <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
        <polyline points="21 3 21 8 16 8" />
        <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
        <polyline points="3 21 3 16 8 16" />
      </>
    ),
    close: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
    coin: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9h4a2 2 0 0 1 0 4H9V9zm0 4v3" />
      </>
    ),
    shuffle: (
      <>
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </>
    ),
    skull: (
      <>
        <path d="M8 21h8v-3a4 4 0 0 0 4-4v-2a8 8 0 1 0-16 0v2a4 4 0 0 0 4 4v3z" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <path d="M11 17h2" />
      </>
    ),
    bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    star: <polygon points="12 2 15.1 8.6 22 9.6 17 14.5 18.2 21.5 12 18.2 5.8 21.5 7 14.5 2 9.6 8.9 8.6 12 2" />,
    'plus-circle': (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </>
    ),
    arrow: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </>
    ),
  };

  return <svg {...svgProps}>{paths[name] || null}</svg>;
}

// ─── CounterChip Component ────────────────────────────────────────────────
interface CounterChipProps {
  kind: 'poison' | 'energy' | 'experience' | 'commander';
  count: number;
}

export function CounterChip({ kind, count }: CounterChipProps): ReactNode {
  const vocab = COUNTER_VOCAB[kind as keyof typeof COUNTER_VOCAB] || COUNTER_VOCAB.poison;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 22,
        padding: '0 9px',
        background: `${vocab.tone}22`,
        color: vocab.soft,
        border: `1px solid ${vocab.tone}44`,
        borderRadius: 999,
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon
        name={vocab.glyph as IconName}
        size={12}
        stroke={vocab.soft}
        width={1.9}
      />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontSize: 13,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ─── CmdrDamageRing Component ─────────────────────────────────────────────
interface DamageSegment {
  amount: number;
  colorIndex: number;
}

interface CmdrDamageRingProps {
  damages?: DamageSegment[];
  radius?: number;
  strokeWidth?: number;
}

export function CmdrDamageRing({
  damages = [],
  radius = 20,
  strokeWidth = 3,
}: CmdrDamageRingProps): ReactNode {
  if (!damages.length) return null;

  let cursor = 0;

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {damages.map((d, i) => {
        const len = Math.min(100, (d.amount / 21) * 100);
        const offset = -cursor;
        cursor += len;

        return (
          <rect
            key={i}
            x={strokeWidth / 2}
            y={strokeWidth / 2}
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
