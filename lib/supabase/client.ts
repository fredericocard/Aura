import { supabase } from '@/lib/supabase';

/**
 * Returns the shared Supabase client.
 * Single singleton — same instance used by all lib files.
 */
export function createClient() {
  return supabase;
}
