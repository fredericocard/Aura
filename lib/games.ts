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
  user_id: string;
  deck_id: string;
  is_winner: boolean;
  joined_at: string;
}

/**
 * Create a game for a pod.
 * Snapshots the current pod members as game_players.
 * Each pod member must have a deck_id assigned.
 */
export async function createGame(podId: string): Promise<{ data: Game | null; error: string | null }> {
  // Get pod members with their decks
  const { data: members, error: membersError } = await supabase
    .from('pod_members')
    .select('user_id, deck_id')
    .eq('pod_id', podId) as { data: any; error: any };

  if (membersError || !members) {
    return { data: null, error: membersError?.message ?? 'Failed to load pod members' };
  }

  // Validate: all members need a deck
  const withDecks = members.filter((m: any) => m.deck_id != null) as any;
  if (withDecks.length < 2) {
    return { data: null, error: 'Need at least 2 players with commanders to start a game' };
  }

  // Create the game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      pod_id: podId,
      pod_size: withDecks.length,
    })
    .select()
    .single() as { data: any; error: any };

  if (gameError || !game) {
    return { data: null, error: gameError?.message ?? 'Failed to create game' };
  }

  // Snapshot pod members as game players
  const gamePlayers = withDecks.map((m: any) => ({
    game_id: game.id,
    user_id: m.user_id,
    deck_id: m.deck_id,
  }));

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
    .order('joined_at', { ascending: true });

  return {
    data: { ...(game as Game), players: (players as GamePlayer[]) ?? [] },
    error: null,
  };
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
