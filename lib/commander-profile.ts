// ============================================
// AF-B24 · Commander profile aggregation
// Single endpoint for the deck profile page.
// Returns AURA, tier, confidence, badges, games, cards.
// Reads from the same source of truth — always consistent.
// ============================================

import { createClient } from "@/lib/supabase/client";
import { getDeckTier, type AuraTier } from "@/lib/aura-tiers";
import {
  getDeckBadgeCounts,
  getDeckVoteCounts,
  getDeckVotesByBracket,
} from "@/lib/badge-counts";
import { getAuraHistory, type AuraHistoryEntry } from "@/lib/aura-scoring";
import { getCardsForDeck } from "@/lib/game-card";
import type { BadgeKey } from "@/lib/votes";

// ── Types ──────────────────────────────────────────────

export type ConfidenceBand = "Developing" | "Tracking" | "Stable";

export interface BadgeProfile {
  badge: BadgeKey;
  earnedCount: number;      // total times brewed this badge
  voteCount: number;        // total votes received in this category
  byBracket: BracketBreakdown[];
}

export interface BracketBreakdown {
  bracket: number;
  votes: number;
  badges: number;
}

export interface CommanderProfile {
  deckId: string;
  commanderName: string;
  commanderArtUrl: string | null;
  colorIdentity: string | null;
  currentBracket: number;
  // AURA
  auraScore: number;
  auraTier: AuraTier;
  confidenceBand: ConfidenceBand;
  // Badges
  badges: BadgeProfile[];
  totalBadgesEarned: number;
  // Games
  totalGames: number;
  gamesAtCurrentBracket: number;
  // Recent AURA trend (last 10 entries)
  auraTrend: AuraHistoryEntry[];
  // Recent Game Cards (last 5)
  recentCards: RecentCard[];
}

export interface RecentCard {
  cardId: string;
  gameDate: string;
  archetype: string;
  brewedBadge: string;
  isWinner: boolean;
  shareCode: string | null;
  narrative: string;
  podSize: number;
}

// ── Confidence band ────────────────────────────────────

/**
 * Determine the confidence band based on games played.
 * - Developing: < 5 games (AURA is still calibrating)
 * - Tracking: 5–14 games (AURA is settling)
 * - Stable: 15+ games (AURA is reliable)
 */
function getConfidenceBand(gamesPlayed: number): ConfidenceBand {
  if (gamesPlayed < 5) return "Developing";
  if (gamesPlayed < 15) return "Tracking";
  return "Stable";
}

// ── Main endpoint ──────────────────────────────────────

/**
 * Get the full commander profile — single call for the deck profile page.
 * All data reads from the same source of truth for consistency.
 */
export async function getCommanderProfile(
  deckId: string
): Promise<CommanderProfile> {
  const supabase = createClient();

  // 1. Load deck basics
  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select(
      "id, commander_name, commander_art_url, color_identity, bracket, aura_score, " +
        "badge_fun, badge_rivalry, badge_allegiance, badge_brilliance, badge_flavor, " +
        "votes_fun, votes_rivalry, votes_allegiance, votes_brilliance, votes_flavor"
    )
    .eq("id", deckId)
    .single() as { data: any; error: any };

  if (deckErr || !deck) {
    throw new Error(`Deck not found: ${deckErr?.message}`);
  }

  // 2. Run parallel queries for speed
  const [
    tierResult,
    bracketVotes,
    auraTrend,
    cards,
    gamesResult,
    bracketGamesResult,
  ] = await Promise.all([
    getDeckTier(deckId),
    getDeckVotesByBracket(deckId),
    getAuraHistory(deckId, 10),
    getCardsForDeck(deckId),
    // Count total completed games
    supabase
      .from("game_players")
      .select("id, games!inner(state)", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .eq("games.state", "completed"),
    // Count games at current bracket
    supabase
      .from("badge_vote_history")
      .select("id", { count: "exact", head: true })
      .eq("deck_id", deckId)
      .eq("bracket_at_time", deck.bracket),
  ]);

  const totalGames = gamesResult.count ?? 0;
  const gamesAtCurrentBracket = bracketGamesResult.count ?? 0;

  // 3. Build badge profiles
  const badgeKeys: BadgeKey[] = [
    "fun",
    "rivalry",
    "allegiance",
    "brilliance",
    "flavor",
  ];

  const badges: BadgeProfile[] = badgeKeys.map((badge) => {
    const earnedCount = Number(deck[`badge_${badge}` as keyof typeof deck] ?? 0);
    const voteCount = Number(deck[`votes_${badge}` as keyof typeof deck] ?? 0);

    // Build bracket breakdown from history
    const byBracket: BracketBreakdown[] = [];
    const bracketData = bracketVotes.filter((bv) => bv.category === badge);
    for (const bv of bracketData) {
      byBracket.push({
        bracket: bv.bracket,
        votes: bv.total_votes,
        badges: bv.total_badges ?? 0,
      });
    }

    return { badge, earnedCount, voteCount, byBracket };
  });

  const totalBadgesEarned = badges.reduce((sum, b) => sum + b.earnedCount, 0);

  // 4. Build recent cards
  const recentCards: RecentCard[] = cards.slice(0, 5).map((card) => {
    // Find this commander's data in the card
    const commanders = (card.commanders ?? []) as Array<{
      deck_id: string;
      archetype: string;
      brewed_badge: string;
      is_winner: boolean;
    }>;
    const myData = commanders.find((c) => c.deck_id === deckId);

    return {
      cardId: card.id,
      gameDate: card.game_date,
      archetype: myData?.archetype ?? "The Unknown",
      brewedBadge: myData?.brewed_badge ?? "none",
      isWinner: myData?.is_winner ?? false,
      shareCode: card.share_code,
      narrative: card.narrative,
      podSize: card.pod_size,
    };
  });

  // 5. Assemble profile
  return {
    deckId,
    commanderName: deck.commander_name,
    commanderArtUrl: deck.commander_art_url,
    colorIdentity: deck.color_identity,
    currentBracket: deck.bracket,
    auraScore: Number(deck.aura_score),
    auraTier: tierResult,
    confidenceBand: getConfidenceBand(totalGames),
    badges,
    totalBadgesEarned,
    totalGames,
    gamesAtCurrentBracket,
    auraTrend,
    recentCards,
  };
}

// ── Lightweight version for list views ─────────────────

export interface CommanderSummary {
  deckId: string;
  commanderName: string;
  commanderArtUrl: string | null;
  bracket: number;
  auraScore: number;
  tier: string;
  totalGames: number;
  totalBadges: number;
  confidenceBand: ConfidenceBand;
}

/**
 * Get summaries for all of a user's commanders.
 * Lighter than full profile — for the deck list page.
 */
export async function getUserCommanderSummaries(
  userId: string
): Promise<CommanderSummary[]> {
  const supabase = createClient();

  const { data: decks, error } = await supabase
    .from("decks")
    .select(
      "id, commander_name, commander_art_url, bracket, aura_score, " +
        "badge_fun, badge_rivalry, badge_allegiance, badge_brilliance, badge_flavor"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false }) as { data: any; error: any };

  if (error) {
    throw new Error(`Failed to fetch decks: ${error.message}`);
  }

  const summaries: CommanderSummary[] = [];

  for (const deck of decks ?? []) {
    const [tierResult, gamesResult] = await Promise.all([
      getDeckTier(deck.id),
      supabase
        .from("game_players")
        .select("id, games!inner(state)", { count: "exact", head: true })
        .eq("deck_id", deck.id)
        .eq("games.state", "completed"),
    ]);

    const totalGames = gamesResult.count ?? 0;
    const totalBadges =
      (deck.badge_fun ?? 0) +
      (deck.badge_rivalry ?? 0) +
      (deck.badge_allegiance ?? 0) +
      (deck.badge_brilliance ?? 0) +
      (deck.badge_flavor ?? 0);

    summaries.push({
      deckId: deck.id,
      commanderName: deck.commander_name,
      commanderArtUrl: deck.commander_art_url,
      bracket: deck.bracket,
      auraScore: Number(deck.aura_score),
      tier: tierResult.tier,
      totalGames,
      totalBadges,
      confidenceBand: getConfidenceBand(totalGames),
    });
  }

  return summaries;
}
