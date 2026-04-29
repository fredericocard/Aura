// ============================================
// Post-game completion orchestration
// Chains all post-game processing steps in order:
//   1. Badge attribution (compute who earned what)
//   2. Badge counts (persist votes + brewed badges to decks)
//   3. Chronic archenemy (evaluate streak for all players)
//   4. AURA scoring (compute + apply deltas)
//   5. Bracket nudge (evaluate for each deck)
//   6. Game Card (compose + save)
//
// This runs once when a game reaches "completed" state.
// Every step is idempotent — safe to retry on failure.
// ============================================

import { saveGameBadgeAttributions } from "@/lib/badge-attribution";
import { processGameBadges } from "@/lib/badge-counts";
import { updateChronicStatusForGame } from "@/lib/chronic-archenemy";
import { applyGameAura } from "@/lib/aura-scoring";
import { createNudgeIfWarranted } from "@/lib/bracket-nudge";
import { createGameCard } from "@/lib/game-card";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface OrchestrationResult {
  gameId: string;
  success: boolean;
  steps: StepResult[];
  error: string | null;
}

export interface StepResult {
  step: string;
  success: boolean;
  detail: string;
  durationMs: number;
}

// ── Main pipeline ─────────────────────────────────────

/**
 * Run the full post-game completion pipeline.
 *
 * Called when checkPodCompletion() determines all reviews are in
 * and transitions the game to "completed" state.
 *
 * Steps execute in strict order — each depends on the prior step's data.
 * All steps are idempotent, so the entire pipeline is safe to re-run.
 *
 * If a step fails, subsequent steps are skipped and the error is returned.
 * The caller can safely retry the whole pipeline later.
 */
export async function onGameCompleted(
  gameId: string
): Promise<OrchestrationResult> {
  const steps: StepResult[] = [];

  try {
    // ── Step 1: Badge attribution ──────────────────────
    // Compute who earned what badges based on the vote tally.
    // Must run first — all downstream steps read from badge_attributions.
    const t1 = Date.now();
    const attrResult = await saveGameBadgeAttributions(gameId);
    steps.push({
      step: "badge_attribution",
      success: !attrResult.error,
      detail: attrResult.error
        ? `Failed: ${attrResult.error}`
        : `Computed for ${attrResult.data?.players.length ?? 0} players`,
      durationMs: Date.now() - t1,
    });

    if (attrResult.error) {
      return { gameId, success: false, steps, error: attrResult.error };
    }

    // ── Step 2: Badge counts ───────────────────────────
    // Persist per-category vote counts + brewed badge to deck cumulative totals.
    // Writes to badge_vote_history and badge_history tables.
    // Must run before chronic check (which reads badge_history).
    const t2 = Date.now();
    const badgesResult = await processGameBadges(gameId);
    steps.push({
      step: "badge_counts",
      success: !badgesResult.error,
      detail: badgesResult.error
        ? `Failed: ${badgesResult.error}`
        : `Votes: ${badgesResult.votesRecorded}, Badges: ${badgesResult.badgesRecorded}`,
      durationMs: Date.now() - t2,
    });

    if (badgesResult.error) {
      return { gameId, success: false, steps, error: badgesResult.error };
    }

    // ── Step 3: Chronic archenemy ──────────────────────
    // Re-evaluate rivalry brewed badge streak for every player in the game.
    // Must run before AURA scoring (which reads the chronic flag).
    const t3 = Date.now();
    const chronicResults = await updateChronicStatusForGame(gameId);
    const chronicCount = chronicResults.filter((s) => s.isChronic).length;
    steps.push({
      step: "chronic_archenemy",
      success: true,
      detail: `Evaluated ${chronicResults.length} players, ${chronicCount} chronic`,
      durationMs: Date.now() - t3,
    });

    // ── Step 4: AURA scoring ───────────────────────────
    // Compute and apply AURA deltas for all commanders.
    // Reads badge votes, bracket flags, chronic status, and config weights.
    const t4 = Date.now();
    const auraResult = await applyGameAura(gameId);
    steps.push({
      step: "aura_scoring",
      success: true,
      detail: `Applied deltas for ${auraResult.deltas.length} commanders`,
      durationMs: Date.now() - t4,
    });

    // ── Step 5: Bracket nudge ──────────────────────────
    // Evaluate each commander for bracket nudge eligibility.
    // Must run after AURA scoring (nudge reads completed game count).
    const t5 = Date.now();
    const deckIds = await getGameDeckIds(gameId);
    let nudgesCreated = 0;
    for (const deckId of deckIds) {
      const nudge = await createNudgeIfWarranted(deckId);
      if (nudge) nudgesCreated++;
    }
    steps.push({
      step: "bracket_nudge",
      success: true,
      detail: `Evaluated ${deckIds.length} decks, ${nudgesCreated} nudges created`,
      durationMs: Date.now() - t5,
    });

    // ── Step 6: Game Card ──────────────────────────────
    // Compose and save the game card (narrative, commanders, archetypes).
    // Must run last — reads from all prior steps' data.
    const t6 = Date.now();
    const card = await createGameCard(gameId);
    steps.push({
      step: "game_card",
      success: true,
      detail: `Card created: ${card.id} (share: ${card.share_code})`,
      durationMs: Date.now() - t6,
    });

    return { gameId, success: true, steps, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Add a failure step for whatever blew up
    steps.push({
      step: "unknown",
      success: false,
      detail: `Uncaught error: ${message}`,
      durationMs: 0,
    });

    return { gameId, success: false, steps, error: message };
  }
}

// ── Helpers ───────────────────────────────────────────

/** Get all deck IDs for players in a game */
async function getGameDeckIds(gameId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_players")
    .select("deck_id")
    .eq("game_id", gameId);

  if (error) {
    throw new Error(`Failed to fetch game deck IDs: ${error.message}`);
  }

  return (data ?? []).map((p) => p.deck_id);
}
