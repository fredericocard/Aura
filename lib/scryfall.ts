import { supabase } from './supabase';

export interface CardData {
  cardName: string;        // canonical name from Scryfall
  artUrl: string | null;
  colorIdentity: string;   // e.g. "WUBRG", "RG", ""
  isValidCommander: boolean;
  scryfallId: string | null;
}

/**
 * Validate a commander name against Scryfall and cache the result.
 * 1. Check local cache first
 * 2. If not cached (or stale), query Scryfall
 * 3. Cache the result for future lookups
 * 4. If Scryfall is unreachable, fall back to cache
 */
export async function validateCommander(cardName: string): Promise<{ data: CardData | null; error: string | null }> {
  const nameLower = cardName.trim().toLowerCase();

  // 1. Check cache first
  const cached = await getCachedCard(nameLower);
  if (cached) {
    // Cache is fresh if less than 7 days old
    const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (cacheAge < sevenDays) {
      return {
        data: {
          cardName: cached.card_name,
          artUrl: cached.art_url,
          colorIdentity: cached.color_identity || '',
          isValidCommander: cached.is_valid_commander,
          scryfallId: cached.scryfall_id,
        },
        error: cached.is_valid_commander ? null : `"${cached.card_name}" is not a valid commander`,
      };
    }
  }

  // 2. Query Scryfall
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName.trim())}`
    );

    if (!res.ok) {
      // Card not found on Scryfall
      if (res.status === 404) {
        return { data: null, error: `"${cardName}" not found in the Scryfall database` };
      }
      throw new Error(`Scryfall returned ${res.status}`);
    }

    const card = await res.json();

    // Check if this card can be a commander
    const isCommander = checkCommanderEligibility(card);

    // Get art URL
    const artUrl = card.image_uris?.art_crop
      || card.card_faces?.[0]?.image_uris?.art_crop
      || null;

    // Get color identity
    const colorIdentity = (card.color_identity || []).join('');

    const cardData: CardData = {
      cardName: card.name,
      artUrl,
      colorIdentity,
      isValidCommander: isCommander,
      scryfallId: card.id || null,
    };

    // 3. Cache the result (upsert)
    await upsertCache(nameLower, cardData);

    // Also cache by exact Scryfall name if different from input
    const scryfallLower = card.name.toLowerCase();
    if (scryfallLower !== nameLower) {
      await upsertCache(scryfallLower, cardData);
    }

    return {
      data: cardData,
      error: isCommander ? null : `"${card.name}" cannot be used as a commander`,
    };
  } catch (err) {
    // 4. Scryfall unreachable — fall back to cache
    if (cached) {
      return {
        data: {
          cardName: cached.card_name,
          artUrl: cached.art_url,
          colorIdentity: cached.color_identity || '',
          isValidCommander: cached.is_valid_commander,
          scryfallId: cached.scryfall_id,
        },
        error: cached.is_valid_commander ? null : `"${cached.card_name}" is not a valid commander`,
      };
    }
    return { data: null, error: 'Could not reach Scryfall and no cached data available. Please try again.' };
  }
}

/**
 * Check if a Scryfall card object is eligible to be a commander.
 * A card can be a commander if:
 * - It's a legendary creature
 * - It has "can be your commander" in its oracle text
 * - Its type line includes "Legendary Creature" or it has the keyword
 */
function checkCommanderEligibility(card: any): boolean {
  // Check all faces for double-faced cards
  const faces = card.card_faces || [card];

  for (const face of faces) {
    const typeLine = (face.type_line || '').toLowerCase();
    const oracleText = (face.oracle_text || '').toLowerCase();

    // Legendary Creature is always a valid commander
    if (typeLine.includes('legendary') && typeLine.includes('creature')) {
      return true;
    }

    // Some cards explicitly say they can be your commander
    if (oracleText.includes('can be your commander')) {
      return true;
    }
  }

  // Also check top-level type_line (for single-faced cards)
  const topType = (card.type_line || '').toLowerCase();
  if (topType.includes('legendary') && topType.includes('creature')) {
    return true;
  }

  // Check if Scryfall already flagged it via game data
  if (card.legalities?.commander === 'legal' || card.legalities?.commander === 'restricted') {
    // Being legal in commander doesn't mean it can BE a commander,
    // but combined with legendary + other types it helps
    const topOracle = (card.oracle_text || '').toLowerCase();
    if (topOracle.includes('can be your commander')) {
      return true;
    }
  }

  return false;
}

/**
 * Look up a card in the local cache.
 */
async function getCachedCard(nameLower: string) {
  const { data } = await supabase
    .from('scryfall_cache')
    .select('*')
    .eq('card_name_lower', nameLower)
    .single() as { data: any };
  return data;
}

/**
 * Insert or update a card in the cache.
 */
async function upsertCache(nameLower: string, card: CardData) {
  await supabase
    .from('scryfall_cache')
    .upsert({
      card_name_lower: nameLower,
      card_name: card.cardName,
      art_url: card.artUrl,
      color_identity: card.colorIdentity,
      is_valid_commander: card.isValidCommander,
      scryfall_id: card.scryfallId,
      cached_at: new Date().toISOString(),
    }, { onConflict: 'card_name_lower' });
}

export interface CommanderPrinting {
  id: string;                  // Scryfall id of this printing
  set_code: string;            // e.g. "neo"
  set_name: string;            // e.g. "Kamigawa: Neon Dynasty"
  set_icon_uri: string | null; // SVG icon URL
  collector_number: string;    // e.g. "117"
  released_at: string;         // YYYY-MM-DD
  art_crop: string | null;
  normal: string | null;       // full-card image for preview
  border_color: string;        // 'black' | 'white' | 'borderless' | etc.
  frame: string;
  promo: boolean;
}

/**
 * Fetch every printing of a commander (different art variants) so the user
 * can pick which one to display. Newest releases first.
 *
 * Uses Scryfall's `unique=prints` filter so we get every distinct printing
 * rather than collapsing them by name.
 */
export async function getCommanderPrintings(name: string): Promise<CommanderPrinting[]> {
  const trimmed = name.trim();
  if (!trimmed) return [];
  try {
    const q = encodeURIComponent(`!"${trimmed}"`);
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${q}&unique=prints&order=released&dir=desc`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    const rows: any[] = Array.isArray(data?.data) ? data.data : [];
    return rows
      .map((card): CommanderPrinting | null => {
        const imgs = card.image_uris ?? card.card_faces?.[0]?.image_uris;
        const artCrop: string | null = imgs?.art_crop ?? null;
        const normal: string | null = imgs?.normal ?? imgs?.large ?? imgs?.png ?? null;
        if (!artCrop && !normal) return null;
        return {
          id: card.id,
          set_code: (card.set || '').toLowerCase(),
          set_name: card.set_name ?? card.set ?? '',
          set_icon_uri: card.set_icon_svg_uri ?? null,
          collector_number: String(card.collector_number ?? ''),
          released_at: card.released_at ?? '',
          art_crop: artCrop,
          normal,
          border_color: card.border_color ?? 'black',
          frame: card.frame ?? '',
          promo: !!card.promo,
        };
      })
      .filter((p): p is CommanderPrinting => p !== null);
  } catch {
    return [];
  }
}

/**
 * Search Scryfall for commanders (used by the search popup).
 * Returns only cards that can legally be commanders.
 */
export async function searchCommanders(query: string): Promise<any[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}+is%3Acommander&order=name&unique=cards`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.slice(0, 8) || [];
  } catch {
    return [];
  }
}
