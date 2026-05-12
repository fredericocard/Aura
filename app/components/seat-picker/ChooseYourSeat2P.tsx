'use client';

/**
 * Aura — "Choose your seat" modal · 2-PLAYER POD (compass style)
 * Seat ids: 'a' (top), 'b' (bottom).
 */

import React from 'react';
import {
  SeatModalCompass,
  ChooseYourSeatStyles,
  SeatDef,
  SeatClaim,
} from './ChooseYourSeat.compass';

const LAYOUT_2P: SeatDef[] = [
  { id: 'a', side: 'top',    x: 0.50, y: 0.00 },
  { id: 'b', side: 'bottom', x: 0.50, y: 1.00 },
];

const TABLE_W = 220;
const TABLE_H = 130;

export type ChooseYourSeatProps = {
  claimed?: Record<string, SeatClaim>;
  onClaim: (seatId: string) => void;
  justClaimedId?: string | null;
  you: SeatClaim;
};

export default function ChooseYourSeat2P({
  claimed = {},
  onClaim,
  justClaimedId = null,
  you,
}: ChooseYourSeatProps) {
  return (
    <SeatModalCompass
      pod={2}
      layout={LAYOUT_2P}
      tableW={TABLE_W}
      tableH={TABLE_H}
      claimed={claimed}
      onClaim={onClaim}
      justClaimedId={justClaimedId}
      you={you}
    />
  );
}

export { ChooseYourSeatStyles };
