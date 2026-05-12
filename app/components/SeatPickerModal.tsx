'use client';

import React, { useState } from 'react';

// Functional stub for the "Choose your seat" modal.
//
// Backend wiring is final. The visual layer is intentionally plain — the
// real table infographic will replace the markup inside the inner card
// once Claude Design hands off the drawing. Props and behavior stay
// stable so the swap is markup-only.

export type SeatInfo = {
  seat: number;
  /** Display label for the player (commander name, "Player 2", etc.). */
  label: string;
  /** Commander art URL when the seat is claimed; null when empty. */
  art: string | null;
  /** True when the seat is already taken (by anyone, including the viewer). */
  taken: boolean;
  /** True when the seat is taken by the current viewer. */
  isMe: boolean;
};

export type SeatPickerModalProps = {
  open: boolean;
  podSize: 2 | 3 | 4 | 5;
  seats: SeatInfo[];
  /** Fires when the viewer taps an empty seat. Async — modal stays open
   *  until the parent flips `open` to false (i.e. after the DB write). */
  onPick: (seat: number) => Promise<void> | void;
  /** Optional override copy. */
  title?: string;
  subtitle?: string;
};

export function SeatPickerModal({
  open,
  podSize,
  seats,
  onPick,
  title = 'Choose your seat',
  subtitle = 'Pick a chair at the table to take that seat in the game.',
}: SeatPickerModalProps) {
  const [busySeat, setBusySeat] = useState<number | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  if (!open) return null;

  const handlePick = async (seat: number) => {
    if (busySeat != null) return;
    setBusySeat(seat);
    setErrorText(null);
    try {
      await onPick(seat);
    } catch (err: any) {
      setErrorText(err?.message ?? 'Could not claim that seat — try another.');
    } finally {
      setBusySeat(null);
    }
  };

  // Render seats in an order that roughly mirrors the gridview layouts.
  // This is placeholder rendering — Claude Design will replace it with a
  // proper top-down table infographic.
  const renderSeats = () => {
    const sorted = [...seats].sort((a, b) => a.seat - b.seat);
    return (
      <div
        style={{
          display: 'grid',
          gap: 10,
          gridTemplateColumns: podSize === 2 ? '1fr' : podSize === 3 ? '1fr' : '1fr 1fr',
          width: '100%',
        }}
      >
        {sorted.map((s) => (
          <SeatButton
            key={s.seat}
            seat={s}
            onPick={() => handlePick(s.seat)}
            busy={busySeat === s.seat}
            disabled={busySeat != null}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--bg-card, #150E08)',
          color: 'var(--ink, #F0E8D8)',
          borderRadius: 20,
          border: '1px solid var(--border-accent, rgba(226,184,88,0.18))',
          padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            lineHeight: 1.2,
            marginBottom: 6,
            textAlign: 'center',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            opacity: 0.7,
            textAlign: 'center',
            marginBottom: 18,
          }}
        >
          {subtitle}
        </div>

        {renderSeats()}

        {errorText && (
          <div
            style={{
              marginTop: 14,
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(158,43,43,0.18)',
              border: '1px solid rgba(158,43,43,0.35)',
              color: '#E78A85',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            {errorText}
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            fontSize: 11,
            opacity: 0.45,
            textAlign: 'center',
            fontFamily: 'var(--font-ui)',
            letterSpacing: '0.04em',
          }}
        >
          {podSize}-player pod · placeholder layout
        </div>
      </div>
    </div>
  );
}

function SeatButton({
  seat,
  onPick,
  busy,
  disabled,
}: {
  seat: SeatInfo;
  onPick: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  const isTaken = seat.taken;
  const isClickable = !isTaken && !disabled;
  return (
    <button
      onClick={isClickable ? onPick : undefined}
      disabled={!isClickable}
      style={{
        appearance: 'none',
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: 14,
        border: `1px solid ${isTaken ? 'rgba(226,184,88,0.22)' : 'var(--copper, #E2B858)'}`,
        background: isTaken
          ? 'var(--bg-elevated, #0A0604)'
          : 'rgba(226,184,88,0.06)',
        color: 'inherit',
        cursor: isClickable ? 'pointer' : 'not-allowed',
        opacity: isTaken ? 0.85 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 56,
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'rgba(226,184,88,0.10)',
          border: '1px solid rgba(226,184,88,0.18)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          opacity: 0.7,
        }}
      >
        {seat.art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={seat.art}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <>{seat.seat}</>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            opacity: 0.6,
          }}
        >
          Seat {seat.seat}
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.2,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isTaken ? seat.label : 'Empty — tap to take this seat'}
        </div>
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          opacity: 0.8,
          flexShrink: 0,
        }}
      >
        {busy ? '…' : isTaken ? (seat.isMe ? 'You' : 'Taken') : 'Pick'}
      </div>
    </button>
  );
}
