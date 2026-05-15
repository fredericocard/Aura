'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerCommander, getMyCommanders, BRACKETS, type Deck } from '@/lib/commanders';
import { createPod, getQrCodeUrl } from '@/lib/pods';
import { createGame } from '@/lib/games';
import { validateCommander, searchCommanders, getCommanderPrintings, type CardData, type CommanderPrinting } from '@/lib/scryfall';

interface ScryfallCard {
  name: string;
  image_uris?: { art_crop: string };
  card_faces?: { image_uris?: { art_crop: string } }[];
  color_identity: string[];
}

const MANA_COLORS: Record<string, string> = {
  W: '#E9DEB6',
  U: '#5B7E9E',
  B: '#3F352E',
  R: '#B0593E',
  G: '#5B7B45',
  C: '#A89F8E',
};

// ── Swipe-to-dismiss hook ──────────────────────────────────────────────────
function useSheetDrag(onDismiss: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const dragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
    dragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dy = e.touches[0].clientY - startY.current;
    currentY.current = Math.max(0, dy);
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${currentY.current}px)`;
  }, []);

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
    if (sheetRef.current) sheetRef.current.style.transition = 'transform 0.25s cubic-bezier(.22,.61,.36,1)';
    if (currentY.current > 100) {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(100%)';
      setTimeout(onDismiss, 250);
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }
    currentY.current = 0;
  }, [onDismiss]);

  return { sheetRef, onTouchStart, onTouchMove, onTouchEnd };
}

export default function Page() {
  const router = useRouter();
  const [podName, setPodName] = useState('Friday Night Pod');
  const [selectedPlayers, setSelectedPlayers] = useState(4);
  const [selectedDeck, setSelectedDeck] = useState(0);
  const [showQr, setShowQr] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPod, setCreatedPod] = useState<{ id: string; short_code: string } | null>(null);
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [pendingCard, setPendingCard] = useState<CardData | null>(null);
  const [selectedBracket, setSelectedBracket] = useState(2);
  const [registering, setRegistering] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  // Art picker state
  const [showArtPicker, setShowArtPicker] = useState(false);
  const [artPrintings, setArtPrintings] = useState<CommanderPrinting[] | null>(null);
  const [selectedArtId, setSelectedArtId] = useState<string | null>(null);
  const [artPickerCard, setArtPickerCard] = useState<CardData | null>(null);

  const searchSheetDrag = useSheetDrag(() => closeNewDeck());
  const bracketSheetDrag = useSheetDrag(() => setPendingCard(null));

  // Load user's commanders on mount
  useEffect(() => {
    async function loadDecks() {
      const { data, error: err } = await getMyCommanders();
      if (err) { setError(err); }
      setDecks(data);
      setLoading(false);
    }
    loadDecks();
  }, []);

  // Create pod + game handler
  async function handleCreatePod() {
    if (decks.length === 0) return;
    setCreating(true);
    setError(null);

    const selectedDeckId = decks[selectedDeck]?.id;
    if (!selectedDeckId) { setCreating(false); return; }

    // 1. Create the pod with the selected deck
    const { data: pod, error: podErr } = await createPod(selectedDeckId);
    if (podErr || !pod) {
      setError(podErr ?? 'Failed to create pod');
      setCreating(false);
      return;
    }

    // 2. Create the game immediately so it exists when others scan the QR code
    const { data: game, error: gameErr } = await createGame(pod.id, selectedPlayers);
    if (gameErr || !game) {
      setError(gameErr ?? 'Failed to create game');
      setCreating(false);
      return;
    }

    setCreatedPod({ id: pod.id, short_code: pod.short_code });
    setCreatedGameId(game.id);
    setShowQr(true);
    setCreating(false);
  }

  // Enter pod → find existing game + navigate to gridview
  async function handleEnterPod() {
    if (!createdPod) return;
    setCreating(true);

    // Game was already created in handleCreatePod — use it
    if (createdGameId) {
      router.push(`/gridview-${selectedPlayers}p?podId=${createdPod.id}&gameId=${createdGameId}`);
      return;
    }

    // Fallback: find existing game (shouldn't normally be needed)
    const { supabase: sb } = await import('@/lib/supabase');
    const { data: existingGames } = await sb
      .from('games').select('id, pod_size').eq('pod_id', createdPod.id)
      .in('state', ['active', 'in_questionnaire'])
      .order('created_at', { ascending: false }).limit(1) as { data: any };

    if (existingGames && existingGames.length > 0) {
      const game = existingGames[0];
      setCreatedGameId(game.id);
      router.push(`/gridview-${game.pod_size}p?podId=${createdPod.id}&gameId=${game.id}`);
      return;
    }

    // Last resort: create game now
    const { data: game, error: gameErr } = await createGame(createdPod.id, selectedPlayers);
    if (gameErr || !game) {
      setError(gameErr ?? 'Failed to create game');
      setCreating(false);
      return;
    }
    setCreatedGameId(game.id);
    router.push(`/gridview-${selectedPlayers}p?podId=${createdPod.id}&gameId=${game.id}`);
  }

  // Parse color identity string to array: "WUBR" → ["W","U","B","R"]
  function parseColors(colorIdentity: string | null): string[] {
    if (!colorIdentity) return [];
    return colorIdentity.split('').filter((c: any) => 'WUBRG'.includes(c));
  }

  const displayToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const searchScryfall = (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchCommanders(query)
      .then(results => {
        setSearchResults(results);
        setSearching(false);
      })
      .catch(() => { setSearchResults([]); setSearching(false); });
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => searchScryfall(value), 400);
    setSearchTimer(timer);
  };

  const getCardArt = (card: ScryfallCard): string => {
    if (card.image_uris?.art_crop) return card.image_uris.art_crop;
    if (card.card_faces?.[0]?.image_uris?.art_crop) return card.card_faces[0].image_uris.art_crop;
    return '';
  };

  const handleSelectCommander = async (card: ScryfallCard) => {
    // Validate against Scryfall + cache the card data
    const { data: validated, error: valError } = await validateCommander(card.name);
    if (valError || !validated) {
      displayToast(valError || 'Could not validate commander');
      return;
    }
    if (!validated.isValidCommander) {
      displayToast(`${validated.cardName} can't be used as a commander`);
      return;
    }

    // If user has no decks, quick-add without bracket picker
    if (decks.length === 0) {
      setRegistering(true);
      setShowNewDeck(false);
      setSearchQuery('');
      setSearchResults([]);

      const { data: newDeck, error: regError } = await registerCommander(validated.cardName, 2, true);
      if (regError || !newDeck) {
        displayToast(regError || 'Failed to register commander');
        setRegistering(false);
        return;
      }

      // Update art + color identity
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('decks').update({
        commander_art_url: validated.artUrl,
        color_identity: validated.colorIdentity || null,
      }).eq('id', newDeck.id);

      const enrichedDeck = {
        ...newDeck,
        commander_art_url: validated.artUrl,
        color_identity: validated.colorIdentity || null,
      };
      setDecks([enrichedDeck]);
      setSelectedDeck(0);
      setRegistering(false);
      displayToast(`${validated.cardName} added!`);
      return;
    }

    // Show art picker step first (normal flow when user already has decks)
    setArtPickerCard(validated);
    setArtPrintings(null);
    setSelectedArtId(null);
    setShowArtPicker(true);
    setShowNewDeck(false);
    setSearchQuery('');
    setSearchResults([]);
    // Fetch all printings in background
    getCommanderPrintings(validated.cardName).then(rows => {
      setArtPrintings(rows);
      // Pre-select the printing matching the default art
      if (validated.artUrl) {
        const match = rows.find(p => p.art_crop === validated.artUrl);
        if (match) setSelectedArtId(match.id);
      }
    });
  };

  const handleConfirmRegistration = async () => {
    if (!pendingCard) return;
    setRegistering(true);

    const { data: newDeck, error } = await registerCommander(pendingCard.cardName, selectedBracket);
    if (error) {
      displayToast(`Error: ${error}`);
      setRegistering(false);
      return;
    }

    if (newDeck) {
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('decks').update({
        commander_art_url: pendingCard.artUrl,
        color_identity: pendingCard.colorIdentity || null,
      }).eq('id', newDeck.id);

      setDecks(prev => [{
        ...newDeck,
        commander_art_url: pendingCard.artUrl,
        color_identity: pendingCard.colorIdentity || null,
      }, ...prev]);

      // Auto-select the newly added commander as the deck
      setSelectedDeck(0);
    }
    displayToast(`${pendingCard.cardName} added at Bracket ${selectedBracket}!`);
    setPendingCard(null);
    setRegistering(false);
  };

  const handleArtConfirm = () => {
    if (!artPickerCard || !artPrintings) return;
    const chosen = selectedArtId ? artPrintings.find(p => p.id === selectedArtId) : null;
    const chosenUrl = chosen?.art_crop ?? artPickerCard.artUrl;
    // Update the card data with the chosen art, then move to bracket picker
    const updatedCard: CardData = { ...artPickerCard, artUrl: chosenUrl };
    setShowArtPicker(false);
    setPendingCard(updatedCard);
    setSelectedBracket(2);
  };

  const handleArtCancel = () => {
    setShowArtPicker(false);
    setArtPickerCard(null);
    setArtPrintings(null);
    setSelectedArtId(null);
  };

  const openNewDeck = () => {
    setShowNewDeck(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const closeNewDeck = () => {
    setShowNewDeck(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Build real QR code URL from the pod's short code
  const qrCodeUrl = createdPod
    ? getQrCodeUrl(createdPod.short_code, typeof window !== 'undefined' ? window.location.origin : 'https://auramtg.com')
    : '';

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Young+Serif&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

    html, body {
      height: 100%;
      overflow: hidden;
      font-family: 'Instrument Sans', sans-serif;
      background: #F5EFE2;
    }

    .app {
      width: 100%;
      height: 100%;
      max-width: 430px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    /* ── Header ── */
    .header {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 12px 12px 8px;
      background: rgba(245,239,226,0.88);
      backdrop-filter: blur(14px) saturate(120%);
      -webkit-backdrop-filter: blur(14px) saturate(120%);
      border-bottom: 1px solid rgba(43,33,24,0.08);
      flex-shrink: 0;
    }

    .header-back {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: none;
      background: transparent;
      color: #2B2118;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .header-back:active { transform: scale(0.85); }

    .header-title {
      flex: 1;
      font-weight: 700;
      font-size: 19px;
      letter-spacing: -0.01em;
      color: #2B2118;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Content ── */
    .content {
      flex: 1;
      overflow: auto;
      padding: 8px 16px 120px;
    }

    /* ── Eyebrow Label ── */
    .eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #8A7E6F;
      padding: 6px 4px 8px;
    }

    .eyebrow-top {
      padding: 18px 4px 8px;
    }

    /* ── Pod Name Input ── */
    .pod-name-input {
      width: 100%;
      background: #FAF5EA;
      border: 1px solid rgba(43,33,24,0.14);
      border-radius: 20px;
      padding: 14px 16px;
      font-family: 'Young Serif', serif;
      font-size: 18px;
      color: #2B2118;
      outline: none;
    }

    .pod-name-input:focus {
      border-color: #2F5D3A;
    }

    /* ── Player Count ── */
    .player-selector {
      display: flex;
      gap: 8px;
    }

    .player-tile {
      flex: 1;
      padding: 14px 0;
      text-align: center;
      background: #FAF5EA;
      border: 1px solid rgba(43,33,24,0.14);
      border-radius: 14px;
      font-family: 'Young Serif', serif;
      font-size: 22px;
      letter-spacing: -0.01em;
      color: #2B2118;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .player-tile.selected {
      background: #2F5D3A;
      color: #F5EFE2;
      border: none;
      box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12);
    }

    /* ── Deck List ── */
    .deck-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .deck-row {
      background: #FAF5EA;
      border: 1px solid rgba(43,33,24,0.08);
      border-radius: 20px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .deck-row:active { transform: scale(0.98); }

    .deck-row.selected {
      background: #E5ECE3;
      border: 1.5px solid #2F5D3A;
    }

    .deck-art {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .deck-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: 50% 25%;
    }

    .deck-info {
      flex: 1;
      min-width: 0;
    }

    .deck-name {
      font-family: 'Young Serif', serif;
      font-size: 16px;
      color: #2B2118;
      line-height: 1.15;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .deck-mana {
      display: flex;
      gap: 3px;
      margin-top: 4px;
    }

    .mana-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      box-shadow: 0 0 0 1px rgba(43,33,24,0.18);
    }

    .deck-check {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      border: 1.5px solid rgba(43,33,24,0.14);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .deck-check.selected {
      border: none;
      background: #2F5D3A;
    }

    /* ── Sticky CTA ── */
    .cta-wrap {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 14px 16px 32px;
      background: linear-gradient(to top, #F5EFE2 60%, rgba(245,239,226,0));
      z-index: 5;
    }

    .create-btn {
      width: 100%;
      border: none;
      cursor: pointer;
      background: #2F5D3A;
      color: #F5EFE2;
      font-family: 'Instrument Sans', sans-serif;
      font-weight: 600;
      font-size: 16px;
      padding: 16px 20px;
      border-radius: 20px;
      box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12);
      transition: all 0.2s ease;
    }

    .create-btn:active { transform: scale(0.97); }

    /* ── QR Popup ── */
    .qr-overlay {
      position: fixed;
      inset: 0;
      z-index: 70;
      background: rgba(43,33,24,0.55);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 28px;
    }

    .qr-card {
      background: #FAF5EA;
      border-radius: 24px;
      padding: 24px 22px 22px;
      width: 100%;
      max-width: 320px;
      position: relative;
      box-shadow: 0 4px 0 rgba(43,33,24,0.06), 0 30px 60px -16px rgba(43,33,24,0.35);
      border: 1px solid #B06B2C;
      animation: popIn 0.3s ease;
    }

    @keyframes popIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .qr-dismiss {
      position: absolute;
      top: 12px;
      right: 12px;
      color: #8A7E6F;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
    }

    .qr-dismiss:active { transform: scale(0.85); }

    .qr-header {
      text-align: center;
      margin-bottom: 14px;
    }

    .qr-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #B06B2C;
    }

    .qr-title {
      font-family: 'Young Serif', serif;
      font-size: 22px;
      color: #2B2118;
      margin-top: 4px;
      line-height: 1.15;
    }

    .qr-grid-wrap {
      width: 200px;
      height: 200px;
      margin: 0 auto;
      padding: 12px;
      background: #FFFFFF;
      border-radius: 14px;
      box-shadow: 0 0 0 1px rgba(43,33,24,0.08);
      display: grid;
      grid-template-columns: repeat(11, 1fr);
      grid-template-rows: repeat(11, 1fr);
      gap: 1.5px;
    }

    .qr-cell {
      border-radius: 1px;
    }

    .qr-cell.filled { background: #2B2118; }

    .qr-code-text {
      text-align: center;
      margin-top: 14px;
      font-family: 'Young Serif', serif;
      font-size: 28px;
      letter-spacing: 0.14em;
      color: #B06B2C;
      font-variant-numeric: tabular-nums;
    }

    .qr-enter-btn {
      width: 100%;
      margin-top: 16px;
      border: none;
      cursor: pointer;
      background: #2F5D3A;
      color: #F5EFE2;
      font-family: 'Instrument Sans', sans-serif;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 20px;
      border-radius: 20px;
      box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12);
      transition: all 0.2s ease;
      display: block;
      text-align: center;
      text-decoration: none;
    }

    .qr-enter-btn:active { transform: scale(0.97); }

    /* ── Add Commander Button ── */
    .add-commander-btn {
      width: 100%;
      margin-top: 8px;
      padding: 14px 16px;
      background: transparent;
      border: 1.5px dashed rgba(43,33,24,0.2);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #8A7E6F;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Instrument Sans', sans-serif;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .add-commander-btn:active { transform: scale(0.98); }

    /* ── Commander Search Popup ── */
    .search-overlay {
      position: fixed;
      inset: 0;
      background: rgba(43,33,24,0.55);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 70;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 80px 20px;
    }

    .search-card {
      background: #FAF5EA;
      border-radius: 24px;
      padding: 22px 20px;
      width: 100%;
      max-width: 360px;
      max-height: calc(100vh - 160px);
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 0 rgba(43,33,24,0.06), 0 30px 60px -16px rgba(43,33,24,0.35);
      border: 1px solid rgba(43,33,24,0.14);
      animation: popIn 0.3s ease;
    }

    .search-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .search-title {
      font-family: 'Young Serif', serif;
      font-size: 20px;
      color: #2B2118;
    }

    .search-close {
      width: 32px;
      height: 32px;
      border-radius: 999px;
      border: none;
      background: transparent;
      color: #8A7E6F;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .search-close:active { transform: scale(0.85); }

    .search-input {
      width: 100%;
      background: #F5EFE2;
      border: 1px solid rgba(43,33,24,0.14);
      border-radius: 16px;
      padding: 12px 14px;
      font-family: 'Instrument Sans', sans-serif;
      font-size: 14px;
      color: #2B2118;
      outline: none;
      margin-bottom: 12px;
    }

    .search-input:focus {
      border-color: #2F5D3A;
    }

    .search-input::placeholder {
      color: #B8AE9E;
    }

    .search-results {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .search-result {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 6px;
      border-radius: 14px;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: 'Instrument Sans', sans-serif;
      transition: background 0.15s ease;
    }

    .search-result:active {
      background: rgba(47,93,58,0.08);
    }

    .search-result-art {
      width: 44px;
      height: 38px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      background: #EDE4D0;
    }

    .search-result-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .search-result-info {
      flex: 1;
      min-width: 0;
    }

    .search-result-name {
      font-size: 14px;
      font-weight: 600;
      color: #2B2118;
      line-height: 1.2;
    }

    .search-result-mana {
      display: flex;
      gap: 3px;
      margin-top: 3px;
    }

    .search-hint {
      text-align: center;
      padding: 24px;
      color: #B8AE9E;
      font-size: 13px;
    }

    /* ── Toast ── */
    .toast {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #2B2118;
      color: #F5EFE2;
      padding: 10px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      z-index: 9999;
    }

    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    @keyframes sheetUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        {/* Header */}
        <div className="header">
          <button onClick={() => router.back()} className="header-back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="header-title" style={{ margin: 0 }}>Create a pod</h1>
        </div>

        {/* Content */}
        <div className="content">
          {/* Pod Name */}
          <div className="eyebrow">Pod Name</div>
          <input
            className="pod-name-input"
            type="text"
            value={podName}
            onChange={(e) => setPodName(e.target.value)}
            placeholder="Enter pod name..."
          />

          {/* Player Count */}
          <div className="eyebrow eyebrow-top">Number of Players</div>
          <div className="player-selector">
            {[2, 3, 4, 5].map(n => (
              <div
                key={n}
                className={`player-tile ${selectedPlayers === n ? 'selected' : ''}`}
                onClick={() => setSelectedPlayers(n)}
              >
                {n}
              </div>
            ))}
          </div>

          {/* Deck Selection */}
          <div className="eyebrow eyebrow-top">Select Your Deck</div>
          {error && <div style={{ color: '#B0593E', fontSize: 14, padding: '8px 4px' }}>{error}</div>}
          <div className="deck-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#8A7E6F' }}>Loading your commanders...</div>
            ) : decks.length === 0 ? (
              <button onClick={openNewDeck} disabled={registering} style={{
                width: '100%', padding: '18px 16px',
                background: 'transparent', border: '1.5px dashed rgba(43,33,24,0.25)',
                borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                color: '#2F5D3A', fontSize: 15, fontWeight: 600, fontFamily: "'Instrument Sans', sans-serif",
                cursor: registering ? 'default' : 'pointer', transition: 'all 0.2s ease',
                opacity: registering ? 0.5 : 1,
              }}>
                {registering ? 'Adding...' : (<>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Choose a Commander
                </>)}
              </button>
            ) : (
              decks.map((d, i) => (
                <div
                  key={d.id}
                  className={`deck-row ${selectedDeck === i ? 'selected' : ''}`}
                  onClick={() => setSelectedDeck(i)}
                >
                  <div className="deck-art">
                    {d.commander_art_url ? (
                      <img src={d.commander_art_url} alt={d.commander_name} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#E5E0D4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                        {d.commander_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="deck-info">
                    <div className="deck-name">{d.commander_name}</div>
                    <div className="deck-mana">
                      {parseColors(d.color_identity).map((c, j) => (
                        <div key={j} className="mana-dot" style={{ background: MANA_COLORS[c] || '#A89F8E' }} />
                      ))}
                    </div>
                  </div>
                  <div className={`deck-check ${selectedDeck === i ? 'selected' : ''}`}>
                    {selectedDeck === i && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5EFE2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Commander Button */}
          {!loading && decks.length > 0 && (
            <button className="add-commander-btn" onClick={openNewDeck} style={{
              width: '100%', marginTop: 8, padding: '14px 16px',
              background: 'transparent', border: '1.5px dashed rgba(43,33,24,0.2)',
              borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: '#8A7E6F', fontSize: 14, fontWeight: 600, fontFamily: "'Instrument Sans', sans-serif",
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Commander
            </button>
          )}
        </div>

        {/* Sticky CTA */}
        <div className="cta-wrap">
          <button
            className="create-btn"
            onClick={handleCreatePod}
            disabled={creating || loading || decks.length === 0}
            style={{ opacity: (creating || loading || decks.length === 0) ? 0.5 : 1 }}
          >
            {creating ? 'Creating...' : 'Create Pod'}
          </button>
        </div>
      </div>

      {/* Commander Search — bottom sheet */}
      {showNewDeck && (
        <div onClick={closeNewDeck} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: "'Instrument Sans', sans-serif",
        }}>
          <div ref={searchSheetDrag.sheetRef} onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 430, height: '88%',
            background: '#F5EFE2',
            borderRadius: '24px 24px 0 0',
            padding: '14px 16px 0',
            boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
            display: 'flex', flexDirection: 'column',
            borderTop: '1px solid rgba(43,33,24,0.14)',
            animation: 'sheetUp 240ms cubic-bezier(.22,.61,.36,1)',
          }}>
            {/* Drag handle + close */}
            <div
              onTouchStart={searchSheetDrag.onTouchStart}
              onTouchMove={searchSheetDrag.onTouchMove}
              onTouchEnd={searchSheetDrag.onTouchEnd}
              style={{ cursor: 'grab', touchAction: 'none' }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 999, background: '#B8AE9E', margin: '0 auto 6px' }}/>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0 14px' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A7E6F' }}>From Scryfall</div>
                  <div style={{ fontFamily: "'Young Serif', serif", fontWeight: 400, fontSize: 26, color: '#2B2118', letterSpacing: '-0.01em', marginTop: 2 }}>Choose a commander</div>
                </div>
                <button onClick={closeNewDeck} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 600,
                  color: '#8A7E6F', padding: 0,
                }}>Done</button>
              </div>
            </div>

            {/* Search input */}
            <div style={{
              marginTop: 14,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              background: '#FAF5EA',
              border: '1px solid rgba(43,33,24,0.14)',
              borderRadius: 14,
              boxShadow: 'inset 0 1px 2px rgba(43,33,24,0.04)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A7E6F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text" value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search legendary creatures…"
                autoFocus
                style={{
                  flex: 1, border: 'none', background: 'transparent', outline: 'none',
                  fontFamily: "'Instrument Sans', sans-serif", fontSize: 16, color: '#2B2118',
                }}/>
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', color: '#8A7E6F', padding: 4,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Results */}
            <div style={{ flex: 1, overflowY: 'auto', marginTop: 14, paddingBottom: 14 }}>
              {searching && (
                <div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>Searching…</div>
              )}
              {!searching && searchQuery.length < 2 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>Type a commander name to search</div>
              )}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>No commanders found</div>
              )}

              {searchResults.length > 0 && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8A7E6F', padding: '0 4px 8px' }}>
                  {searchResults.length} matches
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {searchResults.map((card, i) => {
                  const art = getCardArt(card);
                  return (
                    <button key={i} onClick={() => handleSelectCommander(card)} style={{
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 10px', borderRadius: 14,
                      background: 'transparent', border: 'none',
                      fontFamily: "'Instrument Sans', sans-serif",
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        overflow: 'hidden', flexShrink: 0,
                        border: '1px solid rgba(43,33,24,0.14)',
                        background: '#1A140E',
                      }}>
                        {art && <img src={art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }}/>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: "'Young Serif', serif", fontWeight: 400, fontSize: 16,
                          color: '#2B2118', lineHeight: 1.15, letterSpacing: '-0.005em',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{card.name}</div>
                        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                          {card.color_identity.map((c, j) => (
                            <span key={j} className="mana-dot" style={{ background: MANA_COLORS[c] || '#A89F8E' }} />
                          ))}
                        </div>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A7E6F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Art Picker — choose commander printing */}
      {showArtPicker && artPickerCard && (
        <div onClick={handleArtCancel} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
          fontFamily: "'Instrument Sans', sans-serif",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 420, maxHeight: '85vh',
            display: 'flex', flexDirection: 'column',
            background: '#FAF5EA',
            color: '#2B2118',
            borderRadius: 20,
            border: '1px solid rgba(43,33,24,0.14)',
            boxShadow: '0 30px 60px -16px rgba(43,33,24,0.45)',
            overflow: 'hidden',
            animation: 'sheetUp 240ms cubic-bezier(.22,.61,.36,1)',
          }}>
            {/* Header */}
            <div style={{ padding: '18px 20px 8px', textAlign: 'center' }}>
              <div style={{
                fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
                fontWeight: 700, color: '#B06B2C', marginBottom: 4,
              }}>Commander art</div>
              <div style={{
                fontFamily: "'Young Serif', serif", fontSize: 22, lineHeight: 1.15, color: '#2B2118',
              }}>{artPickerCard.cardName}</div>
              <div style={{
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: '#8A7E6F', marginTop: 4,
              }}>Pick which art to use for this commander.</div>
            </div>

            {/* Grid */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '8px 16px 16px',
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
            }}>
              {artPrintings === null && (
                <div style={{
                  gridColumn: '1 / -1', textAlign: 'center', color: '#8A7E6F', fontSize: 13, padding: '20px 0',
                }}>Loading printings…</div>
              )}
              {artPrintings && artPrintings.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1', textAlign: 'center', color: '#8A7E6F', fontSize: 13, padding: '20px 0',
                }}>No printings found.</div>
              )}
              {artPrintings?.map((p) => {
                const selected = selectedArtId === p.id;
                const thumb = p.art_crop ?? p.normal;
                return (
                  <button key={p.id} type="button" onClick={() => setSelectedArtId(p.id)} style={{
                    appearance: 'none',
                    background: '#F0E8D8',
                    border: `2px solid ${selected ? '#B06B2C' : 'rgba(43,33,24,0.14)'}`,
                    borderRadius: 12, padding: 0, cursor: 'pointer', overflow: 'hidden', textAlign: 'left',
                    boxShadow: selected ? '0 0 0 2px rgba(176,107,44,0.25)' : 'none',
                    transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease',
                    transform: selected ? 'scale(1.01)' : 'scale(1)',
                  }}>
                    <div style={{
                      width: '100%', aspectRatio: '16 / 11',
                      background: 'rgba(176,107,44,0.12)', position: 'relative', overflow: 'hidden',
                    }}>
                      {thumb && (
                        <img src={thumb} alt="" referrerPolicy="no-referrer" loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                      )}
                    </div>
                    <div style={{
                      padding: '6px 8px 8px', fontFamily: "'Instrument Sans', sans-serif", fontSize: 10, color: '#8A7E6F', lineHeight: 1.3,
                    }}>
                      <div style={{
                        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: '#2B2118', fontSize: 10,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{p.set_name}</div>
                      <div style={{ marginTop: 2 }}>
                        #{p.collector_number}
                        {p.released_at ? ` · ${p.released_at.slice(0, 4)}` : ''}
                        {p.promo ? ' · promo' : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 10, padding: '12px 16px 16px', borderTop: '1px solid rgba(43,33,24,0.08)' }}>
              <button onClick={handleArtCancel} style={{
                flex: 1, padding: '12px 14px', borderRadius: 999,
                background: 'transparent', color: '#8A7E6F',
                border: '1px solid rgba(43,33,24,0.14)',
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, fontWeight: 700,
                letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleArtConfirm} disabled={!selectedArtId} style={{
                flex: 1, padding: '12px 14px', borderRadius: 999,
                background: !selectedArtId ? 'rgba(176,107,44,0.5)' : '#B06B2C',
                color: '#F5EFE2', border: 'none',
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, fontWeight: 700,
                letterSpacing: '0.16em', textTransform: 'uppercase',
                cursor: !selectedArtId ? 'not-allowed' : 'pointer',
              }}>Use this art</button>
            </div>
          </div>
        </div>
      )}

      {/* Bracket Picker — compact bottom sheet */}
      {pendingCard && (
        <div onClick={() => setPendingCard(null)} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(43,33,24,0.55)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: "'Instrument Sans', sans-serif",
        }}>
          <div ref={bracketSheetDrag.sheetRef} onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: 430,
            background: '#F5EFE2',
            borderRadius: '24px 24px 0 0',
            padding: '12px 16px 24px',
            boxShadow: '0 -20px 60px -10px rgba(43,33,24,0.4)',
            borderTop: '1px solid rgba(43,33,24,0.14)',
            animation: 'sheetUp 240ms cubic-bezier(.22,.61,.36,1)',
          }}>
            {/* Drag handle */}
            <div
              onTouchStart={bracketSheetDrag.onTouchStart}
              onTouchMove={bracketSheetDrag.onTouchMove}
              onTouchEnd={bracketSheetDrag.onTouchEnd}
              style={{ cursor: 'grab', touchAction: 'none' }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 999, background: '#B8AE9E', margin: '0 auto 4px' }}/>
            </div>

            {/* Commander art + info header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 12 }}>
              {pendingCard.artUrl && (
                <div style={{
                  width: 52, height: 52, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
                  border: '2px solid #B06B2C',
                  boxShadow: '0 6px 16px -6px rgba(43,33,24,0.35)',
                }}>
                  <img src={pendingCard.artUrl} alt={pendingCard.cardName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 22%' }}/>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: '#8A7E6F',
                }}>Power level</div>
                <div style={{
                  fontFamily: "'Young Serif', serif", fontWeight: 400, fontSize: 20,
                  color: '#2B2118', letterSpacing: '-0.01em', marginTop: 1, lineHeight: 1.15,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>Bracket for {pendingCard.cardName.split(',')[0]}</div>
                <div style={{ fontSize: 11, color: '#5C5043', marginTop: 2 }}>
                  Set honestly so the pod knows what to expect.
                </div>
              </div>
            </div>

            {/* Compact bracket tiles — horizontal row */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {BRACKETS.map(b => {
                const selected = selectedBracket === b.value;
                return (
                  <button key={b.value} onClick={() => setSelectedBracket(b.value)} style={{
                    flex: 1, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '10px 4px 8px',
                    background: selected ? '#F3E3D1' : '#FAF5EA',
                    border: selected ? '2px solid #B06B2C' : '1px solid rgba(43,33,24,0.1)',
                    borderRadius: 14,
                    boxShadow: selected ? '0 2px 0 rgba(43,33,24,.05), 0 18px 36px -12px rgba(43,33,24,.22)' : '0 1px 3px rgba(43,33,24,0.06)',
                    fontFamily: "'Instrument Sans', sans-serif",
                    transition: 'all 140ms cubic-bezier(.22,.61,.36,1)',
                    position: 'relative',
                  }}>
                    <span style={{
                      fontFamily: "'Young Serif', serif",
                      fontSize: 26, fontWeight: 400,
                      color: selected ? '#B06B2C' : '#2B2118',
                      lineHeight: 1, letterSpacing: '-0.02em',
                    }}>{b.value}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, color: selected ? '#8C5422' : '#8A7E6F',
                      letterSpacing: '0.04em', lineHeight: 1.2, textAlign: 'center',
                    }}>{b.desc.split(' ')[0]}</span>
                    {selected && (
                      <div style={{
                        position: 'absolute', top: -5, right: -5,
                        width: 18, height: 18, borderRadius: 999,
                        background: '#B06B2C', color: '#F5EFE2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(43,33,24,0.25)',
                      }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Description of selected bracket */}
            <div style={{
              textAlign: 'center', fontSize: 12, color: '#5C5043',
              padding: '4px 8px 8px', lineHeight: 1.4,
            }}>
              {BRACKETS.find(b => b.value === selectedBracket)?.desc}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setPendingCard(null)} style={{
                flex: 1, cursor: 'pointer',
                background: 'transparent',
                border: '1px solid rgba(43,33,24,0.14)',
                borderRadius: 20,
                padding: '14px 16px',
                color: '#2B2118',
                fontFamily: "'Instrument Sans', sans-serif", fontWeight: 600, fontSize: 15,
              }}>Cancel</button>
              <button onClick={handleConfirmRegistration} disabled={registering} style={{
                flex: 1.4, cursor: registering ? 'default' : 'pointer',
                background: registering ? '#8A7E6F' : '#2F5D3A',
                border: 'none',
                borderRadius: 20,
                padding: '14px 16px',
                color: '#F5EFE2',
                fontFamily: "'Instrument Sans', sans-serif", fontWeight: 600, fontSize: 15,
                boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
              }}>{registering ? 'Registering…' : 'Save bracket'}</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Popup */}
      {showQr && (
        <div className="qr-overlay" onClick={() => setShowQr(false)}>
          <div className="qr-card" onClick={(e) => e.stopPropagation()}>
            <button className="qr-dismiss" onClick={() => setShowQr(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div className="qr-header">
              <div className="qr-eyebrow">Pod Created</div>
              <div className="qr-title">Share this code so others can join</div>
            </div>

            {/* Real QR Code */}
            <div style={{
              width: 200, height: 200, margin: '0 auto',
              padding: 12, background: '#FFFFFF',
              borderRadius: 14,
              boxShadow: '0 0 0 1px rgba(43,33,24,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`QR code to join pod ${createdPod?.short_code}`}
                  width={176}
                  height={176}
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div style={{ color: '#B8AE9E', fontSize: 13 }}>Generating...</div>
              )}
            </div>

            <div className="qr-code-text">
              {createdPod ? `${createdPod.short_code.slice(0, 3)}—${createdPod.short_code.slice(3)}` : '———————'}
            </div>

            <button
              className="qr-enter-btn"
              onClick={handleEnterPod}
              disabled={creating}
              style={{ opacity: creating ? 0.5 : 1 }}
            >
              {creating ? 'Starting game...' : 'Enter Pod'}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMsg}
      </div>
    </>
  );
}
