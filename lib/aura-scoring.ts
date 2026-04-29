// ============================================
// AF-B17 · AURA delta computation
// Translates each game's tally into a per-commander
// AURA score change. One game = one update per commander.
//
// Formula per commander:
//   raw_delta = SUM(votes_per_badge × badge_weight) + (bracket_flags × bracket_weight)
//   scaled_delta = raw_delta × pod_size_scaling[pod_size]
//   chronic_penalty = if chronic_archenemy → flat penalty from config
//   final_delta = scaled_delta + chronic_penalty
//   new_score = clamp(old_score + final_delta, aura_min, aura_max)
// ============================================

import { createClient } from "@/lib/supabase/client";
import {
  getScoringWeights,
  getWeightForBadge,
  getPodSizeScaling,
  getAuraRange,
  type ScoringWeights,
  type PodSizeScaling,
  type AuraRange,
} from "@/lib/scoring-config";
import {
  evaluateChronicStatus,
  getChronicConfig,
  type ChronicConfig,
  type ChronicStatus,
} from "@/lib/chronic-archenemy";
import { BADGE_QUESTIONS, type BadgeKey } from "@/lib/votes";

// ── Types ──────────────────────────────────────────────

export interface DeckDelta {
  deckId: string;
  userId: string;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  badgeDeltas: Record<string, number>;
  bracketDelta: number;
  chronicPenalty: number;
  scalingFactor: number;
  wasChronic: boolean;
}

export interface GameAuraResult {
  gameId: string;
  podSize: number;
  deltas: DeckDelta[];
}

export interface AuraHistoryEntry {
  id: string;
  deck_id: string;
  game_id: string;
  score_before: number;
  score_after: number;
  delta: number;
  badge_deltas: Record<string, number>;
  bracket_delta: number;
  pod_size: number;
  scaling_factor: number;
  was_chronic_archenemy: boolean;
  created_at: string;
}

// ── Core computation ───────────────────────────────────

/**
 * Compute AURA deltas for all commanders in a completed game.
 * Does NOT apply changes — call applyGameAura() to persist.
 */
export async function computeGameAura(
  gameId: string
): Promise<GameAuraResult> {
  const supabase = createClient();

  // 1. Load game info
  const { data: game, error: gameErr } = await supabase
    .from("games")
    .select("id, pod_size, produces_score_changes")
    .eq("id", gameId)
    .single() as { data: any; error: any };

  if (gameErr || !game) {
    throw new Error(`Game not found: ${gameErr?.message}`);
  }

  // Games with < 2 voters don't produce score changes
  if (!game.produces_score_changes) {
    return { gameId, podSize: game.pod_size, deltas: [] };
  }

  // 2. Load all config in parallel
  const [weights, scaling, auraRange, chronicCfg] = await Promise.all([
    getScoringWeights(),
    getPodSizeScaling(),
    getAuraRange(),
    getChronicConfig(),
  ]);

  const scaleFactor = scaling[String(game.pod_size)] ?? 1.0;

  // 3. Load game players with their current AURA scores
  const { data: players, error: playersErr } = await supabase
    .from("game_players")
    .select("user_id, deck_id, decks!inner(aura_score)")
    .eq("game_id", gameId) as { data: any; error: any };

  if (playersErr || !players) {
    throw new Error(`Failed to load game players: ${playersErr?.message}`);
  }

  // 4. Load all votes for this game
  const { data: allVotes, error: votesErr } = await supabase
    .from("game_votes")
    .select("question_key, target_deck_id")
    .eq("game_id", gameId) as { data: any; error: any };

  if (votesErr) {
    throw new Error(`Failed to load votes: ${votesErr.message}`);
  }

  // 5. Count votes per deck per question
  const voteCounts: Record<string, Record<string, number>> = {};
  for (const vote of allVotes ?? []) {
    if (!vote.target_deck_id) continue;
    if (!voteCounts[vote.target_deck_id]) {
      voteCounts[vote.target_deck_id] = {};
    }
    const qk = vote.question_key;
    voteCounts[vote.target_deck_id][qk] =
      (voteCounts[vote.target_deck_id][qk] ?? 0) + 1;
  }

  // 6. Compute delta for each commander
  const deltas: DeckDelta[] = [];

  for (const player of players) {
    const deckId = player.deck_id;
    const currentScore = Number(
      (player as Record<string, unknown>).decks &&
        ((player as Record<string, unknown>).decks as Record<string, unknown>)
          .aura_score
    ) || 50;
    const deckVotes = voteCounts[deckId] ?? {};

    // Badge deltas (5 badge questions)
    const badgeDeltas: Record<string, number> = {};
    let badgeTotal = 0;

    for (const badge of BADGE_QUESTIONS) {
      const voteCount = deckVotes[badge] ?? 0;
      const weight = getWeightForBadge(weights, badge as BadgeKey);
      const raw = voteCount * weight;
      badgeDeltas[badge] = raw;
      badgeTotal += raw;
    }

    // Bracket flag delta
    const bracketFlags = deckVotes["bracket_check"] ?? 0;
    const bracketDelta = bracketFlags * weights.bracket_flag_weight;

    // Apply pod size scaling
    const scaledBadge = badgeTotal * scaleFactor;
    const scaledBracket = bracketDelta * scaleFactor;

    // Chronic archenemy check
    const chronicStatus = await evaluateChronicStatus(deckId, chronicCfg);
    const chronicPenalty = chronicStatus.isChronic ? chronicCfg.penalty : 0;

    // Final delta
    const totalDelta = scaledBadge + scaledBracket + chronicPenalty;

    // Apply and clamp
    const newScore = clamp(
      currentScore + totalDelta,
      auraRange.aura_min,
      auraRange.aura_max
    );
    const actualDelta = Number((newScore - currentScore).toFixed(2));

    deltas.push({
      deckId,
      userId: player.user_id,
      scoreBefore: currentScore,
      scoreAfter: newScore,
      delta: actualDelta,
      badgeDeltas,
      bracketDelta: scaledBracket,
      chronicPenalty,
      scalingFactor: scaleFactor,
      wasChronic: chronicStatus.isChronic,
    });
  }

  return { gameId, podSize: game.pod_size, deltas };
}

// ── Apply deltas atomically ────────────────────────────

/**
 * Compute and apply AURA deltas for a completed game.
 * Idempotent: if history already exists for this game, skips.
 * One game produces exactly one update per commander.
 */
export async function applyGameAura(gameId: string): Promise<GameAuraResult> {
  const supabase = createClient();

  // Check if already processed (idempotent)
  const { data: existing } = await supabase
    .from("aura_history")
    .select("id")
    .eq("game_id", gameId)
    .limit(1);

  if (existing && existing.length > 0) {
    // Already processed — return existing data
    return await getGameAuraResult(gameId);
  }

  // Compute deltas
  const result = await computeGameAura(gameId);

  if (result.deltas.length === 0) {
    return result; // No score changes (< 2 voters)
  }

  // Apply all deltas
  for (const delta of result.deltas) {
    // Update deck AURA score
    const { error: updateErr } = await supabase
      .from("decks")
      .update({ aura_score: delta.scoreAfter })
      .eq("id", delta.deckId);

    if (updateErr) {
      throw new Error(
        `Failed to update AURA for deck ${delta.deckId}: ${updateErr.message}`
      );
    }

    // Record history
    const { error: historyErr } = await supabase
      .from("aura_history")
      .insert({
        deck_id: delta.deckId,
        game_id: gameId,
        score_before: delta.scoreBefore,
        score_after: delta.scoreAfter,
        delta: delta.delta,
        badge_deltas: delta.badgeDeltas,
        bracket_delta: delta.bracketDelta,
        pod_size: result.podSize,
        scaling_factor: delta.scalingFactor,
        was_chronic_archenemy: delta.wasChronic,
      });

    if (historyErr) {
      throw new Error(
        `Failed to record AURA history for deck ${delta.deckId}: ${historyErr.message}`
      );
    }
  }

  return result;
}

// ── Readers ────────────────────────────────────────────

/** Get AURA delta history for a specific deck (for trend chart) */
export async function getAuraHistory(
  deckId: string,
  limit = 50
): Promise<AuraHistoryEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("aura_history")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch AURA history: ${error.message}`);
  }

  return (data ?? []) as AuraHistoryEntry[];
}

/** Get AURA history for a specific game (all commanders) */
export async function getGameAuraHistory(
  gameId: string
): Promise<AuraHistoryEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("aura_history")
    .select("*")
    .eq("game_id", gameId);

  if (error) {
    throw new Error(`Failed to fetch game AURA history: ${error.message}`);
  }

  return (data ?? []) as AuraHistoryEntry[];
}

/** Reconstruct a GameAuraResult from persisted history */
async function getGameAuraResult(gameId: string): Promise<GameAuraResult> {
  const history = await getGameAuraHistory(gameId);

  if (history.length === 0) {
    return { gameId, podSize: 0, deltas: [] };
  }

  return {
    gameId,
    podSize: history[0].pod_size,
    deltas: history.map((h) => ({
      deckId: h.deck_id,
      userId: "", // not stored in history
      scoreBefore: Number(h.score_before),
      scoreAfter: Number(h.score_after),
      delta: Number(h.delta),
      badgeDeltas: h.badge_deltas,
      bracketDelta: Number(h.bracket_delta),
      chronicPenalty: 0, // not stored separately
      scalingFactor: Number(h.scaling_factor),
      wasChronic: h.was_chronic_archenemy,
    })),
  };
}

/** Get current AURA score for a deck */
export async function getAuraScore(deckId: string): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decks")
    .select("aura_score")
    .eq("id", deckId)
    .single() as { data: any; error: any };

  if (error) {
    throw new Error(`Failed to fetch AURA score: ${error.message}`);
  }

  return Number(data?.aura_score ?? 50);
}

// ── Helpers ────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Number(Math.max(min, Math.min(max, value)).toFixed(2));
}
