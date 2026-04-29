import { supabase } from './supabase';

export type BadgeKey = 'fun' | 'rivalry' | 'allegiance' | 'brilliance' | 'flavor';
export type QuestionKey = BadgeKey | 'bracket_check';

export const BADGE_QUESTIONS: BadgeKey[] = ['fun', 'rivalry', 'allegiance', 'brilliance', 'flavor'];
export const SINGLE_SELECT_QUESTIONS: QuestionKey[] = [...BADGE_QUESTIONS];

// ─── Result types ───────────────────────────────────────────

export interface CommanderVoteCount {
  deck_id: string;
  commander_name: string;
  votes: number;
  rank: number;       // 1 = most votes, ties share the same rank
  is_tied: boolean;   // true if another commander has the same vote count at this rank
}

export interface QuestionResult {
  question_key: QuestionKey;
  total_votes: number;
  results: CommanderVoteCount[];  // ordered by votes desc, then commander name asc
  winner: CommanderVoteCount | null;       // top-ranked (null if no votes)
  has_tie_at_top: boolean;                 // true if 2+ commanders tied for first
}

export interface BracketCheckResult {
  consensus_honoured: boolean;             // true if no one was flagged
  total_voters: number;
  no_flag_count: number;                   // voters who said "all in bracket"
  flagged_commanders: {
    deck_id: string;
    commander_name: string;
    flag_count: number;
  }[];
}

export interface GameTally {
  game_id: string;
  total_voters: number;
  questions: QuestionResult[];             // q1–q4 + allegiance
  bracket_check: BracketCheckResult;
  computed_at: string;                     // ISO timestamp for reference
}

// ─── Main tally function ────────────────────────────────────

/**
 * Compute the full vote tally for a game.
 * Read-only — does not modify any state.
 * Deterministic — same votes always produce the same result.
 */
export async function computeGameTally(gameId: string): Promise<{
  data: GameTally | null;
  error: string | null;
}> {
  // Get all votes for this game
  const { data: votes, error: votesError } = await supabase
    .from('game_votes')
    .select('voter_id, question_key, target_deck_id')
    .eq('game_id', gameId);

  if (votesError) return { data: null, error: votesError.message };
  if (!votes || votes.length === 0) {
    return { data: null, error: 'No votes found for this game' };
  }

  // Get all decks in this game (for commander names)
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('user_id, deck_id')
    .eq('game_id', gameId);

  if (!gamePlayers) return { data: null, error: 'No players found' };

  const deckIds = gamePlayers.map(p => p.deck_id);
  const { data: decks } = await supabase
    .from('decks')
    .select('id, commander_name')
    .in('id', deckIds);

  const deckNameMap = new Map((decks ?? []).map(d => [d.id, d.commander_name]));

  // Count unique voters
  const uniqueVoters = new Set(votes.map(v => v.voter_id));
  const totalVoters = uniqueVoters.size;

  // ── Single-select questions ──
  const questionResults: QuestionResult[] = [];

  for (const qKey of SINGLE_SELECT_QUESTIONS) {
    const qVotes = votes.filter(v => v.question_key === qKey && v.target_deck_id);

    // Count votes per commander
    const countMap = new Map<string, number>();
    for (const v of qVotes) {
      countMap.set(v.target_deck_id!, (countMap.get(v.target_deck_id!) ?? 0) + 1);
    }

    // Build sorted results
    const sorted = Array.from(countMap.entries())
      .map(([deckId, count]) => ({
        deck_id: deckId,
        commander_name: deckNameMap.get(deckId) ?? 'Unknown',
        votes: count,
        rank: 0,
        is_tied: false,
      }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return a.commander_name.localeCompare(b.commander_name); // alphabetical tiebreak for stable order
      });

    // Assign ranks (tied commanders share the same rank)
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].votes < sorted[i - 1].votes) {
        currentRank = i + 1;
      }
      sorted[i].rank = currentRank;
    }

    // Mark ties
    const rankCounts = new Map<number, number>();
    for (const s of sorted) {
      rankCounts.set(s.rank, (rankCounts.get(s.rank) ?? 0) + 1);
    }
    for (const s of sorted) {
      s.is_tied = (rankCounts.get(s.rank) ?? 0) > 1;
    }

    const winner = sorted.length > 0 ? sorted[0] : null;
    const hasTieAtTop = winner ? winner.is_tied : false;

    questionResults.push({
      question_key: qKey as QuestionKey,
      total_votes: qVotes.length,
      results: sorted,
      winner,
      has_tie_at_top: hasTieAtTop,
    });
  }

  // ── Bracket check ──
  const bracketVotes = votes.filter(v => v.question_key === 'bracket_check');
  const bracketVoterIds = new Set(bracketVotes.map(v => v.voter_id));
  const noFlagCount = bracketVotes.filter(v => v.target_deck_id === null).length;

  // Count flags per commander
  const flagMap = new Map<string, number>();
  for (const v of bracketVotes) {
    if (v.target_deck_id) {
      flagMap.set(v.target_deck_id, (flagMap.get(v.target_deck_id) ?? 0) + 1);
    }
  }

  const flaggedCommanders = Array.from(flagMap.entries())
    .map(([deckId, count]) => ({
      deck_id: deckId,
      commander_name: deckNameMap.get(deckId) ?? 'Unknown',
      flag_count: count,
    }))
    .sort((a, b) => {
      if (b.flag_count !== a.flag_count) return b.flag_count - a.flag_count;
      return a.commander_name.localeCompare(b.commander_name);
    });

  const bracketCheck: BracketCheckResult = {
    consensus_honoured: flaggedCommanders.length === 0,
    total_voters: bracketVoterIds.size,
    no_flag_count: noFlagCount,
    flagged_commanders: flaggedCommanders,
  };

  return {
    data: {
      game_id: gameId,
      total_voters: totalVoters,
      questions: questionResults,
      bracket_check: bracketCheck,
      computed_at: new Date().toISOString(),
    },
    error: null,
  };
}

// ─── Convenience helpers ────────────────────────────────────

/**
 * Get just the winner for a specific question.
 * Returns null if no votes or if there's a tie at the top.
 */
export async function getQuestionWinner(gameId: string, questionKey: QuestionKey): Promise<{
  data: CommanderVoteCount | null;
  tied: boolean;
  error: string | null;
}> {
  const { data: tally, error } = await computeGameTally(gameId);
  if (error || !tally) return { data: null, tied: false, error };

  const question = tally.questions.find(q => q.question_key === questionKey);
  if (!question) return { data: null, tied: false, error: 'Question not found' };

  if (question.has_tie_at_top) {
    return { data: question.winner, tied: true, error: null };
  }

  return { data: question.winner, tied: false, error: null };
}

/**
 * Get all question winners at once (for Game Card composition).
 * Returns a map of question_key → winner (null if tie or no votes).
 */
export async function getAllWinners(gameId: string): Promise<{
  data: Map<string, { winner: CommanderVoteCount | null; tied: boolean }>;
  error: string | null;
}> {
  const { data: tally, error } = await computeGameTally(gameId);
  if (error || !tally) return { data: new Map(), error };

  const winners = new Map<string, { winner: CommanderVoteCount | null; tied: boolean }>();

  for (const q of tally.questions) {
    winners.set(q.question_key, {
      winner: q.winner,
      tied: q.has_tie_at_top,
    });
  }

  return { data: winners, error: null };
}
