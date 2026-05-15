import { supabase } from './supabase';

export type GameState = 'active' | 'in_questionnaire' | 'completed' | 'abandoned';

export interface Game {
  id: string;
  pod_id: string;
  state: GameState;
  pod_size: number;
  winner_player_id: string | null;
  winner_deck_id: string | null;
  voting_player_count: number;
  produces_score_changes: boolean;
  created_at: string;
  started_at: string;
  ended_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_id: string | null;       // null for guests / empty seats
  deck_id: string | null;       // null for guests / empty seats
  commander_name: string | null; // set when guest picks a commander
  seat_number: number;
  is_winner: boolean;
  life_total: number;
  poison_counters: number;
  experience_counters: number;
  energy_counters: number;
  commander_damage_received: Record<string, number>;
  is_eliminated: boolean;
  can_review: boolean;
  joined_at: string;
}

/**
 * Create a game for a pod.
 * The host is the only required real player. Empty seats are placeholders
 * ("Player 1", "Player 2", etc.) that others can claim later by joining.
 * @param podId  The pod to create the game for
 * @param playerCount  Total number of seats (2-5), including the host
 */
export async function createGame(podId: string, playerCount?: number): Promise<{ data: Game | null; error: string | null }> {
  // Get pod members with their decks (at minimum, the host)
  const { data: members, error: membersError } = await supabase
    .from('pod_members')
    .select('user_id, deck_id')
    .eq('pod_id', podId) as { data: any; error: any };

  if (membersError || !members || members.length === 0) {
    return { data: null, error: membersError?.message ?? 'Failed to load pod members' };
  }

  // Use playerCount if provided, otherwise fall back to member count (min 2)
  const totalSeats = playerCount ?? Math.max(members.length, 2);

  // Create the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      pod_id: podId,
      pod_size: totalSeats,
    })
    .select()
    .single() as { data: any; error: any };

  if (gameError || !game) {
    return { data: null, error: gameError?.message ?? 'Failed to create game' };
  }

  // Build ALL seat rows as empty placeholders.
  // Pod members claim seats explicitly via claimSeat() once they reach the
  // gridview — including the host. Three player types after claim:
  //   1. Logged-in user: user_id + deck_id (set by claimSeat from pod_members)
  //   2. Guest: user_id null, commander_name set (set when guest picks a commander)
  //   3. Empty seat: user_id null, deck_id null, commander_name null
  const gamePlayers = [];
  for (let seat = 1; seat <= totalSeats; seat++) {
    gamePlayers.push({
      game_id: game.id,
      seat_number: seat,
      user_id: null,
      deck_id: null,
      commander_name: null,
    });
  }

  const { error: playersError } = await supabase
    .from('game_players')
    .insert(gamePlayers);

  if (playersError) {
    return { data: game as Game, error: `Game created but failed to add players: ${playersError.message}` };
  }

  return { data: game as Game, error: null };
}

/**
 * Get a game with its players.
 */
export async function getGame(gameId: string): Promise<{ data: (Game & { players: GamePlayer[] }) | null; error: string | null }> {
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single() as { data: any; error: any };

  if (gameError || !game) {
    return { data: null, error: gameError?.message ?? 'Game not found' };
  }

  const { data: players } = await supabase
    .from('game_players')
    .select('*')
    .eq('game_id', gameId)
    .order('seat_number', { ascending: true });

  return {
    data: { ...(game as Game), players: (players as GamePlayer[]) ?? [] },
    error: null,
  };
}

/**
 * Claim a seat in an active game for the currently signed-in user.
 *
 * Looks up the user's deck from pod_members (the deck they registered when
 * creating or joining the pod), then atomically writes user_id + deck_id onto
 * the chosen seat — but only if that seat is still empty (user_id IS NULL).
 *
 * Returns an error if:
 *   - The user is not signed in
 *   - The user has no pod_members row / no deck for this pod
 *   - The seat is already claimed (race condition)
 */
export async function claimSeat(gameId: string, seatNumber: number): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // 1. Find the pod this game belongs to.
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('pod_id')
    .eq('id', gameId)
    .single() as { data: any; error: any };

  if (gameError || !game) return { error: gameError?.message ?? 'Game not found' };

  // 2. Look up the user's deck for that pod.
  const { data: member, error: memberError } = await supabase
    .from('pod_members')
    .select('deck_id')
    .eq('pod_id', game.pod_id)
    .eq('user_id', user.id)
    .maybeSingle() as { data: any; error: any };

  if (memberError) return { error: memberError.message };
  if (!member?.deck_id) return { error: 'No deck registered for this pod' };

  // 3. Fast path: claim the seat if it's completely empty (user_id IS NULL).
  const { data, error } = await supabase
    .from('game_players')
    .update({
      user_id: user.id,
      deck_id: member.deck_id,
    })
    .eq('game_id', gameId)
    .eq('seat_number', seatNumber)
    .is('user_id', null)
    .select() as { data: any; error: any };

  if (error) return { error: error.message };
  if (data && data.length > 0) return { error: null }; // Success — empty seat claimed.

  // 4. Seat has a user_id. Check if that occupant is a guest (anonymous).
  //    If so, the logged-in user can take over the seat while keeping all
  //    game data (life, poison, energy, commander damage) intact.
  const { data: seatRow } = await supabase
    .from('game_players')
    .select('user_id')
    .eq('game_id', gameId)
    .eq('seat_number', seatNumber)
    .single() as { data: any; error: any };

  if (!seatRow?.user_id) {
    // Became empty between our two queries — retry the fast path.
    const { data: retry } = await supabase
      .from('game_players')
      .update({ user_id: user.id, deck_id: member.deck_id })
      .eq('game_id', gameId)
      .eq('seat_number', seatNumber)
      .is('user_id', null)
      .select() as { data: any; error: any };
    return retry && retry.length > 0 ? { error: null } : { error: 'Seat is already taken' };
  }

  // If the current occupant is ourselves, nothing to do.
  if (seatRow.user_id === user.id) return { error: null };

  // Look up the occupant's profile to see if they are a guest.
  const { data: occupant } = await supabase
    .from('profiles')
    .select('account_type')
    .eq('id', seatRow.user_id)
    .maybeSingle() as { data: any; error: any };

  const isGuest = !occupant || occupant.account_type === 'guest';

  if (!isGuest) return { error: 'Seat is already taken' };

  // 5. Take over the guest's seat — preserve all game counters, only swap identity.
  const { error: takeoverErr } = await supabase
    .from('game_players')
    .update({
      user_id: user.id,
      deck_id: member.deck_id,
    })
    .eq('game_id', gameId)
    .eq('seat_number', seatNumber)
    .eq('user_id', seatRow.user_id) as { error: any }; // guard: only if occupant hasn't changed

  if (takeoverErr) return { error: takeoverErr.message };
  return { error: null };
}

/**
 * Update a game's state.
 */
export async function updateGameState(gameId: string, newState: GameState): Promise<{ error: string | null }> {
  const updates: Record<string, any> = { state: newState };

  if (newState === 'in_questionnaire') {
    updates.ended_at = new Date().toISOString();
  } else if (newState === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', gameId);

  return { error: error?.message ?? null };
}

/**
 * Declare the winner of a game.
 */
export async function declareWinner(gameId: string, userId: string, deckId: string): Promise<{ error: string | null }> {
  // Update the game record
  const { error: gameError } = await supabase
    .from('games')
    .update({
      winner_player_id: userId,
      winner_deck_id: deckId,
    })
    .eq('id', gameId);

  if (gameError) return { error: gameError.message };

  // Clear any previous winner flag, then set the new one
  await supabase
    .from('game_players')
    .update({ is_winner: false })
    .eq('game_id', gameId);

  const { error: playerError } = await supabase
    .from('game_players')
    .update({ is_winner: true })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  return { error: playerError?.message ?? null };
}

/**
 * Finalize a game's voting count and determine if it produces score changes.
 * Called when the pod completes (all reviews in).
 * Games with < 2 voters still get a record but don't affect AURA/badges.
 */
export async function finalizeGame(gameId: string, votingPlayerCount: number): Promise<{ error: string | null }> {
  const producesChanges = votingPlayerCount >= 2;

  const { error } = await supabase
    .from('games')
    .update({
      voting_player_count: votingPlayerCount,
      produces_score_changes: producesChanges,
      state: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', gameId);

  return { error: error?.message ?? null };
}

/**
 * Get all games for a specific deck (for deck profile / history).
 */
export async function getGamesForDeck(deckId: string): Promise<{ data: Game[]; error: string | null }> {
  const { data: entries } = await supabase
    .from('game_players')
    .select('game_id')
    .eq('deck_id', deckId);

  if (!entries || entries.length === 0) return { data: [], error: null };

  const gameIds = entries.map((e: any) => e.game_id);

  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .in('id', gameIds)
    .order('created_at', { ascending: false });

  return { data: (games as Game[]) ?? [], error: error?.message ?? null };
}

/**
 * Get all games for the current user (across all their decks).
 */
export async function getMyGames(): Promise<{ data: Game[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not signed in' };

  const { data: entries } = await supabase
    .from('game_players')
    .select('game_id')
    .eq('user_id', user.id);

  if (!entries || entries.length === 0) return { data: [], error: null };

  const gameIds = [...new Set(entries.map((e: any) => e.game_id))];

  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .in('id', gameIds)
    .order('created_at', { ascending: false });

  return { data: (games as Game[]) ?? [], error: error?.message ?? null };
}

/**
 * Check if the current user has an active game (state = 'active' or 'in_questionnaire').
 * Returns the game + pod info so the UI can offer rejoin or abandon.
 * Only one active game at a time is allowed.
 */
export async function getActiveGameForUser(): Promise<{
  data: { gameId: string; podId: string; podSize: number; state: GameState; commanderName: string | null; hasWinner: boolean } | null;
  error: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: null };

  // Find game_players rows for this user
  const { data: entries, error: entriesError } = await supabase
    .from('game_players')
    .select('game_id, commander_name')
    .eq('user_id', user.id);

  if (entriesError) return { data: null, error: entriesError.message };
  if (!entries || entries.length === 0) return { data: null, error: null };

  const gameIds = [...new Set(entries.map((e: any) => e.game_id))];

  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .in('id', gameIds)
    .in('state', ['active', 'in_questionnaire'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (gamesError) return { data: null, error: gamesError.message };
  if (!games || games.length === 0) return { data: null, error: null };

  const game = games[0] as Game;
  const commanderName = entries.find((e: any) => e.game_id === game.id)?.commander_name ?? null;

  return {
    data: {
      gameId: game.id,
      podId: game.pod_id,
      podSize: game.pod_size,
      state: game.state,
      commanderName,
      hasWinner: game.winner_player_id !== null,
    },
    error: null,
  };
}
