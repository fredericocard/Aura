import { supabase } from './supabase';
import { computeGameTally } from './vote-tally';
import type { BadgeKey } from './votes';
export type { BadgeKey };

export const ALL_BADGES: BadgeKey[] = ['brilliance', 'flavor', 'rivalry', 'allegiance', 'fun'];

// ─── Archetype definitions ──────────────────────────────────
// Key = sorted badge combination joined by '+', Value = archetype name

const ARCHETYPE_MAP: Record<string, string> = {
  // 1 badge
  'brilliance': 'The Mastermind',
  'flavor': 'The Lore Master',
  'rivalry': 'The Archenemy',
  'allegiance': 'The Kingmaker',
  'fun': 'The Beloved',

  // 2 badges
  'brilliance+flavor': 'The Chronicler',
  'brilliance+rivalry': 'The Grand Tactician',
  'allegiance+brilliance': 'The Architect',
  'brilliance+fun': 'The Enchanter',
  'flavor+rivalry': 'The Dark Legend',
  'allegiance+flavor': 'The Bard',
  'flavor+fun': 'The Showrunner',
  'allegiance+rivalry': 'The Schemer',
  'fun+rivalry': 'The Chaos Agent',
  'allegiance+fun': 'The Bonded',

  // 3 badges
  'brilliance+flavor+rivalry': 'The Nemesis',
  'allegiance+brilliance+flavor': 'The Sage',
  'brilliance+flavor+fun': 'The Raconteur',
  'allegiance+brilliance+rivalry': 'The Sovereign',
  'brilliance+fun+rivalry': 'The Gladiator',
  'allegiance+brilliance+fun': 'The Patron',
  'allegiance+flavor+rivalry': 'The Usurper',
  'flavor+fun+rivalry': 'The Trickster',
  'allegiance+flavor+fun': 'The Herald',
  'allegiance+fun+rivalry': 'The Warchief',

  // 4 badges
  'allegiance+brilliance+flavor+rivalry': 'The Grand Vizier',
  'brilliance+flavor+fun+rivalry': 'The Archmage',
  'allegiance+brilliance+flavor+fun': 'The Luminary',
  'allegiance+brilliance+fun+rivalry': 'The High Commander',
  'allegiance+flavor+fun+rivalry': 'The Mythmaker',

  // 5 badges
  'allegiance+brilliance+flavor+fun+rivalry': 'The Living Legend',
};

// ─── Types ──────────────────────────────────────────────────

export interface PlayerBadgeData {
  user_id: string;
  deck_id: string;
  vote_counts: Record<BadgeKey, number>;  // votes received per badge
  badges_received: BadgeKey[];            // badges where votes > 0
  brewed_badge: BadgeKey | 'none';        // single top badge
  archetype_key: string;                  // sorted combo key
  archetype_name: string;                 // display name
}

export interface BadgeAttributionResult {
  game_id: string;
  players: PlayerBadgeData[];
  computed_at: string;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Build the archetype key from a list of badges (sorted alphabetically, joined by +).
 */
function makeArchetypeKey(badges: BadgeKey[]): string {
  return [...badges].sort().join('+');
}

/**
 * Look up archetype name from badge combination.
 */
function getArchetypeName(badges: BadgeKey[]): string {
  if (badges.length === 0) return 'The Unknown';
  const key = makeArchetypeKey(badges);
  return ARCHETYPE_MAP[key] ?? 'The Unknown';
}

// ─── Main attribution logic ─────────────────────────────────

/**
 * Compute badge attribution for all players in a game.
 *
 * For each player:
 *   1. Count votes received per badge category
 *   2. Brewed badge = category with most votes (alphabetical tiebreak)
 *   3. Badges received = all categories where votes > 0
 *   4. Archetype = mapped from badge combination
 *
 * Archetype collision resolution:
 *   If two players have the same archetype, the one with fewer total votes
 *   drops their weakest badge from the combination → different archetype.
 *   Repeat until all archetypes are unique.
 *
 * Deterministic: same votes always produce the same result.
 */
export async function computeBadgeAttribution(gameId: string): Promise<{
  data: BadgeAttributionResult | null;
  error: string | null;
}> {
  // Get the vote tally
  const { data: tally, error: tallyError } = await computeGameTally(gameId);
  if (tallyError || !tally) return { data: null, error: tallyError ?? 'Failed to compute tally' };

  // Get game players
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('user_id, deck_id')
    .eq('game_id', gameId) as { data: any };

  if (!gamePlayers || gamePlayers.length === 0) {
    return { data: null, error: 'No players found' };
  }

  // Build per-player vote counts (votes RECEIVED, not cast)
  // For each badge question, look at who got voted for
  const playerData: Map<string, PlayerBadgeData> = new Map();

  for (const gp of gamePlayers) {
    playerData.set(gp.user_id, {
      user_id: gp.user_id,
      deck_id: gp.deck_id,
      vote_counts: { fun: 0, rivalry: 0, allegiance: 0, brilliance: 0, flavor: 0 },
      badges_received: [],
      brewed_badge: 'none',
      archetype_key: '',
      archetype_name: 'The Unknown',
    });
  }

  // Count votes received per player per badge
  for (const question of tally.questions) {
    const badgeKey = question.question_key as BadgeKey;
    for (const result of question.results) {
      // result.deck_id → find which player owns this deck
      const player = gamePlayers.find(p => p.deck_id === result.deck_id);
      if (player) {
        const pd = playerData.get(player.user_id);
        if (pd) {
          pd.vote_counts[badgeKey] = result.votes;
        }
      }
    }
  }

  // Determine badges received + brewed badge for each player
  for (const pd of playerData.values()) {
    // Badges received = categories with > 0 votes
    pd.badges_received = ALL_BADGES.filter(b => pd.vote_counts[b] > 0);

    // Brewed badge = highest vote count (random tiebreak if tied)
    let topVotes = 0;
    for (const badge of ALL_BADGES) {
      if (pd.vote_counts[badge] > topVotes) {
        topVotes = pd.vote_counts[badge];
      }
    }

    // Collect all badges tied at the top
    const tiedBadges = ALL_BADGES.filter(b => pd.vote_counts[b] === topVotes && topVotes > 0);
    if (tiedBadges.length === 1) {
      pd.brewed_badge = tiedBadges[0];
    } else if (tiedBadges.length > 1) {
      // Random pick from tied badges
      pd.brewed_badge = tiedBadges[Math.floor(Math.random() * tiedBadges.length)];
    } else {
      pd.brewed_badge = 'none';
    }

    // Initial archetype from all received badges
    pd.archetype_key = makeArchetypeKey(pd.badges_received);
    pd.archetype_name = getArchetypeName(pd.badges_received);
  }

  // ── Archetype collision resolution ──
  // Players with 0 votes on everything get 'The Unknown' — collisions allowed there
  const players = Array.from(playerData.values());
  resolveArchetypeCollisions(players);

  return {
    data: {
      game_id: gameId,
      players,
      computed_at: new Date().toISOString(),
    },
    error: null,
  };
}

/**
 * Resolve archetype collisions.
 * If two players share the same archetype (and it's not 'The Unknown'),
 * the player with fewer total votes drops their weakest badge → new archetype.
 * Repeat until unique.
 */
function resolveArchetypeCollisions(players: PlayerBadgeData[]): void {
  const MAX_ITERATIONS = 20; // safety limit
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    let collision = false;

    // Group by archetype (skip 'The Unknown')
    const archetypeGroups = new Map<string, PlayerBadgeData[]>();
    for (const p of players) {
      if (p.archetype_name === 'The Unknown') continue;
      const group = archetypeGroups.get(p.archetype_name) ?? [];
      group.push(p);
      archetypeGroups.set(p.archetype_name, group);
    }

    for (const [, group] of archetypeGroups) {
      if (group.length <= 1) continue;

      collision = true;

      // Sort by total votes desc, then alphabetically by user_id for determinism
      group.sort((a, b) => {
        const totalA = Object.values(a.vote_counts).reduce((s, v) => s + v, 0);
        const totalB = Object.values(b.vote_counts).reduce((s, v) => s + v, 0);
        if (totalB !== totalA) return totalB - totalA;
        return a.user_id.localeCompare(b.user_id);
      });

      // First player keeps the archetype, others need adjustment
      for (let i = 1; i < group.length; i++) {
        const p = group[i];
        if (p.badges_received.length <= 1) {
          // Can't drop any more badges — stays as is (allows duplicate for 0-1 badge players)
          continue;
        }

        // Drop the weakest badge (fewest votes, alphabetical tiebreak)
        let weakestBadge: BadgeKey = p.badges_received[0];
        let weakestVotes = p.vote_counts[weakestBadge];

        for (const badge of p.badges_received) {
          if (p.vote_counts[badge] < weakestVotes) {
            weakestVotes = p.vote_counts[badge];
            weakestBadge = badge;
          } else if (p.vote_counts[badge] === weakestVotes && badge > weakestBadge) {
            // Drop the one later alphabetically for determinism
            weakestBadge = badge;
          }
        }

        p.badges_received = p.badges_received.filter(b => b !== weakestBadge);
        p.archetype_key = makeArchetypeKey(p.badges_received);
        p.archetype_name = getArchetypeName(p.badges_received);
      }
    }

    if (!collision) break;
  }
}

// ─── Save to database ───────────────────────────────────────

/**
 * Compute and save badge attributions for a completed game.
 * Idempotent — if attributions already exist, returns them without recomputing.
 */
export async function saveGameBadgeAttributions(gameId: string): Promise<{
  data: BadgeAttributionResult | null;
  error: string | null;
}> {
  // Check if already saved
  const { data: existing } = await supabase
    .from('badge_attributions')
    .select('*')
    .eq('game_id', gameId);

  if (existing && existing.length > 0) {
    // Already computed — return existing data
    const players: PlayerBadgeData[] = existing.map(row => ({
      user_id: row.user_id,
      deck_id: row.deck_id,
      vote_counts: row.vote_counts as Record<BadgeKey, number>,
      badges_received: row.badges_received as BadgeKey[],
      brewed_badge: row.brewed_badge as BadgeKey | 'none',
      archetype_key: row.archetype_key,
      archetype_name: row.archetype_name,
    }));

    return {
      data: { game_id: gameId, players, computed_at: existing[0].created_at },
      error: null,
    };
  }

  // Compute fresh
  const { data: result, error } = await computeBadgeAttribution(gameId);
  if (error || !result) return { data: null, error };

  // Save to database
  const rows = result.players.map(p => ({
    game_id: gameId,
    user_id: p.user_id,
    deck_id: p.deck_id,
    brewed_badge: p.brewed_badge,
    archetype_key: p.archetype_key,
    archetype_name: p.archetype_name,
    badges_received: p.badges_received,
    vote_counts: p.vote_counts,
  }));

  const { error: insertError } = await supabase
    .from('badge_attributions')
    .insert(rows);

  if (insertError) return { data: result, error: `Computed but failed to save: ${insertError.message}` };

  return { data: result, error: null };
}

// ─── Read helpers ───────────────────────────────────────────

/**
 * Get badge attributions for a game.
 */
export async function getGameBadgeAttributions(gameId: string): Promise<{
  data: PlayerBadgeData[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('badge_attributions')
    .select('*')
    .eq('game_id', gameId);

  if (error) return { data: [], error: error.message };

  const players: PlayerBadgeData[] = (data ?? []).map(row => ({
    user_id: row.user_id,
    deck_id: row.deck_id,
    vote_counts: row.vote_counts as Record<BadgeKey, number>,
    badges_received: row.badges_received as BadgeKey[],
    brewed_badge: row.brewed_badge as BadgeKey | 'none',
    archetype_key: row.archetype_key,
    archetype_name: row.archetype_name,
  }));

  return { data: players, error: null };
}

/**
 * Get a specific player's attribution for a game.
 */
export async function getPlayerAttribution(gameId: string, userId: string): Promise<{
  data: PlayerBadgeData | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('badge_attributions')
    .select('*')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single() as { data: any; error: any };

  if (error || !data) return { data: null, error: error?.message ?? null };

  return {
    data: {
      user_id: data.user_id,
      deck_id: data.deck_id,
      vote_counts: data.vote_counts as Record<BadgeKey, number>,
      badges_received: data.badges_received as BadgeKey[],
      brewed_badge: data.brewed_badge as BadgeKey | 'none',
      archetype_key: data.archetype_key,
      archetype_name: data.archetype_name,
    },
    error: null,
  };
}

/**
 * Get all archetypes a player has earned across all their games.
 */
export async function getPlayerArchetypeHistory(userId: string): Promise<{
  data: { game_id: string; archetype_name: string; brewed_badge: string; created_at: string }[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('badge_attributions')
    .select('game_id, archetype_name, brewed_badge, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}
