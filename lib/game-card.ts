// ============================================
// AF-B22 · Game Card composition
// Composes the Game Card from votes, badges,
// archetypes, and tally data. Template-based
// narrative. No linear placements, no AURA scores.
// ============================================

import { createClient } from "@/lib/supabase/client";
import { getGameVotes } from "@/lib/votes";
import { computeGameTally, getAllWinners } from "@/lib/vote-tally";
import { getGameBadgeAttributions } from "@/lib/badge-attribution";

// ── Types ──────────────────────────────────────────────

export interface CommanderCardData {
  deck_id: string;
  user_id: string;
  commander_name: string;
  art_url: string | null;
  archetype: string;
  brewed_badge: string;
  is_winner: boolean;
}

export interface GameCardData {
  gameId: string;
  podId: string;
  narrative: string;
  gameDate: string;
  podSize: number;
  // Winner
  winnerUserId: string | null;
  winnerDeckId: string | null;
  winnerCommanderName: string | null;
  winnerArchetype: string | null;
  // Key vote winners
  archenemyCommander: string | null;
  flavourWinnerCommander: string | null;
  funWinnerCommander: string | null;
  brillianceWinnerCommander: string | null;
  // Allegiance
  allegianceData: AllegianceEntry[];
  // Bracket
  bracketConsensus: boolean;
  bracketFlaggedCommanders: string[];
  // All commanders
  commanders: CommanderCardData[];
}

export interface AllegianceEntry {
  voter_commander: string;
  target_commander: string;
}

export interface GameCard {
  id: string;
  game_id: string;
  pod_id: string;
  narrative: string;
  game_date: string;
  pod_size: number;
  winner_commander_name: string | null;
  winner_archetype: string | null;
  archenemy_commander: string | null;
  flavour_winner_commander: string | null;
  fun_winner_commander: string | null;
  brilliance_winner_commander: string | null;
  commanders: CommanderCardData[];
  share_code: string | null;
  image_url: string | null;
  created_at: string;
}

// ── Narrative templates ────────────────────────────────

/**
 * Generate the "in this chapter" narrative from game data.
 * Template-based: builds from winner, archenemy, flavour.
 */
function composeNarrative(data: {
  winnerName: string | null;
  archenemyName: string | null;
  flavourName: string | null;
  funName: string | null;
  podSize: number;
}): string {
  const parts: string[] = [];

  // Winner part
  if (data.winnerName) {
    const winnerIntros = [
      `${data.winnerName} stood as the last one standing`,
      `${data.winnerName} claimed victory`,
      `${data.winnerName} emerged triumphant`,
    ];
    parts.push(pickRandom(winnerIntros, data.winnerName));
  }

  // Archenemy part
  if (data.archenemyName && data.archenemyName !== data.winnerName) {
    const archenemyParts = [
      `while ${data.archenemyName} drew the table's attention as the archenemy`,
      `with ${data.archenemyName} painting a target on their back`,
      `as ${data.archenemyName} commanded fear across the table`,
    ];
    parts.push(archenemyParts[hashPick(data.archenemyName, archenemyParts.length)]);
  } else if (data.archenemyName && data.archenemyName === data.winnerName) {
    parts[0] = `${data.winnerName} won with a target on their back`;
  }

  // Flavour part
  if (data.flavourName && data.flavourName !== data.winnerName && data.flavourName !== data.archenemyName) {
    const flavourParts = [
      `${data.flavourName} stole the spotlight with style`,
      `${data.flavourName} brought the flavour`,
    ];
    parts.push(flavourParts[hashPick(data.flavourName, flavourParts.length)]);
  }

  // Fun part as closer
  if (data.funName && !parts.some((p) => p.includes(data.funName!))) {
    parts.push(`and everyone agreed ${data.funName} should be invited back first`);
  }

  if (parts.length === 0) {
    return `A ${data.podSize}-player game was played. The votes have been cast.`;
  }

  // Join with commas and period
  let narrative = parts[0];
  for (let i = 1; i < parts.length; i++) {
    if (i === parts.length - 1) {
      narrative += `. ${capitalize(parts[i])}`;
    } else {
      narrative += `, ${parts[i]}`;
    }
  }

  return narrative + ".";
}

// ── Card composition ───────────────────────────────────

/**
 * Compose a Game Card from all game data.
 * Call this when the pod reaches "completed" state.
 */
export async function composeGameCard(
  gameId: string
): Promise<GameCardData> {
  const supabase = createClient();

  // 1. Load game + players + decks
  const { data: game, error: gameErr } = await supabase
    .from("games")
    .select("id, pod_id, pod_size, winner_player_id, winner_deck_id, created_at")
    .eq("id", gameId)
    .single() as { data: any; error: any };

  if (gameErr || !game) {
    throw new Error(`Game not found: ${gameErr?.message}`);
  }

  const { data: players, error: playersErr } = await supabase
    .from("game_players")
    .select("user_id, deck_id, is_winner, decks!inner(commander_name, commander_art_url)")
    .eq("game_id", gameId) as { data: any; error: any };

  if (playersErr || !players) {
    throw new Error(`Failed to load players: ${playersErr?.message}`);
  }

  // 2. Get badge attributions (archetypes + brewed badges)
  const { data: attributions } = await getGameBadgeAttributions(gameId);
  const attrMap = new Map(attributions.map((a) => [a.deck_id, a]));

  // 3. Get tally winners
  const { data: winnersMap } = await getAllWinners(gameId);

  // 4. Build commander lookup
  const deckToCommander = new Map<string, string>();
  const deckToArt = new Map<string, string | null>();
  for (const p of players) {
    const deck = p.decks as { commander_name: string; commander_art_url: string | null };
    deckToCommander.set(p.deck_id, deck.commander_name);
    deckToArt.set(p.deck_id, deck.commander_art_url);
  }

  // 5. Resolve key vote winners to commander names
  const resolveWinner = (key: string): string | null => {
    const entry = winnersMap.get(key);
    if (!entry?.winner) return null;
    return deckToCommander.get(entry.winner.deck_id) ?? null;
  };

  const archenemyCommander = resolveWinner("rivalry");
  const flavourWinnerCommander = resolveWinner("flavor");
  const funWinnerCommander = resolveWinner("fun");
  const brillianceWinnerCommander = resolveWinner("brilliance");

  // Winner info
  const winnerCommander = game.winner_deck_id
    ? deckToCommander.get(game.winner_deck_id) ?? null
    : null;
  const winnerAttr = game.winner_deck_id
    ? attrMap.get(game.winner_deck_id)
    : null;

  // 6. Build allegiance data
  const allegianceData = await buildAllegianceData(gameId, deckToCommander);

  // 7. Build bracket check summary
  const bracketResult = await buildBracketSummary(gameId, deckToCommander);

  // 8. Build commanders array
  const commanders: CommanderCardData[] = players.map((p) => {
    const attr = attrMap.get(p.deck_id);
    const deck = p.decks as { commander_name: string; commander_art_url: string | null };
    return {
      deck_id: p.deck_id,
      user_id: p.user_id,
      commander_name: deck.commander_name,
      art_url: deck.commander_art_url,
      archetype: attr?.archetype ?? "The Unknown",
      brewed_badge: attr?.brewed_badge ?? "none",
      is_winner: p.is_winner,
    };
  });

  // 9. Compose narrative
  const narrative = composeNarrative({
    winnerName: winnerCommander,
    archenemyName: archenemyCommander,
    flavourName: flavourWinnerCommander,
    funName: funWinnerCommander,
    podSize: game.pod_size,
  });

  return {
    gameId,
    podId: game.pod_id,
    narrative,
    gameDate: game.created_at.split("T")[0],
    podSize: game.pod_size,
    winnerUserId: game.winner_player_id,
    winnerDeckId: game.winner_deck_id,
    winnerCommanderName: winnerCommander,
    winnerArchetype: winnerAttr?.archetype ?? null,
    archenemyCommander,
    flavourWinnerCommander,
    funWinnerCommander,
    brillianceWinnerCommander,
    allegianceData,
    bracketConsensus: bracketResult.consensus,
    bracketFlaggedCommanders: bracketResult.flagged,
    commanders,
  };
}

// ── Save card to database ──────────────────────────────

/**
 * Compose and save the Game Card. Idempotent.
 * Called when pod completes.
 */
export async function createGameCard(gameId: string): Promise<GameCard> {
  const supabase = createClient();

  // Check if card already exists (idempotent)
  const { data: existing } = await supabase
    .from("game_cards")
    .select("*")
    .eq("game_id", gameId)
    .single() as { data: any };

  if (existing) return existing as GameCard;

  // Compose card data
  const data = await composeGameCard(gameId);

  // Generate share code
  const shareCode = generateShareCode();

  // Insert card
  const { data: card, error: cardErr } = await supabase
    .from("game_cards")
    .insert({
      game_id: data.gameId,
      pod_id: data.podId,
      narrative: data.narrative,
      game_date: data.gameDate,
      pod_size: data.podSize,
      winner_user_id: data.winnerUserId,
      winner_deck_id: data.winnerDeckId,
      winner_commander_name: data.winnerCommanderName,
      winner_archetype: data.winnerArchetype,
      archenemy_commander: data.archenemyCommander,
      flavour_winner_commander: data.flavourWinnerCommander,
      fun_winner_commander: data.funWinnerCommander,
      brilliance_winner_commander: data.brillianceWinnerCommander,
      allegiance_data: data.allegianceData,
      bracket_consensus: data.bracketConsensus,
      bracket_flagged_commanders: data.bracketFlaggedCommanders,
      commanders: data.commanders,
      share_code: shareCode,
    })
    .select()
    .single() as { data: any; error: any };

  if (cardErr || !card) {
    throw new Error(`Failed to create game card: ${cardErr?.message}`);
  }

  // Insert player links
  for (const commander of data.commanders) {
    await supabase.from("game_card_players").insert({
      card_id: card.id,
      user_id: commander.user_id,
      deck_id: commander.deck_id,
      commander_name: commander.commander_name,
      archetype: commander.archetype,
      brewed_badge: commander.brewed_badge,
      is_winner: commander.is_winner,
    });
  }

  return card as GameCard;
}

// ── Card readers ───────────────────────────────────────

/** Get the Game Card for a specific game */
export async function getGameCard(gameId: string): Promise<GameCard | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_cards")
    .select("*")
    .eq("game_id", gameId)
    .single() as { data: any; error: any };

  if (error || !data) return null;
  return data as GameCard;
}

/** Get a card by its share code (public access) */
export async function getCardByShareCode(
  shareCode: string
): Promise<GameCard | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_cards")
    .select("*")
    .eq("share_code", shareCode)
    .single() as { data: any; error: any };

  if (error || !data) return null;
  return data as GameCard;
}

/** Get all Game Cards for a specific deck (deck profile history) */
export async function getCardsForDeck(deckId: string): Promise<GameCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_card_players")
    .select("card_id, game_cards!inner(*)")
    .eq("deck_id", deckId)
    .order("game_cards.created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch cards for deck: ${error.message}`);
  }

  return (data ?? []).map(
    (r) => (r as Record<string, unknown>).game_cards as GameCard
  );
}

/** Get all Game Cards for a specific user (game log) */
export async function getCardsForUser(userId: string): Promise<GameCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_card_players")
    .select("card_id, game_cards!inner(*)")
    .eq("user_id", userId)
    .order("game_cards.created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch cards for user: ${error.message}`);
  }

  return (data ?? []).map(
    (r) => (r as Record<string, unknown>).game_cards as GameCard
  );
}

// ── Image storage (B23) ────────────────────────────────

/** Update card with generated image URL */
export async function setCardImage(
  cardId: string,
  imageUrl: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("game_cards")
    .update({
      image_url: imageUrl,
      image_generated_at: new Date().toISOString(),
    })
    .eq("id", cardId);

  if (error) {
    throw new Error(`Failed to set card image: ${error.message}`);
  }
}

/** Get the share URL for a card */
export function getShareUrl(shareCode: string): string {
  // Base URL will be configured per environment
  return `/card/${shareCode}`;
}

// ── Helpers ────────────────────────────────────────────

async function buildAllegianceData(
  gameId: string,
  deckToCommander: Map<string, string>
): Promise<AllegianceEntry[]> {
  const supabase = createClient();
  const { data: votes } = await supabase
    .from("game_votes")
    .select("voter_id, target_deck_id")
    .eq("game_id", gameId)
    .eq("question_key", "allegiance");

  if (!votes) return [];

  // Get voter deck IDs
  const { data: players } = await supabase
    .from("game_players")
    .select("user_id, deck_id")
    .eq("game_id", gameId);

  const userToDeck = new Map(
    (players ?? []).map((p) => [p.user_id, p.deck_id])
  );

  return votes
    .filter((v) => v.target_deck_id)
    .map((v) => ({
      voter_commander:
        deckToCommander.get(userToDeck.get(v.voter_id) ?? "") ?? "Unknown",
      target_commander:
        deckToCommander.get(v.target_deck_id!) ?? "Unknown",
    }));
}

async function buildBracketSummary(
  gameId: string,
  deckToCommander: Map<string, string>
): Promise<{ consensus: boolean; flagged: string[] }> {
  const supabase = createClient();
  const { data: flags } = await supabase
    .from("game_votes")
    .select("target_deck_id")
    .eq("game_id", gameId)
    .eq("question_key", "bracket_check")
    .not("target_deck_id", "is", null);

  if (!flags || flags.length === 0) {
    return { consensus: true, flagged: [] };
  }

  const flaggedDecks = new Set(flags.map((f) => f.target_deck_id!));
  const flaggedNames = Array.from(flaggedDecks)
    .map((id) => deckToCommander.get(id) ?? "Unknown")
    .sort();

  return { consensus: false, flagged: flaggedNames };
}

function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Deterministic pick based on string hash */
function hashPick(s: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % count;
}

/** Pick from array using string as seed (deterministic) */
function pickRandom(options: string[], seed: string): string {
  return options[hashPick(seed, options.length)];
}
