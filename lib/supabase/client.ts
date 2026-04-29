import { createClient as _createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton client — reused across all lib files
const _client = _createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns the shared Supabase client.
 * All lib files import this and call createClient() to get the client.
 */
export function createClient() {
  return _client;
}
