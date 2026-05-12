'use client';

import React, { useEffect, useState } from 'react';
import ChooseYourSeat2P from './seat-picker/ChooseYourSeat2P';
import ChooseYourSeat3P from './seat-picker/ChooseYourSeat3P';
import ChooseYourSeat4P from './seat-picker/ChooseYourSeat4P';
import ChooseYourSeat5P from './seat-picker/ChooseYourSeat5P';
import {
  ChooseYourSeatStyles,
  SeatClaim,
} from './seat-picker/ChooseYourSeat.compass';

// Public API kept stable from the stub days — gridviews call this
// component without knowing about the compass internals.

export type SeatInfo = {
  seat: number;
  label: string;
  /** Commander art URL when seat is claimed; null when empty. */
  art: string | null;
  taken: boolean;
  isMe: boolean;
};

export type SeatPickerModalProps = {
  open: boolean;
  podSize: 2 | 3 | 4 | 5;
  seats: SeatInfo[];
  /** Fires when the viewer taps an empty seat. Async — modal stays open
   *  until the parent flips `open` to false (i.e. after the DB write). */
  onPick: (seat: number) => Promise<void> | void;
  /** Current user's display name. Falls back to "You". */
  youName?: string;
  /** Current user's commander art. Falls back to a blank chip avatar. */
  youArt?: string;
  /** Stable id for the current viewer (auth user id). Used for the "You" pip. */
  youId?: string;
  /** Render in dark mode (overrides parchment palette with dark tokens). */
  dark?: boolean;
  title?: string;
  subtitle?: string;
};

// Dark-mode overrides for the design's CSS variables. These mirror the
// gridview's DARK_THEME palette so the modal matches the rest of the page.
const DARK_TOKEN_OVERRIDES: Record<string, string> = {
  '--parchment':      '#0A0604',
  '--parchment-card': '#150E08',
  '--parchment-deep': '#050302',
  '--ink':            '#F0E8D8',
  '--ink-2':          '#C5B9A5',
  '--ink-3':          '#8A7E6F',
  '--ink-4':          '#5C5043',
  '--fg-subtle':      '#8A7E6F',
  '--copper':         '#E2B858',
  '--line':           'rgba(226,184,88,0.10)',
  '--line-strong':    'rgba(226,184,88,0.18)',
};

// Letter ↔ seat-number mapping for each pod size. The letters come from
// the compass design's layout files; the seat numbers come from each
// gridview's cell layout. The chair the user taps in the popup must end
// up in the matching cell in the live grid.
const LETTER_TO_SEAT: Record<number, Record<string, number>> = {
  // 2p — gridview shows seat 2 on top (flipped) and seat 1 on bottom (you).
  2: { a: 2, b: 1 },
  // 3p — gridview shows seat 2 top-left, seat 3 top-right, seat 1 bottom.
  3: { a: 2, b: 3, c: 1 },
  // 4p — gridview shows seat 1 top-left, seat 3 bottom-left,
  //                    seat 2 top-right, seat 4 bottom-right.
  4: { a: 1, b: 3, c: 2, d: 4 },
  // 5p — gridview shows seat 2 top-left, seat 3 bottom-left,
  //                    seat 4 top-right, seat 5 bottom-right, seat 1 bottom.
  5: { a: 2, b: 3, c: 4, d: 5, e: 1 },
};

function seatNumToLetter(podSize: 2 | 3 | 4 | 5, seatNum: number): string | null {
  const map = LETTER_TO_SEAT[podSize];
  if (!map) return null;
  for (const [letter, n] of Object.entries(map)) {
    if (n === seatNum) return letter;
  }
  return null;
}

export function SeatPickerModal({
  open,
  podSize,
  seats,
  onPick,
  youName,
  youArt,
  youId,
  dark = false,
}: SeatPickerModalProps) {
  const [errorText, setErrorText] = useState<string | null>(null);
  const [justClaimedId, setJustClaimedId] = useState<string | null>(null);

  // When the viewer's own seat appears as taken, briefly light the ripple.
  useEffect(() => {
    if (!open) return;
    let myLetter: string | null = null;
    for (const s of seats) {
      if (!s.taken || !s.isMe) continue;
      myLetter = seatNumToLetter(podSize, s.seat);
      break;
    }
    if (myLetter) {
      setJustClaimedId(myLetter);
      const t = setTimeout(() => setJustClaimedId(null), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, seats, podSize]);

  if (!open) return null;

  // Build the `claimed` map the compass components expect.
  const claimed: Record<string, SeatClaim> = {};
  for (const s of seats) {
    if (!s.taken) continue;
    const letter = seatNumToLetter(podSize, s.seat);
    if (!letter) continue;
    claimed[letter] = {
      id: s.isMe && youId ? youId : `seat-${s.seat}`,
      name: s.label,
      art: s.art ?? '',
    };
  }

  const you: SeatClaim = {
    id: youId ?? 'me',
    name: youName ?? 'You',
    art: youArt ?? '',
  };

  const handleClaim = async (letter: string) => {
    const seatNum = LETTER_TO_SEAT[podSize]?.[letter];
    if (!seatNum) {
      setErrorText('Could not resolve seat — please try again.');
      return;
    }
    setErrorText(null);
    try {
      setJustClaimedId(letter);
      await onPick(seatNum);
    } catch (err: any) {
      setJustClaimedId(null);
      setErrorText(err?.message ?? 'Could not claim that seat — try another.');
    }
  };

  const SeatModal =
    podSize === 2 ? ChooseYourSeat2P :
    podSize === 3 ? ChooseYourSeat3P :
    podSize === 4 ? ChooseYourSeat4P :
    ChooseYourSeat5P;

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    background: dark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(43, 33, 24, 0.40)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    overflow: 'auto',
  };
  const wrapperStyle: React.CSSProperties = dark
    ? (Object.assign({}, baseStyle, DARK_TOKEN_OVERRIDES) as React.CSSProperties)
    : baseStyle;

  return (
    <div role="dialog" aria-modal="true" style={wrapperStyle}>
      <ChooseYourSeatStyles />
      <div style={{ position: 'relative' }}>
        <SeatModal
          claimed={claimed}
          onClaim={handleClaim}
          justClaimedId={justClaimedId}
          you={you}
        />
        {errorText && (
          <div
            style={{
              position: 'absolute',
              bottom: -38,
              left: 0,
              right: 0,
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(158,43,43,0.18)',
              border: '1px solid rgba(158,43,43,0.35)',
              color: '#E78A85',
              fontSize: 12,
              textAlign: 'center',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {errorText}
          </div>
        )}
      </div>
    </div>
  );
}
