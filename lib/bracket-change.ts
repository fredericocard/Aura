// ============================================
// AF-B21 · Bracket change handler
// Handles bracket changes from nudge acceptance
// or manual action. Resets AURA, clears chronic,
// preserves all badge counts.
// ============================================

import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface BracketChangeResult {
  deckId: string;
  oldBracket: number;
  newBracket: number;
  oldAura: number;
  newAura: number;
  chronicWasCleared: boolean;
  badgeCountsPreserved: BadgeCountsSnapshot;
  trigger: "nudge" | "manual";
}

export interface BadgeCountsSnapshot {
  badge_fun: number;
  badge_rivalry: number;
  badge_allegiance: number;
  badge_brilliance: number;
  badge_flavor: number;
  votes_fun: number;
  votes_rivalry: number;
  votes_allegiance: number;
  votes_brilliance: number;
  votes_flavor: number;
}

export interface BracketChangeLogEntry {
  id: string;
  deck_id: string;
  user_id: string;
  old_bracket: number;
  new_bracket: number;
  old_aura: number;
  new_aura: number;
  trigger_type: "nudge" | "manual";
  nudge_id: string | null;
  chronic_was_cleared: boolean;
  badge_counts_snapshot: BadgeCountsSnapshot;
  created_at: string;
}

// ── Core bracket change ────────────────────────────────

/**
 * Execute a bracket change for a commander.
 *
 * What happens:
 * 1. Bracket updates to the new value
 * 2. AURA resets to 50
 * 3. Chronic archenemy flag clears
 * 4. All badge counts preserved (unchanged)
 * 5. Change logged for audit
 *
 * Can be triggered by:
 * - Accepting a nudge (trigger = 'nudge', nudgeId provided)
 * - Manual action on deck profile (trigger = 'manual')
 */
export async function changeBracket(
  deckId: string,
  newBracket: number,
  trigger: "nudge" | "manual",
  nudgeId?: string
): Promise<BracketChangeResult> {
  const supabase = createClient();

  // Validate bracket range
  if (newBracket < 1 || newBracket > 5) {
    throw new Error(`Invalid bracket: ${newBracket}. Must be 1-5.`);
  }

  // Get current deck state
  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select(
      "id, user_id, bracket, aura_score, is_chronic_archenemy, " +
        "badge_fun, badge_rivalry, badge_allegiance, badge_brilliance, badge_flavor, " +
        "votes_fun, votes_rivalry, votes_allegiance, votes_brilliance, votes_flavor"
    )
    .eq("id", deckId)
    .single();

  if (deckErr || !deck) {
    throw new Error(`Deck not found: ${deckErr?.message}`);
  }

  // Nudges only go up — never allow moving down via nudge
  if (trigger === "nudge" && newBracket <= deck.bracket) {
    throw new Error("Nudge can only suggest moving UP a bracket");
  }

  // Snapshot badge counts before change
  const badgeCounts: BadgeCountsSnapshot = {
    badge_fun: deck.badge_fun ?? 0,
    badge_rivalry: deck.badge_rivalry ?? 0,
    badge_allegiance: deck.badge_allegiance ?? 0,
    badge_brilliance: deck.badge_brilliance ?? 0,
    badge_flavor: deck.badge_flavor ?? 0,
    votes_fun: deck.votes_fun ?? 0,
    votes_rivalry: deck.votes_rivalry ?? 0,
    votes_allegiance: deck.votes_allegiance ?? 0,
    votes_brilliance: deck.votes_brilliance ?? 0,
    votes_flavor: deck.votes_flavor ?? 0,
  };

  const oldAura = Number(deck.aura_score);
  const wasChronic = deck.is_chronic_archenemy ?? false;

  // 1. Update deck: new bracket, reset AURA to 50, clear chronic
  const { error: updateErr } = await supabase
    .from("decks")
    .update({
      bracket: newBracket,
      aura_score: 50.0,
      bracket_set_at: new Date().toISOString(),
      is_chronic_archenemy: false,
      chronic_updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (updateErr) {
    throw new Error(`Failed to update deck: ${updateErr.message}`);
  }

  // 2. Log the bracket change for audit
  const { error: logErr } = await supabase
    .from("bracket_change_log")
    .insert({
      deck_id: deckId,
      user_id: deck.user_id,
      old_bracket: deck.bracket,
      new_bracket: newBracket,
      old_aura: oldAura,
      new_aura: 50.0,
      trigger_type: trigger,
      nudge_id: nudgeId ?? null,
      chronic_was_cleared: wasChronic,
      badge_counts_snapshot: badgeCounts,
    });

  if (logErr) {
    throw new Error(`Failed to log bracket change: ${logErr.message}`);
  }

  // 3. If triggered by nudge, mark it as accepted
  if (trigger === "nudge" && nudgeId) {
    const { error: nudgeErr } = await supabase
      .from("bracket_nudges")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", nudgeId);

    if (nudgeErr) {
      throw new Error(`Failed to update nudge status: ${nudgeErr.message}`);
    }
  }

  return {
    deckId,
    oldBracket: deck.bracket,
    newBracket,
    oldAura,
    newAura: 50,
    chronicWasCleared: wasChronic,
    badgeCountsPreserved: badgeCounts,
    trigger,
  };
}

// ── Convenience: accept nudge ──────────────────────────

/**
 * Accept a bracket nudge — one-tap action.
 * Reads the nudge, executes the bracket change.
 */
export async function acceptNudge(
  nudgeId: string
): Promise<BracketChangeResult> {
  const supabase = createClient();

  const { data: nudge, error } = await supabase
    .from("bracket_nudges")
    .select("*")
    .eq("id", nudgeId)
    .eq("status", "pending")
    .single();

  if (error || !nudge) {
    throw new Error(`Nudge not found or not pending: ${error?.message}`);
  }

  return changeBracket(
    nudge.deck_id,
    nudge.suggested_bracket,
    "nudge",
    nudgeId
  );
}

// ── Manual bracket change ──────────────────────────────

/**
 * Manual bracket change from the deck profile.
 * Player decides on their own to change bracket.
 */
export async function manualBracketChange(
  deckId: string,
  newBracket: number
): Promise<BracketChangeResult> {
  return changeBracket(deckId, newBracket, "manual");
}

// ── Confirmation summary ───────────────────────────────

/**
 * Generate a human-readable confirmation message
 * for the UI after a bracket change.
 */
export function getConfirmationSummary(
  result: BracketChangeResult
): string[] {
  const lines: string[] = [];

  lines.push(
    `Bracket changed: ${result.oldBracket} → ${result.newBracket}`
  );
  lines.push(`AURA reset: ${result.oldAura} → 50 (fresh start in new bracket)`);

  if (result.chronicWasCleared) {
    lines.push("Chronic archenemy status cleared");
  }

  const totalBadges =
    result.badgeCountsPreserved.badge_fun +
    result.badgeCountsPreserved.badge_rivalry +
    result.badgeCountsPreserved.badge_allegiance +
    result.badgeCountsPreserved.badge_brilliance +
    result.badgeCountsPreserved.badge_flavor;

  lines.push(`All ${totalBadges} earned badges preserved`);

  return lines;
}

// ── History / audit ────────────────────────────────────

/**
 * Get bracket change history for a deck.
 */
export async function getBracketChangeHistory(
  deckId: string
): Promise<BracketChangeLogEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bracket_change_log")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch bracket change history: ${error.message}`);
  }

  return (data ?? []) as BracketChangeLogEntry[];
}
