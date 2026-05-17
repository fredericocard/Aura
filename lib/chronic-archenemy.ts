// ============================================
// AF-B18 · Chronic archenemy detection
// A commander becomes chronic archenemy after earning
// the rivalry brewed badge in N consecutive games.
// When chronic, a flat AURA penalty is applied.
// The flag is internal — never shown to the user.
// ============================================

import { createClient } from "@/lib/supabase/client";
import { getConfigValues } from "@/lib/scoring-config";

// ── Types ──────────────────────────────────────────────

export interface ChronicConfig {
  consecutive: number; // default 3
  penalty: number; // default -1.5
}

export interface ChronicStatus {
  deckId: string;
  isChronic: boolean;
  currentStreak: number;
  requiredStreak: number;
  penalty: number;
}

// ── Config reader ──────────────────────────────────────

export async function getChronicConfig(): Promise<ChronicConfig> {
  const raw = await getConfigValues([
    "chronic_archenemy_consecutive",
    "chronic_archenemy_penalty",
  ]);

  return {
    consecutive: Number(raw.chronic_archenemy_consecutive ?? 3),
    penalty: Number(raw.chronic_archenemy_penalty ?? -1.5),
  };
}

// ── Core evaluation ────────────────────────────────────

/**
 * Evaluate whether a commander is chronic archenemy.
 *
 * Logic: look at the commander's most recent brewed badges
 * (from badge_history, ordered by game completion time).
 * If the last N are ALL "rivalry", the commander is chronic.
 *
 * The streak breaks the moment a different badge is earned.
 */
export async function evaluateChronicStatus(
  deckId: string,
  config?: ChronicConfig
): Promise<ChronicStatus> {
  const supabase = createClient();
  const cfg = config ?? (await getChronicConfig());

  // Get the most recent brewed badges for this deck, newest first
  const { data: badges, error } = await supabase
    .from("badge_history")
    .select("badge, earned_at")
    .eq("deck_id", deckId)
    .order("earned_at", { ascending: false })
    .limit(cfg.consecutive) as { data: any; error: any };

  if (error) {
    throw new Error(
      `Failed to fetch badge history for deck ${deckId}: ${error.message}`
    );
  }

  // Count consecutive rivalry badges from the most recent game backwards
  let currentStreak = 0;
  for (const entry of badges ?? []) {
    if (entry.badge === "rivalry") {
      currentStreak++;
    } else {
      break; // streak broken
    }
  }

  const isChronic = currentStreak >= cfg.consecutive;

  return {
    deckId,
    isChronic,
    currentStreak,
    requiredStreak: cfg.consecutive,
    penalty: cfg.penalty,
  };
}

// ── Update chronic status on deck ──────────────────────

/**
 * Re-evaluate and persist chronic archenemy status for a commander.
 * Called after every completed game.
 * Commanders can both enter and exit chronic state.
 */
export async function updateChronicStatus(
  deckId: string,
  config?: ChronicConfig
): Promise<ChronicStatus> {
  const status = await evaluateChronicStatus(deckId, config);
  const supabase = createClient();

  const { error } = await supabase
    .from("decks")
    .update({
      is_chronic_archenemy: status.isChronic,
      chronic_updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (error) {
    throw new Error(
      `Failed to update chronic status for deck ${deckId}: ${error.message}`
    );
  }

  return status;
}

/**
 * Quick check: is this commander currently flagged as chronic archenemy?
 * Reads the persisted flag (no recomputation).
 */
export async function isChronicArchenemy(deckId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("decks")
    .select("is_chronic_archenemy")
    .eq("id", deckId)
    .single() as { data: any; error: any };

  if (error) return false;
  return data?.is_chronic_archenemy ?? false;
}

/**
 * Batch update chronic status for all commanders in a game.
 * Called once when a game completes.
 */
export async function updateChronicStatusForGame(
  gameId: string
): Promise<ChronicStatus[]> {
  const supabase = createClient();
  const config = await getChronicConfig();

  const { data: players, error } = await supabase
    .from("game_players")
    .select("deck_id")
    .eq("game_id", gameId) as { data: any; error: any };

  if (error || !players) {
    throw new Error(`Failed to fetch game players: ${error?.message}`);
  }

  const results: ChronicStatus[] = [];
  for (const player of players) {
    const status = await updateChronicStatus(player.deck_id, config);
    results.push(status);
  }

  return results;
}
