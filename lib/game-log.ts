// ============================================
// AF-B25 · Game log aggregation
// Paginated game history with Game Card links.
// Filterable by commander. Efficient for large histories.
// ============================================

import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────

export interface GameLogEntry {
  gameId: string;
  gameDate: string;
  podSize: number;
  gameState: string;
  // Player's commander in this game
  commanderName: string;
  commanderArtUrl: string | null;
  deckId: string;
  isWinner: boolean;
  // Winner info
  winnerCommanderName: string | null;
  // Pod composition
  podCommanders: PodCommanderEntry[];
  // Game Card link
  cardId: string | null;
  shareCode: string | null;
  narrative: string | null;
}

export interface PodCommanderEntry {
  commanderName: string;
  artUrl: string | null;
  isWinner: boolean;
  userId: string;
  /** True if this player abandoned the game (seat treated as empty). */
  abandoned?: boolean;
}

export interface GameLogPage {
  entries: GameLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface GameLogFilters {
  deckId?: string;      // filter to specific commander
  page?: number;        // 1-based page number
  pageSize?: number;    // default 20
}

// ── Main endpoint ──────────────────────────────────────

/**
 * Get paginated game log for a user.
 * Reverse chronological, filterable by commander.
 */
export async function getGameLog(
  userId: string,
  filters?: GameLogFilters
): Promise<GameLogPage> {
  const supabase = createClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // 1. Get the player's game_players entries (with game info)
  //    Exclude games the user abandoned (is_eliminated + can_review = false).
  //    Normal eliminations (life → 0) have can_review = true and ARE included.
  let query = supabase
    .from("game_players")
    .select(
      "game_id, deck_id, is_winner, is_eliminated, can_review, joined_at, " +
        "games!inner(id, state, pod_size, winner_deck_id, created_at), " +
        "decks!inner(commander_name, commander_art_url)",
      { count: "exact" }
    )
    .eq("user_id", userId)
    .in("games.state", ["completed", "active", "in_questionnaire", "abandoned"])
    .order("joined_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // Filter by specific deck if provided
  if (filters?.deckId) {
    query = query.eq("deck_id", filters.deckId);
  }

  const { data: rawPlayerGames, error, count } = await query as any;

  if (error) {
    throw new Error(`Failed to fetch game log: ${error.message}`);
  }

  // Filter out games the user abandoned (eliminated + can't review = abandoned).
  // Normal eliminations (life → 0) have can_review = true and stay in the list.
  const playerGames = (rawPlayerGames ?? []).filter(
    (pg: any) => !(pg.is_eliminated && !pg.can_review)
  );

  if (playerGames.length === 0) {
    return {
      entries: [],
      totalCount: Math.max(0, (count ?? 0) - ((rawPlayerGames?.length ?? 0) - playerGames.length)),
      page,
      pageSize,
      hasMore: false,
    };
  }

  // 2. Get game IDs for batch queries
  const gameIds = playerGames.map((pg: any) => pg.game_id);

  // 3. Batch load: all players in these games + game cards
  const [allPlayersResult, cardsResult] = await Promise.all([
    supabase
      .from("game_players")
      .select(
        "game_id, user_id, is_winner, is_eliminated, can_review, " +
          "decks!inner(commander_name, commander_art_url)"
      )
      .in("game_id", gameIds) as unknown as Promise<{ data: any; error: any }>,
    supabase
      .from("game_cards")
      .select("id, game_id, share_code, narrative")
      .in("game_id", gameIds) as unknown as Promise<{ data: any; error: any }>,
  ]);

  // Build lookup maps
  const playersByGame = new Map<string, PodCommanderEntry[]>();
  for (const p of allPlayersResult.data ?? []) {
    const deck = p.decks as {
      commander_name: string;
      commander_art_url: string | null;
    };
    // A player who was eliminated AND can't review = abandoned (empty seat)
    const isAbandoned = p.is_eliminated === true && p.can_review === false;
    const entries = playersByGame.get(p.game_id) ?? [];
    entries.push({
      commanderName: isAbandoned ? "Empty Seat" : deck.commander_name,
      artUrl: isAbandoned ? null : deck.commander_art_url,
      isWinner: isAbandoned ? false : p.is_winner,
      userId: p.user_id,
      abandoned: isAbandoned,
    });
    playersByGame.set(p.game_id, entries);
  }

  const cardsByGame = new Map<
    string,
    { id: string; share_code: string | null; narrative: string | null }
  >();
  for (const c of cardsResult.data ?? []) {
    cardsByGame.set(c.game_id, {
      id: c.id,
      share_code: c.share_code,
      narrative: c.narrative,
    });
  }

  // Winner deck → commander name lookup
  const winnerDeckIds = new Set(
    playerGames
      .map((pg: any) => {
        const game = pg.games as { winner_deck_id: string | null };
        return game.winner_deck_id;
      })
      .filter(Boolean)
  );

  const winnerNames = new Map<string, string>();
  if (winnerDeckIds.size > 0) {
    const { data: winnerDecks } = await supabase
      .from("decks")
      .select("id, commander_name")
      .in("id", Array.from(winnerDeckIds));
    for (const d of winnerDecks ?? []) {
      winnerNames.set(d.id, d.commander_name);
    }
  }

  // 4. Assemble entries
  const entries: GameLogEntry[] = playerGames.map((pg: any) => {
    const game = pg.games as {
      id: string;
      state: string;
      pod_size: number;
      winner_deck_id: string | null;
      created_at: string;
    };
    const deck = pg.decks as {
      commander_name: string;
      commander_art_url: string | null;
    };
    const card = cardsByGame.get(pg.game_id);
    const podCommanders = playersByGame.get(pg.game_id) ?? [];

    return {
      gameId: pg.game_id,
      gameDate: game.created_at,
      podSize: game.pod_size,
      gameState: game.state,
      commanderName: deck.commander_name,
      commanderArtUrl: deck.commander_art_url,
      deckId: pg.deck_id,
      isWinner: pg.is_winner,
      winnerCommanderName: game.winner_deck_id
        ? winnerNames.get(game.winner_deck_id) ?? null
        : null,
      podCommanders,
      cardId: card?.id ?? null,
      shareCode: card?.share_code ?? null,
      narrative: card?.narrative ?? null,
    };
  });

  const totalCount = count ?? 0;

  return {
    entries,
    totalCount,
    page,
    pageSize,
    hasMore: offset + pageSize < totalCount,
  };
}

// ── Quick stats ────────────────────────────────────────

export interface PlayerStats {
  totalGames: number;
  totalWins: number;
  winRate: number;
  uniqueCommanders: number;
  totalCards: number;
}

/**
 * Get quick stats for a player's overall game history.
 */
export async function getPlayerStats(userId: string): Promise<PlayerStats> {
  const supabase = createClient();

  const [gamesResult, winsResult, decksResult, cardsResult] =
    await Promise.all([
      supabase
        .from("game_players")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId) as unknown as Promise<{ data: any; error: any }>,
      supabase
        .from("game_players")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_winner", true) as unknown as Promise<{ data: any; error: any }>,
      supabase
        .from("decks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId) as unknown as Promise<{ data: any; error: any }>,
      supabase
        .from("game_card_players")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId) as unknown as Promise<{ data: any; error: any }>,
    ]);

  const totalGames = (gamesResult as any).count ?? 0;
  const totalWins = (winsResult as any).count ?? 0;

  return {
    totalGames,
    totalWins,
    winRate: totalGames > 0 ? Number((totalWins / totalGames).toFixed(2)) : 0,
    uniqueCommanders: (decksResult as any).count ?? 0,
    totalCards: (cardsResult as any).count ?? 0,
  };
}
