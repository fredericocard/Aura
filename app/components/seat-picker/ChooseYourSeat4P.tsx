'use client';

/**
 * Aura — "Choose your seat" modal · 4-PLAYER POD (compass style)
 * Seat ids: 'a' (top-left), 'b' (bottom-left), 'c' (top-right), 'd' (bottom-right).
 */

import React from 'react';
import {
  SeatModalCompass,
  ChooseYourSeatStyles,
  SeatDef,
  SeatClaim,
} from './ChooseYourSeat.compass';

const LAYOUT_4P: SeatDef[] = [
  { id: 'a', side: 'left',  x: 0.00, y: 0.30 },
  { id: 'b', side: 'left',  x: 0.00, y: 0.70 },
  { id: 'c', side: 'right', x: 1.00, y: 0.30 },
  { id: 'd', side: 'right', x: 1.00, y: 0.70 },
];

const TABLE_W = 150;
const TABLE_H = 240;

export type ChooseYourSeatProps = {
  claimed?: Record<string, SeatClaim>;
  onClaim: (seatId: string) => void;
  justClaimedId?: string | null;
  you: SeatClaim;
};

export default function ChooseYourSeat4P({
  claimed = {},
  onClaim,
  justClaimedId = null,
  you,
}: ChooseYourSeatProps) {
  return (
    <SeatModalCompass
      pod={4}
      layout={LAYOUT_4P}
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
