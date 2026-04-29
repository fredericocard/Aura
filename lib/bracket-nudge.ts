// ============================================
// AF-B20 · Bracket change nudge (in-app)
// Evaluates whether a commander is consistently
// flagged as above-bracket and suggests moving up.
// Nudges only go UP, never down.
// ============================================

import { createClient } from "@/lib/supabase/client";
import { getConfigValues } from "@/lib/scoring-config";

// ── Types ──────────────────────────────────────────────

export interface NudgeConfig {
  minGames: number;       // minimum games before evaluation
  flagRatio: number;      // proportion of games with flags to trigger
  cooloffGames: number;   // games after dismiss before new nudge
}

export interface NudgeEvaluation {
  deckId: string;
  shouldNudge: boolean;
  currentBracket: number;
  suggestedBracket: number | null;
  flagRatio: number;
  gamesEvaluated: number;
  reason: string;
}

export interface BracketNudge {
  id: string;
  deck_id: string;
  current_bracket: number;
  suggested_bracket: number;
  flag_ratio: number;
  games_evaluated: number;
  status: "pending" | "dismissed" | "accepted";
  created_at: string;
  cooloff_until: string | null;
}

// ── Config ─────────────────────────────────────────────

export async function getNudgeConfig(): Promise<NudgeConfig> {
  const raw = await getConfigValues([
    "bracket_nudge_min_games",
    "bracket_nudge_flag_ratio",
    "bracket_nudge_cooloff_games",
  ]);

  return {
    minGames: Number(raw.bracket_nudge_min_games ?? 5),
    flagRatio: Number(raw.bracket_nudge_flag_ratio ?? 0.5),
    cooloffGames: Number(raw.bracket_nudge_cooloff_games ?? 5),
  };
}

// ── Core evaluation ────────────────────────────────────

/**
 * Evaluate whether a commander should receive a bracket nudge.
 *
 * Logic:
 * 1. Must have played >= min_games completed games
 * 2. Count how many of those games had at least one bracket flag
 * 3. If flag_ratio >= threshold, suggest moving up one bracket
 * 4. Never suggests moving above bracket 5
 * 5. Respects cooloff period from dismissed nudges
 */
export async function evaluateNudge(
  deckId: string,
  config?: NudgeConfig
): Promise<NudgeEvaluation> {
  const supabase = createClient();
  const cfg = config ?? (await getNudgeConfig());

  // Get deck info
  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select("id, bracket, user_id")
    .eq("id", deckId)
    .single() as { data: any; error: any };

  if (deckErr || !deck) {
    throw new Error(`Deck not found: ${deckErr?.message}`);
  }

  // Already at max bracket — can't nudge higher
  if (deck.bracket >= 5) {
    return {
      deckId,
      shouldNudge: false,
      currentBracket: deck.bracket,
      suggestedBracket: null,
      flagRatio: 0,
      gamesEvaluated: 0,
      reason: "Already at maximum bracket (5)",
    };
  }

  // Check for active pending nudge
  const { data: pendingNudge } = await supabase
    .from("bracket_nudges")
    .select("id")
    .eq("deck_id", deckId)
    .eq("status", "pending")
    .limit(1);

  if (pendingNudge && pendingNudge.length > 0) {
    return {
      deckId,
      shouldNudge: false,
      currentBracket: deck.bracket,
      suggestedBracket: null,
      flagRatio: 0,
      gamesEvaluated: 0,
      reason: "Active nudge already pending",
    };
  }

  // Check cooloff: count games since last dismissed nudge
  const { data: lastDismissed } = await supabase
    .from("bracket_nudges")
    .select("dismissed_at")
    .eq("deck_id", deckId)
    .eq("status", "dismissed")
    .order("dismissed_at", { ascending: false })
    .limit(1) as { data: any };

  if (lastDismissed && lastDismissed.length > 0 && lastDismissed[0].dismissed_at) {
    // Count games played since dismissal
    const { count } = await supabase
      .from("game_players")
      .select("id", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .gt("joined_at", lastDismissed[0].dismissed_at);

    if ((count ?? 0) < cfg.cooloffGames) {
      return {
        deckId,
        shouldNudge: false,
        currentBracket: deck.bracket,
        suggestedBracket: null,
        flagRatio: 0,
        gamesEvaluated: count ?? 0,
        reason: `In cooloff period (${count ?? 0}/${cfg.cooloffGames} games since last dismiss)`,
      };
    }
  }

  // Get all completed games for this deck
  const { data: gameRows, error: gamesErr } = await supabase
    .from("game_players")
    .select("game_id, games!inner(state)")
    .eq("deck_id", deckId)
    .eq("games.state", "completed") as { data: any; error: any };

  if (gamesErr) {
    throw new Error(`Failed to fetch games: ${gamesErr.message}`);
  }

  const gameIds = (gameRows ?? []).map((r) => r.game_id);
  const totalGames = gameIds.length;

  // Not enough games
  if (totalGames < cfg.minGames) {
    return {
      deckId,
      shouldNudge: false,
      currentBracket: deck.bracket,
      suggestedBracket: null,
      flagRatio: 0,
      gamesEvaluated: totalGames,
      reason: `Not enough games (${totalGames}/${cfg.minGames})`,
    };
  }

  // Count games where this deck received at least one bracket flag
  let flaggedGames = 0;
  for (const gameId of gameIds) {
    const { count } = await supabase
      .from("game_votes")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("question_key", "bracket_check")
      .eq("target_deck_id", deckId);

    if ((count ?? 0) > 0) flaggedGames++;
  }

  const ratio = flaggedGames / totalGames;

  if (ratio >= cfg.flagRatio) {
    return {
      deckId,
      shouldNudge: true,
      currentBracket: deck.bracket,
      suggestedBracket: deck.bracket + 1,
      flagRatio: Number(ratio.toFixed(2)),
      gamesEvaluated: totalGames,
      reason: `Flagged in ${flaggedGames}/${totalGames} games (${(ratio * 100).toFixed(0)}% >= ${(cfg.flagRatio * 100).toFixed(0)}% threshold)`,
    };
  }

  return {
    deckId,
    shouldNudge: false,
    currentBracket: deck.bracket,
    suggestedBracket: null,
    flagRatio: Number(ratio.toFixed(2)),
    gamesEvaluated: totalGames,
    reason: `Flag ratio ${(ratio * 100).toFixed(0)}% below ${(cfg.flagRatio * 100).toFixed(0)}% threshold`,
  };
}

// ── Nudge creation ─────────────────────────────────────

/**
 * Evaluate and create a nudge if warranted.
 * Called after each completed game.
 */
export async function createNudgeIfWarranted(
  deckId: string
): Promise<BracketNudge | null> {
  const evaluation = await evaluateNudge(deckId);

  if (!evaluation.shouldNudge || !evaluation.suggestedBracket) {
    return null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("bracket_nudges")
    .insert({
      deck_id: deckId,
      current_bracket: evaluation.currentBracket,
      suggested_bracket: evaluation.suggestedBracket,
      flag_ratio: evaluation.flagRatio,
      games_evaluated: evaluation.gamesEvaluated,
    })
    .select()
    .single() as { data: any; error: any };

  if (error) {
    throw new Error(`Failed to create nudge: ${error.message}`);
  }

  return data as BracketNudge;
}

// ── Nudge actions ──────────────────────────────────────

/**
 * Get the active pending nudge for a deck (if any).
 * Used to show the nudge UI on app open.
 */
export async function getPendingNudge(
  deckId: string
): Promise<BracketNudge | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bracket_nudges")
    .select("*")
    .eq("deck_id", deckId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0] as BracketNudge;
}

/**
 * Get all pending nudges for a user's decks.
 * Used on app open to show at most one nudge per session.
 */
export async function getUserPendingNudges(
  userId: string
): Promise<BracketNudge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bracket_nudges")
    .select("*, decks!inner(user_id)")
    .eq("decks.user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch nudges: ${error.message}`);
  }

  return (data ?? []) as BracketNudge[];
}

/**
 * Dismiss a nudge. Sets cooloff period based on config.
 */
export async function dismissNudge(nudgeId: string): Promise<void> {
  const supabase = createClient();
  const config = await getNudgeConfig();

  // Calculate cooloff: we store the timestamp, but the actual check
  // counts games played since dismissal (see evaluateNudge)
  const { error } = await supabase
    .from("bracket_nudges")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
    })
    .eq("id", nudgeId)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to dismiss nudge: ${error.message}`);
  }
}

/**
 * Get nudge history for a deck (all statuses).
 */
export async function getNudgeHistory(deckId: string): Promise<BracketNudge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bracket_nudges")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch nudge history: ${error.message}`);
  }

  return (data ?? []) as BracketNudge[];
}
