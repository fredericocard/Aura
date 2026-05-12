import { supabase } from './supabase';

export interface Deck {
  id: string;
  user_id: string;
  commander_name: string;
  commander_art_url: string | null;
  color_identity: string | null;
  bracket: number | null;
  aura_score: number;
  bracket_set_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Valid bracket values (1-5) per the official bracket system */
export const BRACKETS = [
  { value: 1, label: 'Bracket 1', desc: 'Precons & very casual' },
  { value: 2, label: 'Bracket 2', desc: 'Casual - most decks live here' },
  { value: 3, label: 'Bracket 3', desc: 'Focused & optimised' },
  { value: 4, label: 'Bracket 4', desc: 'High power & cEDH-adjacent' },
  { value: 5, label: 'Bracket 5', desc: 'cEDH - competitive' },
];

/**
 * Register a new commander deck on the current user's account.
 * Same commander name can be registered multiple times (different builds).
 *
 * When skipBracket is true, bracket is set to NULL. Scoring (aura, badges)
 * is deferred until the user picks a bracket on the Decks page.
 * Otherwise bracket defaults to 2.
 */
export async function registerCommander(
  commanderName: string,
  bracket: number = 2,
  skipBracket: boolean = false,
): Promise<{ data: Deck | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not signed in' };

  if (!skipBracket && (bracket < 1 || bracket > 5)) {
    return { data: null, error: 'Bracket must be between 1 and 5' };
  }

  const { data, error } = await supabase
    .from('decks')
    .insert({
      user_id: user.id,
      commander_name: commanderName.trim(),
      bracket: skipBracket ? null : bracket,
    })
    .select()
    .single() as { data: any; error: any };

  return { data: data as Deck | null, error: error?.message ?? null };
}

/**
 * Set a deck's bracket and apply all pending scoring.
 * Called from the Decks page when a user with bracket=NULL picks one.
 * Re-runs badge counts + aura scoring for every completed game the deck was in.
 */
export async function confirmBracketAndApplyScoring(
  deckId: string,
  bracket: number,
): Promise<{ error: string | null }> {
  if (bracket < 1 || bracket > 5) return { error: 'Bracket must be between 1 and 5' };

  // 1. Set the bracket
  const { error: updateError } = await supabase
    .from('decks')
    .update({ bracket, bracket_set_at: new Date().toISOString() })
    .eq('id', deckId);

  if (updateError) return { error: updateError.message };

  // 2. Find all games this deck participated in
  const { data: gamePlayers, error: gpError } = await supabase
    .from('game_players')
    .select('game_id')
    .eq('deck_id', deckId) as { data: any; error: any };

  if (gpError) return { error: gpError.message };
  if (!gamePlayers || gamePlayers.length === 0) return { error: null };

  // 3. Re-run scoring for each completed game (badge counts + aura)
  const { processGameBadges } = await import('./badge-counts');
  const { applyGameAura } = await import('./aura-scoring');
  const { updateChronicStatusForGame } = await import('./chronic-archenemy');

  for (const gp of gamePlayers) {
    const { data: game } = await supabase
      .from('games')
      .select('state')
      .eq('id', gp.game_id)
      .single() as { data: any; error: any };

    if (game?.state === 'completed') {
      await processGameBadges(gp.game_id);
      await updateChronicStatusForGame(gp.game_id);
      await applyGameAura(gp.game_id);
    }
  }

  return { error: null };
}

/**
 * Update a deck's bracket. Records the timestamp automatically via trigger.
 * AURA score is NOT reset on bracket change (that's by design).
 */
export async function updateBracket(deckId: string, bracket: number): Promise<{ error: string | null }> {
  if (bracket < 1 || bracket > 5) return { error: 'Bracket must be between 1 and 5' };

  const { error } = await supabase
    .from('decks')
    .update({ bracket })
    .eq('id', deckId);

  return { error: error?.message ?? null };
}

/**
 * Get all commander decks for the current user.
 * RLS ensures only the user's own decks are returned.
 */
export async function getMyCommanders(): Promise<{ data: Deck[]; error: string | null }> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .order('created_at', { ascending: false }) as { data: any; error: any };

  return { data: (data as Deck[]) ?? [], error: error?.message ?? null };
}

/**
 * Delete a commander deck by ID.
 * RLS ensures only the owner can delete.
 */
export async function deleteCommander(deckId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('decks')
    .delete()
    .eq('id', deckId);

  return { error: error?.message ?? null };
}
