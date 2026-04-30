import { supabase } from './supabase';

/**
 * Update a player's life total.
 * If life drops to 0 or below → player is eliminated, can_review = true.
 * If life goes back above 0 (revive) → un-eliminated, can_review = false, review reset.
 * After each change, checks if only 1 player remains → that player is the winner + can review.
 */
export async function updateLifeTotal(gameId: string, userId: string, newLife: number): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('game_players')
    .update({ life_total: newLife })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  if (error) return { error: error.message };

  // Check elimination status based on new life
  if (newLife <= 0) {
    await eliminatePlayer(gameId, userId);
  } else {
    await revivePlayer(gameId, userId);
  }

  await checkLastStanding(gameId);
  return { error: null };
}

/**
 * Update a player's poison counters.
 * 10+ poison = eliminated.
 */
export async function updatePoisonCounters(gameId: string, userId: string, count: number): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('game_players')
    .update({ poison_counters: count })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  if (error) return { error: error.message };

  if (count >= 10) {
    await eliminatePlayer(gameId, userId);
  }

  await checkLastStanding(gameId);
  return { error: null };
}

/**
 * Update experience counters. No elimination effect.
 */
export async function updateExperienceCounters(gameId: string, userId: string, count: number): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('game_players')
    .update({ experience_counters: count })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  return { error: error?.message ?? null };
}

/**
 * Update energy counters. No elimination effect.
 */
export async function updateEnergyCounters(gameId: string, userId: string, count: number): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('game_players')
    .update({ energy_counters: count })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  return { error: error?.message ?? null };
}

/**
 * Mark a player as eliminated. They can now access the review.
 */
async function eliminatePlayer(gameId: string, userId: string): Promise<void> {
  await supabase
    .from('game_players')
    .update({
      is_eliminated: true,
      eliminated_at: new Date().toISOString(),
      can_review: true,
    })
    .eq('game_id', gameId)
    .eq('user_id', userId);
}

/**
 * Revive a player (undo elimination).
 * Resets can_review and clears any submitted review for this player.
 */
async function revivePlayer(gameId: string, userId: string): Promise<void> {
  // Only act if player was actually eliminated
  const { data: player } = await supabase
    .from('game_players')
    .select('is_eliminated')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single() as { data: any };

  if (!player?.is_eliminated) return;

  // Un-eliminate
  await supabase
    .from('game_players')
    .update({
      is_eliminated: false,
      eliminated_at: null,
      can_review: false,
    })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  // Reset their submitted review on the pod
  const { data: game } = await supabase
    .from('games')
    .select('pod_id')
    .eq('id', gameId)
    .single() as { data: any };

  if (game?.pod_id) {
    await supabase
      .from('pod_members')
      .update({ review_submitted_at: null })
      .eq('pod_id', game.pod_id)
      .eq('user_id', userId);
  }
}

/**
 * Check if only 1 (or 0) players remain alive.
 * If so, the last standing player is the winner and gets review access.
 * If a revive brings it back to 2+ alive, remove winner's review access
 * (unless they were eliminated too).
 */
async function checkLastStanding(gameId: string): Promise<void> {
  const { data: players } = await supabase
    .from('game_players')
    .select('user_id, deck_id, is_eliminated')
    .eq('game_id', gameId) as { data: any };

  if (!players) return;

  const alive = players.filter((p: any) => !p.is_eliminated);
  const eliminated = players.filter((p: any) => p.is_eliminated);

  if (alive.length === 1) {
    // Last player standing = winner, give them review access
    const winner = alive[0];
    await supabase
      .from('game_players')
      .update({ can_review: true })
      .eq('game_id', gameId)
      .eq('user_id', winner.user_id);

    // Mark winner on game record
    await supabase
      .from('games')
      .update({
        winner_player_id: winner.user_id,
        winner_deck_id: winner.deck_id,
        state: 'in_questionnaire',
        ended_at: new Date().toISOString(),
      })
      .eq('id', gameId);
  } else if (alive.length === 0) {
    // Everyone eliminated (draw) — all can review, game ends
    await supabase
      .from('games')
      .update({
        state: 'in_questionnaire',
        ended_at: new Date().toISOString(),
      })
      .eq('id', gameId);
  } else if (alive.length >= 2) {
    // Multiple players alive — game is still active
    // Remove review access from any alive player who had it (revive scenario)
    for (const p of alive) {
      await supabase
        .from('game_players')
        .update({ can_review: false })
        .eq('game_id', gameId)
        .eq('user_id', p.user_id)
        .eq('is_eliminated', false);
    }

    // Make sure game is back to active if it was moved to in_questionnaire
    await supabase
      .from('games')
      .update({
        state: 'active',
        winner_player_id: null,
        winner_deck_id: null,
        ended_at: null,
      })
      .eq('id', gameId)
      .eq('state', 'in_questionnaire');
  }
}

/**
 * Manually eliminate yourself (concede).
 * Same as life hitting 0 but triggered by button press.
 */
export async function concedeGame(gameId: string, userId: string): Promise<{ error: string | null }> {
  await eliminatePlayer(gameId, userId);
  await checkLastStanding(gameId);
  return { error: null };
}

/**
 * Manually revive yourself.
 * Only works if you were eliminated.
 */
export async function reviveSelf(gameId: string, userId: string): Promise<{ error: string | null }> {
  const { data: player } = await supabase
    .from('game_players')
    .select('is_eliminated, life_total')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single() as { data: any };

  if (!player) return { error: 'Player not found in this game' };
  if (!player.is_eliminated) return { error: 'You are not eliminated' };

  // Check if this player already accepted their review — no going back
  const { data: game } = await supabase
    .from('games')
    .select('pod_id')
    .eq('id', gameId)
    .single() as { data: any };

  if (game?.pod_id) {
    const { data: member } = await supabase
      .from('pod_members')
      .select('review_submitted_at')
      .eq('pod_id', game.pod_id)
      .eq('user_id', userId)
      .single() as { data: any };

    if (member?.review_submitted_at) {
      return { error: 'You already accepted your review — revive is no longer available.' };
    }
  }

  // Set life back to 1 (they can adjust from there)
  await supabase
    .from('game_players')
    .update({ life_total: 1 })
    .eq('game_id', gameId)
    .eq('user_id', userId);

  await revivePlayer(gameId, userId);
  await checkLastStanding(gameId);
  return { error: null };
}

/**
 * Abandon a game entirely. This is NOT the same as conceding mid-game.
 * Used when a player wants to leave and start fresh (e.g. internet crash, stale game).
 * - Eliminates the player
 * - Marks the game as 'completed' (not 'in_questionnaire') so it no longer blocks new games
 * - If there's only one other player, they don't get stuck either
 */
export async function abandonGame(gameId: string, userId: string): Promise<{ error: string | null }> {
  // Eliminate this player
  await eliminatePlayer(gameId, userId);

  // Check how many players are left
  const { data: players } = await supabase
    .from('game_players')
    .select('user_id, is_eliminated')
    .eq('game_id', gameId) as { data: any };

  const alive = (players ?? []).filter((p: any) => !p.is_eliminated);

  if (alive.length <= 1) {
    // Game is effectively over — mark as completed so no one is stuck
    await supabase
      .from('games')
      .update({
        state: 'completed',
        ended_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', gameId);
  } else {
    // More than 1 player still alive — just run the normal check
    await checkLastStanding(gameId);
  }

  return { error: null };
}

/**
 * Check if a specific player can access the review.
 */
export async function canPlayerReview(gameId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('game_players')
    .select('can_review')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single() as { data: any };

  return data?.can_review ?? false;
}

/**
 * Get the current state of all players in a game.
 */
export async function getGamePlayerStates(gameId: string): Promise<{
  data: {
    user_id: string;
    deck_id: string;
    life_total: number;
    poison_counters: number;
    experience_counters: number;
    energy_counters: number;
    is_eliminated: boolean;
    can_review: boolean;
  }[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('game_players')
    .select('user_id, deck_id, life_total, poison_counters, experience_counters, energy_counters, is_eliminated, can_review')
    .eq('game_id', gameId)
    .order('joined_at', { ascending: true });

  return { data: data ?? [], error: error?.message ?? null };
}
