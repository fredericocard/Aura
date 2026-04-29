import { supabase } from './supabase';

export type BadgeKey = 'fun' | 'rivalry' | 'allegiance' | 'brilliance' | 'flavor';
export type QuestionKey = BadgeKey | 'bracket_check';

export const BADGE_QUESTIONS: BadgeKey[] = ['fun', 'rivalry', 'allegiance', 'brilliance', 'flavor'];
export const SINGLE_SELECT_QUESTIONS: QuestionKey[] = [...BADGE_QUESTIONS];

export interface GameVote {
  id: string;
  game_id: string;
  voter_id: string;
  question_key: QuestionKey;
  target_deck_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Immutability check ────────────────────────────────────
// Votes are locked when BOTH:
//   1. A winner has been declared (game.winner_player_id is set)
//   2. The voter has clicked Accept Review (pod_members.review_submitted_at is set)

export async function isVoteLocked(gameId: string, voterId: string): Promise<boolean> {
  // Check if winner is declared
  const { data: game } = await supabase
    .from('games')
    .select('winner_player_id, pod_id')
    .eq('id', gameId)
    .single();

  if (!game) return false;

  // No winner yet → votes always mutable
  if (!game.winner_player_id) return false;

  // Winner exists — check if this voter accepted their review
  if (game.pod_id) {
    const { data: member } = await supabase
      .from('pod_members')
      .select('review_submitted_at')
      .eq('pod_id', game.pod_id)
      .eq('user_id', voterId)
      .single();

    if (member?.review_submitted_at) return true;
  }

  return false;
}

// ─── Single-select vote (q1–q4, allegiance) ────────────────

/**
 * Cast or update a single-select vote.
 * Upserts: if vote exists for this question, updates it.
 * Blocked if votes are locked (winner declared + review accepted).
 */
export async function castVote(
  gameId: string,
  questionKey: QuestionKey,
  targetDeckId: string
): Promise<{ error: string | null }> {
  if (questionKey === 'bracket_check') {
    return { error: 'Use castBracketCheck() for bracket check votes' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // Check immutability
  const locked = await isVoteLocked(gameId, user.id);
  if (locked) return { error: 'Votes are locked — winner declared and review accepted.' };

  // Check voter is a participant in this game
  const { data: player } = await supabase
    .from('game_players')
    .select('user_id, deck_id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .single();

  if (!player) return { error: 'You are not a participant in this game' };

  // Allegiance: cannot vote for yourself
  if (questionKey === 'allegiance') {
    if (targetDeckId === player.deck_id) {
      return { error: 'You cannot vote for yourself on the Allegiance question' };
    }
  }

  // Validate target deck is in this game
  const { data: targetPlayer } = await supabase
    .from('game_players')
    .select('deck_id')
    .eq('game_id', gameId)
    .eq('deck_id', targetDeckId)
    .single();

  if (!targetPlayer) return { error: 'Target commander is not in this game' };

  // Check if vote already exists → update, otherwise insert
  const { data: existing } = await supabase
    .from('game_votes')
    .select('id')
    .eq('game_id', gameId)
    .eq('voter_id', user.id)
    .eq('question_key', questionKey)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('game_votes')
      .update({ target_deck_id: targetDeckId })
      .eq('id', existing.id);
    return { error: error?.message ?? null };
  } else {
    const { error } = await supabase
      .from('game_votes')
      .insert({
        game_id: gameId,
        voter_id: user.id,
        question_key: questionKey,
        target_deck_id: targetDeckId,
      });
    return { error: error?.message ?? null };
  }
}

// ─── Bracket Check ──────────────────────────────────────────

/**
 * Cast a bracket check vote.
 * flaggedDeckIds = [] means "no flag" (no one played above bracket).
 * flaggedDeckIds = ['id1', 'id2'] means those commanders were above bracket.
 * Replaces all previous bracket_check votes for this voter in this game.
 */
export async function castBracketCheck(
  gameId: string,
  flaggedDeckIds: string[]
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // Check immutability
  const locked = await isVoteLocked(gameId, user.id);
  if (locked) return { error: 'Votes are locked — winner declared and review accepted.' };

  // Check voter is a participant
  const { data: player } = await supabase
    .from('game_players')
    .select('user_id')
    .eq('game_id', gameId)
    .eq('user_id', user.id)
    .single();

  if (!player) return { error: 'You are not a participant in this game' };

  // Validate all flagged decks are in this game
  if (flaggedDeckIds.length > 0) {
    const { data: gamePlayers } = await supabase
      .from('game_players')
      .select('deck_id')
      .eq('game_id', gameId);

    const validDeckIds = new Set((gamePlayers ?? []).map(p => p.deck_id));
    for (const deckId of flaggedDeckIds) {
      if (!validDeckIds.has(deckId)) {
        return { error: `Deck ${deckId} is not in this game` };
      }
    }
  }

  // Delete existing bracket_check votes for this voter
  await supabase
    .from('game_votes')
    .delete()
    .eq('game_id', gameId)
    .eq('voter_id', user.id)
    .eq('question_key', 'bracket_check');

  // Insert new votes
  if (flaggedDeckIds.length === 0) {
    // "No flag" — single row with null target
    const { error } = await supabase
      .from('game_votes')
      .insert({
        game_id: gameId,
        voter_id: user.id,
        question_key: 'bracket_check',
        target_deck_id: null,
      });
    return { error: error?.message ?? null };
  } else {
    // Flag specific commanders
    const rows = flaggedDeckIds.map(deckId => ({
      game_id: gameId,
      voter_id: user.id,
      question_key: 'bracket_check' as const,
      target_deck_id: deckId,
    }));

    const { error } = await supabase
      .from('game_votes')
      .insert(rows);
    return { error: error?.message ?? null };
  }
}

// ─── Read votes ─────────────────────────────────────────────

/**
 * Get all votes cast by the current user for a game.
 */
export async function getMyVotes(gameId: string): Promise<{ data: GameVote[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not signed in' };

  const { data, error } = await supabase
    .from('game_votes')
    .select('*')
    .eq('game_id', gameId)
    .eq('voter_id', user.id)
    .order('question_key');

  return { data: (data as GameVote[]) ?? [], error: error?.message ?? null };
}

/**
 * Get all votes for a game (all voters).
 * Used for scoring and Game Card generation.
 */
export async function getGameVotes(gameId: string): Promise<{ data: GameVote[]; error: string | null }> {
  const { data, error } = await supabase
    .from('game_votes')
    .select('*')
    .eq('game_id', gameId)
    .order('voter_id')
    .order('question_key');

  return { data: (data as GameVote[]) ?? [], error: error?.message ?? null };
}

/**
 * Get vote counts per commander per question (for results display).
 */
export async function getVoteSummary(gameId: string): Promise<{
  data: { question_key: QuestionKey; target_deck_id: string | null; count: number }[];
  error: string | null;
}> {
  const { data: votes, error } = await supabase
    .from('game_votes')
    .select('question_key, target_deck_id')
    .eq('game_id', gameId);

  if (error || !votes) return { data: [], error: error?.message ?? null };

  // Group and count
  const counts = new Map<string, { question_key: QuestionKey; target_deck_id: string | null; count: number }>();

  for (const v of votes) {
    const key = `${v.question_key}:${v.target_deck_id ?? 'null'}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, {
        question_key: v.question_key as QuestionKey,
        target_deck_id: v.target_deck_id,
        count: 1,
      });
    }
  }

  return { data: Array.from(counts.values()), error: null };
}

/**
 * Clear a specific single-select vote (set it back to unanswered).
 * Useful if the voter wants to undo their pick before locking.
 */
export async function clearVote(
  gameId: string,
  questionKey: QuestionKey
): Promise<{ error: string | null }> {
  if (questionKey === 'bracket_check') {
    return { error: 'Use castBracketCheck([]) to clear bracket check' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const locked = await isVoteLocked(gameId, user.id);
  if (locked) return { error: 'Votes are locked — winner declared and review accepted.' };

  const { error } = await supabase
    .from('game_votes')
    .delete()
    .eq('game_id', gameId)
    .eq('voter_id', user.id)
    .eq('question_key', questionKey);

  return { error: error?.message ?? null };
}
