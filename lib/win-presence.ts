// ============================================
// Win Presence — Representation Score
// Computes how often a commander wins relative
// to their fair share across pod sizes.
//
// Does NOT expose raw win rate — only the
// normalised label + slider position.
// Completely independent of AURA score.
// ============================================

import { createClient } from '@/lib/supabase/client';

// ── Tuning constants ───────────────────────────────────
// All named — design can tune without logic changes.

const MIN_GAMES    = 6;    // First 5 games always Balanced; eligible from game 6
const Z_LOWER      = -1.6; // At/below → Under-represented
const Z_UPPER      = 2.2;  // At/above → Over-represented
const Z_CENTER     = 0.5;  // Slider midpoint (slightly over true fair share — Rule C)
const SIGMOID_TEMP = 1.5;  // Slider travel speed

// ── Types ──────────────────────────────────────────────

export type WinPresenceClassification =
  | 'UNDER_REPRESENTED'
  | 'BALANCED'
  | 'OVER_REPRESENTED';

export interface WinPresenceResult {
  classification: WinPresenceClassification;
  sliderPosition: number;   // float 0–1; 0.5 = dead-centre Balanced
  gamesPlayed: number;      // G
  observedWins: number;     // O
  expectedWins: number;     // E — "fair share was X"
  zScore: number;           // z — for debugging / future tuning
}

// ── Core computation (pure function) ──────────────────

/**
 * Compute win presence from a list of game records.
 * Exported for unit testing — no DB calls here.
 */
export function computeWinPresenceFromGames(
  games: { podSize: number; won: boolean }[]
): WinPresenceResult {
  const G = games.length;
  let O = 0;
  let E = 0.0;
  let V = 0.0;

  for (const game of games) {
    const p = 1.0 / game.podSize;
    if (game.won) O += 1;
    E += p;
    V += p * (1.0 - p);
  }

  // Rule A: first 5 games always Balanced, dot dead-centre
  if (G < MIN_GAMES) {
    return {
      classification: 'BALANCED',
      sliderPosition: 0.5,
      gamesPlayed: G,
      observedWins: O,
      expectedWins: parseFloat(E.toFixed(2)),
      zScore: 0,
    };
  }

  const std = Math.sqrt(V);
  const z = std > 0 ? (O - E) / std : 0.0;

  let classification: WinPresenceClassification;
  if (z < Z_LOWER)      classification = 'UNDER_REPRESENTED';
  else if (z > Z_UPPER) classification = 'OVER_REPRESENTED';
  else                  classification = 'BALANCED';

  // Sigmoid re-centred on Z_CENTER so 0.5 = slightly over fair share
  const sliderPosition = 1.0 / (1.0 + Math.exp(-(z - Z_CENTER) / SIGMOID_TEMP));

  return {
    classification,
    sliderPosition,
    gamesPlayed: G,
    observedWins: O,
    expectedWins: parseFloat(E.toFixed(2)),
    zScore: parseFloat(z.toFixed(3)),
  };
}

// ── DB fetch + compute ─────────────────────────────────

/**
 * Fetch this deck's completed game history and compute win presence.
 * Reads from game_players joined with games — no schema changes required.
 */
export async function getWinPresence(deckId: string): Promise<WinPresenceResult> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('game_players')
    .select('is_winner, games!inner(pod_size, state)')
    .eq('deck_id', deckId) as { data: any; error: any };

  if (error) throw new Error(`Win presence: failed to load games — ${error.message}`);

  // Only count completed games
  const completedRows = (data ?? []).filter(
    (row: any) => row.games?.state === 'completed'
  );

  const games = completedRows.map((row: any) => ({
    podSize: Number(row.games?.pod_size ?? 4),
    won: Boolean(row.is_winner),
  }));

  return computeWinPresenceFromGames(games);
}
