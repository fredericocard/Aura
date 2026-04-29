'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { registerCommander, getMyCommanders, BRACKETS, type Deck } from '../../lib/commanders';
import { useAuth } from '../../lib/auth-context';
import { validateCommander, searchCommanders, type CardData } from '../../lib/scryfall';

interface ScryfallCard {
  name: string;
  image_uris?: { art_crop: string };
  card_faces?: { image_uris?: { art_crop: string } }[];
  color_identity: string[];
}

const AURA_TIERS = [
  { min: 0,  max: 19,  name: 'Exiled' },
  { min: 20, max: 39,  name: 'Sideboard' },
  { min: 40, max: 59,  name: 'Brewed' },
  { min: 60, max: 79,  name: 'Beloved' },
  { min: 80, max: 100, name: 'Mythic' },
];

const MANA_COLORS: Record<string, string> = {
  W: '#E9DEB6',
  U: '#5B7E9E',
  B: '#3F352E',
  R: '#B0593E',
  G: '#5B7B45',
  C: '#A89F8E',
};

function tierFor(score: number) {
  return AURA_TIERS.find((t: any) => score >= t.min && score <= t.max) || AURA_TIERS[0];
}

export default function Page() {
  const { isLoggedIn } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [pendingCard, setPendingCard] = useState<CardData | null>(null);
  const [selectedBracket, setSelectedBracket] = useState(2);
  const [registering, setRegistering] = useState(false);

  // Fetch real decks from Supabase
  useEffect(() => {
    if (!isLoggedIn) { setLoadingDecks(false); return; }
    getMyCommanders().then(({ data }) => {
      setDecks(data);
      setLoadingDecks(false);
    });
  }, [isLoggedIn]);

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
      const { supabase } = await import('../../lib/supabase');
      await supabase.from('decks').update({
        commander_art_url: pendingCard.artUrl,
        color_identity: pendingCard.colorIdentity || null,
      }).eq('id', newDeck.id);

      setDecks(prev => [{
        ...newDeck,
        commander_art_url: pendingCard.artUrl,
        color_identity: pendingCard.colorIdentity || null,
      }, ...prev]);
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

  const totalAura = decks.reduce((sum: any, d: any) => sum + (d.aura_score || 0), 0);

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

    /* ── Hero Header ── */
    .hero-header {
      padding: 52px 20px 18px;
      background: linear-gradient(180deg, #F3E3D1 0%, #F5EFE2 100%);
      flex-shrink: 0;
    }

    .hero-eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #B06B2C;
      margin-bottom: 6px;
    }

    .hero-title {
      font-family: 'Young Serif', serif;
      font-size: 28px;
      color: #2B2118;
      letter-spacing: -0.01em;
      line-height: 1.1;
    }

    .hero-subtitle {
      font-size: 12px;
      color: #5C5043;
      margin-top: 4px;
    }

    .hero-aura-value {
      color: #2F5D3A;
      font-weight: 700;
    }

    /* ── Content ── */
    .content {
      flex: 1;
      overflow: auto;
      padding: 14px 16px 100px;
    }

    .deck-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* ── Deck Row ── */
    .deck-row {
      width: 100%;
      text-align: left;
      cursor: pointer;
      background: #FAF5EA;
      border: 1px solid rgba(43,33,24,0.08);
      border-radius: 20px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 1px 0 rgba(43,33,24,0.04), 0 6px 18px -8px rgba(43,33,24,0.12);
      text-decoration: none;
      color: inherit;
      transition: all 0.2s ease;
    }

    .deck-row:active { transform: scale(0.98); }

    .deck-art {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 0 0 1px rgba(43,33,24,0.08);
      background: #EDE4D0;
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
      font-size: 17px;
      color: #2B2118;
      line-height: 1.15;
      letter-spacing: -0.01em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .deck-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .mana-dots {
      display: inline-flex;
      gap: 3px;
      align-items: center;
    }

    .mana-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      box-shadow: 0 0 0 1px rgba(43,33,24,0.18);
    }

    .tier-label {
      font-size: 11px;
      color: #8A7E6F;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .deck-aura {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .aura-number {
      font-family: 'Young Serif', serif;
      font-size: 22px;
      color: #2F5D3A;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
    }

    .deck-chevron {
      color: #B8AE9E;
      margin-left: 4px;
    }

    /* ── Add New Card ── */
    .add-card {
      border: 1.5px dashed rgba(43,33,24,0.14);
      border-radius: 20px;
      padding: 20px 14px;
      text-align: center;
      color: #5C5043;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      font-family: 'Instrument Sans', sans-serif;
    }

    .add-card:active { transform: scale(0.98); }

    .add-icon-circle {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      background: #FAF5EA;
      border: 1px solid rgba(43,33,24,0.14);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8A7E6F;
    }

    .add-label {
      font-family: 'Young Serif', serif;
      font-size: 16px;
      color: #2B2118;
    }

    .add-hint {
      font-size: 12px;
      color: #5C5043;
    }

    /* ── Bottom Nav ── */
    .bottom-nav {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding-bottom: 28px;
      padding-top: 8px;
      background: rgba(245,239,226,0.92);
      backdrop-filter: blur(14px) saturate(120%);
      -webkit-backdrop-filter: blur(14px) saturate(120%);
      border-top: 1px solid rgba(43,33,24,0.08);
      display: flex;
      justify-content: space-around;
      z-index: 30;
    }

    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 6px 0;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .nav-item:active { transform: scale(0.9); }

    .nav-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .nav-inactive {
      color: #8A7E6F;
    }

    .nav-active {
      color: #2F5D3A;
    }

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

    @keyframes popIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
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
        {/* Hero Header */}
        <div className="hero-header">
          <div className="hero-eyebrow">The Library</div>
          <div className="hero-title">Decks</div>
          <div className="hero-subtitle">
            {decks.length} commander{decks.length !== 1 ? 's' : ''} · summed Aura{' '}
            <span className="hero-aura-value">{totalAura}</span>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          <div className="deck-list">
            {loadingDecks && (
              <div style={{ textAlign: 'center', padding: 24, color: '#8A7E6F', fontSize: 13 }}>Loading your decks...</div>
            )}
            {!loadingDecks && decks.map(d => {
              const aura = Math.round(d.aura_score || 50);
              const tier = tierFor(aura);
              const colors = d.color_identity ? d.color_identity.split('') : [];
              return (
                <Link key={d.id} href={`/deck-accomplishments?id=${d.id}`} className="deck-row">
                  <div className="deck-art">
                    {d.commander_art_url ? (
                      <img src={d.commander_art_url} alt={d.commander_name} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A7E6F', fontSize: 20 }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="deck-info">
                    <div className="deck-name">{d.commander_name}</div>
                    <div className="deck-meta">
                      <span className="mana-dots">
                        {colors.map((c, j) => (
                          <span key={j} className="mana-dot" style={{ background: MANA_COLORS[c] || '#A89F8E' }} />
                        ))}
                      </span>
                      <span className="tier-label">{tier.name}</span>
                    </div>
                  </div>
                  <div className="deck-aura">
                    <svg width="14" height="14" viewBox="0 0 64 64" aria-hidden="true">
                      <circle cx="32" cy="36" r="2.4" fill="#2F5D3A" />
                      <clipPath id={`ac-${d.id}`}><ellipse cx="32" cy="32" rx="22" ry="26" /></clipPath>
                      <g clipPath={`url(#ac-${d.id})`}>
                        <polygon points="8,60 30,4 31,4 24,60" fill="#2F5D3A" />
                        <polygon points="40,60 33,4 34,4 56,60" fill="#2F5D3A" />
                      </g>
                    </svg>
                    <span className="aura-number">{aura}</span>
                    <span className="deck-chevron">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* Add new commander card */}
            <button className="add-card" onClick={openNewDeck}>
              <div className="add-icon-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="add-label">Add a commander</div>
              <div className="add-hint">Search Scryfall or paste a decklist URL</div>
            </button>
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="bottom-nav">
          <Link href="/recent-games" className="nav-item nav-inactive">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12.83 2.18-9 4a2 2 0 0 0 0 3.64l9 4a2 2 0 0 0 1.66 0l9-4a2 2 0 0 0 0-3.64l-9-4a2 2 0 0 0-1.66 0z" />
              <path d="m2 12.5 9.2 4.1a2 2 0 0 0 1.6 0L22 12.5" />
              <path d="m2 17.5 9.2 4.1a2 2 0 0 0 1.6 0L22 17.5" />
            </svg>
            <div className="nav-label">Recent</div>
          </Link>
          <Link href="/profile" className="nav-item nav-inactive">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div className="nav-label">Profile</div>
          </Link>
          <div className="nav-item nav-active">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
              <path d="M19 3v3M20.5 4.5h-3M5 18v3M6.5 19.5h-3" />
            </svg>
            <div className="nav-label">Decks</div>
          </div>
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

      {/* Toast */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMsg}
      </div>
    </>
  );
}
