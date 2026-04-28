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

/** Valid bracket values (1–5) per the official bracket system */
export const BRACKETS = [
  { value: 1, label: 'Bracket 1', desc: 'Precons & very casual' },
  { value: 2, label: 'Bracket 2', desc: 'Casual — most decks live here' },
  { value: 3, label: 'Bracket 3', desc: 'Focused & optimised' },
  { value: 4, label: 'Bracket 4', desc: 'High power & cEDH-adjacent' },
  { value: 5, label: 'Bracket 5', desc: 'cEDH — competitive' },
];

/**
 * Register a new commander deck on the current user's account.
 * Same commander name can be registered multiple times (different builds).
 * Bracket defaults to 2 if not provided. AURA starts at 50.
 */
export async function registerCommander(commanderName: string, bracket: number = 2): Promise<{ data: Deck | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not signed in' };

  if (bracket < 1 || bracket > 5) return { data: null, error: 'Bracket must be between 1 and 5' };

  const { data, error } = await supabase
    .from('decks')
    .insert({
      user_id: user.id,
      commander_name: commanderName.trim(),
      bracket,
    })
    .select()
    .single();

  return { data: data as Deck | null, error: error?.message ?? null };
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
    .order('created_at', { ascending: false });

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
