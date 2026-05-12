'use client';

/**
 * Aura — "Choose your seat" modal · 3-PLAYER POD (compass style)
 * Seat ids: 'a' (left), 'b' (right), 'c' (bottom).
 */

import React from 'react';
import {
  SeatModalCompass,
  ChooseYourSeatStyles,
  SeatDef,
  SeatClaim,
} from './ChooseYourSeat.compass';

const LAYOUT_3P: SeatDef[] = [
  { id: 'a', side: 'left',   x: 0.00, y: 0.50 },
  { id: 'b', side: 'right',  x: 1.00, y: 0.50 },
  { id: 'c', side: 'bottom', x: 0.50, y: 1.00 },
];

const TABLE_W = 150;
const TABLE_H = 210;

export type ChooseYourSeatProps = {
  claimed?: Record<string, SeatClaim>;
  onClaim: (seatId: string) => void;
  justClaimedId?: string | null;
  you: SeatClaim;
};

export default function ChooseYourSeat3P({
  claimed = {},
  onClaim,
  justClaimedId = null,
  you,
}: ChooseYourSeatProps) {
  return (
    <SeatModalCompass
      pod={3}
      layout={LAYOUT_3P}
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
