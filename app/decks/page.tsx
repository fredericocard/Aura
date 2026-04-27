'use client';

import React, { useState } from 'react';

interface ScryfallCard {
  name: string;
  image_uris?: { art_crop: string };
  card_faces?: { image_uris?: { art_crop: string } }[];
  color_identity: string[];
}

export default function Page() {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  const displayToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const searchScryfall = (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}+is%3Acommander&order=name&unique=cards`)
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setSearchResults(data.data.slice(0, 8));
        } else {
          setSearchResults([]);
        }
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

  const manaColors: Record<string, string> = {
    W: '#f5efe3',
    U: '#2d7fa0',
    B: '#3a3a3a',
    R: '#a84a3a',
    G: '#2a8a56',
  };

  const handleSelectCommander = (card: ScryfallCard) => {
    displayToast(`${card.name} added!`);
    setShowNewDeck(false);
    setSearchQuery('');
    setSearchResults([]);
    // In production this would navigate to deck-accomplishments with the new deck
    window.location.href = '/deck-accomplishments';
  };

  const styles = `
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

    html, body {
      height: 100%;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      background: #e8dcc8;
    }

    .app {
      width: 100%;
      height: 100%;
      max-width: 430px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      padding: 0 24px;
      padding-top: env(safe-area-inset-top, 16px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      overflow: hidden;
    }

    /* ── Header ── */
    .decks-header {
      padding: 16px 0 8px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .back-btn {
      position: absolute;
      left: 0;
      top: 16px;
      color: rgb(90,110,98);
      font-size: 22px;
      cursor: pointer;
      background: none;
      border: none;
      font-family: inherit;
      line-height: 1;
      transition: all 0.2s ease;
    }

    .back-btn:active {
      transform: scale(0.9);
    }

    .title-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .title-text {
      font-size: 20px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    /* ── Scrollable Deck List ── */
    .deck-list {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: 8px 0;
    }

    /* ── Deck Card ── */
    .deck-card {
      display: flex;
      align-items: center;
      gap: 0;
      margin-bottom: 10px;
      cursor: pointer;
      background: rgb(245,239,227);
      border-radius: 22px;
      border: 1px solid rgb(184,168,138);
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(26,20,13,0.08);
      transition: all 0.2s ease;
      text-decoration: none;
      color: inherit;
    }

    .deck-card:active {
      transform: scale(0.9);
    }

    .deck-art {
      width: 72px;
      height: 64px;
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
      background: rgb(222,212,192);
    }

    .deck-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .deck-art-fade {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 50%, rgba(245,239,227,0.9) 100%);
    }

    .deck-info {
      flex: 1;
      padding: 12px 14px;
    }

    .deck-commander {
      color: rgb(44,62,54);
      font-size: 14px;
      font-weight: 700;
    }

    .deck-mana {
      display: flex;
      gap: 4px;
      margin-top: 5px;
    }

    .mana-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .deck-chevron {
      color: rgb(26,122,106);
      font-size: 18px;
      font-weight: 600;
      padding-right: 16px;
      flex-shrink: 0;
    }

    /* ── New Deck Button ── */
    .new-deck-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 24px;
      margin: 4px auto 0;
      width: fit-content;
      background: rgb(245,239,227);
      border-radius: 22px;
      border: 1px solid rgb(184,168,138);
      box-shadow: 0 6px 16px rgba(26,20,13,0.08);
      cursor: pointer;
      color: rgb(44,62,54);
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      transition: all 0.2s ease;
    }

    .new-deck-btn:active {
      transform: scale(0.9);
    }

    .new-deck-plus {
      font-size: 16px;
      color: rgb(26,122,106);
      font-weight: 700;
    }

    /* ── Bottom Nav ── */
    .bottom-nav {
      margin-top: auto;
      margin-bottom: 16px;
      padding-top: 16px;
      height: 84px;
      border-radius: 26px;
      border-top: 1px solid rgba(184,168,138,0.5);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      flex: 1;
      padding: 10px 6px;
      border-radius: 18px;
      background: transparent;
      transition: all 0.2s ease;
      border: none;
      font-family: inherit;
      text-decoration: none;
      color: inherit;
    }

    /* Active state — current page, permanent teal gradient */
    .nav-item.active {
      background: linear-gradient(135deg, rgb(21,138,114) 0%, rgb(26,122,106) 100%);
      border: 1px solid rgb(56,158,133);
      box-shadow: 0 4px 12px rgba(26,120,105,0.45);
    }

    .nav-item.active .nav-label {
      color: rgb(245,239,227);
      font-weight: 700;
    }

    .nav-item.active .nav-icon-svg {
      stroke: rgb(245,239,227);
    }

    /* Press state for inactive items */
    .nav-item:not(.active):active {
      transform: scale(0.9);
      background: linear-gradient(135deg, rgb(21,138,114) 0%, rgb(26,122,106) 100%);
    }

    .nav-item:not(.active):active .nav-label {
      color: rgb(245,239,227);
    }

    .nav-item:not(.active):active .nav-icon-svg {
      stroke: rgb(245,239,227);
    }

    /* Active nav item press — subtle scale */
    .nav-item.active:active {
      transform: scale(0.95);
    }

    .nav-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-icon-svg {
      stroke: rgb(90,110,98);
      fill: none;
      transition: stroke 0.2s ease;
    }

    .nav-label {
      font-weight: 500;
      font-size: 12px;
      color: rgb(90,110,98);
      transition: color 0.2s ease;
    }

    /* ── New Deck Popup ── */
    .newdeck-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 500;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 60px;
    }

    .newdeck-popup {
      width: calc(100% - 48px);
      max-width: 380px;
      max-height: calc(100vh - 120px);
      background: rgb(245,239,227);
      border: 1.3px solid rgb(184,168,138);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.25);
      display: flex;
      flex-direction: column;
    }

    .newdeck-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .newdeck-title {
      font-size: 18px;
      font-weight: 700;
      color: rgb(44,62,54);
    }

    .newdeck-close {
      background: none;
      border: none;
      font-size: 20px;
      color: rgb(90,110,98);
      cursor: pointer;
    }

    .newdeck-search {
      width: 100%;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1.3px solid rgb(184,168,138);
      background: rgb(222,212,192);
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: rgb(44,62,54);
      outline: none;
      margin-bottom: 12px;
    }

    .newdeck-search:focus {
      border-color: rgb(26,122,106);
    }

    .newdeck-search::placeholder {
      color: rgb(138,154,142);
    }

    .newdeck-results {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .newdeck-result {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 6px;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.15s ease;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: 'Inter', sans-serif;
    }

    .newdeck-result:active {
      background: rgba(26,122,106,0.08);
    }

    .newdeck-result-art {
      width: 48px;
      height: 42px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      background: rgb(222,212,192);
    }

    .newdeck-result-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .newdeck-result-info {
      flex: 1;
      min-width: 0;
    }

    .newdeck-result-name {
      font-size: 13px;
      font-weight: 600;
      color: rgb(44,62,54);
      line-height: 1.2;
    }

    .newdeck-result-mana {
      display: flex;
      gap: 3px;
      margin-top: 4px;
    }

    .newdeck-mana-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .newdeck-hint {
      text-align: center;
      padding: 20px;
      color: rgb(138,154,142);
      font-size: 13px;
    }

    /* ── Toast ── */
    .toast {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgb(44,62,54);
      color: rgb(245,239,227);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
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
        <div className="decks-header">
          <div className="title-row">
            <span className="title-text">Your Decks</span>
          </div>
        </div>

        {/* Deck List */}
        <div className="deck-list">
          {/* Deck 1: Atraxa Superfriends */}
          <a href="/deck-accomplishments" className="deck-card">
            <div className="deck-art">
              <img src="https://cards.scryfall.io/art_crop/front/c/3/c34ae834-775e-447a-a330-0270c227c667.jpg" alt="Atraxa" />
              <div className="deck-art-fade"></div>
            </div>
            <div className="deck-info">
              <div className="deck-commander">Atraxa, Praetors' Voice</div>
              <div className="deck-mana">
                <div className="mana-dot" style={{background:'#f5efe3',border:'1px solid rgb(184,168,138)'}}></div>
                <div className="mana-dot" style={{background:'#2d7fa0'}}></div>
                <div className="mana-dot" style={{background:'#3a3a3a'}}></div>
                <div className="mana-dot" style={{background:'#2a8a56'}}></div>
              </div>
            </div>
            <span className="deck-chevron">&#8250;</span>
          </a>

          {/* Deck 2: Korvold Sac */}
          <a href="/deck-accomplishments" className="deck-card">
            <div className="deck-art">
              <img src="https://cards.scryfall.io/art_crop/front/9/2/92ea1575-eb64-43b5-b604-c6e23054f228.jpg" alt="Korvold" />
              <div className="deck-art-fade"></div>
            </div>
            <div className="deck-info">
              <div className="deck-commander">Korvold, Fae-Cursed King</div>
              <div className="deck-mana">
                <div className="mana-dot" style={{background:'#3a3a3a'}}></div>
                <div className="mana-dot" style={{background:'#a84a3a'}}></div>
                <div className="mana-dot" style={{background:'#2a8a56'}}></div>
              </div>
            </div>
            <span className="deck-chevron">&#8250;</span>
          </a>

          {/* Deck 3: Yuriko Ninjas */}
          <a href="/deck-accomplishments" className="deck-card">
            <div className="deck-art">
              <img src="https://cards.scryfall.io/art_crop/front/3/b/3bd81ae6-e628-447a-a36b-597e63ede295.jpg" alt="Yuriko" />
              <div className="deck-art-fade"></div>
            </div>
            <div className="deck-info">
              <div className="deck-commander">Yuriko, the Tiger's Shadow</div>
              <div className="deck-mana">
                <div className="mana-dot" style={{background:'#2d7fa0'}}></div>
                <div className="mana-dot" style={{background:'#3a3a3a'}}></div>
              </div>
            </div>
            <span className="deck-chevron">&#8250;</span>
          </a>

          {/* New Deck button */}
          <button className="new-deck-btn" onClick={() => setShowNewDeck(true)}>
            <span className="new-deck-plus">+</span> New Deck
          </button>
        </div>

        {/* Bottom Nav: Recent Games | Profile | Decks (active) */}
        <div className="bottom-nav">
          <a href="/recent-games" className="nav-item">
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4H16M2 9H16M2 14H16"/>
              </svg>
            </div>
            <div className="nav-label">Recent Games</div>
          </a>

          <a href="/profile" className="nav-item">
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="9" cy="6" r="3.5"/>
                <path d="M2.5 17C2.5 13 5 11 9 11C13 11 15.5 13 15.5 17"/>
              </svg>
            </div>
            <div className="nav-label">Profile</div>
          </a>

          <div className="nav-item active">
            <div className="nav-icon">
              <svg className="nav-icon-svg" width="18" height="18" viewBox="0 0 18 18" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="1" width="12" height="14" rx="2"/>
                <path d="M6 17H15C16 17 17 16 17 15V5" opacity="0.5" strokeWidth="1.2"/>
              </svg>
            </div>
            <div className="nav-label">Decks</div>
          </div>
        </div>
      </div>

      {/* New Deck Popup */}
      {showNewDeck && (
        <div className="newdeck-overlay" onClick={() => { setShowNewDeck(false); setSearchQuery(''); setSearchResults([]); }}>
          <div className="newdeck-popup" onClick={(e) => e.stopPropagation()}>
            <div className="newdeck-header">
              <div className="newdeck-title">Choose Commander</div>
              <button className="newdeck-close" onClick={() => { setShowNewDeck(false); setSearchQuery(''); setSearchResults([]); }}>✕</button>
            </div>
            <input
              className="newdeck-search"
              type="text"
              placeholder="Search commanders..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              autoFocus
            />
            <div className="newdeck-results">
              {searching && <div className="newdeck-hint">Searching...</div>}
              {!searching && searchQuery.length < 2 && <div className="newdeck-hint">Type a commander name to search</div>}
              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && <div className="newdeck-hint">No commanders found</div>}
              {searchResults.map((card, i) => (
                <button key={i} className="newdeck-result" onClick={() => handleSelectCommander(card)}>
                  <div className="newdeck-result-art">
                    {getCardArt(card) && <img src={getCardArt(card)} alt={card.name} />}
                  </div>
                  <div className="newdeck-result-info">
                    <div className="newdeck-result-name">{card.name}</div>
                    <div className="newdeck-result-mana">
                      {card.color_identity.map((c, j) => (
                        <div key={j} className="newdeck-mana-dot" style={{ background: manaColors[c] || '#8a8a8a', border: c === 'W' ? '1px solid rgb(184,168,138)' : 'none' }} />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
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
