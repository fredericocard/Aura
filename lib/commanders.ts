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

/**
 * Register a new commander deck on the current user's account.
 * Same commander name can be registered multiple times (different builds).
 * Returns the new deck record or an error message.
 */
export async function registerCommander(commanderName: string): Promise<{ data: Deck | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not signed in' };

  const { data, error } = await supabase
    .from('decks')
    .insert({
      user_id: user.id,
      commander_name: commanderName.trim(),
    })
    .select()
    .single();

  return { data: data as Deck | null, error: error?.message ?? null };
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
