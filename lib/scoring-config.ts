// ============================================
// AF-B26 · Scoring configuration
// Central config reader + admin writer.
// All scoring values are tunable without code changes.
// ============================================

import { createClient } from "@/lib/supabase/client";
import type { BadgeKey } from "@/lib/votes";

// ── Types ──────────────────────────────────────────────

export interface ScoringWeights {
  brilliance_vote_weight: number;
  flavour_vote_weight: number;
  rivalry_vote_weight: number;
  allegiance_vote_weight: number;
  fun_vote_weight: number;
  bracket_flag_weight: number;
}

export interface ChronicConfig {
  consecutive: number;  // consecutive rivalry brewed badges to trigger
  penalty: number;      // flat AURA penalty when chronic
}

export interface PodSizeScaling {
  [podSize: string]: number; // "2" → 3.0, "3" → 1.5, etc.
}

export interface TierBoundaries {
  exiled: number;
  sideboard: number;
  brewed: number;
  beloved: number;
  mythic: number;
}

export interface AuraRange {
  aura_min: number;
  aura_max: number;
  aura_default: number;
}

// ── Badge key → config key mapping ─────────────────────

const BADGE_WEIGHT_KEYS: Record<BadgeKey, string> = {
  brilliance: "brilliance_vote_weight",
  flavor: "flavour_vote_weight",
  rivalry: "rivalry_vote_weight",
  allegiance: "allegiance_vote_weight",
  fun: "fun_vote_weight",
};

// ── Config reader ──────────────────────────────────────

/** Get a single config value by key */
export async function getConfigValue<T = number>(key: string): Promise<T> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scoring_config")
    .select("value")
    .eq("key", key)
    .single() as { data: any; error: any };

  if (error || !data) {
    throw new Error(`Config key "${key}" not found: ${error?.message}`);
  }

  return data.value as T;
}

/** Get multiple config values by keys */
export async function getConfigValues(
  keys: string[]
): Promise<Record<string, unknown>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scoring_config")
    .select("key, value")
    .in("key", keys) as { data: any; error: any };

  if (error) {
    throw new Error(`Failed to read config: ${error.message}`);
  }

  const result: Record<string, unknown> = {};
  for (const row of data ?? []) {
    result[row.key] = row.value;
  }
  return result;
}

/** Get all config values */
export async function getAllConfig(): Promise<Record<string, unknown>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scoring_config")
    .select("key, value, description") as { data: any; error: any };

  if (error) {
    throw new Error(`Failed to read config: ${error.message}`);
  }

  const result: Record<string, unknown> = {};
  for (const row of data ?? []) {
    result[row.key] = row.value;
  }
  return result;
}

// ── Typed config readers ───────────────────────────────

/** Get all per-vote weights for badge categories */
export async function getScoringWeights(): Promise<ScoringWeights> {
  const keys = Object.values(BADGE_WEIGHT_KEYS).concat(["bracket_flag_weight"]);
  const raw = await getConfigValues(keys);

  return {
    brilliance_vote_weight: Number(raw.brilliance_vote_weight ?? 0.5),
    flavour_vote_weight: Number(raw.flavour_vote_weight ?? 0.7),
    rivalry_vote_weight: Number(raw.rivalry_vote_weight ?? 0.2),
    allegiance_vote_weight: Number(raw.allegiance_vote_weight ?? 0.4),
    fun_vote_weight: Number(raw.fun_vote_weight ?? 0.9),
    bracket_flag_weight: Number(raw.bracket_flag_weight ?? -3.0),
  };
}

/** Get the weight for a specific badge key */
export function getWeightForBadge(
  weights: ScoringWeights,
  badge: BadgeKey
): number {
  const key = BADGE_WEIGHT_KEYS[badge];
  return weights[key as keyof ScoringWeights];
}

/** Get chronic archenemy configuration */
export async function getChronicConfig(): Promise<ChronicConfig> {
  const raw = await getConfigValues([
    "chronic_archenemy_consecutive",
    "chronic_archenemy_penalty",
  ]);

  return {
    consecutive: Number(raw.chronic_archenemy_consecutive ?? 3),
    penalty: Number(raw.chronic_archenemy_penalty ?? -1.5),
  };
}

/** Get pod size scaling factors */
export async function getPodSizeScaling(): Promise<PodSizeScaling> {
  const raw = await getConfigValue<PodSizeScaling>("pod_size_scaling");
  return raw ?? { "2": 3.0, "3": 1.5, "4": 1.0, "5": 0.75 };
}

/** Get AURA range config */
export async function getAuraRange(): Promise<AuraRange> {
  const raw = await getConfigValues(["aura_min", "aura_max", "aura_default"]);

  return {
    aura_min: Number(raw.aura_min ?? 1),
    aura_max: Number(raw.aura_max ?? 100),
    aura_default: Number(raw.aura_default ?? 50),
  };
}

/** Get tier boundaries */
export async function getTierBoundaries(): Promise<TierBoundaries> {
  const raw = await getConfigValue<TierBoundaries>("tier_boundaries");
  return (
    raw ?? { exiled: 20, sideboard: 40, brewed: 60, beloved: 80, mythic: 100 }
  );
}

/** Get developing threshold (min games before showing tier) */
export async function getDevelopingMinGames(): Promise<number> {
  return getConfigValue<number>("developing_min_games");
}

// ── Config writer (admin only) ─────────────────────────

/** Update a config value (admin only — RLS enforced) */
export async function updateConfigValue(
  key: string,
  value: unknown
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("scoring_config")
    .update({ value })
    .eq("key", key);

  if (error) {
    throw new Error(`Failed to update config "${key}": ${error.message}`);
  }
}

/** Get config change history for a specific key */
export async function getConfigHistory(key: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scoring_config_log")
    .select("*")
    .eq("key", key)
    .order("changed_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to read config history: ${error.message}`);
  }

  return data ?? [];
}

/** Get full config change history (admin audit view) */
export async function getFullConfigHistory(limit = 50) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scoring_config_log")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to read config history: ${error.message}`);
  }

  return data ?? [];
}
