'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerCommander, getMyCommanders, BRACKETS, type Deck } from '@/lib/commanders';
import { createPod, getQrCodeUrl } from '@/lib/pods';
import { createGame } from '@/lib/games';
import { validateCommander, searchCommanders, type CardData } from '@/lib/scryfall';

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

    setCreatedPod({ id: pod.id, short_code: pod.short_code });
    setShowQr(true);
    setCreating(false);
  }

  // Enter pod → create game + navigate to gridview
  async function handleEnterPod() {
    if (!createdPod) return;
    setCreating(true);

    const { data: game, error: gameErr } = await createGame(createdPod.id, selectedPlayers);
    if (gameErr || !game) {
      setError(gameErr ?? 'Failed to create game');
      setCreating(false);
      return;
    }

    setCreatedGameId(game.id);
    // Navigate to gridview with pod context
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

    // Show bracket picker step
    setPendingCard(validated);
    setSelectedBracket(2); // default
    setShowNewDeck(false);
    setSearchQuery('');
    setSearchResults([]);
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
      gap: 8px;
      padding: 52px 12px 12px;
      background: rgba(245,239,226,0.85);
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
      font-size: 20px;
      letter-spacing: -0.01em;
      color: #2B2118;
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
      transition: all 0.2s ease;
    }

    .player-tile:active { transform: scale(0.95); }

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
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="app">
        {/* Header */}
        <div className="header">
          <Link href="/landing" className="header-back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="header-title">Create a pod</div>
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
              <div style={{ textAlign: 'center', padding: 32, color: '#8A7E6F' }}>
                No commanders registered yet.
                <br />
                <Link href="/profile" style={{ color: '#2F5D3A', fontWeight: 600 }}>Add a commander first</Link>
              </div>
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

      {/* Commander Search Popup */}
      {showNewDeck && (
        <div className="search-overlay" onClick={closeNewDeck}>
          <div className="search-card" onClick={(e) => e.stopPropagation()}>
            <div className="search-header">
              <div className="search-title">Choose Commander</div>
              <button className="search-close" onClick={closeNewDeck}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <input
              className="search-input"
              type="text"
              placeholder="Search commanders..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              autoFocus
            />
            <div className="search-results">
              {searching && <div className="search-hint">Searching...</div>}
              {!searching && searchQuery.length < 2 && <div className="search-hint">Type a commander name to search</div>}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && <div className="search-hint">No commanders found</div>}
              {searchResults.map((card, i) => (
                <button key={i} className="search-result" onClick={() => handleSelectCommander(card)}>
                  <div className="search-result-art">
                    {getCardArt(card) && <img src={getCardArt(card)} alt={card.name} />}
                  </div>
                  <div className="search-result-info">
                    <div className="search-result-name">{card.name}</div>
                    <div className="search-result-mana">
                      {card.color_identity.map((c, j) => (
                        <span key={j} className="mana-dot" style={{ background: MANA_COLORS[c] || '#A89F8E' }} />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bracket Picker Overlay */}
      {pendingCard && (
        <div className="search-overlay" onClick={() => setPendingCard(null)}>
          <div className="search-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            {/* Commander preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div className="deck-art" style={{ width: 52, height: 52, borderRadius: 14 }}>
                {pendingCard.artUrl ? (
                  <img src={pendingCard.artUrl} alt={pendingCard.cardName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EDE4D0', borderRadius: 14, color: '#8A7E6F' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Young Serif', serif", fontSize: 18, color: '#2B2118', lineHeight: 1.15 }}>{pendingCard.cardName}</div>
                <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                  {(pendingCard.colorIdentity || '').split('').map((c, j) => (
                    <span key={j} className="mana-dot" style={{ background: MANA_COLORS[c] || '#A89F8E' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Bracket picker */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B06B2C', marginBottom: 10 }}>Declare bracket</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BRACKETS.map(b => (
                <button key={b.value} onClick={() => setSelectedBracket(b.value)} style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 14,
                  background: selectedBracket === b.value ? '#EDE4D0' : 'transparent',
                  border: selectedBracket === b.value ? '1.5px solid #B06B2C' : '1px solid rgba(43,33,24,0.08)',
                  fontFamily: "'Instrument Sans', sans-serif",
                  transition: 'all 0.15s ease',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: selectedBracket === b.value ? '#B06B2C' : '#F5EFE2',
                    color: selectedBracket === b.value ? '#F5EFE2' : '#8A7E6F',
                    border: selectedBracket === b.value ? 'none' : '1px solid rgba(43,33,24,0.14)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Young Serif', serif", fontSize: 15, fontWeight: 400,
                  }}>{b.value}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#2B2118' }}>{b.label}</div>
                    <div style={{ fontSize: 11, color: '#8A7E6F', marginTop: 1 }}>{b.desc}</div>
                  </div>
                  {selectedBracket === b.value && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B06B2C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Confirm button */}
            <button onClick={handleConfirmRegistration} disabled={registering} style={{
              width: '100%', marginTop: 16, cursor: registering ? 'default' : 'pointer',
              background: registering ? '#8A7E6F' : '#2F5D3A', color: '#F5EFE2',
              border: 'none', borderRadius: 20, padding: '14px 18px',
              fontSize: 15, fontWeight: 600,
              boxShadow: '0 1px 0 rgba(43,33,24,.04), 0 6px 18px -8px rgba(43,33,24,.12)',
              fontFamily: "'Instrument Sans', sans-serif",
            }}>{registering ? 'Registering...' : 'Register Commander'}</button>
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
