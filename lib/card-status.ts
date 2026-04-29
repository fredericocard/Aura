import { supabase } from './supabase';

export type CardPhase = 'reviewing' | 'waiting_for_others' | 'complete';

export interface CardStatus {
  phase: CardPhase;
  message: string;
  completion: {
    total: number;
    submitted: number;
    remaining: number;
  };
  myVotesSubmitted: boolean;
  gameCardLocked: boolean;
}

export interface VoteRecap {
  question_key: string;
  target_deck_id: string | null;
  target_commander_name: string | null;
}

/**
 * Get the current card status for a player.
 *
 * Phases:
 *   'reviewing'          — this player is still filling out their review
 *   'waiting_for_others' — this player accepted, waiting for podmates
 *   'complete'           — all reviews in, Game Card is locked/final
 */
export async function getCardStatus(gameId: string, userId: string): Promise<{
  data: CardStatus | null;
  error: string | null;
}> {
  // Get game + pod
  const { data: game } = await supabase
    .from('games')
    .select('pod_id, state, winner_player_id')
    .eq('id', gameId)
    .single() as { data: any };

  if (!game?.pod_id) return { data: null, error: 'Game not found' };

  // Get all pod members' review status
  const { data: members } = await supabase
    .from('pod_members')
    .select('user_id, review_submitted_at')
    .eq('pod_id', game.pod_id) as { data: any };

  if (!members) return { data: null, error: 'Pod members not found' };

  const total = members.length;
  const submitted = members.filter((m: any) => m.review_submitted_at).length;
  const remaining = total - submitted;

  const myMember = members.find((m: any) => m.user_id === userId);
  const myVotesSubmitted = !!myMember?.review_submitted_at;

  const gameCardLocked = game.state === 'completed';

  let phase: CardPhase;
  let message: string;

  if (gameCardLocked) {
    phase = 'complete';
    message = ''; // Will be replaced by the commander story
  } else if (myVotesSubmitted) {
    phase = 'waiting_for_others';
    if (remaining === 1) {
      message = 'Waiting for 1 player to finish their review...';
    } else if (remaining > 1) {
      message = `Waiting for ${remaining} players to finish their review...`;
    } else {
      message = 'Finalizing the Game Card...';
    }
  } else {
    phase = 'reviewing';
    message = 'Your review is in progress. Accept your review to lock in your votes.';
  }

  return {
    data: {
      phase,
      message,
      completion: { total, submitted, remaining },
      myVotesSubmitted,
      gameCardLocked,
    },
    error: null,
  };
}

/**
 * Get the text content to display on the Game Card.
 *
 * During reviews: shows interim status message with completion progress.
 * After pod completes: returns null (UI should show the commander story instead).
 */
export async function getCardTextContent(gameId: string, userId: string): Promise<{
  isInterim: boolean;
  text: string | null;
  error: string | null;
}> {
  const { data: status, error } = await getCardStatus(gameId, userId);
  if (error || !status) return { isInterim: false, text: null, error };

  if (status.phase === 'complete') {
    // Pod complete — UI should render the commander story
    return { isInterim: false, text: null, error: null };
  }

  // Still in progress — build interim text
  const lines: string[] = [];

  if (status.phase === 'waiting_for_others') {
    lines.push('Your review has been submitted!');
    lines.push('');
    lines.push(status.message);
    lines.push('');
    lines.push(`${status.completion.submitted} of ${status.completion.total} reviews in.`);
    lines.push('');
    lines.push('The Game Card is live and updating as votes come in.');
    lines.push('Once everyone finishes, it becomes your permanent Game Card.');
  } else {
    // Still reviewing
    lines.push(status.message);
    lines.push('');
    lines.push(`${status.completion.submitted} of ${status.completion.total} reviews in so far.`);
  }

  return { isInterim: true, text: lines.join('\n'), error: null };
}

/**
 * Get a recap of the current player's votes for display on the interim card.
 * Shows what the player voted for each question (for their own reference).
 */
export async function getMyVoteRecap(gameId: string): Promise<{
  data: VoteRecap[];
  error: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not signed in' };

  // Get player's votes
  const { data: votes } = await supabase
    .from('game_votes')
    .select('question_key, target_deck_id')
    .eq('game_id', gameId)
    .eq('voter_id', user.id)
    .order('question_key') as { data: any };

  if (!votes) return { data: [], error: null };

  // Get commander names for voted decks
  const deckIds = votes
    .map(v => v.target_deck_id)
    .filter((id): id is string => id !== null);

  let deckMap = new Map<string, string>();
  if (deckIds.length > 0) {
    const { data: decks } = await supabase
      .from('decks')
      .select('id, commander_name')
      .in('id', deckIds) as { data: any };

    deckMap = new Map((decks ?? []).map((d: any) => [d.id, d.commander_name]));
  }

  const recap: VoteRecap[] = votes.map(v => ({
    question_key: v.question_key,
    target_deck_id: v.target_deck_id,
    target_commander_name: v.target_deck_id
      ? deckMap.get(v.target_deck_id) ?? null
      : null,
  }));

  return { data: recap, error: null };
}
