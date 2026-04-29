// ============================================
// AF-B19 · AURA tier classification
// Maps a commander's AURA score to one of five tiers.
// Commanders with fewer than the developing threshold
// games show "Developing" instead of a tier.
// No separate tier field — always computed on demand.
// ============================================

import { createClient } from "@/lib/supabase/client";
import {
  getTierBoundaries,
  getDevelopingMinGames,
  type TierBoundaries,
} from "@/lib/scoring-config";

// ── Types ──────────────────────────────────────────────

export type TierName =
  | "Exiled"
  | "Sideboard"
  | "Brewed"
  | "Beloved"
  | "Mythic";

export interface AuraTier {
  tier: TierName | "Developing";
  score: number;
  gamesPlayed: number;
  isDeveloping: boolean;
  tierRange: { min: number; max: number } | null;
}

// ── Tier descriptions (for UI display) ─────────────────

export const TIER_INFO: Record<
  TierName,
  { label: string; description: string }
> = {
  Exiled: {
    label: "Exiled",
    description: "This commander is seen as disruptive or unwelcome at the table.",
  },
  Sideboard: {
    label: "Sideboard",
    description: "This commander has a mixed reputation — some rough edges.",
  },
  Brewed: {
    label: "Brewed",
    description: "A solid commander with a neutral reputation. The starting point.",
  },
  Beloved: {
    label: "Beloved",
    description: "This commander is well-regarded — fun to play with and against.",
  },
  Mythic: {
    label: "Mythic",
    description: "A legendary reputation. This commander makes every game better.",
  },
};

// ── Core tier computation ──────────────────────────────

/**
 * Compute the tier for a given AURA score.
 * Pure function — no database access.
 * Tier boundaries are passed in (from config).
 */
export function computeTier(
  score: number,
  boundaries: TierBoundaries
): TierName {
  if (score <= boundaries.exiled) return "Exiled";
  if (score <= boundaries.sideboard) return "Sideboard";
  if (score <= boundaries.brewed) return "Brewed";
  if (score <= boundaries.beloved) return "Beloved";
  return "Mythic";
}

/**
 * Get the range (min–max) for a specific tier.
 */
export function getTierRange(
  tier: TierName,
  boundaries: TierBoundaries
): { min: number; max: number } {
  switch (tier) {
    case "Exiled":
      return { min: 1, max: boundaries.exiled };
    case "Sideboard":
      return { min: boundaries.exiled + 1, max: boundaries.sideboard };
    case "Brewed":
      return { min: boundaries.sideboard + 1, max: boundaries.brewed };
    case "Beloved":
      return { min: boundaries.brewed + 1, max: boundaries.beloved };
    case "Mythic":
      return { min: boundaries.beloved + 1, max: boundaries.mythic };
  }
}

// ── Database-backed tier lookup ────────────────────────

/**
 * Get the full tier info for a specific deck.
 * Reads score from DB, counts completed games, applies developing check.
 */
export async function getDeckTier(deckId: string): Promise<AuraTier> {
  const supabase = createClient();

  // Fetch deck score and count completed games in parallel
  const [deckResult, gamesResult, boundaries, minGames] = await Promise.all([
    supabase
      .from("decks")
      .select("aura_score")
      .eq("id", deckId)
      .single() as Promise<{ data: any; error: any }>,
    supabase
      .from("game_players")
      .select("game_id, games!inner(state)")
      .eq("deck_id", deckId)
      .eq("games.state", "completed"),
    getTierBoundaries(),
    getDevelopingMinGames(),
  ]);

  if (deckResult.error || !deckResult.data) {
    throw new Error(`Deck not found: ${deckResult.error?.message}`);
  }

  const score = Number(deckResult.data.aura_score);
  const gamesPlayed = gamesResult.data?.length ?? 0;

  // Below threshold → show "Developing"
  if (gamesPlayed < minGames) {
    return {
      tier: "Developing",
      score,
      gamesPlayed,
      isDeveloping: true,
      tierRange: null,
    };
  }

  // Compute actual tier
  const tier = computeTier(score, boundaries);
  const tierRange = getTierRange(tier, boundaries);

  return {
    tier,
    score,
    gamesPlayed,
    isDeveloping: false,
    tierRange,
  };
}

/**
 * Get tier info for multiple decks (batch).
 * Useful for displaying a user's full deck collection.
 */
export async function getDeckTiers(
  deckIds: string[]
): Promise<Record<string, AuraTier>> {
  const results: Record<string, AuraTier> = {};
  // Process in parallel
  const promises = deckIds.map(async (id) => {
    results[id] = await getDeckTier(id);
  });
  await Promise.all(promises);
  return results;
}

/**
 * Get tier from score and games count without DB access.
 * Useful when you already have the data in memory.
 */
export async function getTierFromScore(
  score: number,
  gamesPlayed: number
): Promise<AuraTier> {
  const [boundaries, minGames] = await Promise.all([
    getTierBoundaries(),
    getDevelopingMinGames(),
  ]);

  if (gamesPlayed < minGames) {
    return {
      tier: "Developing",
      score,
      gamesPlayed,
      isDeveloping: true,
      tierRange: null,
    };
  }

  const tier = computeTier(score, boundaries);
  const tierRange = getTierRange(tier, boundaries);

  return {
    tier,
    score,
    gamesPlayed,
    isDeveloping: false,
    tierRange,
  };
}
