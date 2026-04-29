import { supabase } from './supabase';
import type { BadgeKey } from './badge-attribution';

const ALL_BADGES: BadgeKey[] = ['fun', 'rivalry', 'allegiance', 'brilliance', 'flavor'];

const BADGE_COLUMN_MAP: Record<BadgeKey, string> = {
  fun: 'badge_fun',
  rivalry: 'badge_rivalry',
  allegiance: 'badge_allegiance',
  brilliance: 'badge_brilliance',
  flavor: 'badge_flavor',
};

const VOTE_COLUMN_MAP: Record<BadgeKey, string> = {
  fun: 'votes_fun',
  rivalry: 'votes_rivalry',
  allegiance: 'votes_allegiance',
  brilliance: 'votes_brilliance',
  flavor: 'votes_flavor',
};

// ─── Types ──────────────────────────────────────────────────

export interface DeckBadgeCounts {
  fun: number;
  rivalry: number;
  allegiance: number;
  brilliance: number;
  flavor: number;
  total: number;
}

export interface DeckVoteCounts {
  fun: number;
  rivalry: number;
  allegiance: number;
  brilliance: number;
  flavor: number;
  total: number;
}

export interface BadgeHistoryEntry {
  id: string;
  deck_id: string;
  game_id: string;
  badge: BadgeKey;
  bracket_at_time: number;
  earned_at: string;
}

export interface BadgeVoteHistoryEntry {
  id: string;
  deck_id: string;
  game_id: string;
  badge: BadgeKey;
  vote_count: number;
  bracket_at_time: number;
  recorded_at: string;
}

// ─── Record badge votes received (for AURA) ────────────────

/**
 * Record all badge votes a commander received in a game.
 * Reads from badge_attributions.vote_counts and persists per-category.
 * Also increments the cumulative vote totals on the deck.
 *
 * Idempotent: if badge_vote_history already has rows for this deck+game, skips.
 */
export async function recordBadgeVotes(
  deckId: string,
  gameId: string,
  userId: string,
  voteCounts: Record<BadgeKey, number>
): Promise<{ error: string | null }> {
  // Check if already recorded
  const { data: existing } = await supabase
    .from('badge_vote_history')
    .select('id')
    .eq('deck_id', deckId)
    .eq('game_id', gameId)
    .limit(1);

  if (existing && existing.length > 0) return { error: null }; // Already recorded

  // Get current bracket
  const { data: deck } = await supabase
    .from('decks')
    .select('bracket, votes_fun, votes_rivalry, votes_allegiance, votes_brilliance, votes_flavor')
    .eq('id', deckId)
    .single() as { data: any };

  if (!deck) return { error: 'Deck not found' };

  // Insert history rows for each badge category
  const rows = ALL_BADGES
    .filter((badge: BadgeKey) => voteCounts[badge] > 0)
    .map((badge: BadgeKey) => ({
      deck_id: deckId,
      game_id: gameId,
      user_id: userId,
      badge,
      vote_count: voteCounts[badge],
      bracket_at_time: deck.bracket,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from('badge_vote_history')
      .insert(rows);

    if (insertError) return { error: insertError.message };
  }

  // Increment cumulative vote totals on the deck
  const updates: Record<string, number> = {};
  for (const badge of ALL_BADGES) {
    if (voteCounts[badge] > 0) {
      const col = VOTE_COLUMN_MAP[badge];
      const current = (deck as Record<string, number>)[col] ?? 0;
      updates[col] = current + voteCounts[badge];
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('decks')
      .update(updates)
      .eq('id', deckId);

    if (updateError) return { error: updateError.message };
  }

  return { error: null };
}

// ─── Record brewed badge earned ─────────────────────────────

/**
 * Record the single brewed badge a commander earned in a game.
 * Increments the brewed badge count on the deck.
 *
 * Idempotent: if badge_history already has a row for this deck+game, skips.
 */
export async function recordBrewedBadge(
  deckId: string,
  gameId: string,
  userId: string,
  badge: BadgeKey
): Promise<{ error: string | null }> {
  // Check if already recorded
  const { data: existing } = await supabase
    .from('badge_history')
    .select('id')
    .eq('deck_id', deckId)
    .eq('game_id', gameId)
    .single() as { data: any };

  if (existing) return { error: null };

  // Get current bracket and badge count
  const column = BADGE_COLUMN_MAP[badge];
  const { data: deck } = await supabase
    .from('decks')
    .select('bracket, badge_fun, badge_rivalry, badge_allegiance, badge_brilliance, badge_flavor')
    .eq('id', deckId)
    .single() as { data: any };

  if (!deck) return { error: 'Deck not found' };

  // Insert history row
  const { error: historyError } = await supabase
    .from('badge_history')
    .insert({
      deck_id: deckId,
      game_id: gameId,
      user_id: userId,
      badge,
      bracket_at_time: deck.bracket,
    });

  if (historyError) return { error: historyError.message };

  // Increment brewed badge count
  const currentCount = (deck as Record<string, number>)[column] ?? 0;
  const { error: updateError } = await supabase
    .from('decks')
    .update({ [column]: currentCount + 1 })
    .eq('id', deckId);

  return { error: updateError?.message ?? null };
}

// ─── Process a full game ────────────────────────────────────

/**
 * Process all badge data for a completed game.
 * Records both badge votes (for AURA) and brewed badges (for accomplishments).
 * Reads from badge_attributions (B13).
 */
export async function processGameBadges(gameId: string): Promise<{
  votesRecorded: number;
  badgesRecorded: number;
  error: string | null;
}> {
  const { data: attributions, error } = await supabase
    .from('badge_attributions')
    .select('user_id, deck_id, brewed_badge, vote_counts')
    .eq('game_id', gameId);

  if (error) return { votesRecorded: 0, badgesRecorded: 0, error: error.message };
  if (!attributions || attributions.length === 0) {
    return { votesRecorded: 0, badgesRecorded: 0, error: 'No badge attributions found' };
  }

  let votesRecorded = 0;
  let badgesRecorded = 0;

  for (const attr of attributions) {
    // 1. Record badge votes (all categories)
    const voteCounts = attr.vote_counts as Record<BadgeKey, number>;
    const hasVotes = Object.values(voteCounts).some(v => v > 0);

    if (hasVotes) {
      const { error: voteError } = await recordBadgeVotes(
        attr.deck_id, gameId, attr.user_id, voteCounts
      );
      if (!voteError) votesRecorded++;
    }

    // 2. Record brewed badge (single winner)
    if (attr.brewed_badge !== 'none') {
      const { error: badgeError } = await recordBrewedBadge(
        attr.deck_id, gameId, attr.user_id, attr.brewed_badge as BadgeKey
      );
      if (!badgeError) badgesRecorded++;
    }
  }

  return { votesRecorded, badgesRecorded, error: null };
}

// ─── Read: brewed badge counts (deck accomplishments) ───────

/**
 * Get brewed badge counts for a deck (deck accomplishments display).
 */
export async function getDeckBadgeCounts(deckId: string): Promise<{
  data: DeckBadgeCounts | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('decks')
    .select('badge_fun, badge_rivalry, badge_allegiance, badge_brilliance, badge_flavor')
    .eq('id', deckId)
    .single() as { data: any; error: any };

  if (error || !data) return { data: null, error: error?.message ?? null };

  const counts: DeckBadgeCounts = {
    fun: data.badge_fun,
    rivalry: data.badge_rivalry,
    allegiance: data.badge_allegiance,
    brilliance: data.badge_brilliance,
    flavor: data.badge_flavor,
    total: data.badge_fun + data.badge_rivalry + data.badge_allegiance + data.badge_brilliance + data.badge_flavor,
  };

  return { data: counts, error: null };
}

/**
 * Get brewed badge history for a deck (which badge won per game).
 */
export async function getDeckBadgeHistory(deckId: string): Promise<{
  data: BadgeHistoryEntry[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('badge_history')
    .select('*')
    .eq('deck_id', deckId)
    .order('earned_at', { ascending: false });

  return { data: (data as BadgeHistoryEntry[]) ?? [], error: error?.message ?? null };
}

// ─── Read: badge vote totals (for AURA) ─────────────────────

/**
 * Get cumulative badge vote totals for a deck (for AURA calculation).
 */
export async function getDeckVoteCounts(deckId: string): Promise<{
  data: DeckVoteCounts | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('decks')
    .select('votes_fun, votes_rivalry, votes_allegiance, votes_brilliance, votes_flavor')
    .eq('id', deckId)
    .single() as { data: any; error: any };

  if (error || !data) return { data: null, error: error?.message ?? null };

  const counts: DeckVoteCounts = {
    fun: data.votes_fun,
    rivalry: data.votes_rivalry,
    allegiance: data.votes_allegiance,
    brilliance: data.votes_brilliance,
    flavor: data.votes_flavor,
    total: data.votes_fun + data.votes_rivalry + data.votes_allegiance + data.votes_brilliance + data.votes_flavor,
  };

  return { data: counts, error: null };
}

/**
 * Get badge vote history for a deck (votes received per category per game).
 */
export async function getDeckVoteHistory(deckId: string): Promise<{
  data: BadgeVoteHistoryEntry[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('badge_vote_history')
    .select('*')
    .eq('deck_id', deckId)
    .order('recorded_at', { ascending: false });

  return { data: (data as BadgeVoteHistoryEntry[]) ?? [], error: error?.message ?? null };
}

/**
 * Get badge votes breakdown by bracket for a deck.
 * e.g., "Fun: 8 votes at Bracket 2, 3 votes at Bracket 3"
 */
export async function getDeckVotesByBracket(deckId: string): Promise<{
  data: { badge: BadgeKey; bracket: number; total_votes: number }[];
  error: string | null;
}> {
  const { data: history, error } = await supabase
    .from('badge_vote_history')
    .select('badge, bracket_at_time, vote_count')
    .eq('deck_id', deckId);

  if (error) return { data: [], error: error.message };

  const groups = new Map<string, { badge: BadgeKey; bracket: number; total_votes: number }>();

  for (const h of (history ?? [])) {
    const key = `${h.badge}:${h.bracket_at_time}`;
    const existing = groups.get(key);
    if (existing) {
      existing.total_votes += h.vote_count;
    } else {
      groups.set(key, {
        badge: h.badge as BadgeKey,
        bracket: h.bracket_at_time,
        total_votes: h.vote_count,
      });
    }
  }

  return {
    data: Array.from(groups.values()).sort((a: any, b: any) => {
      if (a.badge !== b.badge) return a.badge.localeCompare(b.badge);
      return a.bracket - b.bracket;
    }),
    error: null,
  };
}
