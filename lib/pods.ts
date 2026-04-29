import { supabase } from './supabase';

export type PodState = 'waiting' | 'active' | 'in_questionnaire' | 'completed' | 'abandoned';

export interface Pod {
  id: string;
  short_code: string;
  host_id: string;
  state: PodState;
  min_players: number;
  max_players: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  abandoned_at: string | null;
}

export interface PodMember {
  id: string;
  pod_id: string;
  user_id: string;
  deck_id: string | null;
  joined_at: string;
  review_submitted_at: string | null;
}

/**
 * Generate a 6-character alphanumeric short code.
 * Uppercase letters + digits, no ambiguous chars (0/O, 1/I/L).
 */
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new pod. The current user becomes the host and first member.
 * Optionally pass a deck_id for the host's commander selection.
 */
export async function createPod(deckId?: string): Promise<{ data: Pod | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not signed in' };

  // Generate a unique short code (retry on collision)
  let shortCode = generateShortCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from('pods')
      .select('id')
      .eq('short_code', shortCode)
      .single();
    if (!existing) break;
    shortCode = generateShortCode();
    attempts++;
  }

  // Create the pod
  const { data: pod, error: podError } = await supabase
    .from('pods')
    .insert({
      short_code: shortCode,
      host_id: user.id,
    })
    .select()
    .single();

  if (podError || !pod) {
    return { data: null, error: podError?.message ?? 'Failed to create pod' };
  }

  // Add host as first member
  const { error: memberError } = await supabase
    .from('pod_members')
    .insert({
      pod_id: pod.id,
      user_id: user.id,
      deck_id: deckId || null,
    });

  if (memberError) {
    return { data: pod as Pod, error: `Pod created but failed to add host as member: ${memberError.message}` };
  }

  return { data: pod as Pod, error: null };
}

/**
 * Join an existing pod by short code.
 * Optionally pass a deck_id for commander selection.
 */
export async function joinPod(shortCode: string, deckId?: string): Promise<{ data: Pod | null; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not signed in' };

  // Find the pod
  const { data: pod, error: findError } = await supabase
    .from('pods')
    .select('*')
    .eq('short_code', shortCode.toUpperCase().trim())
    .single();

  if (findError || !pod) {
    return { data: null, error: 'Pod not found. Check the code and try again.' };
  }

  if (pod.state !== 'waiting') {
    return { data: null, error: 'This pod has already started or ended.' };
  }

  // Check member count
  const { count } = await supabase
    .from('pod_members')
    .select('*', { count: 'exact', head: true })
    .eq('pod_id', pod.id);

  if ((count ?? 0) >= pod.max_players) {
    return { data: null, error: 'This pod is full (max 5 players).' };
  }

  // Join
  const { error: joinError } = await supabase
    .from('pod_members')
    .insert({
      pod_id: pod.id,
      user_id: user.id,
      deck_id: deckId || null,
    });

  if (joinError) {
    if (joinError.message.includes('duplicate') || joinError.message.includes('unique')) {
      return { data: pod as Pod, error: null }; // already a member
    }
    return { data: null, error: joinError.message };
  }

  return { data: pod as Pod, error: null };
}

/**
 * Get a pod by ID with its members.
 */
export async function getPod(podId: string): Promise<{ data: (Pod & { members: PodMember[] }) | null; error: string | null }> {
  const { data: pod, error: podError } = await supabase
    .from('pods')
    .select('*')
    .eq('id', podId)
    .single();

  if (podError || !pod) {
    return { data: null, error: podError?.message ?? 'Pod not found' };
  }

  const { data: members } = await supabase
    .from('pod_members')
    .select('*')
    .eq('pod_id', podId)
    .order('joined_at', { ascending: true });

  return {
    data: { ...(pod as Pod), members: (members as PodMember[]) ?? [] },
    error: null,
  };
}

/**
 * Get a pod by short code.
 */
export async function getPodByCode(shortCode: string): Promise<{ data: Pod | null; error: string | null }> {
  const { data, error } = await supabase
    .from('pods')
    .select('*')
    .eq('short_code', shortCode.toUpperCase().trim())
    .single();

  return { data: data as Pod | null, error: error?.message ?? null };
}

/**
 * Update a pod's state. Only the host can do this (enforced by RLS).
 * Valid transitions:
 *   waiting → active (when host starts the game, needs 2-5 members)
 *   active → in_questionnaire
 *   in_questionnaire → completed
 *   any non-completed → abandoned
 */
export async function updatePodState(podId: string, newState: PodState): Promise<{ error: string | null }> {
  // Validate member count before starting
  if (newState === 'active') {
    const { count } = await supabase
      .from('pod_members')
      .select('*', { count: 'exact', head: true })
      .eq('pod_id', podId);

    const memberCount = count ?? 0;
    if (memberCount < 2) return { error: 'Need at least 2 players to start.' };
    if (memberCount > 5) return { error: 'Too many players (max 5).' };
  }

  const { error } = await supabase
    .from('pods')
    .update({ state: newState })
    .eq('id', podId);

  return { error: error?.message ?? null };
}

/**
 * Get all pods the current user is a member of (or hosting).
 */
export async function getMyPods(): Promise<{ data: Pod[]; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: 'Not signed in' };

  // Get pods where user is host
  const { data: hosted } = await supabase
    .from('pods')
    .select('*')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false });

  // Get pods where user is a member
  const { data: memberOf } = await supabase
    .from('pod_members')
    .select('pod_id')
    .eq('user_id', user.id);

  const memberPodIds = (memberOf ?? []).map(m => m.pod_id);

  let memberPods: Pod[] = [];
  if (memberPodIds.length > 0) {
    const { data } = await supabase
      .from('pods')
      .select('*')
      .in('id', memberPodIds)
      .order('created_at', { ascending: false });
    memberPods = (data as Pod[]) ?? [];
  }

  // Merge and deduplicate
  const allPods = [...(hosted as Pod[] ?? []), ...memberPods];
  const seen = new Set<string>();
  const unique = allPods.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return { data: unique, error: null };
}

/**
 * Get the member count for a pod.
 */
export async function getPodMemberCount(podId: string): Promise<number> {
  const { count } = await supabase
    .from('pod_members')
    .select('*', { count: 'exact', head: true })
    .eq('pod_id', podId);
  return count ?? 0;
}

/**
 * Submit a player's review for a pod.
 * Marks review_submitted_at on their pod_members row.
 * If ALL members have now submitted, auto-transitions pod to 'completed'.
 */
export async function submitReview(podId: string): Promise<{ allDone: boolean; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allDone: false, error: 'Not signed in' };

  // Mark this player's review as submitted
  const { error: updateError } = await supabase
    .from('pod_members')
    .update({ review_submitted_at: new Date().toISOString() })
    .eq('pod_id', podId)
    .eq('user_id', user.id);

  if (updateError) return { allDone: false, error: updateError.message };

  // Check if ALL members have submitted
  const { data: members } = await supabase
    .from('pod_members')
    .select('review_submitted_at')
    .eq('pod_id', podId);

  const allSubmitted = members != null && members.length > 0
    && members.every(m => m.review_submitted_at != null);

  if (allSubmitted) {
    // Auto-complete the pod — use service-level update
    // (the host trigger on RLS might block non-host updates,
    //  so we do this via the state change which the trigger handles)
    await supabase
      .from('pods')
      .update({ state: 'completed' })
      .eq('id', podId);
  }

  return { allDone: allSubmitted, error: null };
}

/**
 * Build the QR code URL for a pod's short code.
 * Uses a free QR code API — the actual join URL points to the app.
 */
export function getQrCodeUrl(shortCode: string, appBaseUrl: string): string {
  const joinUrl = `${appBaseUrl}/join?code=${shortCode}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`;
}
