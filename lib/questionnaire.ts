import { supabase } from './supabase';
import { onGameCompleted } from '@/lib/orchestration';

const REVIEW_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export type QuestionnairePlayerStatus = 'in_progress' | 'completed' | 'auto_completed';

export interface PlayerQuestionnaireInfo {
  user_id: string;
  deck_id: string;
  can_review: boolean;
  is_eliminated: boolean;
  review_submitted_at: string | null;
  auto_completed: boolean;
  status: QuestionnairePlayerStatus;
}

export interface PodCompletionSummary {
  total_players: number;
  completed: number;        // manually accepted
  auto_completed: number;   // timed out
  in_progress: number;      // still reviewing
  not_yet_reviewing: number; // game still active, no review access
  all_done: boolean;        // everyone completed or auto-completed
  minutes_remaining: number | null; // null if no timer active (no winner yet)
}

// ─── Per-player status ─────────────────────────────────────

/**
 * Get questionnaire status for every player in a game.
 */
export async function getQuestionnaireStatus(gameId: string): Promise<{
  data: PlayerQuestionnaireInfo[];
  error: string | null;
}> {
  // Get game + pod info
  const { data: game } = await supabase
    .from('games')
    .select('pod_id')
    .eq('id', gameId)
    .single();

  if (!game?.pod_id) return { data: [], error: 'Game or pod not found' };

  // Get game_players (review access, elimination)
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('user_id, deck_id, can_review, is_eliminated')
    .eq('game_id', gameId);

  if (!gamePlayers) return { data: [], error: 'No players found' };

  // Get pod_members (review submission status)
  const { data: podMembers } = await supabase
    .from('pod_members')
    .select('user_id, review_submitted_at, auto_completed')
    .eq('pod_id', game.pod_id);

  const memberMap = new Map(
    (podMembers ?? []).map(m => [m.user_id, m])
  );

  const result: PlayerQuestionnaireInfo[] = gamePlayers.map(gp => {
    const pm = memberMap.get(gp.user_id);
    const reviewSubmitted = pm?.review_submitted_at ?? null;
    const autoCompleted = pm?.auto_completed ?? false;

    let status: QuestionnairePlayerStatus;
    if (reviewSubmitted && autoCompleted) {
      status = 'auto_completed';
    } else if (reviewSubmitted) {
      status = 'completed';
    } else {
      status = 'in_progress';
    }

    return {
      user_id: gp.user_id,
      deck_id: gp.deck_id,
      can_review: gp.can_review,
      is_eliminated: gp.is_eliminated,
      review_submitted_at: reviewSubmitted,
      auto_completed: autoCompleted,
      status,
    };
  });

  return { data: result, error: null };
}

// ─── Pod-level summary ──────────────────────────────────────

/**
 * Get a summary of how many players have completed, still reviewing, etc.
 * Also calculates minutes remaining on the 30-min timer.
 */
export async function getPodCompletionSummary(gameId: string): Promise<{
  data: PodCompletionSummary | null;
  error: string | null;
}> {
  // Get game timing
  const { data: game } = await supabase
    .from('games')
    .select('pod_id, ended_at, winner_player_id')
    .eq('id', gameId)
    .single();

  if (!game?.pod_id) return { data: null, error: 'Game or pod not found' };

  const { data: statusResult, error } = await getQuestionnaireStatus(gameId);
  if (error) return { data: null, error };

  const completed = statusResult.filter(p => p.status === 'completed').length;
  const autoComp = statusResult.filter(p => p.status === 'auto_completed').length;
  const inProgress = statusResult.filter(p => p.status === 'in_progress' && p.can_review).length;
  const notYet = statusResult.filter(p => p.status === 'in_progress' && !p.can_review).length;

  // Timer: starts from ended_at (winner declared)
  let minutesRemaining: number | null = null;
  if (game.ended_at && game.winner_player_id) {
    const endedAt = new Date(game.ended_at).getTime();
    const deadline = endedAt + REVIEW_TIMEOUT_MS;
    const now = Date.now();
    minutesRemaining = Math.max(0, Math.ceil((deadline - now) / 60000));
  }

  return {
    data: {
      total_players: statusResult.length,
      completed,
      auto_completed: autoComp,
      in_progress: inProgress,
      not_yet_reviewing: notYet,
      all_done: inProgress === 0 && notYet === 0,
      minutes_remaining: minutesRemaining,
    },
    error: null,
  };
}

// ─── Auto-complete expired reviews ──────────────────────────

/**
 * Check the 30-min timer and auto-complete any expired reviews.
 * For expired players:
 *   - Single-select questions (q1–q4, allegiance): skipped (no vote inserted)
 *   - Bracket check: auto-set to "no flag" (null target_deck_id)
 *   - review_submitted_at set, auto_completed = true
 *
 * Call this on a timer or when checking pod completion.
 * Returns the number of players auto-completed.
 */
export async function autoCompleteExpiredReviews(gameId: string): Promise<{
  autoCompletedCount: number;
  error: string | null;
}> {
  // Get game info
  const { data: game } = await supabase
    .from('games')
    .select('id, pod_id, ended_at, winner_player_id, state')
    .eq('id', gameId)
    .single();

  if (!game) return { autoCompletedCount: 0, error: 'Game not found' };
  if (!game.winner_player_id) return { autoCompletedCount: 0, error: null }; // No winner yet, no timer
  if (!game.ended_at) return { autoCompletedCount: 0, error: null };

  // Check if 30 min have passed
  const endedAt = new Date(game.ended_at).getTime();
  const deadline = endedAt + REVIEW_TIMEOUT_MS;
  if (Date.now() < deadline) {
    return { autoCompletedCount: 0, error: null }; // Timer hasn't expired yet
  }

  // Find players who haven't submitted their review
  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('user_id, can_review')
    .eq('game_id', gameId);

  if (!gamePlayers) return { autoCompletedCount: 0, error: 'No players found' };

  const { data: podMembers } = await supabase
    .from('pod_members')
    .select('user_id, review_submitted_at')
    .eq('pod_id', game.pod_id!);

  const submittedSet = new Set(
    (podMembers ?? [])
      .filter(m => m.review_submitted_at)
      .map(m => m.user_id)
  );

  // Players with review access who haven't submitted
  const expired = gamePlayers.filter(
    p => p.can_review && !submittedSet.has(p.user_id)
  );

  if (expired.length === 0) return { autoCompletedCount: 0, error: null };

  let completedCount = 0;

  for (const player of expired) {
    // Check if they already have a bracket_check vote — if not, insert "no flag"
    const { data: existingBracket } = await supabase
      .from('game_votes')
      .select('id')
      .eq('game_id', gameId)
      .eq('voter_id', player.user_id)
      .eq('question_key', 'bracket_check')
      .limit(1);

    if (!existingBracket || existingBracket.length === 0) {
      // Insert "no flag" bracket check (all played in bracket)
      await supabase
        .from('game_votes')
        .insert({
          game_id: gameId,
          voter_id: player.user_id,
          question_key: 'bracket_check',
          target_deck_id: null,
        });
    }

    // Single-select questions: leave as-is (skipped = no row)
    // Any votes they already cast stay — we only fill in bracket default

    // Mark review as submitted + auto_completed
    await supabase
      .from('pod_members')
      .update({
        review_submitted_at: new Date().toISOString(),
        auto_completed: true,
      })
      .eq('pod_id', game.pod_id!)
      .eq('user_id', player.user_id);

    completedCount++;
  }

  // Check if pod can now complete (all submitted)
  if (completedCount > 0) {
    await checkPodCompletion(game.pod_id!, gameId);
  }

  return { autoCompletedCount: completedCount, error: null };
}

// ─── Pod completion check ───────────────────────────────────

/**
 * Check if all players in the pod have submitted their review.
 * If so, transition pod to completed state.
 * This is called after each manual Accept Review and after auto-complete.
 */
export async function checkPodCompletion(podId: string, gameId: string): Promise<{
  completed: boolean;
  error: string | null;
}> {
  // Get all pod members
  const { data: members } = await supabase
    .from('pod_members')
    .select('user_id, review_submitted_at')
    .eq('pod_id', podId);

  if (!members || members.length === 0) {
    return { completed: false, error: 'No pod members found' };
  }

  const allSubmitted = members.every(m => m.review_submitted_at);

  if (!allSubmitted) {
    return { completed: false, error: null };
  }

  // All reviews in — complete the pod
  await supabase
    .from('pods')
    .update({ state: 'completed' })
    .eq('id', podId);

  // Complete the game
  const votingCount = members.filter(m => m.review_submitted_at).length;
  await supabase
    .from('games')
    .update({
      state: 'completed',
      completed_at: new Date().toISOString(),
      voting_player_count: votingCount,
      produces_score_changes: votingCount >= 2,
    })
    .eq('id', gameId);

  // ── Trigger post-game pipeline ──────────────────────
  // Runs: badges → chronic → AURA → nudges → Game Card
  // All steps are idempotent — safe to retry on failure.
  // Fire-and-forget: don't block the completion response.
  // Errors are captured in the OrchestrationResult (logged, not thrown).
  onGameCompleted(gameId).catch((err) => {
    console.error(`[orchestration] Pipeline failed for game ${gameId}:`, err);
  });

  return { completed: true, error: null };
}

/**
 * Check if the Game Card is locked (immutable).
 * The Game Card locks when the pod is completed (all reviews accepted/auto-completed).
 */
export async function isGameCardLocked(gameId: string): Promise<boolean> {
  const { data: game } = await supabase
    .from('games')
    .select('state')
    .eq('id', gameId)
    .single();

  return game?.state === 'completed';
}

/**
 * Get time remaining on the 30-min review timer.
 * Returns null if no winner yet, 0 if expired.
 */
export async function getReviewTimeRemaining(gameId: string): Promise<number | null> {
  const { data: game } = await supabase
    .from('games')
    .select('ended_at, winner_player_id')
    .eq('id', gameId)
    .single();

  if (!game?.ended_at || !game.winner_player_id) return null;

  const endedAt = new Date(game.ended_at).getTime();
  const deadline = endedAt + REVIEW_TIMEOUT_MS;
  const remaining = Math.max(0, deadline - Date.now());

  return Math.ceil(remaining / 60000); // minutes
}
